import Phaser from 'phaser';
import { ENDINGS, NEWS_TICKER, RECIPES } from './data.js';
import { drawShift, PATIENCE_DRAIN_PER_SECOND, resolveEnding, scoreCase } from './logic.js';
import './style.css';

const WIDTH = 1280;
const HEIGHT = 800;
const FONT = '"Microsoft JhengHei", "Noto Sans TC", "PingFang TC", sans-serif';
const COLORS = {
  night: '#37363f',
  plum: '#795665',
  rose: '#b98483',
  ink: '#3d3b42',
  paper: '#f2ead9',
  paperDeep: '#e4d8c1',
  white: '#fbf7ec',
  gold: '#c5a477',
  mint: '#84998b',
  red: '#ad797c',
  gray: '#77747b',
  line: '#c8bda8',
};

const ART = Object.fromEntries(Array.from({ length: 17 }, (_, index) => {
  const number = String(index + 1).padStart(2, '0');
  return [`art${number}`, `${import.meta.env.BASE_URL}art/${number}.webp`];
}));
ART.scene01 = `${import.meta.env.BASE_URL}art/scene01.webp`;
ART.scene02 = `${import.meta.env.BASE_URL}art/scene02.webp`;
ART.scene03 = `${import.meta.env.BASE_URL}art/scene03.webp`;
const GUEST_ART = {
  refuser: 'art07',
  notice: 'art08',
  memory: 'art09',
  auditor: 'art10',
};

const CLOSING_PUNCTUATION = new Set(Array.from('，。；：！？、）」』】》〉〕〗〙〛〉’”％…'));

function glyphWidth(character, fontSize, bold = false) {
  const codePoint = character.codePointAt(0);
  const isWide = /[\u1100-\u11ff\u2e80-\ua4cf\uac00-\ud7af\uf900-\ufaff\ufe10-\ufe6f\uff01-\uff60\uffe0-\uffe6]/u.test(character)
    || codePoint > 0x1f000;
  const scale = isWide ? 1 : /\s/u.test(character) ? 0.36 : 0.58;
  return fontSize * scale * (bold ? 1.035 : 1);
}

function wrapCanvasText(content, maxWidth, fontSize, bold = false) {
  if (!maxWidth || maxWidth <= 0) return String(content);
  const lines = [];

  for (const paragraph of String(content).split('\n')) {
    if (paragraph === '') {
      lines.push('');
      continue;
    }

    let line = '';
    let lineWidth = 0;
    for (const character of Array.from(paragraph)) {
      const width = glyphWidth(character, fontSize, bold);
      if (line && lineWidth + width > maxWidth && !CLOSING_PUNCTUATION.has(character)) {
        lines.push(line.trimEnd());
        line = character.trimStart();
        lineWidth = glyphWidth(line, fontSize, bold);
      } else {
        line += character;
        lineWidth += width;
      }
    }
    if (line) lines.push(line.trimEnd());
  }

  return lines.join('\n');
}

