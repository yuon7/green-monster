import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  ChannelType,
  TextBasedChannel,
  PermissionFlagsBits,
  Message,
} from 'discord.js';
import { Command } from '@/types';
import { FormationService } from '@/services/FormationService';

const profileScan: Command = {
  data: new SlashCommandBuilder()
    .setName('profile-scan')
    .setDescription('指定したチャンネルから編成データをスキャンして一括登録します')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild) // 管理権限推奨
    .addChannelOption(option =>
      option
        .setName('channel')
        .setDescription('編成提出チャンネル')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) return;

    await interaction.deferReply();

    const channel = interaction.options.getChannel('channel', true) as TextBasedChannel;
    
    try {
      let messages: Message[] = [];
      let lastId: string | undefined;

      // 200件取得 (100件 x 2回)
      for (let i = 0; i < 2; i++) {
        const batch = await channel.messages.fetch({ limit: 100, before: lastId });
        if (batch.size === 0) break;
        messages = messages.concat(Array.from(batch.values()));
        lastId = batch.last()?.id;
      }

      await interaction.editReply(`📥 ${messages.length}件のメッセージをスキャン中...`);

      const failureDetails: string[] = [];
      const parseFailures: string[] = [];
      
      let successCount = 0;
      let errorCount = 0;
      let ignoredCount = 0;

      for (const msg of messages) {
        if (msg.author.bot) {
          ignoredCount++;
          continue;
        }

        const userName = msg.member?.displayName || msg.author.username;
        const parsed = FormationService.parseFormationText(msg.content);
        
        if (!parsed) {
          parseFailures.push(userName);
          ignoredCount++;
          continue;
        }

        const { error } = await FormationService.upsertProfile({
          guildId: interaction.guild.id,
          userId: msg.author.id,
          userName: userName,
          normal: parsed.normal,
          encore: parsed.encore,
        });

        if (error) {
          console.error(`Error saving profile for ${userName}:`, error);
          failureDetails.push(`${userName} (DB Error: ${error})`);
          errorCount++;
        } else {
          successCount++;
        }
      }

      let replyDetails = `✅ **スキャン完了**\n` +
        `対象メッセージ: ${messages.length}件\n` +
        `🆕 登録/更新: **${successCount}**名\n` +
        `❌ エラー: ${errorCount}件\n` +
        `⏭️ 無視(Bot/形式不備): ${ignoredCount}件\n\n`;

      if (failureDetails.length > 0) {
        replyDetails += `⚠️ **DB登録エラー**: ${failureDetails.join(', ')}\n`;
      }
      
      if (parseFailures.length > 0) {
        replyDetails += `⚠️ **形式不備でスキップ**: ${parseFailures.join(', ')}\n`;
      }
      
      // 文字数制限対策
      if (replyDetails.length > 1900) {
          replyDetails = replyDetails.substring(0, 1900) + '...(省略されました)';
      }

      await interaction.editReply(replyDetails);

    } catch (error) {
      console.error('Scan Error:', error);
      await interaction.editReply(`❌ スキャン中にエラーが発生しました: ${error instanceof Error ? error.message : 'Unknown'}`);
    }
  },
};

export default profileScan;
