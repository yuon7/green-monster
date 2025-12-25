/**
 * シフト作成機能の型定義
 */

/**
 * 時間枠データ
 */
export interface TimeSlot {
  /** 時間範囲（例: "10-11"） */
  time: string;
  /** 開始時刻（時） */
  startHour: number;
  /** 終了時刻（時） */
  endHour: number;
  /** ランナー名（メッセージ投稿者） */
  runner: string;
  /** 参加者のユーザー名リスト */
  participants: string[];
  /** ランナーが指定した絵文字 */
  emoji: string;
  /** リアクション時刻のマップ（ユーザー名 → タイムスタンプ） */
  reactionTimes: Map<string, number>;
}

/**
 * シフト全体のデータ
 */
export interface ShiftData {
  /** 日付（例: "03/30(日)"） */
  date: string;
  /** 時間枠の配列 */
  slots: TimeSlot[];
}

/**
 * 列配置された参加者データ
 */
export interface ColumnLayout {
  /** 時間範囲 */
  time: string;
  /** ランナー名 */
  runner: string;
  /** 各列の参加者（最大4列） */
  columns: (string | null)[];
  /** 空き枠かどうか */
  isEmpty: boolean;
}
