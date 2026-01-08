import { OpenAI } from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from 'dotenv';
import path from 'path';

// Load env
if (!process.env.OPENAI_API_KEY && !process.env.GOOGLE_API_KEY) {
  config({ path: path.resolve(process.cwd(), '.env') });
}

export interface ShiftCandidate {
  userId: string;
  userName: string;
  normalEffective: number;
  encoreEffective: number;
  hasEncoreRole: boolean;
  timeRequest: string; // The raw or parsed time request message
}

export interface ScheduledSlot {
  time: string; // "10-11"
  role: 'runner' | 'encore' | 'support' | 'standby';
  userId: string;
  userName: string;
}

export interface ShiftScheduleResult {
  schedule: ScheduledSlot[];
  reasoning: string;
}

/**
 * AI Scheduler Service
 * Interfaces with LLMs to decide the schedule
 */
export class AIScheduler {
  private openai?: OpenAI;
  private gemini?: GoogleGenerativeAI;

  constructor() {
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
    if (process.env.GOOGLE_API_KEY) {
      this.gemini = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    }
  }

  /**
   * Decide which model to use. Preference: Gemini (Cheaper/Free tier) -> OpenAI
   */
  private getProvider() {
    if (this.gemini) return 'gemini';
    if (this.openai) return 'openai';
    throw new Error('No AI Provider configured. Set OPENAI_API_KEY or GOOGLE_API_KEY.');
  }

  /**
   * Main Scheduling Function
   */
  async generateSchedule(
    candidates: ShiftCandidate[],
    targetDate: string
  ): Promise<ShiftScheduleResult> {
    const prompt = this.createPrompt(candidates, targetDate);
    const provider = this.getProvider();

    console.log(`🤖 AI Scheduling using ${provider}...`);

    let responseText = '';

    if (provider === 'openai') {
      const completion = await this.openai!.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: 'gpt-4o', // or gpt-4o-mini
        response_format: { type: "json_object" }
      });
      responseText = completion.choices[0].message.content || '{}';
    } else {
      const model = this.gemini!.getGenerativeModel({ model: 'gemini-2.5-flash', generationConfig: { responseMimeType: "application/json" } });
      const result = await model.generateContent(prompt);
      responseText = result.response.text();
    }

    try {
      const json = JSON.parse(responseText);
      return {
        schedule: json.schedule || [],
        reasoning: json.reasoning || 'No reasoning provided.',
      };
    } catch (e) {
      console.error('AI JSON Parse Error:', e);
      console.error('Raw Response:', responseText);
      throw new Error('Failed to parse AI response');
    }
  }

  private createPrompt(candidates: ShiftCandidate[], date: string): string {
    return `
あなたはゲームイベントにおけるシフトを管理するマネージャーです。以下のルール設計に従ってシフトを作成してください。
Target Date: ${date}

ルール:
0時から24時（または候補者が指定した特定の時間帯）の各時間帯に人員を配置する必要があります。
2. 各時間帯で必要な人員は以下の通りです。:
   - アンコール（Encore）：1名（'hasEncoreRole': true が必須。'encoreEffective' スコアが最も高い候補者を優先します）。
   - サポーター（Supporter）：3名（'normalEffective' スコアが最も高い候補者を優先します）。
   - スタンバイ（Standby）：1名（'normalEffective' スコアが次に高い候補者を優先します）。
3. 重要：候補者が 'timeRequest' でリクエストした時間帯にのみ人員を割り当ててください。例えば、「10-14」は10時、11時、12時、13時を指します（14時は含まれません）。
4. 優先順位：アンコール > サポート > スタンバイ。
5. チーム全体の強さを最大化してください。
6. 「ランナー（runner）」の枠はコマンド引数で固定されているため、「runner」の役割は割り当てないでください。割り当てるのは「encore」、「support」、「standby」のみです。

候補者のデータ（JSON）:
${JSON.stringify(candidates, null, 2)}

出力フォーマット（JSON）:
{
  "reasoning": "このシフトを組んだ思考過程を簡潔に説明してください",
  "schedule": [
    { "time": "10-11", "role": "encore", "userId": "...", "userName": "..." },
    { "time": "10-11", "role": "support", "userId": "...", "userName": "..." },
    { "time": "10-11", "role": "standby", "userId": "...", "userName": "..." }
  ]
}
返り値はJSONのみでお願いします.
`;
  }
}
