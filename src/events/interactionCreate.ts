import { Event } from '@/types';
import { Events, Interaction } from 'discord.js';
import { ExtendedClient } from '@/types';

/**
 * interactionCreateイベント
 * スラッシュコマンドなどのインタラクションが発生したときに実行される
 */
const interactionCreate: Event = {
  name: Events.InteractionCreate,
  once: false,

  async execute(interaction: Interaction) {
    // スラッシュコマンドでない場合は無視
    if (!interaction.isChatInputCommand()) return;

    const client = interaction.client as ExtendedClient;
    const command = client.commands.get(interaction.commandName);

    // コマンドが見つからない場合
    if (!command) {
      console.warn(`⚠️  コマンドが見つかりません: ${interaction.commandName}`);
      return;
    }

    try {
      console.log(
        `📝 コマンド実行: /${interaction.commandName} ` +
          `by ${interaction.user.tag} (${interaction.user.id})`
      );

      await command.execute(interaction);
    } catch (error) {
      console.error(`❌ コマンド実行エラー (/${interaction.commandName}):`, error);

      const errorMessage = {
        content: '❌ コマンドの実行中にエラーが発生しました。',
        ephemeral: true,
      };

      // まだ応答していない場合は reply、すでに応答済みなら followUp
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(errorMessage);
      } else {
        await interaction.reply(errorMessage);
      }
    }
  },
};

export default interactionCreate;
