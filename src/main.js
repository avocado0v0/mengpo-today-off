import Phaser from 'phaser';
import { RECIPES } from './data.js';
import { drawShift, PATIENCE_DRAIN_PER_SECOND, resolveEnding } from './logic.js';
import './style.css';

const WIDTH = 1280;
const HEIGHT = 800;
const FONT = '"Microsoft JhengHei", "Noto Sans TC", "PingFang TC", sans-serif';
const COLORS = {
  night: '#171722',
  plum: '#673347',
  rose: '#a6485d',
  ink: '#2a2835',
  paper: '#f2ead9',
  paperDeep: '#e4d8c1',
  white: '#fffaf1',
  gold: '#d59c4f',
  mint: '#678d78',
  red: '#a5424b',
  gray: '#77727b',
  line: '#b7aa94',
};

const INTRO = [
  {
    speaker: '地府人事小吏',
    text: '報到？孟婆本人今天請假，怎麼是你來代班？',
  },
  {
    speaker: '代班孟婆',
    text: '孟婆怎麼就不能是男的？地府可沒有性別歧視啊！',
  },
  {
    speaker: '地府人事小吏',
    text: '好，櫃檯交給你。三位亡者在等候，記得先看線索再下湯。',
  },
];

const TUTORIAL = [
  {
    number: '01',
    title: '看線索，挑一碗合適的湯',
    text: '每位亡者都有一款最適合的配方。線索藏在他們的需求裡；選錯也會有不同的荒唐後果。',
    note: '配方不是單純對錯題，意外結果也可能改變結局。',
  },
  {
    number: '02',
    title: '先接待最等不及的那位',
    text: '三位亡者同時等待。你服務其中一位時，三條耐心都會下降；耐心歸零會收到投訴，但不會跳過他。',
    note: '沒有整局倒數，請依耐心和線索安排服務順序。',
  },
  {
    number: '03',
    title: '配湯以後，還要好好回話',
    text: '每位亡者都有三種回應方式。完成三份服務後，系統會綜合配方、回應、投訴和彩蛋條件揭曉結局。',
    note: '特殊亡者偶爾會來抽查——大概每十次值班遇到一次。',
  },
];

class MengpoScene extends Phaser.Scene {
  constructor() {
    super('mengpo');
    this.phase = 'title';
    this.choiceCallbacks = {};
    this.enterCallback = null;
    this.barRefs = [];
    this.introIndex = 0;
    this.tutorialIndex = 0;
    this.roundNumber = 1;
    this.faqClicks = 0;
    this.potClicks = 0;
    this.toast = null;
  }

  create() {
    this.cameras.main.setBackgroundColor(COLORS.night);
    this.input.keyboard.on('keydown', (event) => this.handleKey(event));
    this.scale.on('resize', () => this.renderScreen());
    this.renderScreen();
  }

  update(_time, delta) {
    if (!this.model || !this.timerStarted || this.phase === 'title' || this.phase === 'ending') return;

    const elapsed = delta / 1000;
    for (const guest of this.model.guests) {
      if (guest.status === 'served' || guest.timedOut) continue;
      guest.patience = Math.max(0, guest.patience - PATIENCE_DRAIN_PER_SECOND * elapsed);
      if (guest.patience <= 0) {
        guest.timedOut = true;
        this.model.complaints += 1;
        this.model.timeouts += 1;
        this.model.messages.push(`${guest.name}等太久了，投訴箱多了一張單。`);
        if (guest.id === 'queue') this.model.flags.queueOverload = true;
        this.setToast(`投訴 +1　${guest.name} 的耐心用完了`);
      }
    }

    for (const ref of this.barRefs) {
      const ratio = Math.max(0, ref.guest.patience / ref.guest.maxPatience);
      ref.fill.width = Math.max(0, ref.width * ratio);
      ref.fill.setFillStyle(ratio < 0.28 ? 0xa5424b : ratio < 0.52 ? 0xd59c4f : 0x678d78);
      ref.label.setText(ref.guest.timedOut ? '已投訴' : `耐心 ${Math.ceil(ref.guest.patience)}%`);
      ref.label.setColor(ratio < 0.28 ? COLORS.red : COLORS.gray);
    }
  }

