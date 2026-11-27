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

// 記錄單一亡者的服務結果，影響投訴與結局旗標。
export function scoreCase(model, guest, recipeId, tone) {
  const recipeCorrect = recipeId === guest.idealRecipe;
  const replyCorrect = tone === guest.bestTone;

  if (recipeCorrect) model.bestRecipes = (model.bestRecipes ?? 0) + 1;
  else model.recipeMistakes += 1;
  if (replyCorrect) model.goodReplies += 1;
  // 只有「明明不該用」卻端出最便宜的忘憂湯，才算省成本。
  if (recipeId === 'forget' && !recipeCorrect) model.cheapRecipes += 1;
  if (!recipeCorrect && !replyCorrect) model.complaints += 1;

  // 拒絕死亡者喝到「緩緩湯」等於地府默許延期，罷喝就此開始。
  if (guest.id === 'refuser' && recipeId === 'delay') model.flags.strikeSupport = true;
  if (guest.id === 'notice' && (!recipeCorrect || tone === 'silly')) model.flags.noticeUnclear = true;
  if (guest.id === 'auditor' && recipeCorrect && replyCorrect) model.flags.auditPassed = true;
  if (guest.id === 'memory' && recipeId === 'keep') model.flags.subscriptionContinued = true;
  if (guest.id === 'meeting' && tone === 'silly') model.flags.meetingLinkLeaked = true;
  if (guest.id === 'unsubscribe' && tone === 'formal' && recipeId === 'forget') model.flags.unsubscribeSucceeded = true;
  if (guest.id === 'queue' && guest.timedOut) model.flags.queueOverload = true;

  return { recipeCorrect, replyCorrect };
}

export function resolveEnding(model) {
  const results = model.caseResults;
  const full = results.length === 3;
  const allTimedOut = full && results.every((result) => result.timedOut);
  const specialPerfect = results.some((result) => result.guest.isSpecial && result.recipeCorrect && result.replyCorrect);
  const sameRecipe = full && new Set(results.map((result) => result.recipeId)).size === 1;
  const allBest = full && results.every((result) => result.recipeCorrect);
  const allRepliesGood = full && results.every((result) => result.replyCorrect);

  // 順序即優先度：彩蛋 → 嚴重失敗 → 完美 → 特殊事件 → 一般評價。
  if (specialPerfect) return ENDINGS.auditPassed;
  if (model.eggs.selfSoup) return ENDINGS.selfSoup;
  if (allTimedOut) return ENDINGS.overtime;
  if (model.complaints >= 3) return ENDINGS.fired;
  if (allBest && allRepliesGood && model.complaints === 0) return ENDINGS.dayoff;
  if (allBest && model.complaints === 0) return ENDINGS.employee;
  if (model.flags.strikeSupport && model.goodReplies >= 2) return ENDINGS.strike;
  if (model.flags.noticeUnclear && model.recipeMistakes >= 2) return ENDINGS.swap;
  if (model.flags.noticeUnclear) return ENDINGS.notice;
  if (sameRecipe && model.recipeMistakes >= 1) return ENDINGS.viral;
  if (model.cheapRecipes >= 2) return ENDINGS.pricing;
  if (model.complaints === 0 && model.goodReplies >= 2) return ENDINGS.reviews;
  return ENDINGS.callcenter;
}

export function guestById(id) {
  return ALL_GUESTS.find((guest) => guest.id === id);
}
