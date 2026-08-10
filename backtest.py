"""
Backtest — Monthly Best-Idea DCA (Fallen Angel entry + cut-loss/take-profit)
ตั้งแต่มกราคม 2020 ถึงปัจจุบัน บนหุ้นไทยขนาดใหญ่ ~50 ตัว (ดู backtest_universe.json)

ข้อจำกัดที่ต้องอ่านก่อนเชื่อผลลัพธ์ (สำคัญมาก):
  1. ไม่รวม Quality Ratio Check (ชั้น 2 ของแผนจริง) เพราะข้อมูล fundamental
     ย้อนหลังแบบ point-in-time หาฟรีไม่ได้
  2. Technical timing (ชั้น 3) ใช้ proxy คร่าวๆ จากราคาล้วนๆ (ราคาปิด > SMA 20 วันทำการ
     ก่อนถึงจะซื้อได้) แทน retest/BOS/CHoCH จริง ซึ่งยังไม่มีระบบตรวจจับอัตโนมัติ
  3. Universe เป็นรายชื่อหุ้นใหญ่ "ปัจจุบัน" ไม่ใช่สมาชิก SET50 ย้อนหลังจริงทุกจุดเวลา
     -> มี survivorship bias, ผลตอบแทนอาจดูดีกว่าความเป็นจริง
  4. Time-based review ในแผนจริงเป็น "ทบทวนด้วยคน" ไม่ใช่ auto-sell
     แต่ backtest ต้องมีกฎที่คำนวณได้แน่นอน จึงจำลองเป็น "ขายบังคับถ้าถือเกิน 24 เดือน"
     ซึ่งเป็นสมมติฐานง่ายเพื่อให้ backtest รันได้ ไม่ใช่กฎจริงในแผน
  5. Sector ของแต่ละหุ้น (backtest_sectors.json) เป็นการจัดกลุ่มคร่าวๆ ด้วยความรู้ทั่วไป
     ไม่ได้ยืนยันกับแหล่งข้อมูลทางการ ใช้เพื่อทดสอบ sector cap เท่านั้น
  6. Position cap (20%) / sector cap (40%) บังคับเฉพาะตอนพอร์ต>=100k ตามกฎจริง ถ้าตัว
     คะแนนสูงสุดชน cap เงินส่วนเกินไหลไปตัวถัดไปในอันดับอัตโนมัติ (แผนจริงคือ "split เฉพาะ
     ตอนคะแนนใกล้เคียงกัน" ซึ่งเป็นดุลพินิจคน ตรงนี้ simplify เป็นกฎตายตัวแทน)

สรุป: ผลลัพธ์นี้คือ "ประมาณการภายใต้เงื่อนไขที่ทำได้จริงจากข้อมูลฟรี" ไม่ใช่ผลย้อนหลังที่แม่นยำสมบูรณ์
"""

import json
import datetime
import sys

try:
    import yfinance as yf
    import pandas as pd
except ImportError:
    print("ERROR: pip install yfinance pandas ก่อนรัน")
    sys.exit(1)

START_DATE = "2020-01-01"
# Cut-loss แบบขั้นบันไดตามมูลค่าพอร์ต (locked rule): <100k -> -10% ถึง -12%, >=100k -> -15% ถึง -20%
# เลือกขอบบนสุดของแต่ละช่วง (ให้สอดคล้องกับ dashboard classify() ที่ใช้ -12% เป็นค่าเดียวสำหรับ tier แรก)
PORTFOLIO_TIER_THRESHOLD = 100000
CUT_LOSS_SMALL = -0.12  # พอร์ต < 100,000 บาท
CUT_LOSS_LARGE = -0.20  # พอร์ต >= 100,000 บาท
TAKE_PROFIT_PCT = 0.45
FALLEN_ANGEL_THRESHOLD = -0.20
MAX_HOLD_MONTHS = 24  # สมมติฐานสำหรับ backtest เท่านั้น (ดูหมายเหตุข้อ 4 ด้านบน)

# Technical timing proxy (ชั้น 3 คร่าวๆ) — ต้องมีสัญญาณเริ่มทรงตัว/เด้งกลับก่อนซื้อ
# แทนการซื้อทันทีที่แตะ -20% (ดูหมายเหตุข้อ 2 ด้านบน)
TECH_STABILIZATION_WINDOW = 20  # ~1 เดือนเทรด

