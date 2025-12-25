import { readdirSync } from 'fs';
import { join } from 'path';
import { ExtendedClient, Command, Event } from '@/types';
import { REST, Routes } from 'discord.js';
import { config } from '@/config';

/**
 * commandsフォルダからコマンドを動的に読み込む
 */
export async function loadCommands(client: ExtendedClient): Promise<void> {
  const commandsPath = join(__dirname, '../commands');
  const commandFiles = readdirSync(commandsPath).filter(file => file.endsWith('.ts') || file.endsWith('.js'));

  console.log(`📦 ${commandFiles.length}個のコマンドを読み込んでいます...`);

  for (const file of commandFiles) {
    const filePath = join(commandsPath, file);
    try {
      const command: Command = (await import(filePath)).default;

      if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
        console.log(`  ✅ コマンド読み込み成功: ${command.data.name}`);
      } else {
        console.warn(`  ⚠️  コマンドファイルに必要なプロパティがありません: ${file}`);
      }
    } catch (error) {
      console.error(`  ❌ コマンド読み込みエラー (${file}):`, error);
    }
  }

  console.log(`✨ コマンド読み込み完了: ${client.commands.size}個\n`);
}

/**
 * eventsフォルダからイベントを動的に読み込む
 */
export async function loadEvents(client: ExtendedClient): Promise<void> {
  const eventsPath = join(__dirname, '../events');
  const eventFiles = readdirSync(eventsPath).filter(file => file.endsWith('.ts') || file.endsWith('.js'));

  console.log(`📦 ${eventFiles.length}個のイベントを読み込んでいます...`);

  for (const file of eventFiles) {
    const filePath = join(eventsPath, file);
    try {
      const event: Event = (await import(filePath)).default;

      if (event.once) {
        client.once(event.name, (...args) => event.execute(...args));
      } else {
        client.on(event.name, (...args) => event.execute(...args));
      }

      console.log(`  ✅ イベント読み込み成功: ${event.name} (once: ${event.once || false})`);
    } catch (error) {
      console.error(`  ❌ イベント読み込みエラー (${file}):`, error);
    }
  }

  console.log(`✨ イベント読み込み完了\n`);
}

/**
 * スラッシュコマンドをDiscord APIに登録
 */
export async function registerCommands(client: ExtendedClient): Promise<void> {
  try {
    const commands = client.commands.map(command => command.data.toJSON());

    console.log(`🔄 ${commands.length}個のスラッシュコマンドを登録しています...`);

    const rest = new REST().setToken(config.token);
    await rest.put(Routes.applicationCommands(config.clientId), { body: commands });

    console.log(`✅ スラッシュコマンド登録完了\n`);
  } catch (error) {
    console.error('❌ コマンド登録エラー:', error);
  }
}
