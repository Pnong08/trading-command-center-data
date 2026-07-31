import React, { useState, useMemo } from "react";

// ---------- Design tokens ----------
const T = {
  bg: "#0B0E13",
  panel: "#12161F",
  panel2: "#161B26",
  border: "#232838",
  borderSoft: "#1B2029",
  text: "#E7EAF0",
  sub: "#8B93A7",
  faint: "#5B637A",
  amber: "#E8A33D",
  green: "#34D399",
  red: "#F2657A",
  slate: "#64748B",
  mono: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
  sans: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif",
};

// ---------- Mock data ----------
const MOCK_STOCKS = [
  { id: "PTT", symbol: "PTT", name: "PTT PCL", market: "SET", currency: "฿", price: 32.5, changePct: -3.2, score: 78, sector: "Energy", inPortfolio: true, signal: "HOLD", reason: "ราคาน้ำมันดิบโลกอ่อนตัวลง 2 วันติด กดดันหุ้นกลุ่มพลังงานทั้งกระดาน แรงขายส่วนใหญ่มาจากนักลงทุนสถาบัน", forecast: "แนวรับสำคัญที่ 31.5 ยังไม่หลุด — รอดูปริมาณซื้อขายก่อนตัดสินใจเพิ่ม/ลด" },
  { id: "AOT", symbol: "AOT", name: "Airports of Thailand", market: "SET", currency: "฿", price: 62.0, changePct: 1.8, score: 55, sector: "Transport", inPortfolio: true, signal: "HOLD", reason: "จำนวนผู้โดยสารระหว่างประเทศเดือนล่าสุดโตกว่าคาด นักท่องเที่ยวจีนกลับมาเพิ่มขึ้น", forecast: "เทรนด์ฟื้นตัวต่อเนื่อง แต่ valuation เริ่มตึง ควรรอ retest แนวรับก่อนเพิ่มสถานะ" },
  { id: "DELTA", symbol: "DELTA", name: "Delta Electronics TH", market: "SET", currency: "฿", price: 88.25, changePct: 6.4, score: 91, sector: "Technology", inPortfolio: true, signal: "SELL", reason: "ราคาพุ่งแรงจากกระแส AI data center แต่เริ่มมีสัญญาณ overbought ชัดเจนบน RSI รายวัน", forecast: "โมเมนตัมสั้นยังแรง แต่เข้าเงื่อนไข take-profit ตามแผน — พิจารณาลดสถานะบางส่วน" },
  { id: "CPALL", symbol: "CPALL", name: "CP All", market: "SET", currency: "฿", price: 58.0, changePct: -0.4, score: 22, sector: "Consumer", inPortfolio: true, signal: "HOLD", reason: "ไม่มีข่าวสำคัญ ราคาเคลื่อนไหวแคบในกรอบ", forecast: "รอ catalyst — ยังไม่มีสัญญาณเข้า/ออกใหม่" },
  { id: "NVDA", symbol: "NVDA", name: "NVIDIA Corp", market: "US", currency: "$", price: 148.2, changePct: 4.1, score: 82, sector: "Technology", inPortfolio: true, signal: "HOLD", reason: "นักวิเคราะห์ปรับเป้าราคาขึ้นหลังตัวเลข data-center demand แข็งแกร่งกว่าคาด", forecast: "เทรนด์ขาขึ้นยังแข็งแรง แนวต้านถัดไปที่จุดสูงสุดเดิม" },
  { id: "MU", symbol: "MU", name: "Micron Technology", market: "US", currency: "$", price: 96.4, changePct: -8.7, score: 88, sector: "Semiconductor", inPortfolio: false, signal: "BUY", reason: "ราคาร่วงหลังปรับลด guidance ไตรมาสหน้า แต่ fundamental ระยะยาวยังแข็งแรง (ROE, D/E อยู่ในเกณฑ์ดี)", forecast: "เข้าเงื่อนไข Fallen Angel (ลง >20% จาก 52w high) — รอ retest โซนแนวรับก่อนพิจารณาเข้า" },
  { id: "PYPL", symbol: "PYPL", name: "PayPal Holdings", market: "US", currency: "$", price: 58.9, changePct: -5.3, score: 64, sector: "Fintech", inPortfolio: false, signal: "HOLD", reason: "แรงขายจากความกังวลเรื่องส่วนแบ่งตลาดที่ถูกคู่แข่ง fintech รายใหม่แย่งไป", forecast: "ยังไม่มี BOS ยืนยันกลับตัว — เฝ้าดูต่อ" },
  { id: "INTC", symbol: "INTC", name: "Intel Corp", market: "US", currency: "$", price: 21.1, changePct: 2.9, score: 41, sector: "Semiconductor", inPortfolio: false, signal: "HOLD", reason: "ข่าวลือดีลร่วมทุนโรงงานผลิตชิปหนุนราคาฟื้นระยะสั้น", forecast: "ยังอยู่ระหว่างพิสูจน์ตัว fundamental — รอผลประกอบการถัดไป" },
  { id: "BDMS", symbol: "BDMS", name: "Bangkok Dusit Medical", market: "SET", currency: "฿", price: 24.8, changePct: 0.8, score: 18, sector: "Healthcare", inPortfolio: false, signal: "HOLD", reason: "ไม่มีข่าวสำคัญวันนี้", forecast: "เคลื่อนไหวในกรอบปกติ" },
  { id: "SCB", symbol: "SCB", name: "SCB X", market: "SET", currency: "฿", price: 108.5, changePct: -2.1, score: 35, sector: "Financials", inPortfolio: false, signal: "HOLD", reason: "แรงขายทำกำไรหลังราคาขึ้นต่อเนื่อง 3 สัปดาห์", forecast: "แนวรับถัดไปที่แนว MA50 รายวัน" },
  { id: "TSLA", symbol: "TSLA", name: "Tesla Inc", market: "US", currency: "$", price: 218.4, changePct: -6.9, score: 73, sector: "Automotive", inPortfolio: false, signal: "HOLD", reason: "ยอดส่งมอบรถต่ำกว่าคาดการณ์นักวิเคราะห์ในตลาดจีน", forecast: "ยังไม่ผ่านเกณฑ์ fundamental ของ screener (กำไรผันผวนสูง) — ไม่เข้าเงื่อนไข buy" },
  { id: "BABA", symbol: "BABA", name: "Alibaba Group", market: "US", currency: "$", price: 79.6, changePct: -4.4, score: 69, sector: "E-commerce", inPortfolio: false, signal: "BUY", reason: "แรงกดดันจากความกังวลกฎระเบียบจีนรอบใหม่ แต่รายได้หลักยังโตต่อเนื่อง", forecast: "ผ่านเกณฑ์ fundamental แล้ว รอ technical trigger ยืนยันก่อนเข้า" },
  { id: "ADVANC", symbol: "ADVANC", name: "Advanced Info Service", market: "SET", currency: "฿", price: 245.0, changePct: 1.2, score: 15, sector: "Telecom", inPortfolio: false, signal: "HOLD", reason: "ไม่มีข่าวสำคัญ", forecast: "เคลื่อนไหวในกรอบ" },
  { id: "META", symbol: "META", name: "Meta Platforms", market: "US", currency: "$", price: 512.3, changePct: 3.4, score: 47, sector: "Technology", inPortfolio: false, signal: "HOLD", reason: "ตลาดตอบรับดีหลังประกาศลดงบลงทุน AI capex ปีหน้า", forecast: "เทรนด์ระยะกลางยังเป็นบวก" },
];

