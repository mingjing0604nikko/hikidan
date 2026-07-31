# 筆談（多言語筆談ツール）

日本語を入力すると、韓国語・中国語（簡体字）・英語にリアルタイム翻訳する
旅行向けWebアプリです。スマホ / iPad を横向きにすると、翻訳結果だけが
大きく表示され、相手に画面を見せる「筆談」として使えます。

## 使用技術

- React + Vite
- 追加ライブラリなし（軽量・無料）
- 翻訳: 既定では無料の翻訳エンドポイントを使用（後述のとおり公式APIに切替可）
- ホスティング: Vercel（無料枠）
- フォント: Google Fonts（Noto Sans/Serif JP・KR・SC）

## ローカルで動かす

```bash
npm install
npm run dev
```

`http://localhost:5173` で確認できます。

## GitHubへの登録

```bash
git init
git add .
git commit -m "init: 多言語筆談アプリ"
git branch -M main
git remote add origin <あなたのGitHubリポジトリURL>
git push -u origin main
```

## Vercelへのデプロイ

1. https://vercel.com にログイン（GitHubアカウントでOK）
2. 「Add New... → Project」から、上記でpushしたリポジトリをImport
3. Framework Preset は自動的に **Vite** が検出されます
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. そのまま「Deploy」でOK（無料枠で問題なく動作します）

## 翻訳APIについて

現在は `translate.googleapis.com` の無料エンドポイント（`client=gtx`）を
使用しています。これはGoogle公式のドキュメント化されたAPIではなく、
**無料で手軽に使える非公式のエンドポイント**です。動作は概ね安定していますが、
将来的に仕様変更で利用できなくなる可能性がある点はご了承ください。

### 公式のGoogle Cloud Translation APIへ切り替える場合

コードの変更は不要です。以下の手順だけで自動的に公式APIへ切り替わります
（`src/App.jsx` の `translateText` 関数が、環境変数の有無で自動的に
切り替える実装になっています）。

1. [Google Cloud Console](https://console.cloud.google.com/) でプロジェクトを作成し、
   「Cloud Translation API」を有効化してAPIキーを発行
2. Vercelのプロジェクト設定 → Environment Variables に、以下を追加
   - Key: `VITE_GOOGLE_TRANSLATE_API_KEY`
   - Value: 発行したAPIキー
3. 再デプロイすれば、以後は公式APIを使って翻訳されます

（ローカルで試す場合は、プロジェクト直下に `.env.local` を作成し
`VITE_GOOGLE_TRANSLATE_API_KEY=あなたのキー` と記載してください）

## 主な機能

- 上部: 日本語入力欄（ノート罫線風デザイン）、右上に全消去の「×」ボタン
- 中央: 翻訳先言語を選ぶプルダウン（韓国語 / 中国語 / 英語）
- 下部: 翻訳結果を大きく表示（入力から約0.45秒後に自動翻訳）
- 翻訳結果の「コピー」ボタン
- 端末を横向きにすると、入力欄が自動的に隠れ、翻訳結果のみが
  画面いっぱいの大きな文字で表示（相手に見せやすくするため）。
  左上の「✎」ボタンでいつでも入力欄に戻れます

## デザインについて

藍染めのインディゴと生成り和紙をベースに、判子（はんこ）の朱色を
アクセントに使ったデザインです。旅先で手早く使う実用ツールでありながら、
和の道具としての質感を意識しました。
