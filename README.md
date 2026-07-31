# Trading Command Center — Data Layer (Module 02)

## สิ่งที่ทำได้จริงในเวอร์ชันนี้ (ไม่ mock แล้ว)
- ราคาหุ้น US + SET จาก Yahoo Finance จริง อัปเดตอัตโนมัติทุกวันจันทร์-ศุกร์
- % เปลี่ยนแปลง, ระยะห่างจาก 52-week high — คำนวณจากราคาจริง
- Quality Ratio Check (ชั้น 2 ของแผน) — P/E, P/B, PEG, ROE, Gross Margin คำนวณจากข้อมูลจริง พร้อมผ่อนเกณฑ์ตามกลุ่มธุรกิจอัตโนมัติ (cyclical / financials) ตามที่ล็อกไว้ในเอกสารแผน
- Action Queue classification (BUY_NOW / SELL_NOW / WATCHING / HOLD) — คำนวณจากกฎจริงในแผน ไม่ใช่ mock

## สิ่งที่ยังไม่อัตโนมัติ (ต้องทำมือ จนกว่าจะพัฒนาเพิ่ม)
- **Technical signal (BOS/CHoCH/retest):** แก้ไฟล์ `technical_overrides.json` เองรายสัปดาห์ตามที่ดูกราฟจริง
- **เหตุผลราคาเปลี่ยน + ข่าว:** ยังไม่ต่อ News API — ตอนนี้ field `reason` เป็นแค่สรุปตัวเลขราคา ไม่ใช่ข่าวจริง (ขั้นต่อไปจะต่อ Finnhub/News API)
- **Price/FCF, ROIC, ROCE:** yfinance ฟรีไม่มี field ตรงๆ ที่เชื่อถือได้ ข้ามไปก่อน (ระบบนับเฉพาะ ratio ที่มีข้อมูลจริง ไม่ปัดเป็นไม่ผ่านลอยๆ)

## วิธีตั้งค่า (ทำครั้งเดียว)

1. สร้าง repo ใหม่บน GitHub — แนะนำตั้งชื่อ `trading-command-center-data`, เลือก **Public** (จำเป็น เพราะ artifact ต้องดึงไฟล์ raw จาก GitHub โดยไม่ผ่าน auth)
2. อัปโหลดไฟล์ทั้งหมดในโฟลเดอร์นี้เข้า repo (`fetch_data.py`, `watchlist.json`, `technical_overrides.json`, `requirements.txt`, `.github/workflows/update-data.yml`) — รักษาโครงสร้างโฟลเดอร์ `.github/workflows/` ไว้ให้ตรง
3. เข้าแท็บ **Actions** ของ repo → ถ้าขึ้นให้กด enable workflows ก็กดยืนยัน
4. ทดสอบรันทันทีโดยไม่ต้องรอตารางเวลา: แท็บ Actions → เลือก workflow "Update stock data" → กด **Run workflow**
5. รอสัก 1-2 นาที เช็คว่ามีไฟล์ `data.json` โผล่ขึ้นมาใน repo หรือไม่ (ถ้ามี = สำเร็จ)
6. เอา URL ของไฟล์ raw มาให้ผม รูปแบบจะเป็น:
   `https://raw.githubusercontent.com/<username>/<repo-name>/main/data.json`
   ผมจะเอา URL นี้ไปผูกกับ artifact dashboard ให้ดึงข้อมูลจริงมาแทน mock data ทันที

## การแก้ไข watchlist ในอนาคต
เพิ่ม/ลบหุ้นได้โดยแก้ `watchlist.json` — ใส่ `symbol` ตาม yfinance format (หุ้นไทยต้องมี `.BK` ต่อท้าย เช่น `PTT.BK`, หุ้น US ใส่เฉย ๆ เช่น `NVDA`)
