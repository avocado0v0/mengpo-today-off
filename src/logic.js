import { ALL_GUESTS, ENDINGS, NORMAL_GUESTS, SPECIAL_GUEST } from './data.js';

export const PATIENCE_DRAIN_PER_SECOND = 1.25;

export function drawShift(random = Math.random) {
  const foundSpecial = random() < 0.1;
  const normalCount = foundSpecial ? 2 : 3;
  const pool = [...NORMAL_GUESTS];
  const chosen = [];

  while (chosen.length < normalCount) {
    const index = Math.floor(random() * pool.length);
    chosen.push(pool.splice(index, 1)[0]);
  }

  if (foundSpecial) chosen.push(SPECIAL_GUEST);

  for (let i = chosen.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [chosen[i], chosen[j]] = [chosen[j], chosen[i]];
  }

  return chosen.map((guest) => ({
    ...guest,
    patience: 72 + Math.floor(random() * 29),
    maxPatience: 100,
    status: 'waiting',
    timedOut: false,
    recipeId: null,
    replyTone: null,
    result: null,
  }));
}

export function resolveEnding(model) {
  const results = model.caseResults;
  const allTimedOut = results.length === 3 && results.every((result) => result.timedOut);
  const specialPerfect = results.some((result) => result.guest.isSpecial && result.recipeCorrect && result.replyCorrect);
  const sameRecipe = results.length === 3 && new Set(results.map((result) => result.recipeId)).size === 1;
  const allBest = results.length === 3 && results.every((result) => result.recipeCorrect);
  const allRepliesGood = results.length === 3 && results.every((result) => result.replyCorrect);

  if (specialPerfect) return ENDINGS.auditPassed;
  if (model.eggs.selfSoup) return ENDINGS.selfSoup;
  if (allTimedOut) return ENDINGS.overtime;
  if (model.flags.strikeSupport && model.goodReplies >= 2) return ENDINGS.strike;
  if (model.flags.noticeUnclear && model.recipeMistakes >= 2) return ENDINGS.swap;
  if (model.flags.noticeUnclear) return ENDINGS.notice;
  if (sameRecipe && model.recipeMistakes >= 1) return ENDINGS.viral;
  if (model.cheapRecipes >= 2) return ENDINGS.pricing;
  if (model.complaints >= 3) return ENDINGS.fired;
  if (model.complaints > 0) return ENDINGS.callcenter;
  if (allBest) return ENDINGS.employee;
  if (allRepliesGood) return ENDINGS.reviews;
  return ENDINGS.dayoff;
}

export function guestById(id) {
  return ALL_GUESTS.find((guest) => guest.id === id);
}
