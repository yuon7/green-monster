import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import { ColumnLayout } from '@/types';
import { alignDuplicateNames, assignHighlightColors } from '@/utils/shiftLogic';

/**
 * カラー設定（カスタマイズ可能）
 */
export const ShiftColors = {
  // 背景色
  background: '#ffffff',
  
  // 日付ヘッダー
  dateHeaderBg: '#ffffffff',      // 日付ヘッダー背景
  dateHeaderText: '#000000ff',    // 日付ヘッダーテキスト
  
  // カラムヘッダー（各カラムごとに設定可能）
  timeLeftHeaderBg: '#ffd5b8ff',    // 時間（左）カラムの背景
  slot1HeaderBg: '#ff9494ff',       // 1枠カラムの背景
  slots2to5HeaderBg: '#ffffffff',   // 2-5枠カラムの背景
  timeRightHeaderBg: '#ffd5b8ff',   // 時間（右）カラムの背景
  columnHeaderText: '#000000ff',    // カラムヘッダーテキスト
  
  // データセル
  dataCellBg: '#ffffff',        // 通常のデータセル背景
  dataCellText: '#000000',      // 通常のデータセルテキスト
  
  // 空き時間
  emptySlotBg: '#d9d9d9',       // 空き時間の背景（灰色）
  
  // 枠線
  border: '#000000',            // 枠線の色
  borderThick: '#000000',       // 外枠の色
};

/**
 * カラムヘッダーのテキスト（カスタマイズ可能）
 */
export const ShiftHeaders = {
  timeLeft: '時間',
  slot1: '1枠',
  slots2to5: '2-5枠 順不同',
  timeRight: '時間',
};

/**
 * シフト表の画像を生成
 */
