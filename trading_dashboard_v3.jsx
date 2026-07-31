import React, { useState, useMemo } from "react";

// ---------- Design tokens (cinema HUD theme) ----------
const T = {
  bg: "#09090A",
  panel: "#0C0C0B",
  panelAlt: "#111110",
  border: "#242422",
  borderSoft: "#1A1A18",
  text: "#EDEDEA",
  sub: "#8C8C87",
  faint: "#55554F",
  orange: "#EFA05C",
  orangeDim: "#7A5637",
  red: "#EF4F5E",
  green: "#57C889",
  blue: "#5A9CD6",
  mono: "ui-monospace, SFMono-Regular, 'Roboto Mono', Menlo, Consolas, monospace",
};

const DOMAIN = {
  NVDA: "nvidia.com", TSLA: "tesla.com", MU: "micron.com", PYPL: "paypal.com",
  INTC: "intel.com", BABA: "alibaba.com", META: "meta.com", PTT: "pttplc.com",
  AOT: "airportthai.co.th", DELTA: "deltathailand.com", CPALL: "cpall.co.th",
  BDMS: "bdms.co.th", SCB: "scb.co.th", ADVANC: "ais.co.th",
};

// ---------- Mock data ----------
const MOCK_STOCKS = [
  { id: "PTT", symbol: "PTT", name: "PTT PCL", market: "SET", currency: "฿", price: 32.5, changePct: -3.2, score: 78, sector: "Energy", inPortfolio: true, signal: "HOLD", reason: "ราคาน้ำมันดิบโลกอ่อนตัวลง 2 วันติด กดดันหุ้นกลุ่มพลังงานทั้งกระดาน แรงขายส่วนใหญ่มาจากนักลงทุนสถาบัน", forecast: "แนวรับสำคัญที่ 31.5 ยังไม่หลุด — รอดูปริมาณซื้อขายก่อนตัดสินใจ" },
  { id: "AOT", symbol: "AOT", name: "Airports of Thailand", market: "SET", currency: "฿", price: 62.0, changePct: 1.8, score: 55, sector: "Transport", inPortfolio: true, signal: "HOLD", reason: "จำนวนผู้โดยสารระหว่างประเทศเดือนล่าสุดโตกว่าคาด นักท่องเที่ยวจีนกลับมาเพิ่มขึ้น", forecast: "เทรนด์ฟื้นตัวต่อเนื่อง แต่ valuation เริ่มตึง" },
  { id: "DELTA", symbol: "DELTA", name: "Delta Electronics TH", market: "SET", currency: "฿", price: 88.25, changePct: 6.4, score: 91, sector: "Technology", inPortfolio: true, signal: "SELL", reason: "ราคาพุ่งแรงจากกระแส AI data center แต่เริ่มมีสัญญาณ overbought บน RSI รายวัน", forecast: "เข้าเงื่อนไข take-profit ตามแผน — พิจารณาลดสถานะบางส่วน" },
  { id: "CPALL", symbol: "CPALL", name: "CP All", market: "SET", currency: "฿", price: 58.0, changePct: -0.4, score: 22, sector: "Consumer", inPortfolio: true, signal: "HOLD", reason: "ไม่มีข่าวสำคัญ ราคาเคลื่อนไหวแคบในกรอบ", forecast: "รอ catalyst — ยังไม่มีสัญญาณเข้า/ออกใหม่" },
  { id: "NVDA", symbol: "NVDA", name: "NVIDIA Corp", market: "US", currency: "$", price: 148.2, changePct: 4.1, score: 82, sector: "Technology", inPortfolio: true, signal: "HOLD", reason: "นักวิเคราะห์ปรับเป้าราคาขึ้นหลังตัวเลข data-center demand แข็งแกร่งกว่าคาด", forecast: "เทรนด์ขาขึ้นยังแข็งแรง แนวต้านถัดไปที่จุดสูงสุดเดิม" },
  { id: "MU", symbol: "MU", name: "Micron Technology", market: "US", currency: "$", price: 96.4, changePct: -8.7, score: 88, sector: "Semiconductor", inPortfolio: false, signal: "BUY", reason: "ราคาร่วงหลังปรับลด guidance ไตรมาสหน้า แต่ fundamental ระยะยาวยังแข็งแรง (ROE, D/E อยู่ในเกณฑ์ดี)", forecast: "เข้าเงื่อนไข Fallen Angel — รอ retest โซนแนวรับก่อนพิจารณาเข้า" },
  { id: "PYPL", symbol: "PYPL", name: "PayPal Holdings", market: "US", currency: "$", price: 58.9, changePct: -5.3, score: 64, sector: "Fintech", inPortfolio: false, signal: "HOLD", reason: "แรงขายจากความกังวลเรื่องส่วนแบ่งตลาดที่ถูกคู่แข่ง fintech รายใหม่แย่งไป", forecast: "ยังไม่มี BOS ยืนยันกลับตัว — เฝ้าดูต่อ" },
  { id: "INTC", symbol: "INTC", name: "Intel Corp", market: "US", currency: "$", price: 21.1, changePct: 2.9, score: 41, sector: "Semiconductor", inPortfolio: false, signal: "HOLD", reason: "ข่าวลือดีลร่วมทุนโรงงานผลิตชิปหนุนราคาฟื้นระยะสั้น", forecast: "ยังอยู่ระหว่างพิสูจน์ตัว fundamental — รอผลประกอบการถัดไป" },
  { id: "BDMS", symbol: "BDMS", name: "Bangkok Dusit Medical", market: "SET", currency: "฿", price: 24.8, changePct: 0.8, score: 18, sector: "Healthcare", inPortfolio: false, signal: "HOLD", reason: "ไม่มีข่าวสำคัญวันนี้", forecast: "เคลื่อนไหวในกรอบปกติ" },
  { id: "SCB", symbol: "SCB", name: "SCB X", market: "SET", currency: "฿", price: 108.5, changePct: -2.1, score: 35, sector: "Financials", inPortfolio: false, signal: "HOLD", reason: "แรงขายทำกำไรหลังราคาขึ้นต่อเนื่อง 3 สัปดาห์", forecast: "แนวรับถัดไปที่แนว MA50 รายวัน" },
  { id: "TSLA", symbol: "TSLA", name: "Tesla Inc", market: "US", currency: "$", price: 218.4, changePct: -6.9, score: 73, sector: "Automotive", inPortfolio: false, signal: "HOLD", reason: "ยอดส่งมอบรถต่ำกว่าคาดการณ์นักวิเคราะห์ในตลาดจีน", forecast: "ยังไม่ผ่านเกณฑ์ fundamental ของ screener — ไม่เข้าเงื่อนไข buy" },
  { id: "BABA", symbol: "BABA", name: "Alibaba Group", market: "US", currency: "$", price: 79.6, changePct: -4.4, score: 69, sector: "E-commerce", inPortfolio: false, signal: "BUY", reason: "แรงกดดันจากความกังวลกฎระเบียบจีนรอบใหม่ แต่รายได้หลักยังโตต่อเนื่อง", forecast: "ผ่านเกณฑ์ fundamental แล้ว รอ technical trigger ยืนยันก่อนเข้า" },
  { id: "ADVANC", symbol: "ADVANC", name: "Advanced Info Service", market: "SET", currency: "฿", price: 245.0, changePct: 1.2, score: 15, sector: "Telecom", inPortfolio: false, signal: "HOLD", reason: "ไม่มีข่าวสำคัญ", forecast: "เคลื่อนไหวในกรอบ" },
  { id: "META", symbol: "META", name: "Meta Platforms", market: "US", currency: "$", price: 512.3, changePct: 3.4, score: 47, sector: "Technology", inPortfolio: false, signal: "HOLD", reason: "ตลาดตอบรับดีหลังประกาศลดงบลงทุน AI capex ปีหน้า", forecast: "เทรนด์ระยะกลางยังเป็นบวก" },
];

