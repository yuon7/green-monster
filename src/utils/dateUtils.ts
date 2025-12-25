/**
 * 日付関連のユーティリティ関数
 */

/**
 * チャンネル名から日付を抽出
 * 例: "#3月30日", "#3/30", "#3／30", "#3月30日(日)", "#3/30(日)" など
 */
export function extractDateFromChannelName(channelName: string): string | null {
  // 複数のパターンに対応
  // 1. "X月Y日" または "XX月YY日" の形式（曜日あり/なし）
  // 2. "X/Y" または "XX/YY" の形式（半角スラッシュ、曜日あり/なし）
  // 3. "X／Y" または "XX／YY" の形式（全角スラッシュ、曜日あり/なし）
  
  const patterns = [
    /(\d{1,2})月(\d{1,2})日(?:\(.\))?/,  // 3月30日 or 3月30日(日)
    /(\d{1,2})\/(\d{1,2})(?:\(.\))?/,   // 3/30 or 3/30(日)
    /(\d{1,2})／(\d{1,2})(?:\(.\))?/,   // 3／30 or 3／30(日) (全角)
  ];

  let month: number | null = null;
  let day: number | null = null;

  // いずれかのパターンにマッチするか試す
  for (const pattern of patterns) {
    const match = channelName.match(pattern);
    if (match) {
      month = parseInt(match[1], 10);
      day = parseInt(match[2], 10);
      break;
    }
  }

  if (month === null || day === null) {
    return null;
  }

  // 現在の年を取得（年跨ぎの考慮）
  const now = new Date();
  let year = now.getFullYear();
  
  // 月が現在より小さい場合、来年の日付と判断
  if (month < now.getMonth() + 1) {
    year += 1;
  }

  // 日付オブジェクトを作成
  const date = new Date(year, month - 1, day);

  // 曜日を取得
  const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
  const weekday = weekdays[date.getDay()];

  // "MM/DD(曜)" 形式にフォーマット
  const formattedMonth = String(month).padStart(2, '0');
  const formattedDay = String(day).padStart(2, '0');

  return `${formattedMonth}/${formattedDay}(${weekday})`;
}

/**
 * "XX-YY" 形式の時間範囲をパース
 */
export function parseTimeRange(timeString: string): { start: number; end: number } | null {
  const match = timeString.match(/^(\d{1,2})-(\d{1,2})$/);
  
  if (!match) {
    return null;
  }

  const start = parseInt(match[1], 10);
  const end = parseInt(match[2], 10);

  if (start < 0 || start > 23 || end < 0 || end > 24 || start >= end) {
    return null;
  }

  return { start, end };
}