const INTRO = [
  {
    scene: '奈何橋頭，孟婆湯攤位',
    visual: 'bridge',
    speaker: '旁白',
    text: '地府，奈何橋頭。\n每天有三萬七千位亡者在這裡排隊，\n等一碗湯，忘掉前世，重新投胎。\n這份工作，孟婆已經做了兩千年，\n從來沒有請過假。\n直到今天。',
  },
  {
    scene: '攤位上的便條紙',
    visual: 'note',
    speaker: '孟婆留下的便條',
    text: '各位同仁好，我去陽間參加我外甥的\n婚禮，三天。\n湯鍋在左邊，鍋鏟在右邊，不要弄混。\n配方在抽屜第二格，千萬不要自己亂加料。\n——孟婆\n\nP.S. 冰箱裡的綠豆湯是我的，\n誰喝誰投胎。',
  },
  {
    scene: '人事部緊急徵調',
    visual: 'roster',
    speaker: '旁白',
    text: '於是，閻王在人事部門翻了三小時通訊錄，\n最後點到了你。',
  },
  {
    scene: '閻王辦公室',
    visual: 'king',
    speaker: '閻王',
    text: '你就是新來的代班？很好。就你了。',
  },
  {
    scene: '任用資格確認',
    visual: 'kingPhone',
    speaker: '你',
    text: '等一下，我是男的，孟婆不是應該是……',
  },
  {
    scene: '閻王終於抬頭',
    visual: 'kingLook',
    speaker: '閻王',
    text: '（閻王終於抬頭，面無表情。）\n孟婆怎麼就不能是男的？',
  },
  {
    scene: '職稱，不是性別',
    visual: 'bull',
    speaker: '你／閻王／牛頭',
    text: '你：可是「婆」這個字……\n閻王：「婆」是職稱，不是性別。我們地府很進步，性別平等，只歧視壽命太短的。\n牛頭（默默舉手）：報告，我也是請領過「牛頭女士」稱謂的。',
  },
  {
    scene: '人事流程：立即上工',
    visual: 'apron',
    speaker: '閻王',
    text: '少廢話。圍裙穿上。',
  },
  {
    scene: '今日孟婆，強制上任',
    visual: 'apronHero',
    speaker: '旁白',
    text: '你被強行套上一件印著「今日孟婆」的粉紅色圍裙。\n它還附有一張不能退貨的人事簽收單。',
  },
  {
    scene: '代班守則（一）',
    visual: 'rules',
    speaker: '閻王',
    text: '規則很簡單，三條。\n一、每位亡者都要喝湯；不喝不能投胎，不能投胎就會堵在橋上。',
  },
  {
    scene: '代班守則（二）',
    visual: 'rules',
    speaker: '閻王',
    text: '二、不准洩漏前世記憶，否則業績扣光。\n三、客訴率超過 30% 的話……',
  },
  {
    scene: '績效面談通知',
    visual: 'review',
    speaker: '閻王',
    text: '（閻王把手機螢幕轉過來，上面跳出血紅色的「績效面談」通知。）\n……你會親自體驗一下，喝湯是什麼感覺。',
  },
  {
    scene: '第一位亡者已經排到櫃檯',
    visual: 'firstGuest',
    speaker: '亡者 A',
    text: '（遠處傳來吵鬧聲。亡者 A 拍桌。）\n我還沒死！我要找你們主管！！\n\n旁白：第一天上班，開始。',
  },
];