const NEWS = [
  { id: 1, icon: "oil", tag: "ENERGY", breaking: true, headline: "ราคาน้ำมันดิบร่วงต่อเนื่องวันที่ 2 หลังสต็อกสหรัฐฯ พุ่งเกินคาด", time: "23 นาทีที่แล้ว", related: ["PTT"] },
  { id: 2, icon: "chip", tag: "SEMICONDUCTOR", breaking: false, headline: "Micron ปรับลด guidance ไตรมาสหน้า ราคาหุ้นร่วงแรงหลังตลาดเปิด", time: "1 ชม.ที่แล้ว", related: ["MU"] },
  { id: 3, icon: "bank", tag: "MACRO", breaking: false, headline: "ตลาดจับตาถ้อยแถลง Fed สัปดาห์นี้ คาดส่งผลต่อกลุ่มเทคโนโลยี", time: "3 ชม.ที่แล้ว", related: ["NVDA", "META"] },
  { id: 4, icon: "chip", tag: "AI / DATA CENTER", breaking: false, headline: "ความต้องการชิป AI ดันหุ้นกลุ่ม data center ทั้งภูมิภาคปรับตัวขึ้น", time: "5 ชม.ที่แล้ว", related: ["DELTA", "NVDA"] },
];

// ---------- Treemap (slice & dice, alternating axis) ----------
function buildTreemap(items, x, y, w, h) {
  if (items.length === 0) return [];
  if (items.length === 1) return [{ ...items[0], x, y, w, h }];
  const total = items.reduce((s, i) => s + i.value, 0);
  let acc = 0, splitIdx = 1;
  for (let i = 0; i < items.length; i++) {
    acc += items[i].value;
    if (acc >= total / 2) { splitIdx = i + 1; break; }
  }
  splitIdx = Math.min(Math.max(splitIdx, 1), items.length - 1);
  const group1 = items.slice(0, splitIdx);
  const group2 = items.slice(splitIdx);
  const sum1 = group1.reduce((s, i) => s + i.value, 0);
  const ratio = sum1 / total;
  if (w >= h) {
    const w1 = w * ratio;
    return [...buildTreemap(group1, x, y, w1, h), ...buildTreemap(group2, x + w1, y, w - w1, h)];
  } else {
    const h1 = h * ratio;
    return [...buildTreemap(group1, x, y, w, h1), ...buildTreemap(group2, x, y + h1, w, h - h1)];
  }
}