export async function generateShiftImage(
  date: string,
  layouts: ColumnLayout[]
): Promise<Buffer> {
  // 日本語フォントを登録（WSL/Linux環境）
  try {
    // Noto Sans CJK JP を優先的に登録
    const fontPaths = [
      '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',
      '/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc',
      '/usr/share/fonts/opentype/noto/NotoSansJP-Regular.otf',
      '/usr/share/fonts/truetype/fonts-japanese-gothic.ttf',
      '/usr/share/fonts/truetype/takao-gothic/TakaoPGothic.ttf',
      '/usr/share/fonts/opentype/ipaexfont-gothic/ipaexg.ttf',
    ];

    let fontRegistered = false;
    for (const fontPath of fontPaths) {
      try {
        GlobalFonts.registerFromPath(fontPath, 'Japanese');
        console.log(`日本語フォントを登録: ${fontPath}`);
        fontRegistered = true;
        break;
      } catch (e) {
        // フォントが見つからない場合は次を試す
        continue;
      }
    }

    if (!fontRegistered) {
      console.warn('日本語フォントが見つかりませんでした。デフォルトフォントを使用します。');
    }
  } catch (error) {
    console.error('フォント登録エラー:', error);
  }

  // サイズ設定
  const cellWidth = 100;
  const cellHeight = 35;
  const headerHeight = 40;
  const dateHeaderHeight = 40;

  const cols = 7; // 時間 | 1枠 | 2-5枠(4列) | 時間
  const canvasWidth = cellWidth * cols;
  const canvasHeight = dateHeaderHeight + headerHeight + layouts.length * cellHeight;

  // Canvasを作成
  const canvas = createCanvas(canvasWidth, canvasHeight);
  const ctx = canvas.getContext('2d');

  // 背景を白で塗りつぶし
  ctx.fillStyle = ShiftColors.background;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // フォント設定（日本語対応）
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  let currentY = 0;

  // 1. 日付ヘッダー（全列結合）
  ctx.fillStyle = ShiftColors.dateHeaderBg;
  ctx.fillRect(0, currentY, canvasWidth, dateHeaderHeight);
  ctx.strokeStyle = ShiftColors.border;
  ctx.lineWidth = 1;
  ctx.strokeRect(0, currentY, canvasWidth, dateHeaderHeight);

  ctx.fillStyle = ShiftColors.dateHeaderText;
  ctx.font = 'bold 20px "Japanese", sans-serif';
  ctx.fillText(date, canvasWidth / 2, currentY + dateHeaderHeight / 2);

  currentY += dateHeaderHeight;

  // 2. カラムヘッダー
  ctx.font = 'bold 14px "Japanese", sans-serif';
  ctx.fillStyle = ShiftColors.columnHeaderText;
  ctx.strokeStyle = ShiftColors.border;

  let currentX = 0;

  // 時間（左）
  ctx.fillStyle = ShiftColors.timeLeftHeaderBg;
  ctx.fillRect(currentX, currentY, cellWidth, headerHeight);
  ctx.strokeRect(currentX, currentY, cellWidth, headerHeight);
  ctx.fillStyle = ShiftColors.columnHeaderText;
  ctx.fillText(ShiftHeaders.timeLeft, currentX + cellWidth / 2, currentY + headerHeight / 2);
  currentX += cellWidth;

  // 1枠
  ctx.fillStyle = ShiftColors.slot1HeaderBg;
  ctx.fillRect(currentX, currentY, cellWidth, headerHeight);
  ctx.strokeRect(currentX, currentY, cellWidth, headerHeight);
  ctx.fillStyle = ShiftColors.columnHeaderText;
  ctx.fillText(ShiftHeaders.slot1, currentX + cellWidth / 2, currentY + headerHeight / 2);
  currentX += cellWidth;

  // 2-5枠 順不同（4列結合）
  const mergedWidth = cellWidth * 4;
  ctx.fillStyle = ShiftColors.slots2to5HeaderBg;
  ctx.fillRect(currentX, currentY, mergedWidth, headerHeight);
  ctx.strokeRect(currentX, currentY, mergedWidth, headerHeight);
  ctx.fillStyle = ShiftColors.columnHeaderText;
  ctx.fillText(ShiftHeaders.slots2to5, currentX + mergedWidth / 2, currentY + headerHeight / 2);
  currentX += mergedWidth;

  // 時間（右）
  ctx.fillStyle = ShiftColors.timeRightHeaderBg;
  ctx.fillRect(currentX, currentY, cellWidth, headerHeight);
  ctx.strokeRect(currentX, currentY, cellWidth, headerHeight);
  ctx.fillStyle = ShiftColors.columnHeaderText;
  ctx.fillText(ShiftHeaders.timeRight, currentX + cellWidth / 2, currentY + headerHeight / 2);

  currentY += headerHeight;

  // 3. データ行
  ctx.font = '14px "Japanese", sans-serif';

  // --- ロジック統合: 名寄せとハイライト ---
  
  // 1. レイアウトから参加者マトリックス（2-5枠）を抽出
  // layout.columns が null/undefined の場合は空文字で埋める
  let participantMatrix: string[][] = layouts.map(l => {
    // 確実に4列にする
    const cols = l.columns || [];
    return Array.from({ length: 4 }, (_, i) => (cols[i] || ""));
  });

  // 2. 名寄せ（整列）を実行
  const alignedMatrix = alignDuplicateNames(participantMatrix);

  // レイアウトオブジェクト内のカラムを整列後のものに更新
  layouts.forEach((layout, i) => {
    if (!layout.isEmpty) {
        layout.columns = alignedMatrix[i];
    }
  });

  // 3. ハイライト色を計算
  const emptyRows = layouts.map(l => l.isEmpty);
  const colorMatrix = assignHighlightColors(alignedMatrix, undefined, emptyRows);

  layouts.forEach((layout, index) => {
    currentX = 0;

    if (layout.isEmpty) {
      // 空き時間の場合

      // 時間（左）- 白背景
      ctx.fillStyle = ShiftColors.dataCellBg;
      ctx.fillRect(currentX, currentY, cellWidth, cellHeight);
      ctx.fillStyle = ShiftColors.dataCellText;
      ctx.fillText(layout.time, currentX + cellWidth / 2, currentY + cellHeight / 2);
      ctx.strokeStyle = ShiftColors.border;
      ctx.strokeRect(currentX, currentY, cellWidth, cellHeight);
      currentX += cellWidth;

      // 1枠（ランナー）- 白背景
      ctx.fillStyle = ShiftColors.dataCellBg;
      ctx.fillRect(currentX, currentY, cellWidth, cellHeight);
      ctx.strokeRect(currentX, currentY, cellWidth, cellHeight);
      // ランナー名を表示
      if (layout.runner) {
        ctx.fillStyle = ShiftColors.dataCellText;
        ctx.fillText(layout.runner, currentX + cellWidth / 2, currentY + cellHeight / 2);
      }
      currentX += cellWidth;

      // 2-5枠 - 灰色背景（個別セルで描画）
      for (let i = 0; i < 4; i++) {
        ctx.fillStyle = ShiftColors.emptySlotBg;
        ctx.fillRect(currentX, currentY, cellWidth, cellHeight);
        ctx.strokeRect(currentX, currentY, cellWidth, cellHeight);
        currentX += cellWidth;
      }

      // 時間（右）- 白背景
      ctx.fillStyle = ShiftColors.dataCellBg;
      ctx.fillRect(currentX, currentY, cellWidth, cellHeight);
      ctx.fillStyle = ShiftColors.dataCellText;
      ctx.fillText(layout.time, currentX + cellWidth / 2, currentY + cellHeight / 2);
      ctx.strokeRect(currentX, currentY, cellWidth, cellHeight);
    } else {
      // 通常のデータ行
      ctx.fillStyle = ShiftColors.dataCellBg;

      // 時間（左）
      ctx.fillRect(currentX, currentY, cellWidth, cellHeight);
      ctx.fillStyle = ShiftColors.dataCellText;
      ctx.fillText(layout.time, currentX + cellWidth / 2, currentY + cellHeight / 2);
      ctx.strokeStyle = ShiftColors.border;
      ctx.strokeRect(currentX, currentY, cellWidth, cellHeight);
      currentX += cellWidth;

      // 1枠（ランナー）
      ctx.fillStyle = ShiftColors.dataCellBg;
      ctx.fillRect(currentX, currentY, cellWidth, cellHeight);
      ctx.fillStyle = ShiftColors.dataCellText;
      ctx.fillText(layout.runner, currentX + cellWidth / 2, currentY + cellHeight / 2);
      ctx.strokeRect(currentX, currentY, cellWidth, cellHeight);
      currentX += cellWidth;

      // 2-5枠
      layout.columns.forEach((participant, colIndex) => {
        // ハイライト色があれば適用、なければデフォルト背景
        const highlightColor = colorMatrix[index] && colorMatrix[index][colIndex] 
                               ? colorMatrix[index][colIndex] 
                               : ShiftColors.dataCellBg;

        ctx.fillStyle = highlightColor;
        ctx.fillRect(currentX, currentY, cellWidth, cellHeight);
        
        if (participant) {
          ctx.fillStyle = ShiftColors.dataCellText;
          ctx.fillText(participant, currentX + cellWidth / 2, currentY + cellHeight / 2);
        }
        
        ctx.strokeRect(currentX, currentY, cellWidth, cellHeight);
        currentX += cellWidth;
      });

      // 時間（右）
      ctx.fillStyle = ShiftColors.dataCellBg;
      ctx.fillRect(currentX, currentY, cellWidth, cellHeight);
      ctx.fillStyle = ShiftColors.dataCellText;
      ctx.fillText(layout.time, currentX + cellWidth / 2, currentY + cellHeight / 2);
      ctx.strokeRect(currentX, currentY, cellWidth, cellHeight);
    }

    currentY += cellHeight;
  });

  // 外枠を強調
  ctx.strokeStyle = ShiftColors.borderThick;
  ctx.lineWidth = 2;
  ctx.strokeRect(0, 0, canvasWidth, canvasHeight);

  // PNG形式でバッファを返す
  return canvas.toBuffer('image/png');
}
