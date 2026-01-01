import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  ChannelType,
  Message,
  AttachmentBuilder,
} from 'discord.js';
import { Command, TimeSlot } from '@/types';
import { extractDateFromChannelName, parseTimeRange } from '@/utils/dateUtils';
import { arrangeColumns, fillEmptySlots } from '@/utils/shiftProcessor';
import { generateReactionShiftImage } from '@/utils/reactionShiftImageGenerator';
import { assignHighlightColors } from '@/utils/shiftLogic';

/**
 * /shift-create コマンド
 * リアクションベースでシフト表を作成
 */
const shiftCreate: Command = {
  data: new SlashCommandBuilder()
    .setName('shift-create')
    .setDescription('リアクションからシフト表を作成します')
    .addChannelOption(option =>
      option
        .setName('channel')
        .setDescription('対象のチャンネル')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    try {
      // チャンネルを取得
      const channelOption = interaction.options.getChannel('channel', true);

      // 実際のチャンネルオブジェクトを取得
      const channel = await interaction.guild?.channels.fetch(channelOption.id);
      
      if (!channel || channel.type !== ChannelType.GuildText) {
        await interaction.editReply('テキストチャンネルを指定してください。');
        return;
      }

      // チャンネル名から日付を抽出
      const date = extractDateFromChannelName(channel.name);
      if (!date) {
        await interaction.editReply(
          `チャンネル名から日付を抽出できませんでした。\nチャンネル名に「X月Y日」の形式を含めてください。\n例: #3月30日`
        );
        return;
      }

      // メッセージを取得
      await interaction.editReply('メッセージを収集中...');
      const messages = await channel.messages.fetch({ limit: 100 });

      // XX-YY 形式のメッセージを抽出
      const timeSlots: TimeSlot[] = [];

      for (const [, message] of messages) {
        const content = message.content.trim();
        const timeRange = parseTimeRange(content);

        if (!timeRange) continue;

        // ランナー（投稿者）のサーバー表示名を取得
        const runnerMember = await interaction.guild?.members.fetch(message.author.id);
        const runner = runnerMember?.displayName || message.author.username;

        // リアクションを収集
        const reactionTimes = new Map<string, number>();
        const participants: string[] = [];
        let targetEmoji: string | null = null;

        // 最初のリアクション（ランナーがつけた絵文字）を特定
        for (const [, reaction] of message.reactions.cache) {
          const users = await reaction.users.fetch();
          
          // ランナーがこの絵文字にリアクションしているか
          if (users.has(message.author.id)) {
            targetEmoji = reaction.emoji.name || reaction.emoji.id || '';
            
            // このリアクションのユーザーを収集
            for (const [, user] of users) {
              if (user.bot) continue;
              if (user.id === message.author.id) continue; // ランナー自身は除外

              // サーバー表示名を取得
              const member = await interaction.guild?.members.fetch(user.id);
              const displayName = member?.displayName || user.username;
              participants.push(displayName);

              // リアクション時刻を取得（メッセージ作成時刻を基準に推定）
              // 注: Discord APIではリアクション時刻を直接取得できないため、
              // ここでは便宜上メッセージ作成時刻からの経過を使用
              reactionTimes.set(displayName, message.createdTimestamp);
            }
            
            break; // 最初の1つだけ
          }
        }

        if (!targetEmoji) {
          // ランナーがリアクションしていない場合はスキップ
          continue;
        }

        timeSlots.push({
          time: `${timeRange.start}-${timeRange.end}`,
          startHour: timeRange.start,
          endHour: timeRange.end,
          runner,
          participants,
          emoji: targetEmoji,
          reactionTimes,
        });
      }

      if (timeSlots.length === 0) {
        await interaction.editReply(
          'シフト対象のメッセージが見つかりませんでした。\n「XX-YY」形式のメッセージを投稿し、リアクションをつけてください。'
        );
        return;
      }

      // 時間順にソート
      timeSlots.sort((a, b) => a.startHour - b.startHour);

      // 列配置を計算
      await interaction.editReply('シフトを計算中...');
      let layouts = arrangeColumns(timeSlots);

      // 空き時間を埋める
      layouts = fillEmptySlots(layouts);

      // ハイライト色の計算 (飛び石・ギャップ検出)
      // データ形式: [runner, encore, sup1, sup2, sup3]
      const highlightData = layouts.map(layout => [
        layout.runner,
        layout.encore,
        layout.supports[0],
        layout.supports[1],
        layout.supports[2]
      ]);
      
      const emptyRows = layouts.map(layout => layout.isEmpty || false);

      // assignHighlightColors(values, targetCols, emptyRows)
      // targetCols: 0(Runner), 1(Encore), 2,3,4(Supports) -> All
      const highlightColors = assignHighlightColors(highlightData, undefined, emptyRows);

      // 画像を生成
      await interaction.editReply('画像を生成中...');
      const imageBuffer = await generateReactionShiftImage(date, layouts, highlightColors);

      // 画像を送信
      const attachment = new AttachmentBuilder(imageBuffer, {
        name: `shift_${date.replace(/\//g, '-')}.png`,
      });

      await interaction.editReply({
        content: `✅ シフト表を作成しました！${date}`,
        files: [attachment],
      });
    } catch (error) {
      console.error('シフト作成エラー:', error);
      await interaction.editReply(
        `❌ エラーが発生しました: ${error instanceof Error ? error.message : '不明なエラー'}`
      );
    }
  },
};

export default shiftCreate;
