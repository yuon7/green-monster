import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  Role,
} from 'discord.js';
import { Command } from '@/types';
import { supabase, isDbConfigured } from '@/lib/supabaseClient';

const shiftConfig: Command = {
  data: new SlashCommandBuilder()
    .setName('shift-config')
    .setDescription('シフト作成Botの設定を行います')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator) // 管理者のみ
    .addSubcommand(subcommand =>
      subcommand
        .setName('set-encore')
        .setDescription('アンコール役のロールを設定します')
        .addRoleOption(option =>
          option
            .setName('role')
            .setDescription('アンコールを担当するロール')
            .setRequired(true)
        )
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) {
      await interaction.reply({ content: 'サーバー内でのみ使用可能です。', ephemeral: true });
      return;
    }

    if (!isDbConfigured() || !supabase) {
      await interaction.reply({ content: '❌ データベースが設定されていません。ボット管理者に連絡してください。', ephemeral: true });
      return;
    }

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'set-encore') {
      await interaction.deferReply({ ephemeral: true });
      const role = interaction.options.getRole('role', true) as Role;

      try {
        const { error } = await supabase
          .from('guild_configs')
          .upsert({ 
            guild_id: interaction.guild.id, 
            encore_role_id: role.id 
          }, { onConflict: 'guild_id' });

        if (error) throw error;

        await interaction.editReply(`✅ アンコールロールを **${role.name}** に設定しました。`);
      } catch (error) {
        console.error('Config Error:', error);
        await interaction.editReply(`❌ 設定に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  },
};

export default shiftConfig;
