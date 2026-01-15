import React from "react";
import { Link, Route, Routes, Navigate } from "react-router-dom";
import KonbiniLogPage from "./pages/KonbiniLogPage.jsx";
import StoreMapPage from "./pages/StoreMapPage.jsx";

export default function App() {
  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: 18 }}>
      <header style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22 }}>コンビニ可視化ツール</h1>
          <div style={{ color: "#666", fontSize: 12, marginTop: 6 }}>
            「買ったモノ記録」と「店内マップ」を切り替えて使えます
          </div>
        </div>

        <nav style={{ display: "flex", gap: 10 }}>
          <Link to="/log" style={linkStyle}>買ったモノ記録</Link>
          <Link to="/map" style={linkStyle}>店内マップ</Link>
        </nav>
      </header>

      <div style={{ marginTop: 14 }}>
        <Routes>
          <Route path="/" element={<Navigate to="/log" replace />} />
          <Route path="/log" element={<KonbiniLogPage />} />
          <Route path="/map" element={<StoreMapPage />} />
          <Route path="*" element={<div>Not Found</div>} />
        </Routes>
      </div>
    </div>
  );
}

const linkStyle = {
  display: "inline-block",
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #ddd",
  textDecoration: "none",
  color: "#111",
  background: "#fff",
};
