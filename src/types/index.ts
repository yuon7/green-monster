import { Client, Collection, SlashCommandBuilder, SlashCommandOptionsOnlyBuilder, ChatInputCommandInteraction } from 'discord.js';

/**
 * コマンドインターフェース
 * すべてのコマンドファイルがこの型に従う
 */
export interface Command {
  data: SlashCommandBuilder | SlashCommandOptionsOnlyBuilder;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}

/**
 * イベントインターフェース
 * すべてのイベントファイルがこの型に従う
 */
export interface Event {
  name: string;
  once?: boolean;
  execute: (...args: any[]) => Promise<void>;
}

/**
 * 拡張されたClientクラス
 * コマンドコレクションを含む
 */
export class ExtendedClient extends Client {
  commands: Collection<string, Command>;

  constructor(options: any) {
    super(options);
    this.commands = new Collection<string, Command>();
  }
}

// シフト作成機能の型
export * from './ShiftData';
