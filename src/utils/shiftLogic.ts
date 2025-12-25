
/**
 * 以前の行（上の行）の列位置に合わせて、重複する名前を並び替えます。
 * GASの 'alignDuplicateNames' ロジックを移植したものです。
 * @param data 値の2次元配列（行データの配列）
 * @returns ソートされた2次元配列（新しいコピー）
 */
export function alignDuplicateNames(data: any[][]): any[][] {
  const sortData = data.map((row) => [...row]); // ミューテーションを避けるために複製
  const numRows = sortData.length;
  if (numRows === 0) return sortData;
  const numCols = sortData[0].length;

  for (let row = 0; row < numRows - 1; row++) {
    const currentRow = sortData[row];
    const nextRow = sortData[row + 1];

    for (let col = 0; col < numCols; col++) {
      const currentVal = currentRow[col];

      // 現在の値が次の行に存在し、かつ同じ列インデックスにない場合...
      // (厳密なチェック: nextRow[col] が既に同じ値でないことも確認)
      if (
        currentVal &&
        nextRow.includes(currentVal) &&
        nextRow[col] !== currentVal
      ) {
        const targetIndex = nextRow.indexOf(currentVal);
        
        // 次の行の値を入れ替え（スワップ）
        const temp = nextRow[col];
        nextRow[col] = currentVal;
        nextRow[targetIndex] = temp;
      }
    }
  }
  return sortData;
}

/**
 * 全角英数→半角英数、全角/半角区切りを正規化
 */
export function normalizeTimeString(s: any): string {
  if (typeof s !== "string") s = String(s ?? "");
  // 全角数字/記号→半角
  const toHalf = s.replace(/[！-～]/g, (ch: string) => // Type annotation added for safe regex callback
    String.fromCharCode(ch.charCodeAt(0) - 0xfee0)
  );
  // 区切りの正規化：範囲記号をすべて '-' に、複数区切りを ',' に
  const normalized = toHalf
    .replace(/[~〜～─－–—―‾➙]/g, "-") // 全チルダ/ダッシュ類 → '-'
    .replace(/[，、]/g, ",") // 全角カンマ/読点 → ','
    .replace(/\s/g, ""); // 全空白除去
  return normalized;
}

/**
 * "10-12,15-18" → [[10,12],[15,18]]（終了は含まない）
 */
export function parseIntervals(text: string): [number, number][] {
  const s = normalizeTimeString(text);
  if (!s) return [];
  const chunks = s.split(",");
  const intervals: [number, number][] = [];
  for (const c of chunks) {
    if (!c) continue;
    const parts = c.split("-");
    if (parts.length !== 2) continue;
    const start = parseInt(parts[0], 10);
    const end = parseInt(parts[1], 10);
    // 0~24時の範囲で、開始 < 終了 の場合のみ有効
    if (
      Number.isFinite(start) &&
      Number.isFinite(end) &&
      0 <= start &&
      start < end &&
      end <= 24
    ) {
      intervals.push([start, end]);
    }
  }
  // 開始時間でソート
  intervals.sort((a, b) => a[0] - b[0]);
  return intervals;
}

/**
 * 飛び石シフト（隙間時間があるか）を判定
 * 例: "10-12,13-15" -> 12!=13 なので True
 * 例: "10-12,12-14" -> 連続なので False
 */
export function hasGapShift(intervals: [number, number][]): boolean {
  if (intervals.length <= 1) return false;
  for (let i = 0; i < intervals.length - 1; i++) {
    const currentEnd = intervals[i][1];
    const nextStart = intervals[i + 1][0];
    if (currentEnd < nextStart) {
      return true; // 隙間あり
    }
  }
  return false;
}

/**
 * グループの変更やジャンプ（飛び地）に基づいて、ユーザーにハイライト色を割り当てます。
 * GASの 'highlightUsers' ロジックを移植・汎用化したものです。
 *
 * @param values 値の2次元配列（名前データ）
 * @param targetCols (オプション) チェック対象とする列インデックスの配列。指定がない場合は全ての列を対象とします。
 * @param timeStrings (オプション) 各行に対応する時間文字列の配列（例: ["10-12", "10-12,13-15", ...]）。指定がある場合、飛び石シフトの行のユーザーもハイライト対象となります。
 * @returns 16進数カラーコード文字列の2次元配列（色がない場合は空文字）
 */
/**
 * グループの変更やジャンプ（飛び地）に基づいて、ユーザーにハイライト色を割り当てます。
 * GASの 'highlightUsers' ロジックを移植・汎用化したものです。
 *
 * ハイライト条件:
 * 1. (Column Change) 前の行と比べて、所属する列グループが変化した（移動した）場合
 * 2. (Gap Shift) 勤務時間が連続していない（行番号が飛んでいる）場合
 *    ただし、間の行が「募集なし（emptyRows=true）」のみで構成されている場合はGapとみなさない。
 *
 * @param values 値の2次元配列（名前データ）
 * @param targetCols (オプション) チェック対象とする列インデックスの配列。指定がない場合は全ての列を対象とします。
 * @param emptyRows (オプション) 各行が「募集なし/空き時間」かどうかを示す配列。
 * @returns 16進数カラーコード文字列の2次元配列（色がない場合は空文字）
 */
