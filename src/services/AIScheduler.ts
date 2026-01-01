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
You are a Shift Scheduler for a game event.
Target Date: ${date}

rules:
1. We need to fill slots for hours 00-24 (or specific ranges mentioned by candidates).
2. For each active hour, we need:
   - 1 Encore (Must have 'hasEncoreRole': true. Prioritize highest 'encoreEffective' score).
   - 3 Supporters (Prioritize highest 'normalEffective' score).
   - 1 Standby (Next highest 'normalEffective' score).
3. Important: Assign users only to hours they requested in 'timeRequest'. e.g. "10-14" means 10, 11, 12, 13 (end at 14).
4. Priority: Encore > Support > Standby.
5. Maximize the global strength of the team.
6. The 'runner' slot is fixed by command argument, so DO NOT assign 'runner' role. Only 'encore', 'support', and 'standby’.

Candidates Data (JSON):
${JSON.stringify(candidates, null, 2)}

Output Format (JSON):
{
  "reasoning": "Brief explanation...",
  "schedule": [
    { "time": "10-11", "role": "encore", "userId": "...", "userName": "..." },
    { "time": "10-11", "role": "support", "userId": "...", "userName": "..." },
    { "time": "10-11", "role": "standby", "userId": "...", "userName": "..." }
  ]
}
Return ONLY JSON.
`;
  }
}