const TUTORIAL = [
  {
    number: '01',
    title: '看線索，挑一碗合適的湯',
    text: '接待前先讀他的生前檔案。每位亡者都有一款最適合的配方，線索藏在故事裡；選錯也會有不同的荒唐後果。',
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
    text: '每位亡者都有三種回應方式。湯和回話都選對，就能解鎖這位亡者的隱藏結尾；完成三份服務後揭曉今日結局。',
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
    this.unlockedEndings = new Set();
    this.galleryReturnPhase = 'title';
    this.selectedEndingId = null;
    this.tickerIndex = 0;
    this.tickerText = null;
  }

  preload() {
    Object.entries(ART).forEach(([key, url]) => this.load.image(key, url));
  }

  create() {
    this.cameras.main.setBackgroundColor(COLORS.night);
    this.unlockedEndings = this.readUnlockedEndings();
    this.input.keyboard.on('keydown', (event) => this.handleKey(event));
    if (import.meta.env.DEV) window.__mengpo = this;
    this.scale.on('resize', () => this.renderScreen());
    this.tickerIndex = Math.floor(Math.random() * NEWS_TICKER.length);
    this.time.addEvent({
      delay: 9000,
      loop: true,
      callback: () => {
        this.tickerIndex = (this.tickerIndex + 1) % NEWS_TICKER.length;
        if (this.tickerText?.active) this.tickerText.setText(`地府快訊｜${NEWS_TICKER[this.tickerIndex]}`);
      },
    });
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
    if (this.phase === 'galleryDetail' && event.code === 'Escape') {
      this.phase = 'gallery';
      this.renderScreen();
      return;
    }
    if (this.phase === 'gallery' && event.code === 'Escape') {
      this.closeGallery();
      return;
    }
    if ((event.code === 'Enter' || event.code === 'Space') && this.enterCallback) {
      this.enterCallback();
      return;
    }

    const shortcut = String(event.key).toLowerCase();
    this.choiceCallbacks[shortcut]?.();
    if (event.code === 'Escape' && ['story', 'recipe', 'response'].includes(this.phase)) {
      this.returnToQueue();
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
    this.tutorialIndex = 0;
    this.model = this.createShiftModel();
    this.activeGuestId = null;
    this.timerStarted = false;
    this.phase = 'tutorial';
    this.renderScreen();
  }

  createShiftModel() {
    return {
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
  }

  startShift() {
    this.model = this.createShiftModel();
    this.activeGuestId = null;
    this.timerStarted = true;
    this.phase = 'queue';
    this.renderScreen();
  }

  startFromTitle() {
    if (this.storySeen()) {
      this.startShift();
      return;
    }
    this.startIntro();
  }

  storySeen() {
    try {
      return localStorage.getItem('mengpo-story-seen') === 'true';
    } catch {
      return false;
    }
  }

  readUnlockedEndings() {
    try {
      const parsed = JSON.parse(localStorage.getItem('mengpo-unlocked-endings') || '[]');
      return new Set(Array.isArray(parsed) ? parsed : []);
    } catch {
      return new Set();
    }
  }

  unlockEnding(ending) {
    const match = Object.entries(ENDINGS).find(([, entry]) => entry === ending);
    if (!match) return;
    this.unlockedEndings.add(match[0]);
    try {
      localStorage.setItem('mengpo-unlocked-endings', JSON.stringify([...this.unlockedEndings]));
    } catch {
      // The current run still records its ending when persistent storage is unavailable.
    }
  }

  revealEnding() {
    this.model.ending = resolveEnding(this.model);
    this.unlockEnding(this.model.ending);
    this.phase = 'ending';
    this.timerStarted = false;
    this.renderScreen();
  }

  openGallery(returnPhase = this.phase) {
    this.galleryReturnPhase = returnPhase;
    this.phase = 'gallery';
    this.renderScreen();
  }

  closeGallery() {
    this.phase = this.galleryReturnPhase;
    this.renderScreen();
  }

  advanceTutorial() {
    if (this.tutorialIndex < TUTORIAL.length - 1) {
      this.tutorialIndex += 1;
      this.renderScreen();
      return;
    }
    try {
      localStorage.setItem('mengpo-story-seen', 'true');
    } catch {
      // Keep the current session usable even when browser storage is disabled.
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
    if (this.phase === 'gallery') return this.drawGallery();
    if (this.phase === 'galleryDetail') return this.drawGalleryDetail();

    this.drawWorkroom();
    if (this.phase === 'queue') this.drawQueue();
    if (this.phase === 'story') this.drawStory();
    if (this.phase === 'recipe') this.drawRecipe();
    if (this.phase === 'response') this.drawResponse();
    if (this.phase === 'caseResult') this.drawCaseResult();
    if (this.phase === 'ending') this.drawEnding();
    this.drawFooter();
  }

  drawTitle() {
    this.add.rectangle(0, 0, WIDTH, HEIGHT, this.toNumber(COLORS.night)).setOrigin(0, 0);
    this.drawBackdropSymbols();
    this.panel(108, 82, 1064, 638, COLORS.paper, COLORS.gold, 3);
    this.text(160, 122, '地府人事部　／　臨時櫃檯', 17, COLORS.plum, { bold: true });
    this.text(160, 189, '孟婆今天請假', 62, COLORS.ink, { bold: true });
    this.text(164, 275, '代班報到中。請把亡者送上下一站，', 25, COLORS.ink);
    this.text(164, 314, '並且盡量不要被投訴。', 25, COLORS.ink);
    this.panel(166, 385, 524, 106, '#e7dcc7', '#c4b59c', 1);
    this.text(192, 404, '本日工作內容', 16, COLORS.plum, { bold: true });
    this.text(192, 438, '挑配方　・　回應亡者　・　保住飯碗', 22, COLORS.ink, { bold: true });
    this.drawArtFrame(786, 176, 380, 252, 'art01', 350, 218);
    this.drawArtFrame(856, 444, 240, 210, 'art04', 174, 174);
    this.text(870, 665, '奈何橋頭　·　地府臨時人員', 16, COLORS.gray, { align: 'center', width: 270 });
    this.button(164, 545, 380, 66, '開始代班　→', () => this.startFromTitle(), {
      fill: COLORS.plum,
      textColor: COLORS.white,
      size: 24,
      key: 'Enter',
    });
    this.button(164, 625, 300, 48, `結局圖鑑　${this.unlockedEndings.size} / ${Object.keys(ENDINGS).length}`, () => this.openGallery('title'), {
      fill: '#e4d8c1', textColor: COLORS.plum, size: 17, key: 'g',
    });
    this.text(484, 641, '已看過開場後，新一局會直接開始。', 14, COLORS.gray, { width: 280 });
    this.text(1110, 745, 'V 0.1　陰曹臨時版', 12, '#c2b59c', { align: 'right', width: 200 });
  }

  drawGallery() {
    this.add.rectangle(0, 0, WIDTH, HEIGHT, this.toNumber(COLORS.night)).setOrigin(0, 0);
    this.drawBackdropSymbols();
    this.panel(52, 40, 1176, 720, COLORS.paper, null, 0);
    this.add.rectangle(82, 72, 8, 50, this.toNumber(COLORS.rose)).setOrigin(0, 0);
    this.text(108, 72, '地府檔案室　／　已解鎖的去向', 16, COLORS.plum, { bold: true });
    this.text(108, 108, '結局圖鑑', 38, COLORS.ink, { bold: true });
    this.text(110, 160, `已解鎖 ${this.unlockedEndings.size} / ${Object.keys(ENDINGS).length} 個結局　·　選擇已解鎖項目可閱讀小劇場`, 17, COLORS.gray, { width: 1000 });

    Object.entries(ENDINGS).forEach(([id, ending], index) => {
      const column = index % 3;
      const row = Math.floor(index / 3);
      const x = 90 + column * 370;
      const y = 214 + row * 78;
      const unlocked = this.unlockedEndings.has(id);
      const label = `${unlocked ? '已解鎖　✦' : '尚未解鎖　·'}　${ending.title}`;
      this.button(x, y, 350, 64, label, () => {
        if (!unlocked) {
          this.setToast('這個結局還沒有登錄到地府檔案室。');
          return;
        }
        this.selectedEndingId = id;
        this.phase = 'galleryDetail';
        this.renderScreen();
      }, {
        fill: unlocked ? COLORS.white : '#e9e3d7',
        textColor: unlocked ? COLORS.ink : '#88838a',
        stroke: unlocked ? '#c8bda8' : '#ded6c7',
        size: 15,
      });
    });

    this.button(90, 650, 290, 54, '返回　→', () => this.closeGallery(), {
      fill: COLORS.plum, textColor: COLORS.white, size: 18, key: 'Enter',
    });
    this.text(404, 668, '按 Esc 返回上一頁', 14, COLORS.gray);
  }

  drawGalleryDetail() {
    const ending = ENDINGS[this.selectedEndingId];
    if (!ending || !this.unlockedEndings.has(this.selectedEndingId)) {
      this.phase = 'gallery';
      return this.drawGallery();
    }

    this.add.rectangle(0, 0, WIDTH, HEIGHT, this.toNumber(COLORS.night)).setOrigin(0, 0);
    this.drawBackdropSymbols();
    this.panel(52, 40, 1176, 720, COLORS.paper, null, 0);
    this.text(108, 72, `結局圖鑑　／　${ending.seal}`, 16, COLORS.plum, { bold: true });
    this.text(108, 119, ending.title, 42, COLORS.ink, { bold: true, width: 1040 });
    this.text(110, 177, ending.subtitle, 20, COLORS.rose, { bold: true, width: 1000 });
    this.panel(108, 228, 1064, 390, COLORS.white, null, 0);
    this.text(144, 254, '結局小劇場', 15, COLORS.plum, { bold: true });
    this.text(144, 292, ending.story, 22, COLORS.ink, {
      width: 990,
      lineSpacing: 5,
    });
    this.button(108, 652, 330, 56, '回到結局圖鑑　→', () => {
      this.phase = 'gallery';
      this.renderScreen();
    }, { fill: COLORS.plum, textColor: COLORS.white, size: 18, key: 'Enter' });
  }

  drawIntro() {
    this.add.rectangle(0, 0, WIDTH, HEIGHT, this.toNumber(COLORS.night)).setOrigin(0, 0);
    this.drawBackdropSymbols();
    const beat = INTRO[this.introIndex];
    this.panel(58, 42, 1164, 716, COLORS.paper, null, 0);
    this.add.rectangle(86, 70, 8, 52, this.toNumber(COLORS.rose)).setOrigin(0, 0);
    this.text(112, 70, '奈何橋頭　／　臨時代班紀事', 17, COLORS.plum, { bold: true });
    this.text(112, 113, beat.scene, 33, COLORS.ink, { bold: true, width: 620, wordWrap: { width: 620 } });

    this.panel(96, 174, 650, 446, COLORS.white, null, 0);
    this.add.ellipse(119, 198, 30, 30, 0xe8d8bb);
    this.text(103, 183, '陰', 15, COLORS.plum, { bold: true, width: 32, align: 'center' });
    this.text(151, 185, beat.speaker, 17, COLORS.rose, { bold: true, width: 540 });
    this.text(132, 232, beat.text, 23, COLORS.ink, {
      width: 578,
      wordWrap: { width: 578 },
      lineSpacing: 9,
    });

    this.panel(786, 142, 380, 478, '#e8deca', null, 0);
    this.drawIntroIllustration(beat.visual);
    this.text(112, 652, `代班劇情　${String(this.introIndex + 1).padStart(2, '0')} / ${INTRO.length}`, 14, COLORS.gray);
    this.button(820, 660, 346, 60, this.introIndex === INTRO.length - 1 ? '開始營業　→' : '下一幕　→', () => this.advanceIntro(), {
      fill: COLORS.plum,
      textColor: COLORS.white,
      size: 21,
      key: 'Enter',
    });
    this.text(112, 695, 'Enter 繼續　·　現在離開還來得及嗎？', 13, COLORS.gray);
  }

  drawIntroIllustration(kind) {
    const panel = { x: 802, y: 158, width: 348, height: 446 };
    const portrait = (key, width = 286, height = 286) => {
      this.drawArtFrame(panel.x, panel.y, panel.width, panel.height, key, width, height);
    };
    const scene = ({ bridge: 'scene01', note: 'scene02', roster: 'scene03' })[kind];
    if (scene) {
      portrait(scene, 328, 414);
      return;
    }

    if (kind === 'king' || kind === 'kingPhone' || kind === 'kingLook') {
      portrait('art05', 286, 286);
    } else if (kind === 'bull') {
      const cardY = panel.y + 88;
      this.drawArtFrame(panel.x + 8, cardY, 158, 270, 'art05', 154, 154);
      this.drawArtFrame(panel.x + 182, cardY, 158, 270, 'art06', 154, 154);
      this.text(panel.x + 54, cardY + 224, '閻王', 14, COLORS.plum, { bold: true, width: 70, align: 'center' });
      this.text(panel.x + 228, cardY + 224, '牛頭', 14, COLORS.plum, { bold: true, width: 70, align: 'center' });
    } else if (kind === 'apron') {
      const roles = [
        ['art05', '閻王'],
        ['art06', '牛頭'],
        ['art04', '代班孟婆'],
      ];
      roles.forEach(([key, label], index) => {
        const x = panel.x + 6 + index * 114;
        const y = panel.y + 96;
        this.drawArtFrame(x, y, 108, 250, key, 112, 112);
        this.text(x + 8, y + 212, label, 12, COLORS.plum, { bold: true, width: 92, align: 'center' });
      });
    } else if (kind === 'apronHero') {
      portrait('art04', 286, 286);
    } else if (kind === 'rules') {
      portrait(this.introIndex === 9 ? 'art14' : 'art13', 286, 286);
    } else if (kind === 'review') {
      portrait('art17', 286, 286);
    } else if (kind === 'firstGuest') {
      portrait('art07', 286, 286);
    }
  }

  drawArt(key, x, y, width, height, alpha = 1) {
    if (!this.textures.exists(key)) return null;
    return this.add.image(x, y, key).setOrigin(0.5).setDisplaySize(width, height).setAlpha(alpha);
  }

  drawArtFrame(x, y, width, height, key, artWidth, artHeight) {
    this.panel(x, y, width, height, '#f5eee0', '#d4c7b2', 1);
    return this.drawArt(key, x + width / 2, y + height / 2, artWidth, artHeight);
  }

  drawTutorial() {
    const page = TUTORIAL[this.tutorialIndex];
    this.add.rectangle(0, 0, WIDTH, HEIGHT, this.toNumber(COLORS.night)).setOrigin(0, 0);
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
    this.add.rectangle(0, 0, WIDTH, HEIGHT, this.toNumber(COLORS.night)).setOrigin(0, 0);
    this.drawPaperGrain();
    this.panel(28, 20, 1224, 760, COLORS.paper, null, 0);
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
    this.tickerText = this.text(430, 100, `地府快訊｜${NEWS_TICKER[this.tickerIndex]}`, 13, COLORS.rose, { bold: true });
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
      const portraitKey = GUEST_ART[guest.id];
      this.add.circle(x + 29, y + 28, 22, guest.isSpecial ? 0x6c486d : 0xead8b8);
      if (portraitKey) {
        this.drawArt(portraitKey, x + 29, y + 28, 48, 48);
      } else {
        this.text(x + 17, y + 14, guest.icon, 19, guest.isSpecial ? COLORS.white : COLORS.plum, { width: 25, align: 'center' });
      }
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
      this.button(463, 590, 360, 58, '揭曉今日結局　→', () => this.revealEnding(), {
        fill: COLORS.plum, textColor: COLORS.white, size: 20, key: 'Enter',
      });
      return;
    }

    this.text(464, 212, '點左側亡者卡片的「接待」，開始處理他的湯單。', 17, COLORS.gray, { width: 700 });
    this.panel(464, 270, 720, 118, '#f0e6d4', '#d5c6ac', 1);
    this.text(490, 292, '代班小抄', 15, COLORS.plum, { bold: true });
    this.text(490, 324, '看生前檔案　→　選配方　→　選回應　→　看結果', 20, COLORS.ink, { bold: true });
    this.text(464, 422, `目前投訴：${this.model.complaints}　　已完成：${this.model.caseResults.length} / 3`, 17, COLORS.ink, { bold: true });
    this.drawOutcomeSummary(464, 474, 720);
    this.panel(914, 550, 250, 128, '#f0e6d4', '#d5c6ac', 1);
    this.text(934, 562, '三位亡者候位中', 13, COLORS.plum, { bold: true });
    this.drawArt('art11', 1039, 622, 210, 102);
  }

  drawStory() {
    const guest = this.activeGuest;
    if (!guest) return;
    this.text(462, 157, `生前檔案　／　${guest.name}`, 25, COLORS.ink, { bold: true, width: 560 });
    this.text(464, 199, guest.role, 14, COLORS.plum, { bold: true });
    const portraitKey = GUEST_ART[guest.id];
    const storyWidth = portraitKey ? 510 : 660;
    this.panel(462, 231, 724, 222, '#f0e6d4', '#d5c6ac', 1);
    if (portraitKey) this.drawArtFrame(1031, 254, 136, 176, portraitKey, 122, 122);
    let y = 252;
    guest.story.forEach((line, index) => {
      this.text(486, y, `0${index + 1}`, 14, COLORS.gold, { bold: true });
      const body = this.text(522, y - 2, line, 17, COLORS.ink, { width: storyWidth - 40, wordWrap: { width: storyWidth - 40 }, lineSpacing: 4 });
      y += body.height + 16;
    });
    this.panel(462, 474, 724, 84, COLORS.white, '#d5c6ac', 1);
    this.text(486, 486, '亡者對你說', 12, COLORS.plum, { bold: true });
    this.text(486, 508, `「${guest.quote}」`, 16, COLORS.ink, { width: 630, wordWrap: { width: 630 } });
    this.button(463, 607, 360, 56, '聽完了，開始配湯　→', () => {
      this.phase = 'recipe';
      this.renderScreen();
    }, { fill: COLORS.plum, textColor: COLORS.white, size: 19, key: 'Enter' });
    this.button(1043, 160, 139, 34, '先放回待辦', () => this.returnToQueue(), {
      fill: '#e7dcc7', textColor: COLORS.ink, size: 12,
    });
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
    this.panel(1080, 418, 104, 82, '#f0e6d4', '#d5c6ac', 1);
    this.text(1090, 423, '湯鍋', 11, COLORS.gray);
    this.drawArt('art12', 1132, 463, 68, 68);

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
    this.panel(1082, 230, 92, 80, '#fbf7ec', '#d5c6ac', 1);
    this.drawArt('art17', 1128, 270, 74, 74);
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
    const perfect = result.recipeCorrect && result.replyCorrect;
    this.text(462, 159, result.heading, 27, COLORS.ink, { bold: true });
    this.panel(462, 220, 724, 222, perfect ? '#e6efea' : '#f4e6d8', '#d5c6ac', 1);
    const portraitKey = GUEST_ART[result.guest.id];
    if (portraitKey) this.drawArtFrame(1031, 236, 136, 176, portraitKey, 122, 122);
    const bodyWidth = portraitKey ? 480 : 620;
    this.text(493, 236, result.guest.name, 20, COLORS.ink, { bold: true });
    let y = 272;
    const outcome = this.text(493, y, result.message, 17, COLORS.ink, { width: bodyWidth, wordWrap: { width: bodyWidth }, lineSpacing: 5 });
    y += outcome.height + 10;
    const reaction = this.text(493, y, result.reaction, 15, COLORS.plum, { bold: true, width: bodyWidth, wordWrap: { width: bodyWidth }, lineSpacing: 4 });
    y += reaction.height + 10;
    this.text(493, Math.max(y, 410), `配方：${result.recipeName}　·　${result.recipeCorrect ? '線索吻合' : '意外發展'}　·　投訴箱 ${this.model.complaints}`, 13, this.model.complaints ? COLORS.red : COLORS.gray);

    if (result.twist) {
      this.panel(462, 456, 724, 134, '#fbf3df', COLORS.gold, 1.25);
      this.text(486, 469, '✦ 隱藏結尾解鎖', 13, COLORS.plum, { bold: true });
      this.text(486, 493, result.twist, 15, COLORS.ink, { width: 630, wordWrap: { width: 630 }, lineSpacing: 4 });
    } else {
      this.panel(462, 456, 724, 60, '#efe7d8', '#d5c6ac', 1);
      this.text(486, 476, '這位亡者還有一段隱藏結尾：湯和回話都選對才會看到。', 14, COLORS.gray, { width: 676 });
    }
    const allDone = this.model.guests.every((guest) => guest.status === 'served');
    this.button(463, 607, 360, 56, allDone ? '查看今日結局　→' : '回到待辦清單　→', () => {
      if (allDone) {
        this.revealEnding();
      } else {
        this.phase = 'queue';
        this.renderScreen();
      }
    }, { fill: COLORS.plum, textColor: COLORS.white, size: 19, key: 'Enter' });
  }

  drawEnding() {
    const ending = this.model.ending;
    this.text(463, 150, '本日代班紀錄　／　結案', 15, COLORS.plum, { bold: true });
    this.panel(462, 184, 724, 390, '#f0e6d4', COLORS.gold, 1);
    this.text(493, 204, ending.seal, 15, COLORS.plum, { bold: true });
    this.text(493, 234, ending.title, 32, COLORS.ink, { bold: true, width: 500 });
    this.text(496, 277, ending.subtitle, 17, COLORS.rose, { bold: true, width: 500 });
    this.drawArtFrame(1075, 197, 96, 106, 'art16', 78, 78);
    this.panel(486, 311, 676, 244, COLORS.white, null, 0);
    this.text(505, 322, '結局小劇場', 13, COLORS.plum, { bold: true });
    this.text(505, 344, ending.story, 18, COLORS.ink, {
      width: 638,
      lineSpacing: 2,
    });
    this.drawOutcomeSummary(462, 582, 720);
    this.button(463, 647, 358, 45, '再代一次班　↻', () => {
      this.roundNumber += 1;
      this.startShift();
    }, { fill: COLORS.plum, textColor: COLORS.white, size: 18, key: 'Enter' });
    this.button(840, 647, 346, 45, '結局圖鑑　✦', () => this.openGallery('ending'), {
      fill: '#e4d8c1', textColor: COLORS.plum, size: 18, key: 'g',
    });
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
    graphics.fillStyle(this.toNumber('#81706f'), 0.17);
    graphics.fillPoints([{ x: 0, y: 0 }, { x: 460, y: 0 }, { x: 0, y: 280 }], true);
    graphics.fillStyle(this.toNumber('#9f8e78'), 0.13);
    graphics.fillPoints([{ x: 1280, y: 0 }, { x: 1280, y: 320 }, { x: 1000, y: 0 }], true);
    graphics.fillStyle(this.toNumber('#a17b7d'), 0.14);
    graphics.fillPoints([{ x: 0, y: 800 }, { x: 0, y: 590 }, { x: 360, y: 800 }], true);
    graphics.fillStyle(this.toNumber('#8f9587'), 0.12);
    graphics.fillPoints([{ x: 1280, y: 800 }, { x: 950, y: 800 }, { x: 1280, y: 580 }], true);
    this.add.ellipse(1040, 223, 286, 256, this.toNumber('#aa927e'), 0.16);
    this.add.ellipse(1040, 223, 220, 194, this.toNumber('#d2bd9f'), 0.10);
    this.drawPaperGrain();
  }

  drawPaperGrain() {
    const grain = this.add.graphics();
    grain.fillStyle(this.toNumber('#f0e5ce'), 0.045);
    for (let i = 0; i < 115; i += 1) {
      const x = (i * 137 + 43) % WIDTH;
      const y = (i * 83 + 29) % HEIGHT;
      grain.fillCircle(x, y, i % 9 === 0 ? 2 : 1);
    }
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
    const graphics = this.add.graphics();
    graphics.fillStyle(this.toNumber('#675b5e'), 0.09);
    graphics.fillRoundedRect(x + 4, y + 6, width, height, 12);
    graphics.fillStyle(this.toNumber(fill), 1);
    graphics.fillRoundedRect(x, y, width, height, 12);
    if (stroke && lineWidth > 0) {
      graphics.lineStyle(Math.min(lineWidth, 1.25), this.toNumber(stroke), 0.56);
      graphics.strokeRoundedRect(x, y, width, height, 12);
    }
  }

  text(x, y, content, size = 16, color = COLORS.ink, extra = {}) {
    const { wordWrap, ...config } = extra;
    const maxWidth = wordWrap?.width ?? extra.width;
    const safeContent = maxWidth
      ? wrapCanvasText(content, maxWidth, size, extra.bold)
      : content;
    return this.add.text(x, y, safeContent, {
      fontFamily: FONT,
      fontSize: size,
      color,
      lineSpacing: 2,
      ...config,
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
    this.phase = 'story';
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

    scoreCase(this.model, guest, recipe.id, reply.tone);

    const message = guest.outcomes[recipe.id];
    const reaction = guest.reactions[reply.tone];
    const twist = recipeCorrect && replyCorrect ? guest.twist : null;
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
      reaction,
      twist,
      heading: recipeCorrect && replyCorrect ? '這位亡者已順利送達' : '服務完成，但結果有點出乎意料',
    };
    this.model.caseResults.push(result);
    this.model.currentResult = result;
    this.model.messages.push(message);
    this.activeGuestId = null;
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
