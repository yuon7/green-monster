
import { alignDuplicateNames, assignHighlightColors } from './shiftLogic';

console.log("=== alignDuplicateNames（名寄せ） のテスト ===");

// シナリオ: ユーザー 'A' は行0の列0にいます。行1では 'A' は列1にいます。
// 期待値: 行1で、可能であれば 'A' は列0にスワップされるべきです。
const inputAlign = [
  ['A', 'B', 'C'],
  ['B', 'A', 'C'], // 'A'はインデックス1にいますが、インデックス0にいました。スワップされるはず？
  ['D', 'E', 'A']
];

console.log("入力マトリックス:");
inputAlign.forEach((r: any[]) => console.log(JSON.stringify(r)));

const aligned = alignDuplicateNames(inputAlign);

console.log("\n整列後の出力:");
aligned.forEach((r: any[]) => console.log(JSON.stringify(r)));
// トレース:
// 行 0: ['A', 'B', 'C']
// 行 1 処理中: 列0 は 'B'。prevRow[0] は 'A' でした。
// ロジック:
// 行 0: 'A', 'B', 'C'
// 行 1: 'B', 'A', 'C'
// 列 0 の場合: currentVal（行0から）= 'A'
// nextRow に 'A' は含まれるか？ はい。nextRow[0] ('B') != 'A'。
// 次に nextRow 内の 'A' を検索（インデックス1）。
// nextRow[0] ('B') と nextRow[1] ('A') を交換。
// 結果の行 1: ['A', 'B', 'C']。

console.log("-----------------------------------------");

console.log("=== assignHighlightColors（ハイライト色付け） のテスト ===");

// 6列のマトリックス - 縦方向のGapテスト + 空き時間テスト
const inputHighlight = [
  ['User1', 'User2', '', '', '', 'User3'], // 行 0 (Active)
  ['User1', 'User2', '', '', '', 'User3'], // 行 1 (Active)
  ['',       '',      '',      '', '', ''],    // 行 2 (Empty/Gray)
  ['User4',  'User2', '',      '', '', ''],    // 行 3 (Active)
  ['User1',  '',      '',      '', '', ''],    // 行 4 (Active)
];

// 行2をEmptyとする設定
const emptyRows = [false, false, true, false, false];

console.log("入力マトリックス:");
inputHighlight.forEach(r => console.log(JSON.stringify(r)));
console.log("EmptyRows:", emptyRows);

// 引数なし -> 全列対象
const colors = assignHighlightColors(inputHighlight, undefined, emptyRows);

console.log("\n色出力（全列対象 + 縦方向Gap検出[Empty考慮]）:");
colors.forEach((r, i) => console.log(`Row ${i}: ${JSON.stringify(r)}`));

// 期待値:
// User1:
//   行0,1 (連続)
//   行2 (Empty) - 不在
//   行3 (Active) - 不在 (!) -> ここでGap発生！ (Emptyの行2だけでなく、Activeの行3も飛ばして行4に来ているため)
//   行4 (Active) - 復帰
//   -> User1 は行3(Active)を飛ばしているので「Gapあり」としてハイライトされるべき。

// User2:
//   行0,1 (連続)
//   行2 (Empty) - 不在
//   行3 (Active) - 復帰
//   -> User2 が飛ばしたのは 行2(Empty) のみ。
//   -> 中間にActiveな行がないため、「Gapなし」とみなされ、ハイライトされないべき。
//   (ただし、行3で列位置が変わっていないためColumnChangeもないはず)

// User3:
//   行0,1 連続。以降不在。 -> Gapなし。

// User4:
//   行3のみ。 -> Gapなし。

// 期待値:
// User1:
//   行0,1,2 は連続。
//   行3 不在。
//   行4 復帰。 -> Gapあり！ -> 全ての出現箇所(行0,1,2,4)でハイライトされるべき。
// User2:
//   行0,1,2 は連続。行3以降不在。 -> Gapなし。移動もなし（列1固定）。 -> 色なし？
// User3:
//   行0,1,2 連続。以降不在。 -> 色なし？
// User4:
//   行3のみ。 -> Gapなし。 -> 色なし。

// 追加テスト: インデックス4で移動するケース
const inputHighlight2 = [
  ['', '', '', '', 'User5', ''],
  ['', '', '', 'User5', '', ''] // 4列目->3列目へ移動
];
console.log("\n追加テスト（User5の移動）:");
const colors2 = assignHighlightColors(inputHighlight2);
colors2.forEach((r: string[]) => console.log(JSON.stringify(r)));

