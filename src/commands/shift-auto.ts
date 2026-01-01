import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  ChannelType,
  AttachmentBuilder,
  Guild,
  TextBasedChannel,
} from 'discord.js';
import { Command, ColumnLayout } from '@/types';
import { AIScheduler, ShiftCandidate, ScheduledSlot } from '@/services/AIScheduler';
import { FormationService } from '@/services/FormationService';
import { generateShiftImage } from '@/utils/shiftImageGenerator';
import { extractDateFromChannelName, parseTimeRange } from '@/utils/dateUtils';
import { supabase } from '@/lib/supabaseClient';

const shiftAuto: Command = {
  data: new SlashCommandBuilder()
    .setName('shift-auto')
    .setDescription('AIを使用してシフトを自動生成します')
    .addChannelOption(option =>
      option
        .setName('channel')
        .setDescription('希望提出チャンネル')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('runner')
        .setDescription('ランナー名（ヘッダー用）')
        .setRequired(true)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) {
      await interaction.reply({ content: 'サーバー内でのみ使用できます。', ephemeral: true });
      return;
    }
    
    // DB接続チェック
    if (!supabase) {
      await interaction.reply({ content: '❌ データベースが設定されていません。', ephemeral: true });
      return;
    }

    await interaction.deferReply();

    try {
      const channel = interaction.options.getChannel('channel', true);
      const runnerName = interaction.options.getString('runner', true);

      // 1. メッセージ取得 & 候補者リスト作成
      const candidates = await fetchCandidates(channel as TextBasedChannel, interaction.guild);

      if (candidates.length === 0) {
        await interaction.editReply('❌ シフト希望が見つかりませんでした。');
        return;
      }

      await interaction.editReply(`🤖 ${candidates.length}名の希望を確認しました。AIがシフトを構成中...`);

      // 2. AIスケジューリング
      const dateStr = extractDateFromChannelName(channel.name ?? '') || '日付不明';
      const scheduler = new AIScheduler();
      const result = await scheduler.generateSchedule(candidates, dateStr);

      // 3. レイアウト変換
      const layouts = convertScheduleToLayouts(result.schedule, runnerName);

      // 4. 画像生成
      await interaction.editReply('🎨 画像を生成中...');
      const buffer = await generateShiftImage(dateStr, layouts);

      const attachment = new AttachmentBuilder(buffer, {
        name: `shift_ai_${dateStr.replace(/\//g, '-')}.png`,
      });

      await interaction.editReply({
        content: `✅ AIシフト生成完了！\n💡 **AIのコメント**: ${result.reasoning}`,
        files: [attachment],
      });

    } catch (error) {
      console.error('Shift Auto Error:', error);
      await interaction.editReply(`❌ エラー: ${error instanceof Error ? error.message : 'Unknown Error'}`);
    }
  },
};

// --- Helpers ---

async function fetchCandidates(channel: TextBasedChannel, guild: Guild): Promise<ShiftCandidate[]> {
  const messages = await channel.messages.fetch({ limit: 100 });
  const userIds = new Set<string>();
  const requestMap = new Map<string, string>(); // userId -> timeRequest

  // メッセージ解析 (10-14 形式を含むものを抽出)
  for (const [, msg] of messages) {
    if (msg.author.bot) continue;
    
    // 簡易的な時間抽出 (10-14, 10-14,18-22 など)
    // 厳密なパースはAIが行うため、ここでは「数字-数字」が含まれているかだけで候補とする
    if (/\d{1,2}-\d{1,2}/.test(msg.content)) {
      userIds.add(msg.author.id);
      // 複数リクエストがある場合は最新を優先するか結合するか...今回は単純にコンテンツ全体を渡す
      requestMap.set(msg.author.id, msg.content);
    }
  }

  if (userIds.size === 0) return [];

  // DBからプロフィール取得
  const profiles = await FormationService.getProfiles(guild.id, Array.from(userIds));
  const profileMap = new Map(profiles.map(p => [p.user_id, p]));

  // アンコールロール確認
  let encoreRoleId: string | null = null;
  const { data: config } = await supabase!
    .from('guild_configs')
    .select('encore_role_id')
    .eq('guild_id', guild.id)
    .single();
  
  if (config) encoreRoleId = config.encore_role_id;

  const candidates: ShiftCandidate[] = [];

  for (const userId of userIds) {
    const member = await guild.members.fetch(userId).catch(() => null);
    if (!member) continue;

    const profile = profileMap.get(userId);
    const hasEncoreRole = encoreRoleId ? member.roles.cache.has(encoreRoleId) : false;

    candidates.push({
      userId: userId,
      userName: member.displayName,
      normalEffective: profile?.normal_effective || 0,
      encoreEffective: profile?.encore_effective || 0,
      hasEncoreRole: hasEncoreRole,
      timeRequest: requestMap.get(userId) || '',
    });
  }

  return candidates;
}

function convertScheduleToLayouts(schedule: ScheduledSlot[], runnerName: string): ColumnLayout[] {
  // 時間ごとにスロットをまとめる
  const hourMap = new Map<number, ScheduledSlot[]>();

  for (const slot of schedule) {
    // "10-11" -> start 10
    const startHour = parseInt(slot.time.split('-')[0]);
    if (isNaN(startHour)) continue;

    if (!hourMap.has(startHour)) {
      hourMap.set(startHour, []);
    }
    hourMap.get(startHour)!.push(slot);
  }

  // ColumnLayoutに変換
  const layouts: ColumnLayout[] = [];
  const hours = Array.from(hourMap.keys()).sort((a, b) => a - b);

  for (const h of hours) {
    const slots = hourMap.get(h)!;
    
    const encore = slots.find(s => s.role === 'encore');
    const supports = slots.filter(s => s.role === 'support');
    const standby = slots.find(s => s.role === 'standby');

    // 支援枠は必ず3つ
    const supportNames: (string | null)[] = [];
    for (let i = 0; i < 3; i++) {
        supportNames.push(supports[i] ? removeEmojis(supports[i].userName) : null);
    }

    layouts.push({
      time: `${h}-${h+1}`,
      runner: removeEmojis(runnerName), // コマンド引数のランナーを使用
      encore: encore ? removeEmojis(encore.userName) : null,
      supports: supportNames,
      standby: standby ? removeEmojis(standby.userName) : null,
      isEmpty: false,
    });
  }

  return layouts;
}

/**
 * 文字列から絵文字を除去する
 */
function removeEmojis(text: string): string {
  if (!text) return '';
  // Unicode絵文字範囲の簡易的な除去
  return text
    .replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '')
    .trim() || text; // 全て消えてしまった場合は元のテキストを返す（フォールバック）
}

export default shiftAuto;