  handleKey(event) {
    if (this.phase === 'title' && (event.code === 'Enter' || event.code === 'Space')) {
      this.startIntro();
      return;
    }
    if (this.phase === 'intro' && (event.code === 'Enter' || event.code === 'Space')) {
      this.advanceIntro();
      return;
    }
    if (this.phase === 'tutorial' && (event.code === 'Enter' || event.code === 'Space')) {
      this.advanceTutorial();
      return;
    }
    if ((event.code === 'Enter' || event.code === 'Space') && this.enterCallback) {
      this.enterCallback();
      return;
    }

    const shortcut = String(event.key).toLowerCase();
    this.choiceCallbacks[shortcut]?.();
    if (event.code === 'Escape' && ['recipe', 'response'].includes(this.phase)) {
      this.activeGuestId = null;
      this.phase = 'queue';
      this.renderScreen();
    }
  }

  startIntro() {
    this.introIndex = 0;
    this.phase = 'intro';
    this.renderScreen();
  }

  advanceIntro() {
    if (this.introIndex < INTRO.length - 1) {
      this.introIndex += 1;
      this.renderScreen();
      return;
    }
    this.model = {
      guests: drawShift(),
      complaints: 0,
      timeouts: 0,
      recipeMistakes: 0,
      goodReplies: 0,
      cheapRecipes: 0,
      caseResults: [],
      messages: [],
      flags: {},
      eggs: { selfSoup: false, faq: false },
    };
    this.activeGuestId = null;
    this.timerStarted = false;
    this.tutorialIndex = 0;
    this.phase = 'tutorial';
    this.renderScreen();
  }

  advanceTutorial() {
    if (this.tutorialIndex < TUTORIAL.length - 1) {
      this.tutorialIndex += 1;
      this.renderScreen();
      return;
    }
    this.timerStarted = true;
    this.phase = 'queue';
    this.renderScreen();
  }

  get activeGuest() {
    return this.model?.guests.find((guest) => guest.id === this.activeGuestId);
  }

  renderScreen() {
    this.children.removeAll(true);
    this.choiceCallbacks = {};
    this.enterCallback = null;
    this.barRefs = [];

    if (this.phase === 'title') return this.drawTitle();
    if (this.phase === 'intro') return this.drawIntro();
    if (this.phase === 'tutorial') return this.drawTutorial();

    this.drawWorkroom();
    if (this.phase === 'queue') this.drawQueue();
    if (this.phase === 'recipe') this.drawRecipe();
    if (this.phase === 'response') this.drawResponse();
    if (this.phase === 'caseResult') this.drawCaseResult();
    if (this.phase === 'ending') this.drawEnding();
    this.drawFooter();
  }

  drawTitle() {
    this.add.rectangle(0, 0, WIDTH, HEIGHT, 0x171722).setOrigin(0, 0);
    this.drawBackdropSymbols();
    this.panel(108, 82, 1064, 638, COLORS.paper, COLORS.gold, 3);
    this.text(160, 122, '地府人事部　／　臨時櫃檯', 17, COLORS.plum, { bold: true });
    this.text(160, 189, '孟婆今天請假', 62, COLORS.ink, { bold: true });
    this.text(164, 275, '代班報到中。請把亡者送上下一站，', 25, COLORS.ink);
    this.text(164, 314, '並且盡量不要被投訴。', 25, COLORS.ink);
    this.panel(166, 385, 524, 106, '#e7dcc7', '#c4b59c', 1);
    this.text(192, 404, '本日工作內容', 16, COLORS.plum, { bold: true });
    this.text(192, 438, '挑配方　・　回應亡者　・　保住飯碗', 22, COLORS.ink, { bold: true });
    this.drawGhostStamp(928, 358, 124);
    this.text(870, 477, '地府臨時人員', 16, COLORS.gray, { align: 'center', width: 230 });
    this.button(164, 545, 380, 66, '開始代班　→', () => this.startIntro(), {
      fill: COLORS.plum,
      textColor: COLORS.white,
      size: 24,
      key: 'Enter',
    });
    this.text(164, 636, '建議使用滑鼠；鍵盤 Enter 也可以繼續。', 15, COLORS.gray);
    this.text(1110, 745, 'V 0.1　陰曹臨時版', 12, '#c2b59c', { align: 'right', width: 200 });
  }

