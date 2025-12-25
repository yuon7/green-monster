import { GatewayIntentBits } from 'discord.js';
import { ExtendedClient } from '@/types';
import { config } from '@/config';
import { loadCommands, loadEvents } from '@/utils/handlers';

/**
 * Botのメインエントリーポイント
 */
async function main() {
  console.log('🤖 Discord Bot を起動しています...\n');

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
