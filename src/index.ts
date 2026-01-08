import { GatewayIntentBits } from 'discord.js';
import { ExtendedClient } from '@/types';
import { config } from '@/config';
import { loadCommands, loadEvents } from '@/utils/handlers';

/**
 * Botのメインエントリーポイント
 */
import express from 'express';

async function main() {
  console.log('🤖 Discord Bot を起動しています...\n');

  // Railway Health Check Server (最優先で起動)
  const app = express();
  const port = process.env.PORT || 3000;

  app.get('/', (req, res) => {
    res.send('Reaction Bot is running! 🤖');
  });

  app.listen(Number(port), '0.0.0.0', () => {
    console.log(`🌍 Health Check Server is running on port ${port} (0.0.0.0)`);
  });

  // Clientの作成
  const client = new ExtendedClient({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers, // /userinfoコマンドで使用
    ],
  });

  // コマンドとイベントを読み込み
  await loadCommands(client);
  await loadEvents(client);

  // Discordにログイン
  try {
    // Token check for debugging
    const tokenPrefix = config.token ? config.token.substring(30, 40) + '...' : 'undefined';
    console.log(`🔑 Using Token Prefix: ${tokenPrefix}`);
    await client.login(config.token);
  } catch (error) {
    console.error('❌ ログインエラー:', error);
    process.exit(1);
  }

  // グローバルエラーハンドリング
  process.on('unhandledRejection', error => {
    console.error('🚨 未処理のPromise拒否:', error);
  });

  process.on('uncaughtException', error => {
    console.error('🚨 キャッチされていない例外:', error);
    process.exit(1);
  });
}

main();