  drawIntro() {
    this.add.rectangle(0, 0, WIDTH, HEIGHT, 0x171722).setOrigin(0, 0);
    this.drawBackdropSymbols();
    this.panel(110, 76, 1060, 650, COLORS.paper, COLORS.gold, 3);
    this.text(160, 120, '地府人事部　／　代班報到', 17, COLORS.plum, { bold: true });
    this.drawGhostStamp(1040, 172, 62);
    this.text(170, 227, INTRO[this.introIndex].speaker, 18, COLORS.plum, { bold: true });
    this.panel(160, 275, 950, 202, '#fffaf1', '#c4b59c', 2);
    this.text(205, 318, `「${INTRO[this.introIndex].text}」`, 30, COLORS.ink, {
      width: 850,
      wordWrap: { width: 850 },
      lineSpacing: 16,
    });
    this.text(165, 521, `報到劇情　${this.introIndex + 1} / ${INTRO.length}`, 15, COLORS.gray);
    this.button(164, 583, 360, 62, this.introIndex === INTRO.length - 1 ? '領取三張服務單　→' : '繼續　→', () => this.advanceIntro(), {
      fill: COLORS.plum,
      textColor: COLORS.white,
      size: 21,
      key: 'Enter',
    });
  }

  drawTutorial() {
    const page = TUTORIAL[this.tutorialIndex];
    this.add.rectangle(0, 0, WIDTH, HEIGHT, 0x171722).setOrigin(0, 0);
    this.drawBackdropSymbols();
    this.panel(110, 76, 1060, 650, COLORS.paper, COLORS.gold, 3);
    this.text(160, 120, '代班快速上手', 17, COLORS.plum, { bold: true });
    this.text(160, 165, `小教學 ${page.number} / 03`, 16, COLORS.gray, { bold: true });
    this.text(160, 216, page.title, 34, COLORS.ink, { bold: true });
    this.panel(160, 285, 950, 166, '#fffaf1', '#c4b59c', 2);
    this.text(200, 323, page.text, 23, COLORS.ink, {
      width: 860,
      wordWrap: { width: 860 },
      lineSpacing: 13,
    });
    this.panel(160, 475, 950, 70, '#e7dcc7', '#c4b59c', 1);
    this.text(187, 498, `小提醒　${page.note}`, 17, COLORS.plum, { width: 890, wordWrap: { width: 890 } });
    this.button(164, 583, 360, 62, this.tutorialIndex === TUTORIAL.length - 1 ? '開始服務三位亡者　→' : '下一則　→', () => this.advanceTutorial(), {
      fill: COLORS.plum,
      textColor: COLORS.white,
      size: 21,
      key: 'Enter',
    });
    if (this.tutorialIndex > 0) {
      this.button(545, 583, 180, 62, '上一則', () => {
        this.tutorialIndex -= 1;
        this.renderScreen();
      }, { fill: '#ddd0b8', textColor: COLORS.ink, size: 18 });
    }
  }

