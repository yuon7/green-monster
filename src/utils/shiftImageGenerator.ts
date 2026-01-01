import { createCanvas, GlobalFonts, CanvasRenderingContext2D } from '@napi-rs/canvas';
import { ColumnLayout } from '@/types';
import path from 'path';

// フォント登録 (日本語対応)
// フォント登録 (日本語対応)
try {
  // 複数のパス候補を試す (ローカル開発環境 vs ビルド後環境)
  // フォントファイル単体ではなく、ディレクトリを探して中身を全て登録する
  const pathsToTry = [
    path.join(__dirname, '../assets/fonts'),        // dist/utils -> dist/assets/fonts
    path.join(__dirname, '../../assets/fonts'),     // dist/lib/.. -> dist/assets/fonts (fallback)
    path.join(process.cwd(), 'dist/assets/fonts'),  // Absolute from CWD
    path.join(process.cwd(), 'src/assets/fonts'),   // Local dev
  ];

  let registeredCount = 0;
  for (const dirPath of pathsToTry) {
    if (require('fs').existsSync(dirPath)) {
      console.log(`[Font] Found font directory: ${dirPath}`);
      const files = require('fs').readdirSync(dirPath);
      
      for (const file of files) {
        if (file.endsWith('.otf') || file.endsWith('.ttf') || file.endsWith('.ttc')) {
          const fullPath = path.join(dirPath, file);
          console.log(`[Font] Registering: ${file}`);
          GlobalFonts.registerFromPath(fullPath, 'NotoSansJP');
          registeredCount++;
        }
      }
      
      if (registeredCount > 0) {
        console.log(`[Font] Successfully registered ${registeredCount} fonts from ${dirPath}`);
        // 登録されているフォントファミリー名を全てログに出力して確認
        const families = GlobalFonts.families;
        console.log('[Font] Available Font Families:', JSON.stringify(families.map(f => f.family)));
        break; // 1つのディレクトリから読み込めればOK
      }
    }
  }

  if (registeredCount === 0) {
    console.error(`[Font] FAILED to find any font files. Searched in:`, pathsToTry);
  }
} catch (e) {
  console.error('[Font] Font registration CRITICAL failure:', e);
}

// 色定義
const COLORS = {
  headerBg: '#FFCCBC', // 1枠
  headerTimeBg: '#FFDAB9', // 時間
  headerEncoreBg: '#FFFACD', // アンコール
  headerSupportBg: '#FFFFFF', // 2-5枠 (順不同)
  border: '#000000',
  text: '#000000',
  
  // セル背景
  cellRunner: '#FFCCBC', 
  cellEncore: '#E0FFFF', 
  cellSupport: '#FFFFFF',
  cellStandby: '#F0F8FF',
  cellTime: '#FFFFFF',
};

const CONFIG = {
  width: 1200, 
  rowHeight: 40,
  headerHeight: 60,
  fontSize: 20,
  fontFamily: '"Noto Sans CJK JP", sans-serif', // フォント優先順位
};

// カラム幅調整
const ADJUSTED_COL_WIDTHS = [
  80,  // Time
  160, // Runner
  160, // Encore
  160, // Sup1
  160, // Sup2
  160, // Sup3
  80,  // Time
  160  // Standby
];

