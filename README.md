# Crew Space

เว็บแอปพื้นที่ทำงานร่วมกันของทีม (แนวคล้าย Slack + Trello + FigJam) สร้างด้วย [Create React App](https://github.com/facebook/create-react-app) และ `react-router-dom` ดีไซน์เป็นสไตล์ hand-drawn / doodle notebook

## โครงสร้างโปรเจกต์

```
src/
├─ App.js                     # เชื่อม route ทั้งหมดของแอป
├─ index.js / index.css
├─ assets/
│  └─ images/                 # รูปภาพที่ใช้จริงในแอป (icon, ปุ่มดูรหัสผ่าน ฯลฯ)
├─ components/
│  ├─ common/                 # ของที่ใช้ร่วมกันทุกหน้า
│  │  ├─ GlobalStyles.jsx     # CSS ระบบ doodle (ปุ่ม, input, การ์ด, animation)
│  │  └─ icons.jsx            # ไอคอน social login (Google / GitHub / Facebook)
│  └─ mockups/                # placeholder รอใส่รูป/ภาพเคลื่อนไหวจริง
│     ├─ AssetPlaceholder.jsx # กล่องเส้นประ reuse ได้ทุกหน้า (ระบุ label/ขนาด/ตำแหน่งเอง)
│     └─ BoatMockup.jsx       # ภาพเรือ placeholder ฝั่ง Login/Register
└─ pages/                     # หน้าเต็มของแอป แยกโฟลเดอร์ตามหน้า
   ├─ LoginPage/
   │  ├─ index.jsx
   │  └─ styles.js
   ├─ RegisterPage/
   │  ├─ index.jsx
   │  └─ styles.js
   └─ WelcomePage/
      ├─ index.jsx
      └─ styles.js
```

**แนวทางจัดโครงสร้าง**
- `pages/` เก็บหน้าเต็ม (route-level) แต่ละหน้าเป็นโฟลเดอร์ของตัวเอง มี `index.jsx` + `styles.js`
- `components/common/` เก็บของที่ใช้ร่วมกันข้ามหน้า (global style, ไอคอน)
- `components/mockups/` เก็บ placeholder ที่ยังไม่มี asset จริง เพื่อให้ layout เห็นสัดส่วนก่อน แล้วค่อยเอารูป/ภาพเคลื่อนไหวจริงมาสลับทีหลังโดยไม่ต้องแก้ layout

## หน้าและ Route

| Route        | หน้า            | หมายเหตุ |
|--------------|-----------------|----------|
| `/`          | `LoginPage`     | เข้าสู่ระบบ |
| `/register`  | `RegisterPage`  | สมัครสมาชิก |
| `/welcome`   | `WelcomePage`   | หน้าต้อนรับ "Welcome Aboard!" พร้อมเมนู Dashboard / Task / Chat / Calendar |

## ของที่ยังเป็น Placeholder (รอใส่รูปจริง)

จุดที่ขึ้นกรอบเส้นประสีดำ (component `AssetPlaceholder`) คือจุดที่เว้นพื้นที่ไว้ให้ใส่รูปภาพ/ภาพเคลื่อนไหวจริงทีหลัง:

- **BoatMockup** (`LoginPage`, `RegisterPage`) — รูปเรือใบฝั่งขวาของฟอร์ม
- **WelcomePage**
  - มาสคอตหัวข้อ (`🙂` ชั่วคราว)
  - ฝูงนก 2 จุด
  - เรือใบกลางฉากทะเล
  - ป้ายบอกทาง (เช่น Bells Beach, Trestles)

วิธีใส่รูปจริงแทน placeholder: แทนที่ `<AssetPlaceholder ... />` ด้วย `<img src="..." />` หรือ component ภาพเคลื่อนไหว โดยใช้ค่า `width` / `height` / `style` (ตำแหน่ง) เดิมเป็นแนวทางจัดวาง

## Available Scripts

โปรเจกต์นี้ bootstrap ด้วย Create React App ในโฟลเดอร์โปรเจกต์ สามารถรันคำสั่งได้ดังนี้:

### `npm start`

รันแอปในโหมด development\
เปิด [http://localhost:3000](http://localhost:3000) เพื่อดูผลลัพธ์ในเบราว์เซอร์

หน้าเว็บจะ reload อัตโนมัติเมื่อแก้โค้ด และอาจเห็น lint error ใน console

### `npm test`

รัน test runner แบบ interactive watch mode\
ดูรายละเอียดเพิ่มเติมที่ [running tests](https://facebook.github.io/create-react-app/docs/running-tests)

### `npm run build`

build แอปสำหรับ production ไปที่โฟลเดอร์ `build`\
รวม React แบบ production mode และ optimize ให้ performance ดีที่สุด

ไฟล์ที่ได้จะถูก minify และตั้งชื่อไฟล์แบบมี hash พร้อม deploy

ดูรายละเอียดเพิ่มเติมที่ [deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run eject`

**หมายเหตุ: คำสั่งนี้ทำครั้งเดียว ย้อนกลับไม่ได้**

ถ้าไม่พอใจ build tool/config ที่ CRA ตั้งไว้ สามารถ `eject` ได้ตลอดเวลา คำสั่งนี้จะเอา dependency การ build ออกจากโปรเจกต์ แล้ว copy ไฟล์ config และ dependency ทั้งหมด (webpack, Babel, ESLint ฯลฯ) เข้ามาในโปรเจกต์โดยตรง เพื่อให้ควบคุมได้เต็มที่ คำสั่งอื่นนอกจาก `eject` ยังใช้งานได้ปกติ แต่จะชี้ไปที่ script ที่ copy มาแทน

ไม่จำเป็นต้องใช้ `eject` ก็ได้ ฟีเจอร์ที่ CRA เตรียมไว้เหมาะกับโปรเจกต์ขนาดเล็กถึงกลางอยู่แล้ว

## เรียนรู้เพิ่มเติม

- [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started)
- [React documentation](https://reactjs.org/)
- [Code Splitting](https://facebook.github.io/create-react-app/docs/code-splitting)
- [Analyzing the Bundle Size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)
- [Making a Progressive Web App](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)
- [Advanced Configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)
- [Deployment](https://facebook.github.io/create-react-app/docs/deployment)
- [`npm run build` fails to minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)