  drawWorkroom() {
    this.add.rectangle(0, 0, WIDTH, HEIGHT, 0x171722).setOrigin(0, 0);
    this.panel(28, 20, 1224, 760, COLORS.paper, COLORS.gold, 2);
    this.text(58, 39, '地府人事部　／　臨時櫃檯', 14, COLORS.plum, { bold: true });
    this.text(56, 61, '孟婆今天請假', 28, COLORS.ink, { bold: true });
    this.text(665, 57, `值班 ${String(this.roundNumber).padStart(2, '0')}　·　亡者 ${this.model.caseResults.length}/3`, 16, COLORS.gray, {
      align: 'right', width: 360,
    });
    this.button(1103, 38, 54, 42, '?', () => this.showFaqEgg(), {
      fill: '#e7dcc7', textColor: COLORS.plum, size: 23,
    });
    this.button(1164, 38, 54, 42, '♨', () => this.clickPotEgg(), {
      fill: '#e7dcc7', textColor: COLORS.plum, size: 23,
    });
    this.panel(52, 126, 356, 570, '#e7dcc7', '#c4b59c', 1);
    this.text(72, 143, '今日待辦　／　先服務誰？', 18, COLORS.ink, { bold: true });
    this.text(72, 171, '三條耐心同步下降', 13, COLORS.gray);
    this.drawGuestCards();
    this.panel(426, 126, 802, 570, '#fffaf1', '#c4b59c', 1);
    this.drawStampIcon(1184, 154);
  }

  drawGuestCards() {
    const x = 66;
    const y0 = 204;
    const w = 328;
    const h = 146;
    const gap = 12;

    this.model.guests.forEach((guest, index) => {
      const y = y0 + index * (h + gap);
      const isActive = guest.id === this.activeGuestId;
      const fill = guest.status === 'served' ? '#d7d0c2' : isActive ? '#f6e8c8' : COLORS.white;
      this.panel(x, y, w, h, fill, isActive ? COLORS.gold : '#c4b59c', isActive ? 2 : 1);
      this.add.circle(x + 29, y + 28, 19, guest.isSpecial ? 0x6c486d : 0xead8b8);
      this.text(x + 17, y + 14, guest.icon, 19, guest.isSpecial ? COLORS.white : COLORS.plum, { width: 25, align: 'center' });
      this.text(x + 57, y + 9, guest.name, 16, COLORS.ink, { bold: true, width: 250 });
      const status = guest.status === 'served' ? '已完成' : isActive ? '處理中' : guest.timedOut ? '等待中 · 已投訴' : guest.role;
      this.text(x + 57, y + 32, status, 12, guest.status === 'served' ? COLORS.gray : COLORS.plum, { width: 250 });
      this.text(x + 14, y + 57, guest.quote, 13, COLORS.ink, {
        width: 300,
        wordWrap: { width: 300 },
        lineSpacing: 1,
      });

      const barX = x + 16;
      const barY = y + 101;
      const barW = 198;
      this.add.rectangle(barX, barY, barW, 10, 0xd1c7b6).setOrigin(0, 0);
      const barFill = this.add.rectangle(barX, barY, barW * (guest.patience / guest.maxPatience), 10, 0x678d78).setOrigin(0, 0);
      const label = this.text(barX, barY + 14, guest.timedOut ? '已投訴' : `耐心 ${Math.ceil(guest.patience)}%`, 11, COLORS.gray);
      this.barRefs.push({ guest, fill: barFill, width: barW, label });

      if (guest.status !== 'served' && this.phase === 'queue') {
        const queueKey = ['Q', 'W', 'E'][index];
        this.button(x + 225, y + 103, 88, 30, `接待 ${queueKey}`, () => this.selectGuest(guest.id), {
          fill: guest.timedOut ? COLORS.red : COLORS.plum,
          textColor: COLORS.white,
          size: 13,
          key: queueKey,
        });
      } else if (guest.status === 'served') {
        this.text(x + 228, y + 111, '✓ 已送達', 13, COLORS.mint, { bold: true });
      }
    });
  }

