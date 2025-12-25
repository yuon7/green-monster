import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { Command } from '@/types';

/**
 * /ping コマンド
 * Botの応答速度を確認する
 */
const ping: Command = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Botの応答速度を確認します'),

  async execute(interaction: ChatInputCommandInteraction) {
    const sent = await interaction.reply({
      content: '🏓 Pong! 計測中...',
      fetchReply: true,
    });

    const latency = sent.createdTimestamp - interaction.createdTimestamp;
    const wsLatency = interaction.client.ws.ping;

    await interaction.editReply(
      `🏓 Pong!\n` +
        `📊 応答速度: **${latency}ms**\n` +
        `💓 WebSocket: **${wsLatency}ms**`
    );
  },
};

export default ping;
