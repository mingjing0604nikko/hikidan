import React, { useState, useEffect, useRef, useCallback } from 'react'

/* ------------------------------------------------------------------
 * 翻訳先の言語定義
 * fontClass は出力文字を各言語向けの読みやすいフォントで表示するため
 * ---------------------------------------------------------------- */
const LANGUAGES = [
  { code: 'ko', native: '한국어', jp: '韓国語', fontClass: 'font-ko' },
  { code: 'zh-CN', native: '中文', jp: '中国語（簡体字）', fontClass: 'font-zh' },
  { code: 'en', native: 'English', jp: '英語', fontClass: 'font-en' },
]

/* ------------------------------------------------------------------
 * 翻訳処理
 * 1) VITE_GOOGLE_TRANSLATE_API_KEY が設定されていれば
 *    Google Cloud Translation API（公式・有料/従量課金）を使用
 * 2) 未設定の場合は無料の翻訳エンドポイント（開発・検証向け）を使用
 *
 * 後日、公式APIに切り替える場合は Vercel の環境変数に
 * VITE_GOOGLE_TRANSLATE_API_KEY を追加するだけでよい（コード変更不要）
 * ---------------------------------------------------------------- */
async function translateWithCloudAPI(text, targetLang, apiKey) {
  const res = await fetch(
    `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: text, source: 'ja', target: targetLang, format: 'text' }),
    }
  )
  if (!res.ok) throw new Error('cloud-api-error')
  const data = await res.json()
  return data?.data?.translations?.[0]?.translatedText ?? ''
}

async function translateWithFreeEndpoint(text, targetLang) {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=ja&tl=${encodeURIComponent(
    targetLang
  )}&dt=t&q=${encodeURIComponent(text)}`
  const res = await fetch(url)
  if (!res.ok) throw new Error('free-endpoint-error')
  const data = await res.json()
  return (data?.[0] ?? []).map((chunk) => chunk?.[0] ?? '').join('')
}

async function translateText(text, targetLang) {
  const apiKey = import.meta.env.VITE_GOOGLE_TRANSLATE_API_KEY
  if (apiKey) {
    return translateWithCloudAPI(text, targetLang, apiKey)
  }
  return translateWithFreeEndpoint(text, targetLang)
}

export default function App() {
  const [inputText, setInputText] = useState('')
  const [targetLang, setTargetLang] = useState(LANGUAGES[0].code)
  const [output, setOutput] = useState('')
  const [status, setStatus] = useState('idle') // idle | loading | error
  const [copied, setCopied] = useState(false)
  const [controlsOpen, setControlsOpen] = useState(true)
  const debounceRef = useRef(null)
  const requestIdRef = useRef(0)

  const currentLang = LANGUAGES.find((l) => l.code === targetLang) ?? LANGUAGES[0]

  /* 入力 or 言語変更のたびに 450ms デバウンスして翻訳 */
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (!inputText.trim()) {
      setOutput('')
      setStatus('idle')
      return
    }

    setStatus('loading')
    debounceRef.current = setTimeout(async () => {
      const myId = ++requestIdRef.current
      try {
        const result = await translateText(inputText, targetLang)
        if (myId === requestIdRef.current) {
          setOutput(result)
          setStatus('idle')
        }
      } catch (e) {
        if (myId === requestIdRef.current) {
          setStatus('error')
        }
      }
    }, 450)

    return () => clearTimeout(debounceRef.current)
  }, [inputText, targetLang])

  /* 画面の向きが変わったら、編集パネルの開閉を自動調整 */
  useEffect(() => {
    const mq = window.matchMedia('(orientation: landscape)')
    const handle = (e) => setControlsOpen(!e.matches)
    handle(mq)
    mq.addEventListener('change', handle)
    return () => mq.removeEventListener('change', handle)
  }, [])

  const handleClear = useCallback(() => {
    setInputText('')
    setOutput('')
    setStatus('idle')
  }, [])

  const handleCopy = useCallback(async () => {
    if (!output) return
    try {
      await navigator.clipboard.writeText(output)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch (e) {
      /* クリップボード権限がない環境では無視 */
    }
  }, [output])

  return (
    <div className={`shell ${!controlsOpen ? 'controls-hidden' : ''}`}>
      <style>{CSS}</style>

      {/* 横向き時、コントロールを隠している間だけ現れる再表示ボタン */}
      <button
        className="reopen-btn"
        onClick={() => setControlsOpen(true)}
        aria-label="入力欄を表示"
        title="入力欄を表示"
      >
        ✎
      </button>

      <div className="editor-panel">
        <header className="header">
          <div className="hanko" aria-hidden="true">
            訳
          </div>
          <div className="header-text">
            <h1>筆談</h1>
            <p>日本語を入力すると、韓国語・中国語・英語に翻訳します</p>
          </div>
        </header>

        <section className="input-card">
          <textarea
            className="input-area"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="ここに日本語を入力…"
            aria-label="日本語入力"
            rows={4}
          />
          {inputText && (
            <button className="clear-btn" onClick={handleClear} aria-label="入力をクリア" title="クリア">
              ×
            </button>
          )}
        </section>

        <section className="lang-select-wrap">
          <span className="lang-arrow">翻訳先</span>
          <div className="select-shell">
            <select
              className="lang-select"
              value={targetLang}
              onChange={(e) => setTargetLang(e.target.value)}
              aria-label="翻訳先の言語"
            >
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.native}（{l.jp}）
                </option>
              ))}
            </select>
          </div>
          {controlsOpen && (
            <button
              className="collapse-btn"
              onClick={() => setControlsOpen(false)}
              aria-label="入力欄を隠して大きく表示"
              title="入力欄を隠す"
            >
              ▾ 大きく表示
            </button>
          )}
        </section>
      </div>

      <section className={`output-card ${currentLang.fontClass}`}>
        <div className="output-top">
          <span className="output-lang-label">{currentLang.native}</span>
          {output && (
            <button className="copy-btn" onClick={handleCopy} aria-label="コピー">
              {copied ? 'コピーしました' : 'コピー'}
            </button>
          )}
        </div>

        <div className="output-text-wrap">
          {status === 'loading' && <span className="output-hint">翻訳中…</span>}
          {status === 'error' && (
            <span className="output-hint error">
              翻訳できませんでした。通信状況を確認してもう一度お試しください。
            </span>
          )}
          {status === 'idle' && !output && (
            <span className="output-hint placeholder">ここに翻訳結果が表示されます</span>
          )}
          {status === 'idle' && output && <p className="output-text">{output}</p>}
        </div>

        <p className="rotate-hint">📱 端末を横向きにすると、この文字だけ大きく表示されます</p>
      </section>
    </div>
  )
}