  drawQueue() {
    const remaining = this.model.guests.filter((guest) => guest.status !== 'served').length;
    this.text(462, 159, remaining === 0 ? '三份服務單都處理好了' : '下一位，請孟婆決定', 27, COLORS.ink, { bold: true });
    if (remaining === 0) {
      this.text(464, 211, '投訴箱已經封存。現在來看看今天的地府評語。', 17, COLORS.gray);
      this.drawOutcomeSummary(462, 272, 720);
      this.button(463, 590, 360, 58, '揭曉今日結局　→', () => {
        this.model.ending = resolveEnding(this.model);
        this.phase = 'ending';
        this.timerStarted = false;
        this.renderScreen();
      }, { fill: COLORS.plum, textColor: COLORS.white, size: 20, key: 'Enter' });
      return;
    }

    this.text(464, 212, '點左側亡者卡片的「接待」，開始處理他的湯單。', 17, COLORS.gray, { width: 700 });
    this.panel(464, 270, 720, 118, '#f0e6d4', '#d5c6ac', 1);
    this.text(490, 292, '代班小抄', 15, COLORS.plum, { bold: true });
    this.text(490, 324, '找線索　→　選配方　→　選回應　→　看結果', 20, COLORS.ink, { bold: true });
    this.text(464, 422, `目前投訴：${this.model.complaints}　　已完成：${this.model.caseResults.length} / 3`, 17, COLORS.ink, { bold: true });
    this.drawOutcomeSummary(464, 474, 720);
  }

  drawRecipe() {
    const guest = this.activeGuest;
    if (!guest) return;
    this.text(462, 157, `接待中　／　${guest.name}`, 25, COLORS.ink, { bold: true, width: 650 });
    this.text(464, 199, guest.role, 14, COLORS.plum, { bold: true });
    this.panel(462, 231, 724, 122, '#f0e6d4', '#d5c6ac', 1);
    this.text(486, 248, '亡者需求', 14, COLORS.plum, { bold: true });
    this.text(486, 276, `「${guest.quote}」`, 18, COLORS.ink, { width: 670, wordWrap: { width: 670 }, lineSpacing: 3 });
    this.panel(462, 369, 724, 70, '#e6efea', '#b4cabe', 1);
    this.text(486, 390, `線索　${guest.clue}`, 15, '#355b49', { width: 670, wordWrap: { width: 670 } });
    this.text(464, 466, '挑一款湯　／　鍵盤 1–3 也可以選', 18, COLORS.ink, { bold: true });

    RECIPES.forEach((recipe, index) => {
      const x = 462 + index * 245;
      this.panel(x, 505, 225, 126, COLORS.white, recipe.color, 2);
      this.text(x + 18, 519, recipe.icon, 29, recipe.color, { bold: true });
      this.text(x + 57, 521, recipe.name, 19, COLORS.ink, { bold: true, width: 150 });
      this.text(x + 17, 560, recipe.hint, 14, COLORS.gray, { width: 190, wordWrap: { width: 190 } });
      this.button(x + 16, 593, 193, 28, `選這碗　${index + 1}`, () => this.selectRecipe(recipe.id), {
        fill: recipe.color,
        textColor: COLORS.ink,
        size: 13,
        key: String(index + 1),
      });
    });
    this.button(1043, 160, 139, 34, '先放回待辦', () => this.returnToQueue(), {
      fill: '#e7dcc7', textColor: COLORS.ink, size: 12,
    });
  }

  drawResponse() {
    const guest = this.activeGuest;
    const recipe = RECIPES.find((item) => item.id === this.selectedRecipeId);
    if (!guest || !recipe) return;
    this.text(462, 157, `湯已備好　／　${guest.name}`, 25, COLORS.ink, { bold: true, width: 670 });
    this.panel(462, 222, 724, 88, '#f0e6d4', '#d5c6ac', 1);
    this.text(486, 238, '你端上了', 13, COLORS.gray);
    this.text(486, 262, `${recipe.icon}　${recipe.name}`, 22, COLORS.ink, { bold: true });
    this.text(462, 337, '亡者看著你，等你回話。', 18, COLORS.plum, { bold: true });

    guest.replies.forEach((reply, index) => {
      const y = 382 + index * 88;
      this.panel(462, y, 724, 74, COLORS.white, '#d5c6ac', 1);
      this.text(481, y + 13, `0${index + 1}`, 15, COLORS.gold, { bold: true });
      this.text(527, y + 12, `「${reply.text}」`, 17, COLORS.ink, {
        width: 550,
        wordWrap: { width: 550 },
      });
      this.button(1091, y + 18, 74, 38, `選 ${index + 1}`, () => this.chooseReply(reply), {
        fill: COLORS.plum,
        textColor: COLORS.white,
        size: 14,
        key: String(index + 1),
      });
    });
    this.button(1043, 160, 139, 34, '先放回待辦', () => this.returnToQueue(), {
      fill: '#e7dcc7', textColor: COLORS.ink, size: 12,
    });
  }

