import dotenv from 'dotenv';

// 環境変数を読み込み
dotenv.config();

/**
 * 環境変数の検証と取得
 */
function getEnvVar(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`環境変数 ${key} が設定されていません。.env ファイルを確認してください。`);
  }
  return value;
}

/**
 * アプリケーション設定
 */
export const config = {
  // Discord Bot Token
  token: getEnvVar('DISCORD_TOKEN'),

  // Discord Application (Client) ID
  clientId: getEnvVar('CLIENT_ID'),

  // 開発モードかどうか
  isDevelopment: process.env.NODE_ENV === 'development',
} as const;
