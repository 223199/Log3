import React, { useEffect, useMemo, useState } from "react";
import "../App.css";

const SESSIONS_KEY = "konbini_sessions_v1";
const PRICES_KEY = "konbini_prices_v1";
const BUDGET_KEY = "konbini_budget_v1";

const ITEMS = [
  { id: "drink", label: "飲み物", hint: "ペットボトル/缶/コーヒー", defaultPrice: 160 },
  { id: "onigiri", label: "おにぎり", hint: "おにぎり/寿司系", defaultPrice: 170 },
  { id: "snack", label: "お菓子", hint: "スナック/チョコ/ガム", defaultPrice: 160 },
  { id: "cupnoodle", label: "カップ麺", hint: "カップ麺/即席", defaultPrice: 220 },
  { id: "bento", label: "弁当/惣菜", hint: "弁当/唐揚げ/サラダ", defaultPrice: 520 },
  { id: "ice", label: "アイス", hint: "アイス/冷凍スイーツ", defaultPrice: 190 },
  { id: "bread", label: "パン", hint: "菓子パン/惣菜パン", defaultPrice: 170 },
  { id: "dessert", label: "スイーツ", hint: "プリン/ケーキ系", defaultPrice: 320 },
];

function safeParse(json, fallback) {
  try {
    const parsed = JSON.parse(json);
    return parsed && typeof parsed === "object" ? parsed : fallback;
  } catch {
    return fallback;
  }
}
function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}
function yen(n) {
  const x = Math.round(Number(n) || 0);
  return x.toLocaleString("ja-JP");
}
function nowISO() {
  return new Date().toISOString();
}
function makeEmptyItems() {
  return Object.fromEntries(ITEMS.map((x) => [x.id, 0]));
}
function formatJP(iso) {
  const d = new Date(iso);
  return d.toLocaleString("ja-JP", { hour12: false });
}

