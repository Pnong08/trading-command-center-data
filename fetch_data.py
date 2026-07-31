"""
Trading Command Center — Module 02 data layer
รันโดย GitHub Actions ทุกวัน -> เขียน data.json -> artifact ใน Claude ดึงไปโชว์

สิ่งที่ทำอัตโนมัติจริง (ไม่ใช่ mock):
  - ราคาปัจจุบัน, % เปลี่ยนแปลง, ระยะห่างจาก 52w high      (yfinance price history)
  - Quality Ratio Check ชั้น 2 (P/E, P/B, PEG, ROE, Gross Margin)  (yfinance .info)

สิ่งที่ยัง "ทำอัตโนมัติไม่ได้" ในเวอร์ชันนี้ (บอกตรงๆ ไม่ปิดบัง):
  - Price/FCF, ROIC, ROCE  -> yfinance ไม่มี field ตรงๆ ที่เชื่อถือได้ฟรี ขอข้ามไปก่อน
    (นับเฉพาะ ratio ที่มีข้อมูลจริงเป็นตัวหาร ไม่ปัดเป็นไม่ผ่านลอยๆ)
  - Technical (BOS/CHoCH/retest)  -> อ่านจาก technical_overrides.json ที่พี่น้องกรอกเอง
  - ข่าว/เหตุผลราคาเปลี่ยน       -> ยังไม่ต่อ News API ในรอบนี้ ใช้ข้อความสรุปตัวเลขแทนไปก่อน
"""

import json
import datetime
import sys

try:
    import yfinance as yf
except ImportError:
    print("ERROR: pip install yfinance ก่อนรัน (ดู requirements.txt)")
    sys.exit(1)

QUALITY_THRESHOLDS = {
    "pe": 20,          # ต่ำกว่า = ผ่าน
    "pb": 2,           # ต่ำกว่า = ผ่าน
    "peg": 2,          # ต่ำกว่า = ผ่าน
    "roe": 0.20,       # สูงกว่า = ผ่าน (yfinance คืนเป็น fraction เช่น 0.25 = 25%)
    "grossMargin": 0.50,  # สูงกว่า = ผ่าน
}

CYCLICAL_SECTORS = {"Energy", "Industrials", "Materials", "Transport"}
FINANCIAL_SECTORS = {"Financials"}


def quality_check(info, sector):
    """คืนค่า (fundamentalPass: bool, passed: int, evaluated: int, notes: list[str])"""
    checks = {}

    pe = info.get("trailingPE")
    if pe is not None:
        checks["pe"] = pe < QUALITY_THRESHOLDS["pe"]

    pb = info.get("priceToBook")
    if pb is not None:
        checks["pb"] = pb < QUALITY_THRESHOLDS["pb"]

    peg = info.get("pegRatio") or info.get("trailingPegRatio")
    if peg is not None:
        checks["peg"] = peg < QUALITY_THRESHOLDS["peg"]

    roe = info.get("returnOnEquity")
    roe_threshold = QUALITY_THRESHOLDS["roe"]
    notes = []
    if sector in FINANCIAL_SECTORS:
        # กลุ่มธนาคาร: gross margin ไม่มีความหมาย ข้าม ไม่ตัดคะแนน
        notes.append("กลุ่ม Financials: ข้าม Gross Margin ตามกฎข้อ 3.2")
    else:
        gm = info.get("grossMargins")
        gm_threshold = QUALITY_THRESHOLDS["grossMargin"]
        if sector in CYCLICAL_SECTORS:
            gm_threshold = 0.28  # ผ่อนตามข้อ 3.2 (capital-intensive)
            notes.append(f"กลุ่ม cyclical: ผ่อน Gross Margin เหลือ >{gm_threshold:.0%}")
        if gm is not None:
            checks["grossMargin"] = gm >= gm_threshold

    if roe is not None:
        checks["roe"] = roe >= roe_threshold

    evaluated = len(checks)
    passed = sum(1 for v in checks.values() if v)
    if evaluated == 0:
        return False, 0, 0, notes + ["ไม่มีข้อมูล fundamental พอประเมิน — ต้องตรวจด้วยมือ"]

    # ต้องผ่านอย่างน้อยครึ่งหนึ่งของที่ประเมินได้ (ปรับสัดส่วนตามจำนวน ratio ที่มีข้อมูลจริง)
    fundamental_pass = passed >= max(1, round(evaluated * 0.5))
    return fundamental_pass, passed, evaluated, notes


