import { createCanvas, GlobalFonts, CanvasRenderingContext2D } from '@napi-rs/canvas';
import { ColumnLayout } from '@/types';

// フォント登録 (日本語対応)
try {
  GlobalFonts.registerFromPath('/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc', 'NotoSansCJK');
} catch (e) {
  console.warn('Font registration failed:', e);
}

// 色定義
const COLORS = {
  headerBg: '#FFCCBC', // 1枠（ランナー）
  headerTimeBg: '#FFDAB9', // 時間
  headerSupportBg: '#FFFFFF', // 参加者 (2-5枠)
  border: '#000000',
  text: '#000000',
  
  // セル背景
  cellRunner: '#FFFFFF', // デフォルトは白 (ハイライト時のみ色が付く) 
  cellSupport: '#FFFFFF', // 参加者全員この色（旧アンコール色などもこれに統一）
  cellTime: '#FFFFFF',
};

const CONFIG = {
  width: 1000, 
  rowHeight: 40,
  headerHeight: 60,
  fontSize: 20,
  fontFamily: '"Noto Sans CJK JP", sans-serif',
};

// カラム幅設定
// Time(80) + Runner(160) + Member1(160) + Member2(160) + Member3(160) + Member4(160) = 880 + margins
const COL_WIDTHS = {
  time: 80,
  runner: 160,
  member: 160, 
};

export async function generateReactionShiftImage(
  title: string,
  layouts: ColumnLayout[],
  highlightColors?: string[][] // オプションでハイライト色を受け取る
): Promise<Buffer> {
  // カラム数: Time(1) + Runner(1) + Members(4) + Time(1) = 7カラム
  // 時間(80) + Runner(160) + Members(160*4=640) + Time(80) = 960 width.
  const drawingWidth = 40 + COL_WIDTHS.time + COL_WIDTHS.runner + (COL_WIDTHS.member * 4) + COL_WIDTHS.time + 40;
  const height = CONFIG.headerHeight + (layouts.length * CONFIG.rowHeight) + 50;

  const canvas = createCanvas(drawingWidth, height);
  const ctx = canvas.getContext('2d');

  // 背景白
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, drawingWidth, height);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `bold 24px ${CONFIG.fontFamily}`;
  ctx.fillStyle = COLORS.text;

  // タイトル描画
  ctx.fillText(title, drawingWidth / 2, 30);

  // テーブル開始位置
  const startY = 50;
  let currentY = startY;
  let currentX = 40; // 左マージン

  // --- ヘッダー描画 ---
  ctx.lineWidth = 1;
  ctx.strokeStyle = COLORS.border;

  // 1. Time (Left)
  drawHeaderCell(ctx, '時間', currentX, currentY, COL_WIDTHS.time, COLORS.headerTimeBg);
  currentX += COL_WIDTHS.time;

  // 2. Runner
  drawHeaderCell(ctx, '1枠', currentX, currentY, COL_WIDTHS.runner, COLORS.headerBg);
  currentX += COL_WIDTHS.runner;

  // 3-6. Members (Combined Header)
  const membersWidth = COL_WIDTHS.member * 4;
  drawHeaderCell(ctx, '2-5枠 順不同', currentX, currentY, membersWidth, COLORS.headerSupportBg);
  currentX += membersWidth;

  // 7. Time (Right)
  drawHeaderCell(ctx, '時間', currentX, currentY, COL_WIDTHS.time, COLORS.headerTimeBg);
  
  currentY += CONFIG.headerHeight;

  // --- データ行描画 ---
  layouts.forEach((row, rowIndex) => {
    currentX = 40;
    const rowH = CONFIG.rowHeight;

    // データ準備
    // Encore枠もMemberとして扱う
    const members = [
      row.encore,
      row.supports[0],
      row.supports[1],
      row.supports[2]
    ];

    // ハイライト色の取得 (rowIndex行目)
    // index 0: Runner, index 1..4: Members
    const rowColors = highlightColors ? highlightColors[rowIndex] : [];

    // --- 1. Time (Left) ---
    drawCell(ctx, row.time, currentX, currentY, COL_WIDTHS.time, row.isEmpty ? '#D3D3D3' : COLORS.cellTime);
    currentX += COL_WIDTHS.time;

    // --- 2. Runner ---
    // Color Priority: Highlight > EmptyGray > Standard
    let runnerBg = COLORS.cellRunner;
    if (row.isEmpty) runnerBg = '#D3D3D3';
    else if (rowColors && rowColors[0]) runnerBg = rowColors[0];
    
    drawCell(ctx, row.runner, currentX, currentY, COL_WIDTHS.runner, runnerBg);
    currentX += COL_WIDTHS.runner;

    // --- 3-6. Members ---
    members.forEach((member, i) => {
      let memberBg = COLORS.cellSupport;
      if (row.isEmpty) memberBg = '#D3D3D3';
      else if (rowColors && rowColors[i + 1]) memberBg = rowColors[i + 1];

      drawCell(ctx, member, currentX, currentY, COL_WIDTHS.member, memberBg);
      currentX += COL_WIDTHS.member;
    });

    // --- 7. Time (Right) ---
    drawCell(ctx, row.time, currentX, currentY, COL_WIDTHS.time, row.isEmpty ? '#D3D3D3' : COLORS.cellTime);
    
    currentY += rowH;
  });

  return canvas.toBuffer('image/png');
}

function drawFitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  maxFontSize: number
) {
  if (!text) return;

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

function drawCell(
  ctx: CanvasRenderingContext2D,
  text: string | null | undefined,
  x: number,
  y: number,
  w: number,
  bg: string
) {
  ctx.fillStyle = bg;
  ctx.fillRect(x, y, w, CONFIG.rowHeight);
  ctx.strokeRect(x, y, w, CONFIG.rowHeight);
  
  if (text) {
    ctx.fillStyle = COLORS.text;
    drawFitText(ctx, text, x + w / 2, y + CONFIG.rowHeight / 2, w - 10, CONFIG.fontSize);
  }
}
