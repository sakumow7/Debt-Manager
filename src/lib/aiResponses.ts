import type { SavingsTip } from '../types';
export function parseSavingsTips(raw: string): SavingsTip[] {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('AI returned invalid tips.');
  const parsed = JSON.parse(match[0]);
  const difficulties = ['easy', 'medium', 'hard'];
  const categories = ['housing', 'food', 'transportation', 'entertainment', 'utilities', 'income', 'debt', 'other'];
  const text = (value: unknown) => typeof value === 'string' && value.length <= 10000;
  if (!Array.isArray(parsed.tips) || parsed.tips.length === 0 || parsed.tips.length > 20) throw new Error('AI returned invalid tips.');
  return parsed.tips.map((tip: any) => {
    if (!tip || !text(tip.title) || !text(tip.description) || !text(tip.potentialSavings) || !difficulties.includes(tip.difficulty) || !categories.includes(tip.category) ||
      (tip.actionSteps !== undefined && (!Array.isArray(tip.actionSteps) || tip.actionSteps.length > 20 || !tip.actionSteps.every(text)))) throw new Error('AI returned invalid tips.');
    return { title: tip.title, description: tip.description, potentialSavings: tip.potentialSavings, difficulty: tip.difficulty, category: tip.category, actionSteps: tip.actionSteps };
  });
}