export default function KonbiniLogPage() {
  const [sessions, setSessions] = useState(() => {
    const init = [];
    const saved = localStorage.getItem(SESSIONS_KEY);
    if (!saved) return init;
    const parsed = safeParse(saved, init);
    return Array.isArray(parsed) ? parsed : init;
  });

  const [current, setCurrent] = useState(null);
  const [selected, setSelected] = useState("drink");

  const [prices, setPrices] = useState(() => {
    const init = Object.fromEntries(ITEMS.map((x) => [x.id, x.defaultPrice]));
    const saved = localStorage.getItem(PRICES_KEY);
    if (!saved) return init;
    const parsed = safeParse(saved, init);
    for (const it of ITEMS) if (typeof parsed[it.id] !== "number") parsed[it.id] = it.defaultPrice;
    return parsed;
  });

  const [budget, setBudget] = useState(() => {
    const saved = localStorage.getItem(BUDGET_KEY);
    return saved ? clamp(Number(saved) || 0, 0, 9999999) : 8000;
  });

  const [selectedSessionId, setSelectedSessionId] = useState(null);

  useEffect(() => localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions)), [sessions]);
  useEffect(() => localStorage.setItem(PRICES_KEY, JSON.stringify(prices)), [prices]);
  useEffect(() => localStorage.setItem(BUDGET_KEY, String(budget)), [budget]);

  const totals = useMemo(() => {
    const totalCounts = makeEmptyItems();
    for (const s of sessions) {
      const items = s.items || {};
      for (const it of ITEMS) totalCounts[it.id] += Number(items[it.id] || 0);
    }
    return totalCounts;
  }, [sessions]);

  const spendingByItem = useMemo(() => {
    const out = {};
    for (const it of ITEMS) out[it.id] = (totals[it.id] || 0) * (prices[it.id] || 0);
    return out;
  }, [totals, prices]);

  const totalCount = useMemo(() => Object.values(totals).reduce((a, b) => a + b, 0), [totals]);
  const totalSpending = useMemo(() => Object.values(spendingByItem).reduce((a, b) => a + b, 0), [spendingByItem]);

  const ranking = useMemo(() => {
    return [...ITEMS]
      .map((x) => ({
        ...x,
        count: totals[x.id] || 0,
        price: prices[x.id] || 0,
        spending: spendingByItem[x.id] || 0,
      }))
      .sort((a, b) => b.spending - a.spending);
  }, [totals, prices, spendingByItem]);

  const maxSpending = useMemo(() => Math.max(1, ...ranking.map((r) => r.spending)), [ranking]);
  const budgetRatio = budget <= 0 ? 0 : clamp(totalSpending / budget, 0, 2);
  const overBudget = budget > 0 && totalSpending > budget;

  const selectedItem = useMemo(() => ITEMS.find((x) => x.id === selected) || ITEMS[0], [selected]);

  const viewingSession = useMemo(() => {
    if (!selectedSessionId) return null;
    return sessions.find((s) => s.id === selectedSessionId) || null;
  }, [selectedSessionId, sessions]);

  function startShopping() {
    const id = `sess_${Date.now()}`;
    const at = nowISO();
    setCurrent({ id, at, items: makeEmptyItems(), memo: "" });
    setSelectedSessionId(null);
  }
  function cancelShopping() {
    setCurrent(null);
  }
  function commitShopping() {
    if (!current) return;
    const sum = Object.values(current.items || {}).reduce((a, b) => a + (Number(b) || 0), 0);
    if (sum <= 0) {
      setCurrent(null);
      return;
    }
    setSessions((prev) => [current, ...prev]);
    setCurrent(null);
  }
  function bumpInCurrent(itemId, delta) {
    if (!current) return;
    setSelected(itemId);
    setCurrent((prev) => {
      const next = { ...prev };
      const nextItems = { ...(prev.items || {}) };
      nextItems[itemId] = clamp((nextItems[itemId] || 0) + delta, 0, 999999);
      next.items = nextItems;
      return next;
    });
  }
  function setCurrentMemo(value) {
    if (!current) return;
    setCurrent((prev) => ({ ...prev, memo: value }));
  }
  function setPrice(id, value) {
    const v = clamp(Number(value) || 0, 0, 999999);
    setPrices((prev) => ({ ...prev, [id]: v }));
  }
  function deleteSession(id) {
    setSessions((prev) => prev.filter((s) => s.id !== id));
    if (selectedSessionId === id) setSelectedSessionId(null);
  }
  function resetAll() {
    setSessions([]);
    setCurrent(null);
    setSelectedSessionId(null);
    setSelected("drink");
    setPrices(Object.fromEntries(ITEMS.map((x) => [x.id, x.defaultPrice])));
    setBudget(8000);
  }

  const currentSpending = useMemo(() => {
    if (!current) return 0;
    let sum = 0;
    for (const it of ITEMS) sum += (current.items?.[it.id] || 0) * (prices[it.id] || 0);
    return sum;
  }, [current, prices]);

  function alphaFor(id) {
    const v = spendingByItem[id] || 0;
    const a = 0.12 + 0.78 * (v / maxSpending);
    return clamp(a, 0.12, 0.9);
  }

  return (
    <div className="page">
      <header className="top">
        <div>
          <h1>買ったモノ記録（買い物セッション方式）</h1>
          <p className="sub">「買い物開始」→棚クリックで入力→「買い物確定」で履歴に保存。</p>
        </div>
        <div className="actions">
          <button className="btn" onClick={resetAll}>全部リセット</button>
        </div>
      </header>

      <main className="grid">
        <section className="card">
          <div className="cardTitle">
            <h2>棚（クリックして入力）</h2>
            <div className="small">
              {current ? (
                <>進行中：<b>{formatJP(current.at)}</b>（今回：{yen(currentSpending)}円）</>
              ) : (
                <>進行中の買い物：なし（「買い物開始」を押してね）</>
              )}
            </div>
          </div>

          <div className="sessionControls">
            {!current ? (
              <button className="btn" onClick={startShopping}>買い物開始</button>
            ) : (
              <>
                <button className="btn" onClick={commitShopping}>買い物確定</button>
                <button className="btnGhost" onClick={cancelShopping}>キャンセル</button>
              </>
            )}
          </div>

          <ShelfSVG
            counts={totals}
            selected={selected}
            alphaFor={alphaFor}
            onClickItem={(id) => bumpInCurrent(id, +1)}
            disabled={!current}
            currentItems={current?.items || null}
            prices={prices}
          />
        </section>

        <section className="card">
          <div className="cardTitle">
            <h2>集計（履歴合計）</h2>
            <div className="small">
              合計 <b>{totalCount}</b> 個 / 推定支出 <b>{yen(totalSpending)}</b> 円
            </div>
          </div>

          <div className="statBlock">
            <h3>月予算</h3>
            <div className="budgetRow">
              <label className="budgetLabel">
                予算：
                <input
                  className="budgetInput"
                  type="number"
                  value={budget}
                  onChange={(e) => setBudget(clamp(Number(e.target.value) || 0, 0, 9999999))}
                  min="0"
                />
                円
              </label>
              <div className={"badge" + (overBudget ? " danger" : "")}>
                {budget <= 0 ? "予算未設定" : overBudget ? "予算オーバー" : "OK"}
              </div>
            </div>

            <div className="progressTrack" aria-label="予算進捗">
              <div
                className={"progressFill" + (overBudget ? " danger" : "")}
                style={{ width: `${clamp(budgetRatio, 0, 1) * 100}%` }}
              />
            </div>

                        {/* 追加：よく買う（回数）可視化 */}
            <div className="statBlock">
              <h3>よく買うランキング（回数）</h3>

              <div className="bars">
                {(() => {
                  const byCount = [...ITEMS]
                    .map((it) => ({ ...it, count: totals[it.id] || 0 }))
                    .sort((a, b) => b.count - a.count);

                  const maxCount = Math.max(1, ...byCount.map((x) => x.count));

                  return byCount.map((it) => (
                    <div key={it.id} className="barRow">
                      <div className="barLabel">{it.label}</div>
                      <div className="barTrack" onClick={() => setSelected(it.id)} title="クリックで選択">
                        <div
                          className={"barFill" + (it.id === selected ? " isSelected" : "")}
                          style={{ width: `${(it.count / maxCount) * 100}%` }}
                        />
                      </div>
                      <div className="barNum">{it.count}回</div>
                    </div>
                  ));
                })()}
              </div>

              <div className="small" style={{ marginTop: 8 }}>
                棒が長いほど「買う頻度が高い」カテゴリです（クリックで左側の選択も切り替わります）。
              </div>
            </div>

            {/* 追加：よく使う（支出）可視化 */}
            <div className="statBlock">
              <h3>支出ランキング（推定）</h3>

              <div className="bars">
                {ranking.map((r) => (
                  <div key={r.id} className="barRow">
                    <div className="barLabel">{r.label}</div>
                    <div className="barTrack" onClick={() => setSelected(r.id)} title="クリックで選択">
                      <div
                        className={"barFill" + (r.id === selected ? " isSelected" : "")}
                        style={{ width: `${(r.spending / maxSpending) * 100}%` }}
                      />
                    </div>
                    <div className="barNum">{yen(r.spending)}円</div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          <div className="statBlock">
            <h3>買い物履歴（セッション）</h3>
            {sessions.length === 0 ? (
              <div className="small">まだ履歴がありません。</div>
            ) : (
              <ul className="sessionList">
                {sessions.map((s) => {
                  const cnt = Object.values(s.items || {}).reduce((a, b) => a + (Number(b) || 0), 0);
                  let sp = 0;
                  for (const it of ITEMS) sp += (s.items?.[it.id] || 0) * (prices[it.id] || 0);
                  const active = s.id === selectedSessionId;

                  return (
                    <li key={s.id} className={"sessionItem" + (active ? " active" : "")}>
                      <button
                        className="sessionBtn"
                        onClick={() => setSelectedSessionId(active ? null : s.id)}
                        title="クリックで詳細"
                      >
                        <div className="sessionTop">
                          <span className="sessionTime">{formatJP(s.at)}</span>
                          <span className="sessionMeta">{cnt}個 / {yen(sp)}円</span>
                        </div>
                        <div className="sessionMemo">{s.memo ? s.memo : <span className="small">（メモなし）</span>}</div>
                      </button>
                      <button className="btnGhost" onClick={() => deleteSession(s.id)} title="削除">
                        削除
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            {viewingSession && (
              <div className="sessionDetail">
                <h3>選択中の買い物：{formatJP(viewingSession.at)}</h3>
                <div className="detailGrid">
                  {ITEMS.map((it) => {
                    const c = viewingSession.items?.[it.id] || 0;
                    if (!c) return null;
                    return (
                      <div key={it.id} className="detailRow">
                        <span className="detailLabel">{it.label}</span>
                        <span className="detailValue">{c}個</span>
                        <span className="detailValue">{yen(c * (prices[it.id] || 0))}円</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

function ShelfSVG({ counts, selected, alphaFor, onClickItem, disabled, currentItems, prices }) {
  const boxes = [
    { id: "drink", x: 30, y: 30, w: 250, h: 85 },
    { id: "onigiri", x: 300, y: 30, w: 250, h: 85 },
    { id: "snack", x: 30, y: 135, w: 250, h: 85 },
    { id: "cupnoodle", x: 300, y: 135, w: 250, h: 85 },
    { id: "bento", x: 30, y: 240, w: 250, h: 85 },
    { id: "ice", x: 300, y: 240, w: 250, h: 85 },
    { id: "bread", x: 30, y: 345, w: 250, h: 85 },
    { id: "dessert", x: 300, y: 345, w: 250, h: 85 },
  ];

  const labelById = useMemo(() => {
    const map = {};
    for (const it of ITEMS) map[it.id] = it.label;
    return map;
  }, []);

  return (
    <div className={"svgWrap" + (disabled ? " isDisabled" : "")}>
      <svg viewBox="0 0 580 460" className="shelf" aria-label="棚SVG" role="img">
        <rect x="10" y="10" width="560" height="440" rx="18" className="bg" />
        <rect x="20" y="125" width="540" height="10" rx="5" className="board" />
        <rect x="20" y="230" width="540" height="10" rx="5" className="board" />
        <rect x="20" y="335" width="540" height="10" rx="5" className="board" />
        <rect x="20" y="440" width="540" height="6" rx="3" className="board" />

        {boxes.map((b) => {
          const isSel = b.id === selected;
          const totalCount = counts[b.id] || 0;
          const curCount = currentItems ? (currentItems[b.id] || 0) : 0;

          return (
            <g
              key={b.id}
              className={"item" + (isSel ? " selected" : "") + (disabled ? " disabled" : "")}
              onClick={() => !disabled && onClickItem(b.id)}
              role="button"
              tabIndex={disabled ? -1 : 0}
              onKeyDown={(e) => {
                if (disabled) return;
                if (e.key === "Enter" || e.key === " ") onClickItem(b.id);
              }}
              title={disabled ? "買い物開始すると入力できます" : "クリックで+1（今回の買い物）"}
            >
              <rect x={b.x} y={b.y} width={b.w} height={b.h} rx="14" className="itemBox" />
              <rect x={b.x} y={b.y} width={b.w} height={b.h} rx="14" className="heat" style={{ opacity: alphaFor(b.id) }} />
              <text x={b.x + 18} y={b.y + 34} className="itemLabel">{labelById[b.id]}</text>
              <text x={b.x + 18} y={b.y + 60} className="itemCount">合計 {totalCount}個 / 今回 {curCount}個</text>
              <text x={b.x + 18} y={b.y + 78} className="itemCount smallText">単価 {yen(prices[b.id] || 0)}円</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
