# Discord Bot - Reaction Bot

TypeScript + discord.js v14 で構築された、拡張性の高いDiscord Botです。

## ✨ 特徴

- 🔧 **拡張性**: `commands/`と`events/`にファイルを追加するだけで機能追加
- 📦 **TypeScript**: 型安全で保守性の高いコードベース
- 🎨 **開発環境**: ESLint + Prettier + nodemon で快適な開発体験
- 🚀 **デプロイ対応**: Railway/Renderで簡単にホスティング可能
- 🐛 **VSCodeデバッグ**: F5でデバッグ実行

## 📂 ディレクトリ構造

```
reactionBot/
├── src/
│   ├── commands/        # スラッシュコマンド（自動読み込み）
│   │   ├── ping.ts
│   │   └── userinfo.ts
│   ├── events/          # イベントハンドラー（自動読み込み）
│   │   ├── ready.ts
│   │   └── interactionCreate.ts
│   ├── types/           # 型定義
│   │   └── index.ts
│   ├── utils/           # ユーティリティ
│   │   └── handlers.ts
│   ├── config.ts        # 設定管理
│   └── index.ts         # エントリーポイント
├── .vscode/             # VSCode設定
├── dist/                # ビルド出力（自動生成）
├── package.json
├── tsconfig.json
└── .env                 # 環境変数（要作成）
```

## 🚀 セットアップ

### 1. Discord Bot の作成

1. [Discord Developer Portal](https://discord.com/developers/applications) にアクセス
2. 「New Application」をクリック
3. 左メニュー「Bot」→「Reset Token」でTokenを取得
4. 「Privileged Gateway Intents」で以下を有効化:
   - `SERVER MEMBERS INTENT`
   - `MESSAGE CONTENT INTENT`（将来的に使用予定）
5. 左メニュー「OAuth2」→「OAuth2 URL Generator」:
   - SCOPES: `bot`, `applications.commands`
   - BOT PERMISSIONS: `Administrator`（または必要な権限のみ）
   - 生成されたURLでBotをサーバーに招待

### 2. プロジェクトのセットアップ

```bash
# 依存関係のインストール
npm install

# 環境変数ファイルの作成
cp .env.example .env
```

### 3. 環境変数の設定

`.env`ファイルを編集:

```env
DISCORD_TOKEN=your_bot_token_here
CLIENT_ID=your_application_id_here
```

- `DISCORD_TOKEN`: Bot タブで取得したToken
- `CLIENT_ID`: アプリケーション画面の「Application ID」

## 💻 開発

```bash
# 開発サーバー起動（自動リロード）
npm run dev

# コード整形
npm run format

# Lintチェック
npm run lint

# ビルド（TypeScript → JavaScript）
npm run build

# 本番起動
npm start
```

### VSCodeでのデバッグ

1. `.env`ファイルが作成済みであることを確認
2. `F5`キーを押す
3. ブレークポイントを設定してデバッグ

## ➕ 新しいコマンドの追加方法

1. `src/commands/`に新しいファイルを作成（例: `hello.ts`）

```typescript
import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { Command } from '@/types';

const hello: Command = {
  data: new SlashCommandBuilder()
    .setName('hello')
    .setDescription('挨拶します'),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.reply('こんにちは！');
  },
};

export default hello;
```

2. Botを再起動するだけで自動的に登録されます！

## 🎯 新しいイベントの追加方法

1. `src/events/`に新しいファイルを作成（例: `messageCreate.ts`）

```typescript
import { Event } from '@/types';
import { Events, Message } from 'discord.js';

const messageCreate: Event = {
  name: Events.MessageCreate,
  once: false,

  async execute(message: Message) {
    if (message.author.bot) return;
    console.log(`メッセージ受信: ${message.content}`);
  },
};

export default messageCreate;
```

2. Botを再起動するだけで自動的に登録されます！

## 🌐 デプロイ（Railway）

### 初回設定

1. [Railway](https://railway.app/) にサインアップ
2. 「New Project」→「Deploy from GitHub repo」
3. このリポジトリを選択
4. 「Variables」タブで環境変数を設定:
   - `DISCORD_TOKEN`
   - `CLIENT_ID`
5. 自動デプロイ完了！

### 更新

GitHubにpushするだけで自動的にデプロイされます。

```bash
git add .
git commit -m "新機能を追加"
git push
```

## 📝 実装済み機能

### コマンド

- `/ping` - Botの応答速度を確認
- `/userinfo [user]` - ユーザー情報を表示

### 将来の拡張予定

- シフト管理機能
- リアクションベースの参加者管理
- スプレッドシート/画像出力

## 🛠️ トラブルシューティング

### Botがオンラインにならない

- `.env`ファイルが正しく設定されているか確認
- Discord Developer PortalでTokenが有効か確認

### スラッシュコマンドが表示されない

- Botがサーバーに招待されているか確認
- 数分待ってからDiscordを再起動
- Botのログで「スラッシュコマンド登録完了」が表示されているか確認

### パスエイリアス（@/*）でエラーが出る

- `npm install`が完了しているか確認
- VSCodeの場合、TypeScript バージョンをワークスペース版に変更

## 📄 ライセンス

MIT License

## 🤝 貢献

将来的に他の開発者が参加する可能性を考慮し、コードの可読性と保守性を重視しています。