# Diversification cap — บังคับเฉพาะตอนพอร์ต >= PORTFOLIO_TIER_THRESHOLD (ดูหมายเหตุข้อ 6)
MAX_POSITION_PCT = 0.20
SECTOR_CAP_PCT = 0.40


def sma(series, as_of_date, window):
    """Simple moving average แบบ causal (ใช้ข้อมูลถึงวันนั้นเท่านั้น)"""
    w = series[series.index <= as_of_date].tail(window)
    if len(w) < window:
        return None
    return w.mean()


def monthly_contribution(year_index):
    """year_index: 0 = ปีแรก (2020), 1 = ปีที่สอง (2021), ...
    คืนค่า (เงินสมทบรายเดือน, มีโบนัสสิ้นปีไหม)"""
    monthly = 27000 if year_index < 2 else 32000  # ปี 1-2: 10k+17k, ปี 3+: 15k+17k
    return monthly


def load_prices(tickers, start):
    print(f"กำลังดึงราคาย้อนหลัง {len(tickers)} ตัว ตั้งแต่ {start} ...")
    data = {}
    for t in tickers:
        try:
            hist = yf.Ticker(t).history(start=start, auto_adjust=True)
            if not hist.empty:
                data[t] = hist["Close"]
        except Exception as e:
            print(f"WARNING: ดึง {t} ไม่ได้ ({e}) — ข้าม")
    return data


def rolling_high_252(series, as_of_date):
    """52-week high แบบ causal (ใช้ข้อมูลถึงวันนั้นเท่านั้น ไม่แอบดูอนาคต)"""
    window = series[series.index <= as_of_date].tail(252)
    if len(window) < 60:  # ข้อมูลน้อยเกินไปยังประเมินไม่ได้
        return None
    return window.max()


def month_range(start, end):
    cur = datetime.date(start.year, start.month, 1)
    out = []
    while cur <= end:
        out.append(cur)
        if cur.month == 12:
            cur = datetime.date(cur.year + 1, 1, 1)
        else:
            cur = datetime.date(cur.year, cur.month + 1, 1)
    return out


def first_trading_day_on_or_after(series, target_date):
    idx = series.index[series.index.date >= target_date]
    return idx[0] if len(idx) else None


