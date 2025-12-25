import { Event } from '@/types';
import { Events, Client } from 'discord.js';
import { ExtendedClient } from '@/types';
import { registerCommands } from '@/utils/handlers';

/**
 * readyイベント
 * Bot起動時に1回だけ実行される
 */
const ready: Event = {
  name: Events.ClientReady,
  once: true,

  async execute(client: Client) {
    if (!client.user) return;

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ ログイン成功: ${client.user.tag}`);
    console.log(`🆔 Bot ID: ${client.user.id}`);
    console.log(`🌐 サーバー数: ${client.guilds.cache.size}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // スラッシュコマンドを登録
    await registerCommands(client as ExtendedClient);

    console.log('🚀 Bot準備完了！\n');
  },
};

export default ready;