// ---------- Simple recursive treemap (slice & dice, alternating axis) ----------
function buildTreemap(items, x, y, w, h) {
  if (items.length === 0) return [];
  if (items.length === 1) return [{ ...items[0], x, y, w, h }];

  const total = items.reduce((s, i) => s + i.value, 0);
  let acc = 0,
    splitIdx = 1;
  for (let i = 0; i < items.length; i++) {
    acc += items[i].value;
    if (acc >= total / 2) {
      splitIdx = i + 1;
      break;
    }
  }
  splitIdx = Math.min(Math.max(splitIdx, 1), items.length - 1);

  const group1 = items.slice(0, splitIdx);
  const group2 = items.slice(splitIdx);
  const sum1 = group1.reduce((s, i) => s + i.value, 0);
  const ratio = sum1 / total;

  if (w >= h) {
    const w1 = w * ratio;
    return [
      ...buildTreemap(group1, x, y, w1, h),
      ...buildTreemap(group2, x + w1, y, w - w1, h),
    ];
  } else {
    const h1 = h * ratio;
    return [
      ...buildTreemap(group1, x, y, w, h1),
      ...buildTreemap(group2, x, y + h1, w, h - h1),
    ];
  }
}

function changeColor(pct) {
  // interpolate red -> slate -> green
  const clamped = Math.max(-10, Math.min(10, pct));
  if (clamped >= 0) {
    const t = clamped / 10;
    return mix(T.slate, T.green, t);
  } else {
    const t = -clamped / 10;
    return mix(T.slate, T.red, t);
  }
}
function mix(hex1, hex2, t) {
  const c1 = hexToRgb(hex1),
    c2 = hexToRgb(hex2);
  const r = Math.round(c1.r + (c2.r - c1.r) * t);
  const g = Math.round(c1.g + (c2.g - c1.g) * t);
  const b = Math.round(c1.b + (c2.b - c1.b) * t);
  return `rgb(${r},${g},${b})`;
}
function hexToRgb(hex) {
  const v = hex.replace("#", "");
  return {
    r: parseInt(v.substring(0, 2), 16),
    g: parseInt(v.substring(2, 4), 16),
    b: parseInt(v.substring(4, 6), 16),
  };
}

