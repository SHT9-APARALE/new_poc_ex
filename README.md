# Image AI Generator Chrome Extension

Chrome extension ที่ดึงรูปภาพจากเว็บไซต์ และสร้างภาพใหม่โดยใช้ Gemini AI

## คุณสมบัติ

1. **ดึงรูปภาพ** - สกัดรูปภาพทั้งหมดจากหน้าเว็บปัจจุบัน
2. **เลือกรูปภาพ** - UI สำหรับเลือกรูปภาพที่ต้องการประมวลผล
3. **Proxy Server** - เซิร์ฟเวอร์ที่เชื่อมต่อกับ Gemini API
4. **แทนที่รูปภาพ** - แทนที่รูปภาพเดิมในเว็บด้วยรูปใหม่ที่สร้างขึ้น

## การติดตั้ง

### 1. ติดตั้ง Dependencies สำหรับ Proxy Server

```bash
cd /Users/nicenathapong/Desktop/nSys/SHT9/new_poc_ex
npm install
```

### 2. เรียกใช้ Proxy Server

```bash
npm start
```

Server จะทำงานที่ `http://localhost:3000`

### 3. โหลด Chrome Extension

1. เปิด Chrome และไปที่ `chrome://extensions/`
2. เปิดใช้งาน "Developer mode"
3. คลิก "Load unpacked"
4. เลือกโฟลเดอร์ `/Users/nicenathapong/Desktop/nSys/SHT9/new_poc_ex`

## การใช้งาน

1. เปิดเว็บไซต์ที่มีรูปภาพ
2. คลิกที่ไอคอน extension
3. เลือกรูปภาพที่ต้องการประมวลผล
4. คลิก "Generate" เพื่อสร้างรูปภาพใหม่
5. รอการประมวลผล รูปภาพใหม่จะแทนที่รูปเดิมในหน้าเว็บ

## โครงสร้างไฟล์

```
new_poc_ex/
├── manifest.json       # Chrome extension manifest
├── content.js         # Content script สำหรับดึงและแทนที่รูปภาพ
├── popup.html         # UI ของ extension popup
├── popup.js          # Logic สำหรับ popup
├── background.js     # Background script
├── server.js         # Proxy server สำหรับ Gemini API
├── package.json      # Dependencies สำหรับ server
└── generated/        # โฟลเดอร์สำหรับเก็บรูปภาพที่สร้างขึ้น
```

## API Endpoints

- `POST /generate` - สร้างภาพใหม่จาก URL ของภาพ
- `GET /image/:filename` - ดาวน์โหลดภาพที่สร้างขึ้น

## หมายเหตุ

- ต้องเรียกใช้ proxy server ก่อนใช้งาน extension
- Extension ใช้ Gemini API key จาก test_extension
- รูปภาพที่สร้างขึ้นจะถูกเก็บในโฟลเดอร์ `generated/`# new_poc_ex