/* ------------------------------------------------------------------
 * スタイル（1ファイルにまとめるため <style> タグとして埋め込み）
 * 配色：藍染めのインディゴ × 生成り和紙 × 朱色の判子アクセント
 * ---------------------------------------------------------------- */
const CSS = `
:root{
  --paper: #f7f4ec;
  --paper-line: #e4ddc9;
  --ink: #1c2430;
  --ink-soft: #4a5468;
  --indigo: #2b4c7e;
  --indigo-deep: #1f3352;
  --seal: #b3392f;
  --seal-soft: #e7c9c4;
}

*{ box-sizing: border-box; }

html, body, #root{
  height: 100%;
  margin: 0;
}

body{
  background: var(--indigo-deep);
  color: var(--ink);
  font-family: 'Noto Sans JP', system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
}

.font-ko { font-family: 'Noto Sans KR', 'Noto Sans JP', system-ui, sans-serif; }
.font-zh { font-family: 'Noto Sans SC', 'Noto Sans JP', system-ui, sans-serif; }
.font-en { font-family: 'Noto Sans JP', system-ui, sans-serif; }

.shell{
  min-height: 100dvh;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  max-width: 640px;
  margin: 0 auto;
  background: var(--paper);
  box-shadow: 0 0 40px rgba(0,0,0,0.35);
}

.reopen-btn{
  display: none;
  position: fixed;
  top: 10px;
  left: 10px;
  z-index: 20;
  width: 40px;
  height: 40px;
  border-radius: 999px;
  border: 1px solid var(--paper-line);
  background: rgba(247,244,236,0.92);
  color: var(--indigo-deep);
  font-size: 18px;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 10px rgba(0,0,0,0.2);
}

.editor-panel{
  display: flex;
  flex-direction: column;
  padding: 20px 20px 8px;
  gap: 16px;
}

.header{
  display: flex;
  align-items: center;
  gap: 14px;
}

.hanko{
  flex: none;
  width: 46px;
  height: 46px;
  border-radius: 10px;
  border: 2.5px solid var(--seal);
  color: var(--seal);
  font-family: 'Noto Serif JP', serif;
  font-weight: 700;
  font-size: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  transform: rotate(-2deg);
}

.header-text h1{
  margin: 0;
  font-family: 'Noto Serif JP', serif;
  font-weight: 700;
  font-size: 22px;
  color: var(--indigo-deep);
  letter-spacing: 0.04em;
}

.header-text p{
  margin: 2px 0 0;
  font-size: 12.5px;
  color: var(--ink-soft);
}

.input-card{
  position: relative;
  background:
    repeating-linear-gradient(
      var(--paper) 0px,
      var(--paper) 31px,
      var(--paper-line) 32px
    );
  border: 1px solid var(--paper-line);
  border-radius: 12px;
  padding: 14px 44px 14px 16px;
}

.input-area{
  width: 100%;
  border: none;
  background: transparent;
  resize: vertical;
  min-height: 96px;
  font-size: 17px;
  line-height: 32px;
  font-family: 'Noto Sans JP', sans-serif;
  color: var(--ink);
  outline: none;
}

.input-area::placeholder{
  color: #a8a290;
}

.clear-btn{
  position: absolute;
  top: 10px;
  right: 10px;
  width: 28px;
  height: 28px;
  border-radius: 999px;
  border: none;
  background: var(--ink-soft);
  color: #fff;
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
}

.clear-btn:focus-visible,
.collapse-btn:focus-visible,
.copy-btn:focus-visible,
.reopen-btn:focus-visible,
.lang-select:focus-visible{
  outline: 2px solid var(--indigo);
  outline-offset: 2px;
}

.lang-select-wrap{
  display: flex;
  align-items: center;
  gap: 10px;
  justify-content: center;
  flex-wrap: wrap;
}

.lang-arrow{
  font-size: 12.5px;
  color: var(--ink-soft);
  white-space: nowrap;
}

.select-shell{
  border: 1.5px solid var(--seal);
  border-radius: 999px;
  padding: 2px 4px;
}

.lang-select{
  appearance: none;
  -webkit-appearance: none;
  border: none;
  background: transparent;
  font-size: 15px;
  font-weight: 500;
  color: var(--indigo-deep);
  padding: 6px 14px;
  cursor: pointer;
}

.collapse-btn{
  border: none;
  background: none;
  color: var(--ink-soft);
  font-size: 12.5px;
  cursor: pointer;
  padding: 4px 6px;
}

.output-card{
  flex: 1;
  display: flex;
  flex-direction: column;
  background: var(--indigo-deep);
  color: #fff;
  border-radius: 20px 20px 0 0;
  padding: 18px 22px 22px;
  margin-top: 8px;
}

.output-top{
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.output-lang-label{
  font-size: 13px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #b9c5da;
}

.copy-btn{
  border: 1px solid rgba(255,255,255,0.35);
  background: rgba(255,255,255,0.06);
  color: #fff;
  border-radius: 999px;
  padding: 5px 12px;
  font-size: 12.5px;
  cursor: pointer;
}

.output-text-wrap{
  flex: 1;
  display: flex;
  align-items: center;
  padding: 18px 0;
}

.output-text{
  margin: 0;
  font-size: clamp(28px, 8vw, 44px);
  line-height: 1.35;
  font-weight: 700;
  word-break: break-word;
  animation: fadeIn 0.25s ease;
}

@keyframes fadeIn{
  from{ opacity: 0; transform: translateY(4px); }
  to{ opacity: 1; transform: translateY(0); }
}

.output-hint{
  font-size: 16px;
  color: #93a3c1;
}

.output-hint.placeholder{ color: #6d7d9c; }
.output-hint.error{ color: #f2b8b0; }

.rotate-hint{
  margin: 0;
  font-size: 11.5px;
  color: #7c8bab;
  text-align: center;
}

/* ---------- 横向き：翻訳結果のみを大きく表示 ---------- */
@media (orientation: landscape) and (max-height: 600px){
  .shell{ max-width: none; }

  .controls-hidden .editor-panel{ display: none; }
  .controls-hidden .reopen-btn{ display: flex; }
  .controls-hidden .rotate-hint{ display: none; }
  .controls-hidden .output-card{
    border-radius: 0;
    margin-top: 0;
    justify-content: center;
    padding: 16px 28px;
  }
  .controls-hidden .output-text{
    font-size: clamp(32px, 11vw, 96px);
    text-align: center;
  }
  .controls-hidden .output-top{ justify-content: center; }
}

@media (prefers-reduced-motion: reduce){
  .output-text{ animation: none; }
}
`
