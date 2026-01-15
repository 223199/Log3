import React, { useEffect, useMemo, useState } from "react";

const VISITS_KEY = "store_map_v2_visits";
const ROUTES_KEY = "store_map_v2_routes";

/* =========================
   レイアウト（画像寄せ）
   viewBox: 1000 x 600
   ========================= */
const ZONES = [
  // 上部：弁当・冷蔵品・冷凍品（青帯）
  { id: "top_bento", label: "弁当・冷蔵品・冷凍品", x: 200, y: 10, w: 600, h: 70, cx: 500, cy: 45, kind: "banner" },

  // 右：飲料（青帯）
  { id: "drink", label: "飲料", x: 820, y: 80, w: 90, h: 360, cx: 865, cy: 260, kind: "banner" },

  // 左：レジ／ホットスナック
  { id: "register", label: "レジ", x: 80, y: 120, w: 200, h: 220, cx: 180, cy: 230, kind: "area" },
  { id: "hotsnack", label: "ホットスナック", x: 170, y: 200, w: 70, h: 70, cx: 205, cy: 235, kind: "area" },

  // 左下：コーヒー／ATM／プリンタ
  { id: "coffee", label: "コーヒー", x: 70, y: 340, w: 90, h: 70, cx: 115, cy: 375, kind: "utility" },
  { id: "atm", label: "ATM", x: 20, y: 420, w: 70, h: 70, cx: 55, cy: 455, kind: "utility" },
  { id: "printer", label: "プリンタ", x: 20, y: 500, w: 120, h: 80, cx: 80, cy: 540, kind: "utility" },

  // 出入口
  { id: "entrance", label: "出入口", x: 160, y: 470, w: 160, h: 110, cx: 240, cy: 535, kind: "area" },

  // 中央：島棚
  { id: "bread_dessert", label: "パン・デザート類", x: 320, y: 140, w: 220, h: 60, cx: 430, cy: 170, kind: "shelf" },
  { id: "frozen", label: "冷凍類", x: 560, y: 140, w: 220, h: 60, cx: 670, cy: 170, kind: "shelf" },

  { id: "snack", label: "菓子類", x: 320, y: 230, w: 220, h: 60, cx: 430, cy: 260, kind: "shelf" },
  { id: "instant", label: "インスタント類", x: 560, y: 230, w: 220, h: 60, cx: 670, cy: 260, kind: "shelf" },

  { id: "daily_left", label: "日用品類", x: 320, y: 320, w: 220, h: 60, cx: 430, cy: 350, kind: "shelf" },
  { id: "daily_right", label: "日用品類", x: 560, y: 320, w: 220, h: 60, cx: 670, cy: 350, kind: "shelf" },

  // 下中央：雑誌
  { id: "magazine", label: "雑誌類", x: 360, y: 500, w: 420, h: 80, cx: 570, cy: 540, kind: "area" },

  // 右下：WC
  { id: "wc", label: "WC", x: 740, y: 440, w: 250, h: 150, cx: 865, cy: 515, kind: "area" },
];