export async function generateShiftImage(
  title: string,
  layouts: ColumnLayout[]
): Promise<Buffer> {
  const width = 1200;
  const height = CONFIG.headerHeight + (layouts.length * CONFIG.rowHeight) + 50;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // 背景白
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `bold 24px ${CONFIG.fontFamily}`;
  ctx.fillStyle = COLORS.text;

  // タイトル描画
  ctx.fillText(title, width / 2, 30);

  // テーブル開始位置
  const startY = 50;
  let currentY = startY;

  // --- ヘッダー描画 ---
  // 特別な結合処理: Sup1, Sup2, Sup3 を "2-5枠 順不同" に結合
  
  let currentX = 40; // 左マージン
  ctx.lineWidth = 1;
  ctx.strokeStyle = COLORS.border;

  // 1. Time
  drawHeaderCell(ctx, '時間', currentX, currentY, ADJUSTED_COL_WIDTHS[0], COLORS.headerTimeBg);
  currentX += ADJUSTED_COL_WIDTHS[0];

  // 2. Runner
  drawHeaderCell(ctx, '1枠', currentX, currentY, ADJUSTED_COL_WIDTHS[1], COLORS.headerBg);
  currentX += ADJUSTED_COL_WIDTHS[1];

  // 3. Encore
  drawHeaderCell(ctx, 'アンコール', currentX, currentY, ADJUSTED_COL_WIDTHS[2], COLORS.headerEncoreBg);
  currentX += ADJUSTED_COL_WIDTHS[2];

  // 4,5,6. Support (Combined)
  const supportWidth = ADJUSTED_COL_WIDTHS[3] + ADJUSTED_COL_WIDTHS[4] + ADJUSTED_COL_WIDTHS[5];
  drawHeaderCell(ctx, '2-5枠 順不同', currentX, currentY, supportWidth, COLORS.headerSupportBg);
  currentX += supportWidth;

  // 7. Time
  drawHeaderCell(ctx, '時間', currentX, currentY, ADJUSTED_COL_WIDTHS[6], COLORS.headerTimeBg);
  currentX += ADJUSTED_COL_WIDTHS[6];

  // 8. Standby
  drawHeaderCell(ctx, '待機', currentX, currentY, ADJUSTED_COL_WIDTHS[7], COLORS.headerTimeBg);

  currentY += CONFIG.headerHeight;

  // --- データ行描画 ---
  for (const row of layouts) {
    currentX = 40;
    const rowH = CONFIG.rowHeight;

    // データ準備 (8カラム分)
    const rowData = [
      row.time,
      row.runner,
      row.encore,
      row.supports[0],
      row.supports[1],
      row.supports[2],
      row.time,
      row.standby
    ];

    const cellColors = [
       COLORS.cellTime,
       COLORS.cellRunner,
       COLORS.cellEncore,
       COLORS.cellSupport,
       COLORS.cellSupport,
       COLORS.cellSupport,
       COLORS.cellTime,
       COLORS.cellStandby
    ];

    for (let i = 0; i < 8; i++) {
      const w = ADJUSTED_COL_WIDTHS[i];
      const text = rowData[i] || ''; // nullなら空文字

      // 背景
      ctx.fillStyle = cellColors[i];
      ctx.fillRect(currentX, currentY, w, rowH);
      ctx.strokeRect(currentX, currentY, w, rowH);

      // テキスト描画 (自動縮小)
      ctx.fillStyle = COLORS.text;
      drawFitText(ctx, text, currentX + w / 2, currentY + rowH / 2, w - 10, CONFIG.fontSize);

      currentX += w;
    }

    currentY += rowH;
  }

  return canvas.toBuffer('image/png');
}

/**
 * 枠内に収まるようにテキストを描画する
 */
function drawFitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  maxFontSize: number
) {
  let fontSize = maxFontSize;
  ctx.font = `${fontSize}px ${CONFIG.fontFamily}`;

  // 幅が収まるまでフォントサイズを小さくする
  while (ctx.measureText(text).width > maxWidth && fontSize > 8) {
    fontSize -= 1;
    ctx.font = `${fontSize}px ${CONFIG.fontFamily}`;
  }

  ctx.fillText(text, x, y);
}

function drawHeaderCell(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  w: number,
  bg: string
) {
  ctx.fillStyle = bg;
  ctx.fillRect(x, y, w, CONFIG.headerHeight);
  ctx.strokeRect(x, y, w, CONFIG.headerHeight);
  ctx.fillStyle = COLORS.text;
  ctx.font = `bold 18px ${CONFIG.fontFamily}`;
  ctx.fillText(text, x + w / 2, y + CONFIG.headerHeight / 2);
}