const SIGNAL_STYLE = {
  BUY: { color: T.green, label: "ซื้อ" },
  SELL: { color: T.red, label: "ขาย" },
  HOLD: { color: T.slate, label: "ถือ" },
};

function TreemapSection({ title, stocks, onSelect, selectedId }) {
  const items = useMemo(() => {
    const sorted = [...stocks].sort((a, b) => b.score - a.score);
    const withValue = sorted.map((s) => ({ ...s, value: s.score }));
    return buildTreemap(withValue, 0, 0, 1, 1);
  }, [stocks]);

  return (
    <div style={{ marginBottom: 28 }}>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          marginBottom: 10,
        }}
      >
        <h3
          style={{
            color: T.text,
            fontFamily: T.sans,
            fontSize: 15,
            fontWeight: 600,
            letterSpacing: 0.2,
            margin: 0,
          }}
        >
          {title}
        </h3>
        <span style={{ color: T.faint, fontFamily: T.mono, fontSize: 11 }}>
          {stocks.length} ตัว
        </span>
      </div>
      <div
        style={{
          position: "relative",
          width: "100%",
          height: 280,
          background: T.panel2,
          border: `1px solid ${T.borderSoft}`,
          borderRadius: 10,
          overflow: "hidden",
        }}
      >
        {items.map((it) => {
          const isSelected = selectedId === it.id;
          const glow = it.score >= 75;
          return (
            <div
              key={it.id}
              onClick={() => onSelect(it)}
              style={{
                position: "absolute",
                left: `${it.x * 100}%`,
                top: `${it.y * 100}%`,
                width: `${it.w * 100}%`,
                height: `${it.h * 100}%`,
                padding: 1.5,
                boxSizing: "border-box",
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  background: `linear-gradient(135deg, ${changeColor(
                    it.changePct
                  )}22, ${T.panel})`,
                  border: `1px solid ${
                    isSelected ? T.amber : glow ? T.amber + "66" : T.border
                  }`,
                  boxShadow: isSelected
                    ? `0 0 0 1px ${T.amber}, 0 0 14px ${T.amber}55`
                    : glow
                    ? `0 0 10px ${T.amber}22`
                    : "none",
                  borderRadius: 6,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  padding: it.w * it.h > 0.02 ? 8 : 4,
                  overflow: "hidden",
                  transition: "box-shadow 0.15s ease",
                }}
              >
                <div
                  style={{
                    fontFamily: T.mono,
                    fontWeight: 700,
                    color: T.text,
                    fontSize: Math.max(10, Math.min(15, it.w * 130)),
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {it.symbol}
                </div>
                {it.w > 0.12 && it.h > 0.15 && (
                  <div
                    style={{
                      fontFamily: T.mono,
                      fontSize: 12,
                      color: changeColor(it.changePct),
                      fontWeight: 600,
                    }}
                  >
                    {it.changePct > 0 ? "+" : ""}
                    {it.changePct.toFixed(1)}%
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function OwnershipBar({ label, value, total, color }) {
  const pct = (value / total) * 100;
  return (
    <div style={{ marginBottom: 10 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontFamily: T.mono,
          fontSize: 12,
          marginBottom: 4,
        }}
      >
        <span style={{ color: T.sub }}>{label}</span>
        <span style={{ color: T.text, fontWeight: 600 }}>
          ฿{value.toLocaleString()}
        </span>
      </div>
      <div
        style={{
          height: 6,
          background: T.borderSoft,
          borderRadius: 3,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background: color,
            borderRadius: 3,
          }}
        />
      </div>
    </div>
  );
}

export default function TradingDashboard() {
  const [selected, setSelected] = useState(MOCK_STOCKS[5]); // default: MU as example BUY

  const portfolioStocks = MOCK_STOCKS.filter((s) => s.inPortfolio);
  const watchlistStocks = MOCK_STOCKS.filter((s) => !s.inPortfolio);

  const partnerPrincipal = 42000;
  const selfPrincipal = 30000;
  const totalPrincipal = partnerPrincipal + selfPrincipal;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: T.bg,
        color: T.text,
        fontFamily: T.sans,
        padding: "24px 20px 40px",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: 22,
        }}
      >
        <div>
          <div
            style={{
              fontFamily: T.mono,
              fontSize: 11,
              color: T.amber,
              letterSpacing: 1.5,
              marginBottom: 4,
            }}
          >
            TRADING COMMAND CENTER — MODULE 02
          </div>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 700,
              margin: 0,
              letterSpacing: -0.3,
            }}
          >
            Stock Significance Map
          </h1>
        </div>
        <div
          style={{
            fontFamily: T.mono,
            fontSize: 11,
            color: T.faint,
            textAlign: "right",
          }}
        >
          <div>ข้อมูลตัวอย่าง (mock) — ยังไม่เชื่อมข้อมูลจริง</div>
          <div>อัปเดตล่าสุด: —</div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
        {/* Main column */}
        <div style={{ flex: "1 1 560px", minWidth: 320 }}>
          <TreemapSection
            title="หุ้นในพอร์ต"
            stocks={portfolioStocks}
            onSelect={setSelected}
            selectedId={selected?.id}
          />
          <TreemapSection
            title="Watchlist ทั่วไป"
            stocks={watchlistStocks}
            onSelect={setSelected}
            selectedId={selected?.id}
          />

          {/* Legend */}
          <div
            style={{
              display: "flex",
              gap: 20,
              flexWrap: "wrap",
              alignItems: "center",
              padding: "12px 14px",
              background: T.panel,
              border: `1px solid ${T.borderSoft}`,
              borderRadius: 8,
              fontFamily: T.mono,
              fontSize: 11,
              color: T.sub,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 2,
                  background: T.red,
                  display: "inline-block",
                }}
              />
              ราคาลง
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 2,
                  background: T.slate,
                  display: "inline-block",
                  marginLeft: 8,
                }}
              />
              ทรงตัว
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 2,
                  background: T.green,
                  display: "inline-block",
                  marginLeft: 8,
                }}
              />
              ราคาขึ้น
            </div>
            <div>ขนาดกล่อง = คะแนนนัยสำคัญ (significance score)</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 2,
                  border: `1px solid ${T.amber}`,
                  boxShadow: `0 0 6px ${T.amber}88`,
                  display: "inline-block",
                }}
              />
              ขอบเรือง = score ≥ 75
            </div>
          </div>
        </div>

        {/* Side column */}
        <div style={{ flex: "0 1 300px", minWidth: 280 }}>
          {/* Ownership panel */}
          <div
            style={{
              background: T.panel,
              border: `1px solid ${T.borderSoft}`,
              borderRadius: 10,
              padding: 16,
              marginBottom: 16,
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                marginBottom: 12,
                color: T.text,
              }}
            >
              เงินต้นสะสม (ตัวอย่าง)
            </div>
            <OwnershipBar
              label="แฟน"
              value={partnerPrincipal}
              total={totalPrincipal}
              color={T.amber}
            />
            <OwnershipBar
              label="พี่น้อง"
              value={selfPrincipal}
              total={totalPrincipal}
              color={"#5EA0F2"}
            />
            <div
              style={{
                marginTop: 10,
                paddingTop: 10,
                borderTop: `1px solid ${T.borderSoft}`,
                display: "flex",
                justifyContent: "space-between",
                fontFamily: T.mono,
                fontSize: 12,
              }}
            >
              <span style={{ color: T.sub }}>รวม</span>
              <span style={{ color: T.text, fontWeight: 700 }}>
                ฿{totalPrincipal.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Detail panel */}
          {selected && (
            <div
              style={{
                background: T.panel,
                border: `1px solid ${T.borderSoft}`,
                borderRadius: 10,
                padding: 16,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 10,
                }}
              >
                <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                  <span
                    style={{
                      fontFamily: T.mono,
                      fontSize: 17,
                      fontWeight: 700,
                    }}
                  >
                    {selected.symbol}
                  </span>
                  <span style={{ fontSize: 11, color: T.faint }}>
                    {selected.market}
                  </span>
                </div>
                <span
                  style={{
                    fontFamily: T.mono,
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "3px 8px",
                    borderRadius: 4,
                    color: T.bg,
                    background: SIGNAL_STYLE[selected.signal].color,
                  }}
                >
                  {SIGNAL_STYLE[selected.signal].label}
                </span>
              </div>

              <div style={{ fontSize: 12, color: T.sub, marginBottom: 10 }}>
                {selected.name} · {selected.sector}
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 16,
                  fontFamily: T.mono,
                  marginBottom: 14,
                }}
              >
                <div>
                  <div style={{ fontSize: 10, color: T.faint }}>ราคา</div>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>
                    {selected.currency}
                    {selected.price}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: T.faint }}>เปลี่ยนแปลง</div>
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: 700,
                      color: changeColor(selected.changePct),
                    }}
                  >
                    {selected.changePct > 0 ? "+" : ""}
                    {selected.changePct.toFixed(1)}%
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: T.faint }}>Score</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: T.amber }}>
                    {selected.score}
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <div
                  style={{
                    fontSize: 11,
                    color: T.faint,
                    marginBottom: 4,
                    fontFamily: T.mono,
                  }}
                >
                  เหตุผลที่ราคาเปลี่ยนวันนี้ (mock)
                </div>
                <div style={{ fontSize: 13, lineHeight: 1.5, color: T.text }}>
                  {selected.reason}
                </div>
              </div>

              <div>
                <div
                  style={{
                    fontSize: 11,
                    color: T.faint,
                    marginBottom: 4,
                    fontFamily: T.mono,
                  }}
                >
                  คาดการณ์คร่าวๆ (mock)
                </div>
                <div style={{ fontSize: 13, lineHeight: 1.5, color: T.sub }}>
                  {selected.forecast}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