def main():
    with open("backtest_universe.json", encoding="utf-8") as f:
        tickers = json.load(f)["tickers"]
    with open("backtest_sectors.json", encoding="utf-8") as f:
        sector_map = json.load(f)["sectors"]

    prices = load_prices(tickers, START_DATE)
    if not prices:
        print("ERROR: ดึงราคาไม่ได้เลยสักตัว — หยุดทำงาน")
        sys.exit(1)

    start_date = datetime.date(2020, 1, 1)
    end_date = datetime.date.today()
    months = month_range(start_date, end_date)

    cash = 0.0
    total_contributed = 0.0
    positions = {}  # ticker -> {"shares": float, "entry_price": float, "entry_month_idx": int}
    trade_log = []

    for month_idx, month_start in enumerate(months):
        year_index = month_start.year - 2020
        contribution = monthly_contribution(year_index)
        # โบนัสสิ้นปี: ใส่ในเดือนธันวาคม
        if month_start.month == 12:
            contribution += 50000
        cash += contribution
        total_contributed += contribution

        # หาวันทำการแรกของเดือนที่มีข้อมูลราคา (ใช้ราคาปิดวันนั้นเป็นราคาอ้างอิงของเดือนนี้)
        ref_prices = {}
        for t, series in prices.items():
            d = first_trading_day_on_or_after(series, month_start)
            if d is not None:
                ref_prices[t] = (d, series.loc[d])

        # คำนวณมูลค่าพอร์ตรวม ณ ต้นเดือนนี้ (ใช้ตัดสิน tier ของ cut-loss)
        portfolio_value = cash
        for t, pos in positions.items():
            mark_price = ref_prices[t][1] if t in ref_prices else pos["entry_price"]
            portfolio_value += pos["shares"] * mark_price
        cut_loss_pct = CUT_LOSS_SMALL if portfolio_value < PORTFOLIO_TIER_THRESHOLD else CUT_LOSS_LARGE

        # 1) เช็ค exit ของตำแหน่งที่ถืออยู่ก่อน
        for t in list(positions.keys()):
            if t not in ref_prices:
                continue
            date, price = ref_prices[t]
            pos = positions[t]
            pct = (price - pos["entry_price"]) / pos["entry_price"]
            months_held = month_idx - pos["entry_month_idx"]
            reason = None
            if pct <= cut_loss_pct:
                reason = f"CUT-LOSS ({cut_loss_pct*100:.0f}%, portfolio {'<' if portfolio_value < PORTFOLIO_TIER_THRESHOLD else '>='}100k)"
            elif pct >= TAKE_PROFIT_PCT:
                reason = "TAKE-PROFIT"
            elif months_held >= MAX_HOLD_MONTHS:
                reason = "TIME-BASED (backtest assumption)"
            if reason:
                proceeds = pos["shares"] * price
                cash += proceeds
                trade_log.append({
                    "action": "SELL", "ticker": t, "date": str(date.date()),
                    "price": round(float(price), 2), "reason": reason,
                    "pct_return": round(pct * 100, 1),
                })
                del positions[t]

        # 2) หา Fallen Angel candidate ใหม่ (เฉพาะตัวที่ยังไม่ถือ)
        candidates = []
        for t, (date, price) in ref_prices.items():
            if t in positions:
                continue
            high = rolling_high_252(prices[t], date)
            if high is None or high <= 0:
                continue
            pct_from_high = (price - high) / high
            if pct_from_high <= FALLEN_ANGEL_THRESHOLD:
                ma = sma(prices[t], date, TECH_STABILIZATION_WINDOW)
                if ma is None or price <= ma:
                    continue  # ยังไม่มีสัญญาณทรงตัว/เด้งกลับ (technical proxy) — ยัง WATCHING ไม่ใช่ BUY
                candidates.append((t, date, price, pct_from_high))

        # จัดอันดับ: ลงลึกที่สุดจาก high มาก่อน (deepest Fallen Angel = significance สูงสุด ในเชิงราคาล้วน)
        candidates.sort(key=lambda c: c[3])

        if candidates and cash > 0:
            base_portfolio_value = cash
            sector_exposure = {}
            for t, pos in positions.items():
                mark_price = ref_prices[t][1] if t in ref_prices else pos["entry_price"]
                v = pos["shares"] * mark_price
                base_portfolio_value += v
                sec = sector_map.get(t, "Unknown")
                sector_exposure[sec] = sector_exposure.get(sec, 0.0) + v

            cap_active = base_portfolio_value >= PORTFOLIO_TIER_THRESHOLD

            if not cap_active:
                # พอร์ตยังเล็ก — ทุ่มเงินเดือนนี้ทั้งหมดลงตัวคะแนนสูงสุดตัวเดียว (ไม่กระจายบังคับ)
                t, date, price, pct_from_high = candidates[0]
                shares = cash / price
                positions[t] = {"shares": shares, "entry_price": float(price), "entry_month_idx": month_idx}
                trade_log.append({
                    "action": "BUY", "ticker": t, "date": str(date.date()),
                    "price": round(float(price), 2), "amount": round(cash, 2),
                    "pct_from_52w_high": round(pct_from_high * 100, 1),
                    "sector": sector_map.get(t, "Unknown"),
                })
                cash = 0.0
            else:
                # พอร์ต >= 100k — บังคับ diversification cap: เงินส่วนเกินไหลไปตัวถัดไปในอันดับ
                remaining_cash = cash
                for t, date, price, pct_from_high in candidates:
                    if remaining_cash <= 0:
                        break
                    sec = sector_map.get(t, "Unknown")
                    room = min(remaining_cash, MAX_POSITION_PCT * base_portfolio_value)
                    sector_room = SECTOR_CAP_PCT * base_portfolio_value - sector_exposure.get(sec, 0.0)
                    room = min(room, max(0.0, sector_room))
                    if room <= 1.0:  # กันเศษเงินจิ๊บจ๊อยที่ไม่มีความหมาย
                        continue
                    shares = room / price
                    positions[t] = {"shares": shares, "entry_price": float(price), "entry_month_idx": month_idx}
                    trade_log.append({
                        "action": "BUY", "ticker": t, "date": str(date.date()),
                        "price": round(float(price), 2), "amount": round(room, 2),
                        "pct_from_52w_high": round(pct_from_high * 100, 1),
                        "sector": sec,
                    })
                    sector_exposure[sec] = sector_exposure.get(sec, 0.0) + room
                    remaining_cash -= room
                cash = remaining_cash

    # มูลค่าสุดท้าย = เงินสด + มูลค่าตำแหน่งที่ยังถืออยู่ (ราคาล่าสุดที่มี)
    final_value = cash
    holdings_detail = []
    for t, pos in positions.items():
        # ใช้ราคาปิดล่าสุดที่ "ไม่ใช่ NaN" — แท่งของวันปัจจุบันอาจว่างถ้าตลาดยังไม่ปิด/ข้อมูลยังไม่มา
        valid_closes = prices[t].dropna()
        last_price = float(valid_closes.iloc[-1])
        value = pos["shares"] * last_price
        final_value += value
        holdings_detail.append({"ticker": t, "shares": round(pos["shares"], 4),
                                 "last_price": round(last_price, 2), "value": round(value, 2)})

    years = (end_date - start_date).days / 365.25
    total_return_pct = (final_value / total_contributed - 1) * 100 if total_contributed else 0
    cagr = ((final_value / total_contributed) ** (1 / years) - 1) * 100 if total_contributed > 0 and years > 0 else 0

    result = {
        "generatedAt": datetime.datetime.utcnow().isoformat() + "Z",
        "period": f"{START_DATE} ถึง {end_date.isoformat()}",
        "totalContributed": round(total_contributed, 2),
        "finalValue": round(final_value, 2),
        "totalReturnPct": round(total_return_pct, 1),
        "cagrPct": round(cagr, 2),
        "cashRemaining": round(cash, 2),
        "currentHoldings": holdings_detail,
        "tradeCount": len(trade_log),
        "trades": trade_log,
        "assumptions": [
            "ไม่รวม Quality Ratio Check (ชั้น 2) — ไม่มีข้อมูล fundamental ย้อนหลังฟรี",
            "Technical timing (ชั้น 3) ใช้ proxy คร่าวๆ จากราคาล้วนๆ: ต้องปิด > SMA20 วันทำการ "
            "ก่อนถึงจะนับเป็น candidate ที่ซื้อได้ แทน retest/BOS/CHoCH จริงที่ยังไม่มีระบบตรวจจับอัตโนมัติ",
            "Universe เป็นหุ้นใหญ่ปัจจุบัน ~50 ตัว ไม่ใช่สมาชิก SET50 ย้อนหลังจริง (survivorship bias)",
            "Time-based exit จำลองเป็นขายบังคับที่ 24 เดือน (แผนจริงคือทบทวนด้วยคน ไม่ auto-sell)",
            "Cut-loss แบบขั้นบันไดใช้ขอบบนสุดของแต่ละช่วง: -12% ตอนพอร์ต<100k, -20% ตอนพอร์ต>=100k "
            "(กฎจริงเป็นช่วง -10~-12% / -15~-20% ไม่ใช่ตัวเลขเดี่ยว)",
            "Sector ต่อหุ้น (backtest_sectors.json) จัดกลุ่มคร่าวๆ ด้วยความรู้ทั่วไป ไม่ได้ยืนยันกับแหล่งข้อมูลทางการ",
            "Position cap 20% / sector cap 40% บังคับเฉพาะตอนพอร์ต>=100k เงินส่วนเกินไหลไปตัวถัดไปในอันดับ "
            "อัตโนมัติ (แผนจริงคือ split เฉพาะตอนคะแนนใกล้เคียงกัน ซึ่งเป็นดุลพินิจคน)",
        ],
    }

    with open("backtest_results.json", "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    print(f"\n=== ผลลัพธ์ ===")
    print(f"ช่วงเวลา: {result['period']}")
    print(f"เงินสมทบรวม: {total_contributed:,.0f} บาท")
    print(f"มูลค่าสุดท้าย: {final_value:,.0f} บาท")
    print(f"ผลตอบแทนรวม: {total_return_pct:.1f}%")
    print(f"CAGR: {cagr:.2f}% ต่อปี")
    print(f"จำนวนการซื้อขาย: {len(trade_log)} ครั้ง")
    print(f"เขียนรายละเอียดเต็มลง backtest_results.json แล้ว")


if __name__ == "__main__":
    main()