function safeParse(json, fallback) {
  try {
    const v = JSON.parse(json);
    return v ?? fallback;
  } catch {
    return fallback;
  }
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

export default function StoreMapPage() {
  const [visits, setVisits] = useState(() => {
    const init = Object.fromEntries(ZONES.map((z) => [z.id, 0]));
    const saved = localStorage.getItem(VISITS_KEY);
    if (!saved) return init;
    const parsed = safeParse(saved, init);
    for (const z of ZONES) if (typeof parsed[z.id] !== "number") parsed[z.id] = 0;
    return parsed;
  });

  const [routes, setRoutes] = useState(() => {
    const saved = localStorage.getItem(ROUTES_KEY);
    return saved ? safeParse(saved, []) : [];
  });

  const [routeMode, setRouteMode] = useState(false);
  const [currentRoute, setCurrentRoute] = useState([]);
  const [selectedZone, setSelectedZone] = useState("drink");

  useEffect(() => localStorage.setItem(VISITS_KEY, JSON.stringify(visits)), [visits]);
  useEffect(() => localStorage.setItem(ROUTES_KEY, JSON.stringify(routes)), [routes]);

  const zoneById = useMemo(() => {
    const m = new Map();
    ZONES.forEach((z) => m.set(z.id, z));
    return m;
  }, []);

  const maxVisit = useMemo(() => Math.max(1, ...Object.values(visits)), [visits]);

  const currentPoints = useMemo(() => {
    return currentRoute
      .map((id) => zoneById.get(id))
      .filter(Boolean)
      .map((z) => `${z.cx},${z.cy}`)
      .join(" ");
  }, [currentRoute, zoneById]);

  function heatOpacity(zoneId) {
    const v = visits[zoneId] || 0;
    return clamp(0.10 + 0.80 * (v / maxVisit), 0.10, 0.90);
  }

  function clickZone(zoneId) {
    setSelectedZone(zoneId);

    setVisits((prev) => ({ ...prev, [zoneId]: (prev[zoneId] || 0) + 1 }));

    if (routeMode) {
      setCurrentRoute((prev) => {
        if (prev.length > 0 && prev[prev.length - 1] === zoneId) return prev;
        return [...prev, zoneId];
      });
    }
  }

  function undoRoute() {
    setCurrentRoute((prev) => prev.slice(0, -1));
  }

  function clearRoute() {
    setCurrentRoute([]);
  }

  function saveRoute() {
    if (currentRoute.length < 2) return;
    setRoutes((prev) => [{ id: `route_${Date.now()}`, at: new Date().toISOString(), path: currentRoute }, ...prev]);
    setCurrentRoute([]);
    setRouteMode(false);
  }

  function deleteRoute(routeId) {
    setRoutes((prev) => prev.filter((r) => r.id !== routeId));
  }

  function resetAll() {
    setVisits(Object.fromEntries(ZONES.map((z) => [z.id, 0])));
    setRoutes([]);
    setCurrentRoute([]);
    setRouteMode(false);
    setSelectedZone("drink");
  }

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
        <div>
          <h2 style={{ margin: 0 }}>店内マップ（画像寄せSVG）</h2>
          <div style={{ fontSize: 12, color: "#666", marginTop: 6 }}>
            クリックで回数が増えます。ルート記録モードで道順（線）も作れます。
          </div>
        </div>
        <button onClick={resetAll} style={btnDark}>全部リセット</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 14, marginTop: 14 }}>
        <section style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
            <div>
              <b>マップ</b>
              <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
                選択：{zoneById.get(selectedZone)?.label}（{visits[selectedZone] || 0} 回）
              </div>
            </div>

            <label style={{ display: "inline-flex", gap: 8, alignItems: "center", fontSize: 12, color: "#444" }}>
              <input
                type="checkbox"
                checked={routeMode}
                onChange={(e) => {
                  const on = e.target.checked;
                  setRouteMode(on);
                  if (!on) setCurrentRoute([]);
                }}
              />
              <span>ルート記録モード</span>
            </label>
          </div>

          <StoreSVG
            visits={visits}
            selectedZone={selectedZone}
            heatOpacity={heatOpacity}
            onClickZone={clickZone}
            currentPoints={currentPoints}
            routeMode={routeMode}
          />

          <div style={routeBar}>
            <div style={{ flex: 1, fontSize: 12, color: "#555" }}>
              現在のルート：
              {currentRoute.length === 0
                ? "（なし）"
                : " " + currentRoute.map((id) => zoneById.get(id)?.label || id).join(" → ")}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button style={btn} onClick={undoRoute} disabled={currentRoute.length === 0}>戻す</button>
              <button style={btn} onClick={clearRoute} disabled={currentRoute.length === 0}>クリア</button>
              <button style={btnDark} onClick={saveRoute} disabled={currentRoute.length < 2}>保存</button>
            </div>
          </div>

          <div style={{ fontSize: 12, color: "#666", marginTop: 8 }}>
            {/* コメントアウト例：ここはJSXコメントで安全 */}
            {/* 💡 例：出入口 → 飲料 → 菓子類 → レジ、の順でクリックして保存 */}
            💡 例：出入口 → 飲料 → 菓子類 → レジ、の順でクリックして保存
          </div>
        </section>

        <section style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
            <b>ランキング</b>
            <div style={{ fontSize: 12, color: "#666" }}>ルート履歴：{routes.length} 件</div>
          </div>

          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>よく押すゾーン（回数）</div>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 8 }}>
              {[...ZONES]
                .map((z) => ({ ...z, v: visits[z.id] || 0 }))
                .sort((a, b) => b.v - a.v)
                .map((z) => (
                  <li
                    key={z.id}
                    onClick={() => setSelectedZone(z.id)}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "8px 10px",
                      borderRadius: 10,
                      border: "1px solid #eee",
                      cursor: "pointer",
                      background: "#fff",
                    }}
                    title="クリックで選択"
                  >
                    <span>{z.label}</span>
                    <span style={{ fontVariantNumeric: "tabular-nums" }}>{z.v}</span>
                  </li>
                ))}
            </ul>
          </div>

          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>保存したルート</div>

            {routes.length === 0 ? (
              <div style={{ fontSize: 12, color: "#666" }}>まだありません。</div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {routes.slice(0, 8).map((r) => (
                  <div key={r.id} style={{ border: "1px solid #eee", borderRadius: 12, padding: "10px 12px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                      <div style={{ fontSize: 12, fontWeight: 700 }}>
                        {new Date(r.at).toLocaleString("ja-JP", { hour12: false })}
                      </div>
                      <button style={btn} onClick={() => deleteRoute(r.id)}>削除</button>
                    </div>
                    <div style={{ fontSize: 12, color: "#444", marginTop: 6 }}>
                      {r.path.map((id) => ZONES.find((z) => z.id === id)?.label || id).join(" → ")}
                    </div>

                    {/* コメントアウト例：不要ならこのブロック丸ごと消してOK */}
                    {/* <div style={{ fontSize: 11, color: "#777", marginTop: 6 }}>ここにメモ欄を増やせます</div> */}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

/* =========================
   StoreSVG（画像寄せSVG）
   ========================= */
function StoreSVG({ visits, selectedZone, heatOpacity, onClickZone, currentPoints, routeMode }) {
  return (
    <svg viewBox="0 0 1000 600" style={{ width: "100%", height: "auto", display: "block", marginTop: 10 }}>
      {/* 外枠 */}
      <rect x="5" y="5" width="990" height="590" fill="#fff" stroke="#111" strokeWidth="2" />

      {/* （雰囲気）中央のフロア枠 */}
      <rect x="200" y="80" width="600" height="500" fill="#ffffff" stroke="#e5e5e5" strokeWidth="2" />

      {/* 上の青帯 */}
      <rect x="200" y="10" width="600" height="70" fill="#3f6fb6" />
      <text x="500" y="52" textAnchor="middle" fontSize="22" fill="#fff" fontWeight="700">
        弁当・冷蔵品・冷凍品
      </text>

      {/* 右の青帯（飲料） */}
      <rect x="820" y="80" width="90" height="360" fill="#3f6fb6" />
      <text
        x="865"
        y="270"
        textAnchor="middle"
        fontSize="22"
        fill="#fff"
        fontWeight="700"
        transform="rotate(90 865 270)"
      >
        飲料
      </text>

      {/* WC（背景として描画） */}
      <rect x="740" y="440" width="250" height="150" fill="#fff" stroke="#e5e5e5" strokeWidth="2" />
      <text x="865" y="525" textAnchor="middle" fontSize="26" fill="#444" fontWeight="700">
        WC
      </text>

      {/* 出入口の矢印（雰囲気） */}
      <text x="210" y="465" fontSize="18" fill="#444" fontWeight="700">
        出入口
      </text>
      <polygon points="220,505 260,505 240,540" fill="#d22" />
      <rect x="230" y="540" width="20" height="25" fill="#d22" />

      {/* 現在記録中のルート（前面） */}
      {routeMode && currentPoints && currentPoints.length > 0 && (
        <polyline
          points={currentPoints}
          fill="none"
          stroke="#111"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.9"
        />
      )}

      {/* クリックできるゾーン */}
      {ZONES.map((z) => {
        const isSel = z.id === selectedZone;
        const v = visits[z.id] || 0;

        const isBanner = z.kind === "banner";
        const isUtility = z.kind === "utility";

        // bannerはすでに青帯で描画済みなので、クリック当たり判定だけ欲しい
        // （透明のrectを重ねる）
        const stroke = isSel ? "#111" : "#bdbdbd";
        const baseFill = isUtility ? "#eee" : "#fff";

        return (
          <g
            key={z.id}
            onClick={() => onClickZone(z.id)}
            style={{ cursor: "pointer", userSelect: "none" }}
          >
            {/* クリック当たり判定 */}
            <rect
              x={z.x}
              y={z.y}
              width={z.w}
              height={z.h}
              rx={isBanner ? 0 : 10}
              fill="transparent"
            />

            {/* banner以外は枠＋ヒートを描く */}
            {!isBanner && (
              <>
                {/* 枠 */}
                <rect
                  x={z.x}
                  y={z.y}
                  width={z.w}
                  height={z.h}
                  rx="10"
                  fill={baseFill}
                  stroke={stroke}
                  strokeWidth={isSel ? 3 : 2}
                />

                {/* ヒート */}
                <rect
                  x={z.x}
                  y={z.y}
                  width={z.w}
                  height={z.h}
                  rx="10"
                  fill="#111"
                  opacity={heatOpacity(z.id)}
                />

                {/* ラベル */}
                <text
                  x={z.x + z.w / 2}
                  y={z.y + z.h / 2}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={z.id === "register" ? 20 : 16}
                  fill={isUtility ? "#333" : "#fff"}
                  fontWeight="700"
                >
                  {z.label}
                </text>

                <text
                  x={z.x + z.w / 2}
                  y={z.y + z.h - 10}
                  textAnchor="middle"
                  fontSize="12"
                  fill={isUtility ? "#333" : "#fff"}
                  opacity="0.9"
                >
                  {v} 回
                </text>
              </>
            )}

            {/* bannerには回数だけ表示（任意） */}
            {isBanner && (
              <>
                {/* JSXコメント例：bannerの回数表示を消したいなら下をコメントアウト */}
                {/* <text x={z.cx} y={z.cy + 30} textAnchor="middle" fontSize="12" fill="#fff" opacity="0.9">{v} 回</text> */}
              </>
            )}

            {/* ルート用中心点（薄く） */}
            <circle cx={z.cx} cy={z.cy} r="4" fill="#111" opacity="0.2" />
          </g>
        );
      })}

      <text x="20" y="25" fontSize="12" fill="#777">
        クリックで訪問回数＋（濃いほど多い） / ルート記録モードで線が出る
      </text>
    </svg>
  );
}

/* =========================
   styles
   ========================= */
const card = {
  background: "#fff",
  border: "1px solid #eee",
  borderRadius: 14,
  padding: 14,
  boxShadow: "0 6px 20px rgba(0,0,0,0.05)",
};

const btn = {
  border: "1px solid #ddd",
  background: "#fff",
  color: "#111",
  padding: "8px 10px",
  borderRadius: 10,
  cursor: "pointer",
};

const btnDark = {
  border: "1px solid #ddd",
  background: "#111",
  color: "#fff",
  padding: "10px 12px",
  borderRadius: 10,
  cursor: "pointer",
};

const routeBar = {
  marginTop: 12,
  display: "flex",
  justifyContent: "space-between",
  gap: 10,
  alignItems: "center",
  border: "1px solid #eee",
  background: "#fcfcfc",
  borderRadius: 12,
  padding: "10px 12px",
};
