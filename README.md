# 《孟婆今天請假》

一款以 Phaser 製作的瀏覽器短篇管理喜劇。你是男性代班孟婆，每次隨機接待三位亡者，挑選孟婆湯、安排服務順序，並在三條同步下降的耐心條歸零前處理投訴。開場以多幕拼貼插畫演出代班故事。

美術採低飽和度幾何色塊拼貼插畫，融合現代童趣繪本與中式奇幻民俗元素。完整色票、角色造型、場景和介面規範見 [ART_DIRECTION.md](ART_DIRECTION.md)。

## 本機遊玩

需要 Node.js 20.19 以上版本。

```powershell
npm install
npm run dev
```

終端機顯示本機網址後，在瀏覽器開啟該網址。點「開始代班」即可遊玩。

## 操作

- 滑鼠點擊介面按鈕。
- `Q`、`W`、`E` 選擇先接待哪位亡者。
- 數字鍵 `1`、`2`、`3` 選擇配方或回應。
- `Enter` 繼續劇情、教學與結果。
- `Esc` 將目前亡者放回待辦清單。
- 點右上角 `?` 三次可觸發陰間 AI 客服彩蛋；點湯杓 `♨` 五次可觸發隱藏結果。

## 結局平衡檢查

```powershell
node tools/endings-sim.mjs
```

以不同玩法策略各模擬兩萬局，列出每種結局的出現比例，調整 `src/logic.js` 的結局條件後可用來確認每個結局都還觸發得到。

## 發布到 GitHub Pages

`.github/workflows/deploy.yml` 已設定好。建立 GitHub repository 並把專案推送到 `main` 分支後：

1. 到 repository 的 **Settings → Pages**，把 **Source** 設為 **GitHub Actions**。
2. 等 Actions 頁面的「Deploy to GitHub Pages」跑完，網址會是 `https://<帳號>.github.io/<repository 名稱>/`。

`vite.config.js` 會在 GitHub Actions 中自動把網址路徑設成 repository 名稱，所以圖片路徑不需要手動調整。`node_modules/` 與 `dist/` 已列入 `.gitignore`，不需要上傳。