  drawCaseResult() {
    const result = this.model.currentResult;
    if (!result) return;
    this.text(462, 159, result.heading, 27, COLORS.ink, { bold: true });
    this.panel(462, 220, 724, 223, result.recipeCorrect && result.replyCorrect ? '#e6efea' : '#f4e6d8', '#d5c6ac', 1);
    this.text(493, 250, result.guest.icon, 46, COLORS.plum, { bold: true });
    this.text(560, 246, result.guest.name, 20, COLORS.ink, { bold: true });
    this.text(560, 283, result.message, 18, COLORS.ink, { width: 575, wordWrap: { width: 575 }, lineSpacing: 6 });
    this.text(493, 377, `配方：${result.recipeName}　·　${result.recipeCorrect ? '線索吻合' : '意外發展'}`, 14, COLORS.gray);
    this.text(493, 402, `投訴箱：${this.model.complaints}　·　其他亡者仍在等待`, 14, this.model.complaints ? COLORS.red : COLORS.mint);
    this.drawOutcomeSummary(462, 473, 720);
    const allDone = this.model.guests.every((guest) => guest.status === 'served');
    this.button(463, 607, 360, 56, allDone ? '查看今日結局　→' : '回到待辦清單　→', () => {
      if (allDone) {
        this.model.ending = resolveEnding(this.model);
        this.phase = 'ending';
        this.timerStarted = false;
      } else {
        this.phase = 'queue';
      }
      this.renderScreen();
    }, { fill: COLORS.plum, textColor: COLORS.white, size: 19, key: 'Enter' });
  }

  drawEnding() {
    const ending = this.model.ending;
    this.text(463, 159, '本日代班紀錄　／　結案', 15, COLORS.plum, { bold: true });
    this.panel(462, 208, 724, 337, '#f0e6d4', COLORS.gold, 2);
    this.text(493, 237, ending.seal, 15, COLORS.plum, { bold: true });
    this.text(493, 279, ending.title, 32, COLORS.ink, { bold: true, width: 650, wordWrap: { width: 650 } });
    this.text(496, 333, ending.subtitle, 17, COLORS.rose, { bold: true, width: 640 });
    this.text(496, 374, ending.body, 18, COLORS.ink, {
      width: 640,
      wordWrap: { width: 640 },
      lineSpacing: 7,
    });
    this.drawOutcomeSummary(462, 563, 720);
    this.button(463, 647, 358, 45, '再代一次班　↻', () => {
      this.roundNumber += 1;
      this.model = null;
      this.timerStarted = false;
      this.phase = 'title';
      this.renderScreen();
    }, { fill: COLORS.plum, textColor: COLORS.white, size: 18, key: 'Enter' });
  }

  drawOutcomeSummary(x, y, width) {
    const guestCount = this.model.caseResults.length;
    const best = this.model.caseResults.filter((result) => result.recipeCorrect).length;
    const text = `最佳配方 ${best}/${guestCount}　·　投訴 ${this.model.complaints}　·　耐心耗盡 ${this.model.timeouts}`;
    this.panel(x, y, width, 59, '#e7dcc7', '#c4b59c', 1);
    this.text(x + 20, y + 19, text, 15, COLORS.ink, { bold: true, width: width - 40 });
  }

  drawFooter() {
    this.text(58, 716, '提示：服務途中三條耐心同步下降　·　Q/W/E 接待　·　1–3 選湯與回應　·　Esc 放回待辦', 12, '#d4c7b0');
    this.text(1110, 716, '無整局倒數', 12, '#d4c7b0', { align: 'right', width: 110 });
  }