function hexToRgb(hex) {
  const v = hex.replace("#", "");
  return { r: parseInt(v.substring(0, 2), 16), g: parseInt(v.substring(2, 4), 16), b: parseInt(v.substring(4, 6), 16) };
}
function mix(hex1, hex2, t) {
  const c1 = hexToRgb(hex1), c2 = hexToRgb(hex2);
  return `rgb(${Math.round(c1.r + (c2.r - c1.r) * t)},${Math.round(c1.g + (c2.g - c1.g) * t)},${Math.round(c1.b + (c2.b - c1.b) * t)})`;
}
function changeColor(pct) {
  const clamped = Math.max(-10, Math.min(10, pct));
  return clamped >= 0 ? mix("#55554F", T.green, clamped / 10) : mix("#55554F", T.red, -clamped / 10);
}
function concColor(pct) {
  if (pct >= 70) return T.red;
  if (pct >= 50) return "#DDB454";
  if (pct >= 25) return T.green;
  return T.blue;
}

const SIGNAL_STYLE = {
  BUY: { color: T.green, label: "BUY" },
  SELL: { color: T.red, label: "SELL" },
  HOLD: { color: T.faint, label: "HOLD" },
};

// ---------- Logo with graceful fallback ----------
function Logo({ symbol, size = 18 }) {
  const [failed, setFailed] = useState(false);
  const domain = DOMAIN[symbol];
  if (!domain || failed) {
    return (
      <div style={{ width: size, height: size, borderRadius: 3, background: T.borderSoft, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.48, fontWeight: 700, color: T.faint, flexShrink: 0 }}>
        {symbol.slice(0, 2)}
      </div>
    );
  }
  return (
    <img
      src={`https://logo.clearbit.com/${domain}?size=64`}
      width={size} height={size}
      onError={() => setFailed(true)}
      style={{ borderRadius: 3, objectFit: "contain", background: "#F5F3EF", padding: 1.5, flexShrink: 0 }}
      alt={symbol}
    />
  );
}