def classify(stock):
    """พอร์ต the same logic as classify() in the dashboard artifact (JS -> Python)."""
    if stock["inPortfolio"]:
        pct_from_entry = ((stock["price"] - stock["entryPrice"]) / stock["entryPrice"]) * 100
        if pct_from_entry <= -12:
            return {"status": "SELL_NOW", "rule": "CUT-LOSS",
                    "detail": f"หลุด -12% จากราคาเข้า ({pct_from_entry:.1f}%) — hard rule ไม่มีข้อยกเว้น"}
        if stock.get("technicalState") == "breakdown":
            return {"status": "SELL_NOW", "rule": "TECHNICAL BREAKDOWN",
                    "detail": "หลุดโครงสร้างสำคัญพร้อม volume ยืนยัน"}
        if pct_from_entry >= 45:
            return {"status": "SELL_NOW", "rule": "TAKE-PROFIT",
                    "detail": f"วิ่ง +{pct_from_entry:.0f}% จากราคาเข้า เข้าเป้าหมายกำไร"}
        if pct_from_entry <= -8:
            return {"status": "WATCHING", "rule": "APPROACHING CUT-LOSS",
                    "detail": f"{pct_from_entry:.1f}% ห่างจากเกณฑ์ -12% ไม่มาก"}
        if stock.get("reviewFlag"):
            return {"status": "WATCHING", "rule": "TIME-BASED REVIEW",
                    "detail": "ถือมาหลายไตรมาส ยังไม่ถึงเป้า — ทบทวนธีสิส"}
        return {"status": "HOLD", "rule": "—", "detail": "อยู่ในกรอบปกติ"}

    if stock.get("fundamentalPass") and stock.get("technicalState") == "retest_confirmed":
        return {"status": "BUY_NOW", "rule": "BUY TRIGGER ครบ",
                "detail": "ผ่าน fundamental + technical ยืนยันแล้ว"}
    if stock.get("fundamentalPass") and stock.get("technicalState") == "awaiting_retest":
        return {"status": "WATCHING", "rule": "รอ TECHNICAL TRIGGER",
                "detail": "fundamental ผ่านแล้ว รอจังหวะ retest/BOS"}
    pct52 = stock.get("pctFrom52wHigh", 0)
    if -20 < pct52 <= -15:
        return {"status": "WATCHING", "rule": "ใกล้เกณฑ์ SCREEN",
                "detail": f"ลง {pct52:.0f}% จาก 52w high (เกณฑ์คัดกรอง -20%)"}
    return {"status": "HOLD", "rule": "—", "detail": "ยังไม่เข้าเงื่อนไขใดๆ"}


def fetch_one(cfg, overrides):
    symbol = cfg["symbol"]
    try:
        ticker = yf.Ticker(symbol)
        hist = ticker.history(period="1y")
    except Exception as e:
        print(f"WARNING: ดึงราคาของ {symbol} ไม่ได้ ({e}) — ข้ามตัวนี้รอบนี้")
        return None
    if hist.empty:
        print(f"WARNING: ไม่มีข้อมูลราคาสำหรับ {symbol} — ข้าม")
        return None

    price = round(float(hist["Close"].iloc[-1]), 2)
    prev_close = float(hist["Close"].iloc[-2]) if len(hist) > 1 else price
    change_pct = round((price - prev_close) / prev_close * 100, 2)
    high_52w = float(hist["High"].max())
    pct_from_52w_high = round((price - high_52w) / high_52w * 100, 2)

    info = {}
    try:
        info = ticker.info or {}
    except Exception as e:
        print(f"WARNING: ดึง fundamental ของ {symbol} ไม่ได้ ({e})")

    fundamental_pass, passed, evaluated, notes = quality_check(info, cfg["sector"])

    # significance score: ผสม % เปลี่ยนแปลง + ระยะห่างจาก 52w high + bonus ถ้าอยู่ในพอร์ต
    score = min(100, round(abs(change_pct) * 4 + abs(pct_from_52w_high) * 0.8 + (10 if cfg["inPortfolio"] else 0)))

    stock_id = cfg["id"]
    result = {
        "id": stock_id,
        "symbol": stock_id,
        "name": cfg["name"],
        "market": cfg["market"],
        "currency": cfg["currency"],
        "sector": cfg["sector"],
        "inPortfolio": cfg["inPortfolio"],
        "price": price,
        "changePct": change_pct,
        "pctFrom52wHigh": pct_from_52w_high,
        "score": score,
        "fundamentalPass": fundamental_pass,
        "qualityCheck": {"passed": passed, "evaluated": evaluated, "notes": notes},
        "reason": f"ราคา {'+'if change_pct>=0 else ''}{change_pct}% จากปิดก่อนหน้า, ห่างจาก 52w high {pct_from_52w_high}% (ยังไม่ต่อ News API — เป็นสรุปจากตัวเลขราคาเท่านั้น)",
    }

    if cfg["inPortfolio"]:
        result["entryPrice"] = cfg["entryPrice"]
        result["technicalState"] = overrides.get("portfolio", {}).get(stock_id, "intact")
        result["thesisState"] = "intact"
        result["reviewFlag"] = overrides.get("reviewFlags", {}).get(stock_id, False)
    else:
        result["technicalState"] = overrides.get("watchlist", {}).get(stock_id, "none")

    result["classification"] = classify(result)
    return result


def main():
    with open("watchlist.json", encoding="utf-8") as f:
        watchlist = json.load(f)["stocks"]
    with open("technical_overrides.json", encoding="utf-8") as f:
        overrides = json.load(f)

    stocks = []
    for cfg in watchlist:
        try:
            result = fetch_one(cfg, overrides)
        except Exception as e:
            print(f"WARNING: {cfg.get('id')} ล้มเหลวไม่คาดคิด ({e}) — ข้าม")
            result = None
        if result:
            stocks.append(result)

    output = {
        "generatedAt": datetime.datetime.utcnow().isoformat() + "Z",
        "stocks": stocks,
    }
    with open("data.json", "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"เขียน data.json สำเร็จ — {len(stocks)}/{len(watchlist)} ตัว")


if __name__ == "__main__":
    main()
