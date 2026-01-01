import { supabase } from '@/lib/supabaseClient';

export interface FormationData {
  leader: number;
  internal: number;
  total: number;
}

export interface UserProfile {
  guildId: string;
  userId: string;
  userName: string;
  normal: FormationData;
  encore?: FormationData | null;
}

/**
 * Formation Service
 * 支援編成データのパースと保存を担当
 */
export class FormationService {
  /**
   * 文字列から編成データをパースする
   * フォーマット: 先頭/内部/総合力 (例: 160/760/35.6)
   * 行頭の装飾文字(①など)は無視する
   */
  static parseFormationText(text: string): { normal: FormationData; encore?: FormationData } | null {
    // 行に分割し、空行を除去
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    // 数値/数値/数値(小数可) のパターン
    // 行頭に任意の文字があっても、最初にマッチする「数字/数字/数字」を抽出
    const regex = /(\d{3})\s*\/\s*(\d{3})\s*\/\s*(\d+(?:\.\d+)?)/;

    const formations: FormationData[] = [];

    for (const line of lines) {
      const match = line.match(regex);
      if (match) {
        formations.push({
          leader: parseInt(match[1]),
          internal: parseInt(match[2]),
          total: parseFloat(match[3]),
        });
      }
    }

    if (formations.length === 0) {
      /*
        パース失敗: 数字の並びが見つからない
        ユーザーが "①160/760/35,6" のようにカンマを使っている可能性なども考慮すべきだが、
        まずはドット区切りの数値を必須とする
       */
      return null;
    }

    // 1つ目 = 通常, 2つ目(あれば) = アンコール
    return {
      normal: formations[0],
      encore: formations.length > 1 ? formations[1] : undefined
    };
  }

  /**
   * プロフィールを保存/更新する
   */
  static async upsertProfile(profile: UserProfile): Promise<{ error: string | null }> {
    if (!supabase) return { error: 'Database not configured' };

    try {
      // データの準備
      const data = {
        guild_id: profile.guildId,
        user_id: profile.userId,
        user_name: profile.userName,
        
        // 通常編成
        normal_leader: profile.normal.leader,
        normal_internal: profile.normal.internal,
        normal_total: Math.round(profile.normal.total), // DBがintegerのため丸める
        // effectiveはDB側でGenerated Columnとして計算されるため送信不要だが、
        // Supabase JSでinsertする場合、計算列は無視されるのでそのままでOK
        
        // アンコール編成
        encore_leader: profile.encore?.leader || 0,
        encore_internal: profile.encore?.internal || 0,
        encore_total: Math.round(profile.encore?.total || 0), // DBがintegerのため丸める
        
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('profiles')
        .upsert(data, { onConflict: 'guild_id,user_id' });

      if (error) throw error;
      
      return { error: null };
    } catch (err: any) {
      console.error('Upsert Profile Error:', err);
      // Supabaseエラーやその他のオブジェクトからメッセージを抽出
      const errorMessage = err?.message || (typeof err === 'object' ? JSON.stringify(err) : String(err));
      return { error: errorMessage };
    }
  }

  /**
   * ユーザーIDリストからプロフィールを取得
   */
  static async getProfiles(guildId: string, userIds: string[]) {
    if (!supabase) return [];
    
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('guild_id', guildId)
      .in('user_id', userIds);
      
    return data || [];
  }
}