// ---------- News category icons (original line-art SVG) ----------
function NewsIcon({ type, color }) {
  const common = { width: 22, height: 22, viewBox: "0 0 24 24", fill: "none", stroke: color, strokeWidth: 1.4, strokeLinecap: "round", strokeLinejoin: "round" };
  if (type === "oil") return (
    <svg {...common}>
      <rect x="6" y="4" width="12" height="16" rx="1.5" />
      <line x1="6" y1="9" x2="18" y2="9" />
      <line x1="6" y1="15" x2="18" y2="15" />
      <path d="M9 4 L9 2 M15 4 L15 2" />
    </svg>
  );
  if (type === "chip") return (
    <svg {...common}>
      <rect x="7" y="7" width="10" height="10" rx="1" />
      <line x1="9" y1="3" x2="9" y2="7" /><line x1="15" y1="3" x2="15" y2="7" />
      <line x1="9" y1="17" x2="9" y2="21" /><line x1="15" y1="17" x2="15" y2="21" />
      <line x1="3" y1="9" x2="7" y2="9" /><line x1="3" y1="15" x2="7" y2="15" />
      <line x1="17" y1="9" x2="21" y2="9" /><line x1="17" y1="15" x2="21" y2="15" />
    </svg>
  );
  if (type === "bank") return (
    <svg {...common}>
      <path d="M4 10 L12 4 L20 10" />
      <line x1="4" y1="10" x2="20" y2="10" />
      <line x1="6" y1="10" x2="6" y2="18" /><line x1="10" y1="10" x2="10" y2="18" />
      <line x1="14" y1="10" x2="14" y2="18" /><line x1="18" y1="10" x2="18" y2="18" />
      <line x1="4" y1="20" x2="20" y2="20" />
    </svg>
  );
  return null;
}

// ---------- Small UI primitives ----------
function Panel({ label, children, style, right }) {
  return (
    <div style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 3, padding: 11, position: "relative", ...style }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 9 }}>
        <div style={{ fontFamily: T.mono, fontSize: 9.5, letterSpacing: 1.4, color: T.orange, fontWeight: 600 }}>— {label}</div>
        {right}
      </div>
      {children}
    </div>
  );
}

function Corner({ pos }) {
  const size = 12;
  const base = { position: "absolute", width: size, height: size, borderColor: T.orangeDim, opacity: 0.6 };
  const map = {
    tl: { top: 6, left: 6, borderTop: "1px solid", borderLeft: "1px solid" },
    tr: { top: 6, right: 6, borderTop: "1px solid", borderRight: "1px solid" },
    bl: { bottom: 6, left: 6, borderBottom: "1px solid", borderLeft: "1px solid" },
    br: { bottom: 6, right: 6, borderBottom: "1px solid", borderRight: "1px solid" },
  };
  return <div style={{ ...base, ...map[pos] }} />;
}

function RadialGauge({ value, size = 76, color, label, sublabel }) {
  const stroke = 5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - Math.min(value, 100) / 100);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={T.borderSoft} strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round" transform={`rotate(-90 ${size / 2} ${size / 2})`} />
        <text x="50%" y="47%" textAnchor="middle" fill={T.text} fontSize="14" fontWeight="700" fontFamily={T.mono}>{value.toFixed(0)}%</text>
        <text x="50%" y="63%" textAnchor="middle" fill={T.faint} fontSize="7.2" fontFamily={T.mono}>{sublabel}</text>
      </svg>
      <div style={{ fontFamily: T.mono, fontSize: 10, color: T.sub, marginTop: 3, letterSpacing: 0.5 }}>{label}</div>
    </div>
  );
}

function SegBar({ value, max = 100, color }) {
  const segCount = 26;
  const filled = Math.round((value / max) * segCount);
  return (
    <div style={{ display: "flex", gap: 1.5, height: 8 }}>
      {Array.from({ length: segCount }).map((_, i) => (
        <div key={i} style={{ flex: 1, background: i < filled ? color : T.borderSoft, borderRadius: 1 }} />
      ))}
    </div>
  );
}

