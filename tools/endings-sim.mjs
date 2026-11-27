// 用法：node tools/endings-sim.mjs —— 模擬不同玩法策略，檢查各結局出現比例與可達性。
import { drawShift, resolveEnding, scoreCase } from '../src/logic.js';
import { ENDINGS } from '../src/data.js';

const endingName = (ending) => Object.entries(ENDINGS).find(([, value]) => value === ending)[0];
const RECIPES = ['forget', 'keep', 'delay'];
const TONES = ['gentle', 'formal', 'silly'];
const pick = (list) => list[Math.floor(Math.random() * list.length)];

function play(strategy, timeoutChance) {
  const model = { guests: drawShift(), complaints: 0, timeouts: 0, recipeMistakes: 0, goodReplies: 0, cheapRecipes: 0, caseResults: [], flags: {}, eggs: {} };
  for (const guest of model.guests) {
    if (Math.random() < timeoutChance) { guest.timedOut = true; model.complaints += 1; model.timeouts += 1; }
    const [recipeId, tone] = strategy(guest);
    const scored = scoreCase(model, guest, recipeId, tone);
    model.caseResults.push({ guest, recipeId, ...scored, timedOut: guest.timedOut });
  }
  return endingName(resolveEnding(model));
}

const strategies = [
  ['亂選', () => [pick(RECIPES), pick(TONES)], 0],
  ['亂選＋拖延', () => [pick(RECIPES), pick(TONES)], 0.4],
  ['全對', (g) => [g.idealRecipe, g.bestTone], 0],
  ['全對＋拖延', (g) => [g.idealRecipe, g.bestTone], 0.3],
  ['只配對湯', (g) => [g.idealRecipe, pick(TONES)], 0],
  ['只回對話', (g) => [pick(RECIPES), g.bestTone], 0],
];
const seen = new Set();
for (const [label, strategy, timeoutChance] of strategies) {
  const counts = {};
  for (let i = 0; i < 20000; i += 1) { const e = play(strategy, timeoutChance); counts[e] = (counts[e] ?? 0) + 1; seen.add(e); }
  console.log(label.padEnd(8, '　'), Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${ENDINGS[k].title} ${(v / 200).toFixed(1)}%`).join('、'));
}
console.log('未出現（彩蛋需手動觸發）：', Object.keys(ENDINGS).filter((k) => !seen.has(k)).map((k) => ENDINGS[k].title));
