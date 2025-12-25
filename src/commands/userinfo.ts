import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { Command } from '@/types';

/**
 * /userinfo コマンド
 * ユーザーの情報を表示する
 */
const userinfo: Command = {
  data: new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('ユーザーの情報を表示します')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('情報を表示するユーザー（省略すると自分）')
        .setRequired(false)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    // オプションからユーザーを取得、なければコマンド実行者
    const user = interaction.options.getUser('user') || interaction.user;
    const member = interaction.guild?.members.cache.get(user.id);

    // Embedを作成
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(`${user.tag} のユーザー情報`)
      .setThumbnail(user.displayAvatarURL({ size: 256 }))
      .addFields(
        { name: 'ユーザー名', value: user.username, inline: true },
        { name: 'ID', value: user.id, inline: true },
        {
          name: 'アカウント作成日',
          value: `<t:${Math.floor(user.createdTimestamp / 1000)}:D>`,
          inline: false,
        }
      );

    // サーバーメンバー情報があれば追加
    if (member) {
      embed.addFields(
        {
          name: 'サーバーでの表示名',
          value: member.displayName,
          inline: true,
        },
        {
          name: 'サーバー参加日',
          value: member.joinedAt
            ? `<t:${Math.floor(member.joinedAt.getTime() / 1000)}:D>`
            : '不明',
          inline: false,
        }
      );

      const roles = member.roles.cache
        .filter(role => role.id !== interaction.guild?.id)
        .map(role => role.toString())
        .slice(0, 10);

      if (roles.length > 0) {
        embed.addFields({
          name: `ロール (${roles.length})`,
          value: roles.join(', '),
          inline: false,
        });
      }
    }

    embed.setFooter({ text: `リクエスト: ${interaction.user.tag}` });
    embed.setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};

export default userinfo;
