import { TimeSlot, ColumnLayout } from '@/types';

/**
 * 連続参加者を同じ列に配置するアルゴリズム
 */
export function arrangeColumns(slots: TimeSlot[]): ColumnLayout[] {
  // 各ユーザーの参加時間帯を記録
  const userParticipation = new Map<string, number[]>();

  slots.forEach((slot, index) => {
    slot.participants.forEach(participant => {
      if (!userParticipation.has(participant)) {
        userParticipation.set(participant, []);
      }
      userParticipation.get(participant)!.push(index);
    });
  });

  // 列ごとの配置（最大4列）
  const layouts: ColumnLayout[] = [];

  slots.forEach((slot, slotIndex) => {
    const columns: (string | null)[] = [null, null, null, null];
    const assigned = new Set<string>();

    // リアクション時刻順でソート
    const sortedParticipants = slot.participants.sort((a, b) => {
      const timeA = slot.reactionTimes.get(a) || 0;
      const timeB = slot.reactionTimes.get(b) || 0;
      return timeA - timeB;
    });

    // 各参加者を配置
    sortedParticipants.forEach(participant => {
      if (assigned.has(participant)) return;

      // この参加者が参加している時間帯
      const participatingSlots = userParticipation.get(participant) || [];

      // 連続性を考慮して最適な列を見つける
      let bestColumn = -1;
      let maxContinuity = 0;

      for (let col = 0; col < 4; col++) {
        if (columns[col] !== null) continue;

        // この列での連続性をチェック
        let continuity = 0;

        // 前の時間帯をチェック
        for (let i = slotIndex - 1; i >= 0; i--) {
          if (layouts[i] && layouts[i].columns[col] === participant) {
            continuity++;
          } else {
            break;
          }
        }

        // 後の時間帯をチェック（暫定的に）
        // ※実際には後の時間帯はまだ配置されていないので、参加予定かだけチェック
        if (participatingSlots.includes(slotIndex + 1)) {
          continuity += 0.5; // ボーナス
        }

        if (continuity > maxContinuity) {
          maxContinuity = continuity;
          bestColumn = col;
        }
      }

      // 列が見つからない場合は最初の空き列
      if (bestColumn === -1) {
        bestColumn = columns.findIndex(col => col === null);
      }

      // 配置
      if (bestColumn !== -1 && bestColumn < 4) {
        columns[bestColumn] = participant;
        assigned.add(participant);
      }
    });

    layouts.push({
      time: slot.time,
      runner: slot.runner,
      columns,
      isEmpty: false,
    });
  });

  return layouts;
}

/**
 * 時間範囲内の空き時間を検出
 */
export function fillEmptySlots(layouts: ColumnLayout[]): ColumnLayout[] {
  if (layouts.length === 0) return [];

  // 最小時刻と最大時刻を取得
  const times = layouts.map(layout => {
    const [start] = layout.time.split('-').map(Number);
    return start;
  });

  const minTime = Math.min(...times);
  const maxTime = Math.max(...times.map((_, i) => {
    const [, end] = layouts[i].time.split('-').map(Number);
    return end;
  }));

  // 全時間帯のマップ
  const timeMap = new Map<string, ColumnLayout>();
  layouts.forEach(layout => {
    timeMap.set(layout.time, layout);
  });

  // 空き時間を埋める
  const result: ColumnLayout[] = [];
  for (let hour = minTime; hour < maxTime; hour++) {
    const timeKey = `${hour}-${hour + 1}`;
    
    if (timeMap.has(timeKey)) {
      result.push(timeMap.get(timeKey)!);
    } else {
      // 空き時間を追加
      // 前後のランナー情報を取得
      let runner = '';
      
      // 直前の時間帯からランナーを取得
      const prevTimeKey = `${hour - 1}-${hour}`;
      if (timeMap.has(prevTimeKey)) {
        runner = timeMap.get(prevTimeKey)!.runner;
      } else {
        // 直後の時間帯からランナーを取得
        const nextTimeKey = `${hour + 1}-${hour + 2}`;
        if (timeMap.has(nextTimeKey)) {
          runner = timeMap.get(nextTimeKey)!.runner;
        }
      }
      
      result.push({
        time: timeKey,
        runner,
        columns: [null, null, null, null],
        isEmpty: true,
      });
    }
  }

  return result;
}