  drawBackdropSymbols() {
    const graphics = this.add.graphics();
    graphics.lineStyle(1, 0x373441, 0.75);
    for (let x = 18; x < WIDTH; x += 40) graphics.lineBetween(x, 0, x, HEIGHT);
    for (let y = 20; y < HEIGHT; y += 40) graphics.lineBetween(0, y, WIDTH, y);
    this.add.circle(1040, 223, 143, 0x272532, 0.54);
    this.add.circle(1040, 223, 110, 0x171722, 0.88);
  }

  drawGhostStamp(x, y, radius) {
    this.add.circle(x, y, radius, 0xead7b7);
    this.add.circle(x, y - radius * 0.15, radius * 0.47, 0xffffff);
    this.add.ellipse(x, y + radius * 0.34, radius * 1.12, radius * 0.78, 0xffffff);
    this.add.circle(x - radius * 0.17, y - radius * 0.2, Math.max(3, radius * 0.06), 0x443646);
    this.add.circle(x + radius * 0.17, y - radius * 0.2, Math.max(3, radius * 0.06), 0x443646);
    this.add.ellipse(x, y + radius * 0.31, radius * 0.16, radius * 0.1, 0xd58b75);
  }

  drawStampIcon(x, y) {
    this.add.circle(x, y, 15, 0xead7b7);
    this.text(x - 9, y - 11, '陰', 15, COLORS.plum, { bold: true, width: 18, align: 'center' });
  }

  panel(x, y, width, height, fill = COLORS.white, stroke = null, lineWidth = 1) {
    this.add.rectangle(x, y, width, height, this.toNumber(fill)).setOrigin(0, 0);
    if (stroke) {
      this.add.graphics().lineStyle(lineWidth, this.toNumber(stroke), 1).strokeRect(x, y, width, height);
    }
  }

  text(x, y, content, size = 16, color = COLORS.ink, extra = {}) {
    return this.add.text(x, y, content, {
      fontFamily: FONT,
      fontSize: size,
      color,
      lineSpacing: 2,
      ...extra,
    });
  }

  button(x, y, width, height, label, action, options = {}) {
    const fill = options.fill ?? COLORS.plum;
    const textColor = options.textColor ?? COLORS.white;
    const background = this.add.rectangle(x, y, width, height, this.toNumber(fill)).setOrigin(0, 0);
    const border = this.add.graphics();
    border.lineStyle(options.lineWidth ?? 1, this.toNumber(options.stroke ?? fill), 1).strokeRect(x, y, width, height);
    const labelText = this.text(x + width / 2, y + height / 2, label, options.size ?? 17, textColor, {
      bold: options.bold ?? true,
      align: 'center',
      wordWrap: { width: width - 18 },
    }).setOrigin(0.5);

    background.setInteractive({ useHandCursor: true });
    background.on('pointerover', () => {
      background.setFillStyle(this.toNumber(options.hoverFill ?? '#815065'));
      this.tweens.add({ targets: [background, labelText], scaleX: 1.015, scaleY: 1.035, duration: 90, yoyo: true });
    });
    background.on('pointerout', () => background.setFillStyle(this.toNumber(fill)));
    background.on('pointerdown', () => {
      this.tweens.add({ targets: [background, labelText], scaleX: 0.985, scaleY: 0.96, duration: 70, yoyo: true });
      action();
    });

    if (options.key === 'Enter') this.enterCallback = action;
    else if (options.key) this.choiceCallbacks[String(options.key).toLowerCase()] = action;
  }

  selectGuest(id) {
    const guest = this.model.guests.find((item) => item.id === id);
    if (!guest || guest.status === 'served') return;
    guest.status = 'serving';
    this.activeGuestId = id;
    this.phase = 'recipe';
    this.renderScreen();
  }

  selectRecipe(recipeId) {
    this.selectedRecipeId = recipeId;
    this.phase = 'response';
    this.renderScreen();
  }