function TreemapPanel({ stocks, onSelect, selectedId }) {
  const items = useMemo(() => {
    const sorted = [...stocks].sort((a, b) => b.score - a.score);
    return buildTreemap(sorted.map((s) => ({ ...s, value: s.score })), 0, 0, 1, 1);
  }, [stocks]);
  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      {items.map((it) => {
        const isSelected = selectedId === it.id;
        const glow = it.score >= 75;
        const big = it.w * it.h > 0.035;
        return (
          <div key={it.id} onClick={() => onSelect(it)} style={{ position: "absolute", left: `${it.x * 100}%`, top: `${it.y * 100}%`, width: `${it.w * 100}%`, height: `${it.h * 100}%`, padding: 1.5, boxSizing: "border-box", cursor: "pointer" }}>
            <div style={{
              width: "100%", height: "100%",
              background: `linear-gradient(135deg, ${changeColor(it.changePct)}1C, ${T.panelAlt})`,
              border: `1px solid ${isSelected ? T.orange : glow ? T.orangeDim : T.border}`,
              boxShadow: isSelected ? `0 0 0 1px ${T.orange}, 0 0 12px ${T.orange}55` : "none",
              borderRadius: 3, display: "flex", flexDirection: "column", justifyContent: "space-between",
              padding: it.w * it.h > 0.02 ? 7 : 3, overflow: "hidden",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                {big && <Logo symbol={it.symbol} size={14} />}
                <div style={{ fontFamily: T.mono, fontWeight: 700, color: T.text, fontSize: Math.max(9, Math.min(14, it.w * 120)), whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {it.symbol}
                </div>
              </div>
              {it.w > 0.12 && it.h > 0.15 && (
                <div style={{ fontFamily: T.mono, fontSize: 11, color: changeColor(it.changePct), fontWeight: 600 }}>
                  {it.changePct > 0 ? "+" : ""}{it.changePct.toFixed(1)}%
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ScopePlot({ stocks, selectedId, onSelect }) {
  const size = 150, cx = size / 2, cy = size / 2, R = 58;
  return (
    <svg width="100%" height={size} viewBox={`0 0 ${size} ${size}`}>
      {[1, 0.66, 0.33].map((f) => <circle key={f} cx={cx} cy={cy} r={R * f} fill="none" stroke={T.borderSoft} strokeWidth="1" />)}
      <line x1={cx - R} y1={cy} x2={cx + R} y2={cy} stroke={T.borderSoft} strokeWidth="1" />
      <line x1={cx} y1={cy - R} x2={cx} y2={cy + R} stroke={T.borderSoft} strokeWidth="1" />
      {stocks.map((s) => {
        const x = cx + Math.max(-1, Math.min(1, s.changePct / 10)) * R;
        const y = cy - (s.score / 100) * R;
        const isSel = s.id === selectedId;
        return <circle key={s.id} cx={x} cy={y} r={isSel ? 4.5 : 3} fill={changeColor(s.changePct)} stroke={isSel ? T.orange : "none"} strokeWidth={1.5} onClick={() => onSelect(s)} style={{ cursor: "pointer" }} />;
      })}
    </svg>
  );
}

// ---------- Main component ----------
export default function TradingDashboard() {
  const [selected, setSelected] = useState(MOCK_STOCKS[5]);
  const [filter, setFilter] = useState("ALL");

  const visibleStocks = MOCK_STOCKS.filter((s) => {
    if (filter === "PORTFOLIO") return s.inPortfolio;
    if (filter === "WATCHLIST") return !s.inPortfolio;
    if (filter === "BUY") return s.signal === "BUY";
    return true;
  });

  const jaoPrincipal = 42000, jaoTarget = 51000;
  const pnongPrincipal = 30000, pnongTarget = 30000;
  const totalPrincipal = jaoPrincipal + pnongPrincipal;
  const jaoPct = (jaoPrincipal / totalPrincipal) * 100;
  const pnongPct = (pnongPrincipal / totalPrincipal) * 100;

  const avgScore = (MOCK_STOCKS.reduce((s, i) => s + i.score, 0) / MOCK_STOCKS.length).toFixed(0);
  const portfolioCount = MOCK_STOCKS.filter((s) => s.inPortfolio).length;
  const riskBudgetUsedPct = 6.2, riskBudgetMax = 25;

  const sectorMap = {};
  MOCK_STOCKS.filter((s) => s.inPortfolio).forEach((s) => { sectorMap[s.sector] = (sectorMap[s.sector] || 0) + s.score; });
  const sectorTotal = Object.values(sectorMap).reduce((a, b) => a + b, 0);
  const sectors = Object.entries(sectorMap).map(([name, v]) => ({ name, pct: (v / sectorTotal) * 100 }));

  const allocBands = [
    { name: "ETF CORE", target: 25, actual: 29 },
    { name: "GROWTH", target: 50, actual: 46 },
    { name: "WARRANTS", target: 15, actual: 17 },
    { name: "CASH", target: 10, actual: 8 },
  ];

  const filterBtn = (key, label) => (
    <button onClick={() => setFilter(key)} style={{
      fontFamily: T.mono, fontSize: 10, letterSpacing: 1, color: filter === key ? T.bg : T.sub,
      background: filter === key ? T.orange : "transparent", border: `1px solid ${filter === key ? T.orange : T.border}`,
      borderRadius: 3, padding: "8px 6px", cursor: "pointer", flex: 1, fontWeight: 600,
    }}>{label}</button>
  );

  return (
    <div style={{
      minHeight: "100vh", background: T.bg, color: T.text, fontFamily: T.mono, padding: 16,
      backgroundImage: `linear-gradient(${T.borderSoft} 1px, transparent 1px), linear-gradient(90deg, ${T.borderSoft} 1px, transparent 1px)`,
      backgroundSize: "26px 26px", backgroundPosition: "-1px -1px",
    }}>
      {/* Top HUD bar */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "center", padding: "9px 14px", border: `1px solid ${T.border}`, borderRadius: 3, marginBottom: 12, background: T.panel }}>
        <span style={{ fontSize: 10, color: T.faint }}>MARKET <b style={{ color: T.text }}>US · SET</b></span>
        <span style={{ fontSize: 10, color: T.faint }}>HORIZON <b style={{ color: T.text }}>1–3M</b></span>
        <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: T.orange, fontWeight: 700 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: T.orange, display: "inline-block" }} /> MOCK DATA
        </span>
        <span style={{ fontSize: 10, color: T.faint }}>SESSION <b style={{ color: T.text }}>SES-0042</b></span>
        <span style={{ fontSize: 10, color: T.faint, marginLeft: "auto" }}>SCAN <b style={{ color: T.text }}>14:32:07</b></span>
        <div style={{ flexBasis: "100%" }} />
        <h1 style={{ fontSize: 16, fontWeight: 700, margin: 0, letterSpacing: 0.6 }}>TRADING COMMAND CENTER — MODULE 02</h1>
      </div>

      {/* Row 1: main map + right column */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
        <div style={{ flex: "1 1 520px", minWidth: 300 }}>
          <Panel label={`SIGNIFICANCE MAP — ${filter}`} style={{ height: 340 }} right={<span style={{ fontFamily: T.mono, fontSize: 9, color: T.faint }}>{visibleStocks.length} SYMBOLS</span>}>
            <div style={{ position: "relative", height: 288 }}>
              <TreemapPanel stocks={visibleStocks} onSelect={setSelected} selectedId={selected?.id} />
              <Corner pos="tl" /><Corner pos="tr" /><Corner pos="bl" /><Corner pos="br" />
            </div>
          </Panel>
        </div>

        <div style={{ flex: "0 1 260px", minWidth: 240, display: "flex", flexDirection: "column", gap: 12 }}>
          <Panel label="TOP SIGNAL">
            {selected && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Logo symbol={selected.symbol} size={26} />
                    <span style={{ fontSize: 17, fontWeight: 700 }}>{selected.symbol}</span>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 3, color: T.bg, background: SIGNAL_STYLE[selected.signal].color }}>
                    {SIGNAL_STYLE[selected.signal].label}
                  </span>
                </div>
                <div style={{ fontSize: 10, color: T.sub, marginBottom: 6 }}>{selected.name}</div>
                <div style={{ display: "flex", gap: 12, marginBottom: 8 }}>
                  <div><div style={{ fontSize: 8, color: T.faint }}>PRICE</div><div style={{ fontSize: 13, fontWeight: 700 }}>{selected.currency}{selected.price}</div></div>
                  <div><div style={{ fontSize: 8, color: T.faint }}>CHG</div><div style={{ fontSize: 13, fontWeight: 700, color: changeColor(selected.changePct) }}>{selected.changePct > 0 ? "+" : ""}{selected.changePct.toFixed(1)}%</div></div>
                  <div><div style={{ fontSize: 8, color: T.faint }}>SCORE</div><div style={{ fontSize: 13, fontWeight: 700, color: T.orange }}>{selected.score}</div></div>
                </div>
                <div style={{ fontSize: 10.5, lineHeight: 1.5, color: T.text, maxHeight: 55, overflow: "auto" }}>{selected.reason}</div>
              </div>
            )}
          </Panel>
          <Panel label="SCORE SCAN">
            <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 58 }}>
              {MOCK_STOCKS.map((s) => (
                <div key={s.id} title={s.symbol} onClick={() => setSelected(s)} style={{ flex: 1, height: `${s.score}%`, background: s.id === selected?.id ? T.orange : T.borderSoft, cursor: "pointer", borderRadius: 1 }} />
              ))}
            </div>
          </Panel>
          <Panel label="SIGNAL SCOPE">
            <ScopePlot stocks={MOCK_STOCKS} selectedId={selected?.id} onSelect={setSelected} />
          </Panel>
        </div>
      </div>

      {/* Row 2: news watch */}
      <Panel label="NEWS WATCH" style={{ marginBottom: 12 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 8 }}>
          {NEWS.map((n) => (
            <div key={n.id} style={{ display: "flex", gap: 10, padding: 9, background: T.panelAlt, border: `1px solid ${T.borderSoft}`, borderRadius: 3 }}>
              <div style={{ width: 40, height: 40, flexShrink: 0, borderRadius: 3, background: T.bg, border: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <NewsIcon type={n.icon} color={n.breaking ? T.red : T.orange} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 3 }}>
                  {n.breaking && <span style={{ fontSize: 8.5, fontWeight: 700, color: T.bg, background: T.red, padding: "1px 5px", borderRadius: 2, letterSpacing: 0.5 }}>BREAKING</span>}
                  <span style={{ fontSize: 8.5, color: T.faint, letterSpacing: 0.5 }}>{n.tag}</span>
                </div>
                <div style={{ fontSize: 11, color: T.text, lineHeight: 1.4, marginBottom: 4 }}>{n.headline}</div>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <span style={{ fontSize: 9, color: T.faint }}>{n.time}</span>
                  <span style={{ fontSize: 9, color: T.faint }}>·</span>
                  {n.related.map((r) => <span key={r} style={{ fontSize: 9, color: T.orange, fontWeight: 600 }}>{r}</span>)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      {/* Row 3: screener / rules / ownership */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
        <Panel label="SCREENER RULES" style={{ flex: "1 1 260px" }}>
          {["ราคาลง ≥20% จาก 52w high", "ROE เป็นบวก, D/E จัดการได้", "Revenue growth ยังบวก", "ยังทำกำไร (ไม่ burn cash)"].map((r, i) => (
            <div key={i} style={{ fontSize: 11, color: T.text, padding: "6px 8px", background: i === 0 ? T.panelAlt : "transparent", borderLeft: i === 0 ? `2px solid ${T.orange}` : "2px solid transparent", marginBottom: 2 }}>{r}</div>
          ))}
        </Panel>

        <Panel label="POSITION RULES" style={{ flex: "1 1 260px" }}>
          {[["CUT-LOSS", "-10% ~ -12%"], ["MAX POSITION", "20%"], ["SECTOR CAP", "40%"], ["MONTHLY DEPLOY", "฿10,000"], ["DRAWDOWN PAUSE", "25%"]].map(([k, v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, padding: "5px 2px", borderBottom: `1px solid ${T.borderSoft}` }}>
              <span style={{ color: T.faint }}>{k}</span><span style={{ color: T.text, fontWeight: 600 }}>{v}</span>
            </div>
          ))}
        </Panel>

        <Panel label="OWNERSHIP" style={{ flex: "1 1 260px" }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <RadialGauge value={jaoPct} color={T.orange} label="Jao" sublabel={`฿${jaoPrincipal.toLocaleString()}`} />
            <RadialGauge value={pnongPct} color={T.blue} label="Pnong" sublabel={`฿${pnongPrincipal.toLocaleString()}`} />
          </div>
          <div style={{ fontSize: 9, color: T.faint }}>TOTAL PRINCIPAL ฿{totalPrincipal.toLocaleString()}</div>
        </Panel>
      </div>

      {/* Row 4: quick stats + last scan + risk budget */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
        <div style={{ flex: "1 1 380px", display: "flex", flexWrap: "wrap", gap: 10, border: `1px solid ${T.border}`, borderRadius: 3, padding: "10px 14px", background: T.panel }}>
          {[["AVG SCORE", avgScore], ["POSITIONS", portfolioCount], ["CASH BUFFER", "10%"], ["SECTOR CAP USED", "34%"], ["WIN RATE", "PENDING"]].map(([k, v]) => (
            <div key={k} style={{ minWidth: 90 }}>
              <div style={{ fontSize: 8.5, color: T.faint }}>{k}</div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{v}</div>
            </div>
          ))}
        </div>
        <Panel label="LAST SCAN" style={{ flex: "0 1 180px" }}>
          <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: 1 }}>14:32:07</div>
          <div style={{ fontSize: 9, color: T.faint, marginTop: 2 }}>SESSION SES-0042</div>
        </Panel>
        <Panel label="RISK BUDGET" style={{ flex: "0 1 140px" }}>
          <RadialGauge value={(riskBudgetUsedPct / riskBudgetMax) * 100} color={T.red} label="DRAWDOWN" sublabel={`${riskBudgetUsedPct}% / ${riskBudgetMax}%`} />
        </Panel>
      </div>

      {/* Bottom filter toolbar */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        {filterBtn("ALL", "ALL")}
        {filterBtn("PORTFOLIO", "PORTFOLIO")}
        {filterBtn("WATCHLIST", "WATCHLIST")}
        {filterBtn("BUY", "BUY SIGNALS")}
      </div>

      {/* Row 5: capital log / sector exposure / allocation bands */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Panel label="CAPITAL LOG" style={{ flex: "1 1 260px" }}>
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, marginBottom: 3 }}>
              <span style={{ color: T.sub }}>Jao</span><span>฿{jaoPrincipal.toLocaleString()} / ฿{jaoTarget.toLocaleString()}</span>
            </div>
            <SegBar value={jaoPrincipal} max={jaoTarget} color={T.orange} />
          </div>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, marginBottom: 3 }}>
              <span style={{ color: T.sub }}>Pnong</span><span>฿{pnongPrincipal.toLocaleString()} / ฿{pnongTarget.toLocaleString()}</span>
            </div>
            <SegBar value={pnongPrincipal} max={pnongTarget} color={T.blue} />
          </div>
        </Panel>

        <Panel label="SECTOR EXPOSURE" style={{ flex: "1 1 260px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            {sectors.map((s) => (
              <div key={s.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: T.panelAlt, borderRadius: 3, padding: "5px 7px", borderLeft: `3px solid ${concColor(s.pct)}` }}>
                <span style={{ fontSize: 9.5, color: T.sub }}>{s.name}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: concColor(s.pct) }}>{s.pct.toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel label="ALLOCATION BANDS" style={{ flex: "1 1 260px" }}>
          {allocBands.map((b) => (
            <div key={b.name} style={{ marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9.5, marginBottom: 3 }}>
                <span style={{ color: T.sub }}>{b.name}</span>
                <span style={{ color: Math.abs(b.actual - b.target) > 5 ? T.red : T.text }}>{b.actual}% (target {b.target}%)</span>
              </div>
              <div style={{ position: "relative", height: 6, background: T.borderSoft, borderRadius: 3 }}>
                <div style={{ position: "absolute", left: `${b.target}%`, top: -2, width: 1, height: 10, background: T.faint }} />
                <div style={{ width: `${b.actual}%`, height: "100%", background: Math.abs(b.actual - b.target) > 5 ? T.red : T.orange, borderRadius: 3 }} />
              </div>
            </div>
          ))}
        </Panel>
      </div>
    </div>
  );
}