export function assignHighlightColors(
  values: any[][],
  targetCols?: number[],
  emptyRows?: boolean[]
): string[][] {
  const rows = values.length;
  if (rows === 0) return [];
  const cols = values[0].length;
  
  // 対象列が指定されていない場合は、全ての列 [0, ..., cols-1] を対象とする
  const checkCols = targetCols || Array.from({ length: cols }, (_, i) => i);

  // 結果のマトリックスを空文字で初期化
  const colors: string[][] = Array.from({ length: rows }, () =>
    Array(cols).fill("")
  );

  const highlightColors = [
    "#FFDDC1", "#FFFFCC", "#D4F1F4", "#F0E6FF", "#FFD1DC",
    "#D9EAD3", "#C9DAF8", "#FFECB3", "#E1E0FF", "#FADADD",
    "#D0F0C0", "#BCE4E8", "#F5CBA7", "#FFFACD", "#CFE2F3",
    "#EAD1DC", "#FFE5CC", "#E0FFFF", "#DAE8FC", "#FCE6C9",
    "#D6FFD6", "#F8D5E1", "#D1E8E2", "#FFF0F5", "#E6F0FF",
    "#F3E5AB", "#D8BFD8", "#B0E0E6", "#FAFAD2", "#98FB98",
    "#FFB6C1"
  ];

  let usedColors: string[] = [];
  const colorMap: Record<string, string> = {};

  function getUniqueColor() {
    for (const color of highlightColors) {
      if (!usedColors.includes(color)) {
        usedColors.push(color);
        return color;
      }
    }
    return highlightColors[Math.floor(Math.random() * highlightColors.length)];
  }

  // 指定された列に基づいて行のグループを取得するヘルパー関数
  function getUserGroups(row: any[]) {
    const groups: Record<string, number[]> = {};
    for (const col of checkCols) {
      if (col >= row.length) continue;
      const user = row[col];
      if (user) {
        if (!groups[user]) groups[user] = [];
        groups[user].push(col);
      }
    }
    return groups;
  }

  // --- Step 1: 全データをスキャンしてユーザーごとの出現行を記録 ---
  const userRowIndices: Record<string, number[]> = {};
  for (let r = 0; r < rows; r++) {
    const rowData = values[r];
    for (const col of checkCols) {
      if (col >= rowData.length) continue;
      const user = rowData[col];
      if (user) {
        if (!userRowIndices[user]) userRowIndices[user] = [];
        // 同じ行で複数回出現しても、行番号は1つでよい
        if (userRowIndices[user][userRowIndices[user].length - 1] !== r) {
            userRowIndices[user].push(r);
        }
      }
    }
  }

  const affectedUsers = new Set<string>();

  // --- Step 2: 飛び石（Gap）検出 ---
  for (const user in userRowIndices) {
    const indices = userRowIndices[user];
    if (indices.length > 1) {
      for (let i = 0; i < indices.length - 1; i++) {
        const startRow = indices[i];
        const endRow = indices[i + 1];
        
        // 行番号が連続しているならGapではない
        if (endRow - startRow === 1) continue;

        // Gapがある場合、間の行を確認
        let hasActiveRowInGap = false;
        
        // 間の行 (startRow + 1 から endRow - 1 まで) をチェック
        for (let r = startRow + 1; r < endRow; r++) {
          // emptyRows が未指定、あるいは false (募集あり) なら Active
          const isEmpty = emptyRows ? emptyRows[r] : false;
          if (!isEmpty) {
            hasActiveRowInGap = true;
            break;
          }
        }

        // 間の行に一つでも Active な行があれば Gap とみなす
        if (hasActiveRowInGap) {
          if (!colorMap[user]) colorMap[user] = getUniqueColor();
          affectedUsers.add(user);
          break; // Gap確定
        }
      }
    }
  }

  // --- Step 3: グループ変更（Column Change）検出 ---
  let prevGroups = getUserGroups(values[0]);
  
  // 以前のロジック同様、行ごとにスキャンして前行との差分を見る
  for (let row = 1; row < rows; row++) {
    const currentGroups = getUserGroups(values[row]);
    
    for (const user in currentGroups) {
      const prevPos = prevGroups[user] || [];
      const currPos = currentGroups[user];

      let foundAbove = false;
      // ユーザーが以前の行に出現していたか確認（これは Step 1 のデータを使えば高速化できるが、ロジック維持のためそのまま）
      // ただし、Gap判定は既に済んでいるので、「直前の行にいない」=「Gap」または「新規」
      // ここでの関心は「直前の行にいたのに、列が変わった」こと。
      // あるいは「飛び地（Gap）」もここで検出していたが（jumped）、それはStep 2でカバーされているはず。
      // 下記の jumped は Gap と同義（foundAbove=true && !prevRow.includes）。
      // なので、jumped の判定は Step 2 結果と重複するが、安全のため残してもよい（色はマップで管理されるので問題ない）。
      
      // ただ、Step 2 は「1行以上空いている」を検知する。
      // jumped ロジックは「過去にいたけど直前にいない」⇒ これもGap。
      // なので実質同じだが、Column Change を重点的に見る。
      
      // 'groupChanged'（グループ変更）: 列が大幅に変更されたか？
      // 以前にいた列のいずれかが現在の列に含まれていない場合。
      const groupChanged =
        prevPos.length > 0 && !prevPos.every((col) => currPos.includes(col));

      if (groupChanged) {
        if (!colorMap[user]) colorMap[user] = getUniqueColor();
        affectedUsers.add(user);
      }
    }
    prevGroups = currentGroups;
  }

  // --- Step 4: 色の適用 ---
  for (let row = 0; row < rows; row++) {
    for (const col of checkCols) {
      if (col >= values[row].length) continue;
      const user = values[row][col];
      if (affectedUsers.has(user)) {
        colors[row][col] = colorMap[user] || "";
      }
    }
  }

  return colors;
}