  chooseReply(reply) {
    const guest = this.activeGuest;
    if (!guest) return;
    const recipe = RECIPES.find((item) => item.id === this.selectedRecipeId);
    const recipeCorrect = recipe.id === guest.idealRecipe;
    const replyCorrect = reply.tone === guest.bestTone;
    const timedOut = guest.timedOut;
    const allWrong = !recipeCorrect && !replyCorrect;

    if (recipeCorrect) this.model.bestRecipes = (this.model.bestRecipes ?? 0) + 1;
    else this.model.recipeMistakes += 1;
    if (replyCorrect) this.model.goodReplies += 1;
    if (recipe.id === 'forget') this.model.cheapRecipes += 1;
    if (allWrong) this.model.complaints += 1;

    if (guest.id === 'refuser' && reply.tone === 'gentle') this.model.flags.strikeSupport = true;
    if (guest.id === 'notice' && (!recipeCorrect || reply.tone === 'silly')) this.model.flags.noticeUnclear = true;
    if (guest.id === 'auditor' && recipeCorrect && replyCorrect) this.model.flags.auditPassed = true;
    if (guest.id === 'memory' && recipe.id === 'keep') this.model.flags.subscriptionContinued = true;
    if (guest.id === 'meeting' && reply.tone === 'silly') this.model.flags.meetingLinkLeaked = true;
    if (guest.id === 'unsubscribe' && reply.tone === 'formal' && recipe.id === 'forget') this.model.flags.unsubscribeSucceeded = true;
    if (guest.id === 'queue' && timedOut) this.model.flags.queueOverload = true;

    const message = recipeCorrect && replyCorrect
      ? guest.bestOutcome
      : guest.oddOutcome;
    guest.status = 'served';
    guest.recipeId = recipe.id;
    guest.replyTone = reply.tone;
    guest.result = message;

    const result = {
      guest,
      recipeId: recipe.id,
      recipeName: recipe.name,
      recipeCorrect,
      replyCorrect,
      replyTone: reply.tone,
      timedOut,
      message,
      heading: recipeCorrect && replyCorrect ? '這位亡者已順利送達' : '服務完成，但結果有點出乎意料',
    };
    this.model.caseResults.push(result);
    this.model.currentResult = result;
    this.model.messages.push(message);
    this.activeGuestId = id;
    this.phase = 'caseResult';
    this.renderScreen();
  }

  returnToQueue() {
    if (this.activeGuest && this.activeGuest.status !== 'served') this.activeGuest.status = 'waiting';
    this.activeGuestId = null;
    this.phase = 'queue';
    this.renderScreen();
  }

  showFaqEgg() {
    this.faqClicks += 1;
    if (this.faqClicks === 3) {
      this.model.eggs.faq = true;
      this.setToast('陰間 AI 客服：您已過世，請勿重複提交申訴。');
      return;
    }
    this.setToast('地府服務台　·　常見問題請按三次。');
  }

  clickPotEgg() {
    this.potClicks += 1;
    this.setToast(this.potClicks >= 5 ? '你偷喝了一口，怎麼突然忘記自己是誰？' : '湯杓碰到鍋沿：叮。');
    if (this.potClicks >= 5 && this.model) this.model.eggs.selfSoup = true;
  }

  setToast(message) {
    if (this.toast) this.toast.destroy();
    this.toast = this.text(720, 730, message, 13, COLORS.white, { backgroundColor: '#393342', padding: { x: 10, y: 7 } });
    this.toast.setOrigin(0.5, 0.5);
    this.time.delayedCall(2200, () => {
      if (this.toast?.active) this.toast.destroy();
      this.toast = null;
    });
  }

  toNumber(color) {
    return Number.parseInt(String(color).replace('#', ''), 16);
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game-container',
  width: WIDTH,
  height: HEIGHT,
  backgroundColor: COLORS.night,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  render: {
    antialias: true,
    pixelArt: false,
    roundPixels: true,
  },
  input: {
    activePointers: 2,
    keyboard: true,
  },
  scene: [MengpoScene],
});
