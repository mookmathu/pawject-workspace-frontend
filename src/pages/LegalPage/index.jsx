import React from "react";
import { Link } from "react-router-dom";
import GlobalStyles from "../../components/common/GlobalStyles";
import { PawPrint } from "../../components/mockups/DogSVG";
import { CardMascot } from "../../components/common/Mascot";

const CONTACT_EMAIL = "mathuradamook@gmail.com";
const UPDATED = "18 ตุลาคม 2569";

const wrap = {
  minHeight: "100vh",
  background: "var(--bg-page, #fffdf7)",
  color: "var(--ink)",
  fontFamily: "'Itim', cursive",
  padding: "32px 16px",
};
const card = {
  maxWidth: 760,
  margin: "0 auto",
  background: "var(--bg-surface, #fff)",
  border: "2px solid var(--ink)",
  borderRadius: 16,
  boxShadow: "4px 4px 0 0 var(--ink)",
  padding: "28px 24px",
  position: "relative",
  lineHeight: 1.8,
  fontSize: 17,
};
const h2 = { fontSize: 22, margin: "24px 0 6px" };

function Shell({ title, children }) {
  return (
    <div style={wrap}>
      <GlobalStyles />
      <div style={card}>
        <CardMascot name="reader" width={74} anim="float" />
        <Link
          to="/"
          style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "var(--ink)", textDecoration: "none" }}
        >
          <PawPrint size={30} color="var(--accent-color)" />
          <strong style={{ fontSize: 22 }}>Pawject</strong>
        </Link>
        <h1 style={{ margin: "16px 0 4px" }}>{title}</h1>
        <div style={{ opacity: 0.7, fontSize: 14 }}>อัปเดตล่าสุด: {UPDATED}</div>
        {children}
      </div>
    </div>
  );
}

export function PrivacyPolicyPage() {
  return (
    <Shell title="นโยบายความเป็นส่วนตัว">
      <p>
        Pawject เป็นเว็บแอปสำหรับทำงานร่วมกันเป็นทีม พัฒนาเพื่อเป็นโครงงานทางการศึกษา
        (ปัญหาพิเศษ) มหาวิทยาลัยเกษตรศาสตร์ นโยบายนี้อธิบายว่าเราเก็บและใช้ข้อมูลของคุณอย่างไร
      </p>

      <h2 style={h2}>ข้อมูลที่เราเก็บ</h2>
      <ul>
        <li>ชื่อ อีเมล และรูปโปรไฟล์ ที่ได้จากการสมัครสมาชิก หรือจากการล็อกอินด้วย Google, GitHub หรือ Facebook</li>
        <li>รหัสผ่าน (กรณีสมัครด้วยอีเมล) ซึ่งถูกเข้ารหัสแบบแฮชก่อนบันทึก เราไม่สามารถอ่านรหัสผ่านจริงได้</li>
        <li>เนื้อหาที่คุณสร้างในระบบ เช่น งาน ข้อความแชต ปฏิทิน และอารมณ์ประจำวัน</li>
      </ul>

      <h2 style={h2}>การล็อกอินด้วย Facebook / Google / GitHub</h2>
      <p>
        เราขอเฉพาะข้อมูลพื้นฐานของโปรไฟล์ (ชื่อ อีเมล รูปโปรไฟล์) เพื่อสร้างและยืนยันบัญชีของคุณเท่านั้น
        เราไม่โพสต์ใด ๆ ในนามคุณ และไม่เข้าถึงรายชื่อเพื่อนหรือข้อมูลอื่นของคุณบนบริการเหล่านั้น
      </p>

      <h2 style={h2}>วัตถุประสงค์การใช้ข้อมูล</h2>
      <ul>
        <li>ยืนยันตัวตนและให้บริการฟีเจอร์ของระบบ</li>
        <li>ส่งอีเมลที่จำเป็น เช่น รหัส OTP และการรีเซ็ตรหัสผ่าน</li>
      </ul>
      <p>เราไม่ขายหรือแบ่งปันข้อมูลของคุณให้บุคคลที่สามเพื่อการโฆษณา</p>

      <h2 style={h2}>ผู้ให้บริการที่เกี่ยวข้อง</h2>
      <p>ระบบเก็บข้อมูลบนฐานข้อมูล Supabase และเซิร์ฟเวอร์ VPS ของ Hostinger และส่งอีเมลผ่าน Resend</p>

      <h2 style={h2}>การลบข้อมูลและสิทธิ์ของคุณ</h2>
      <p>
        คุณลบบัญชีและข้อมูลของคุณได้เองที่หน้า โปรไฟล์ หรือดูขั้นตอนที่{" "}
        <Link to="/data-deletion">หน้าการลบข้อมูล</Link> คุณขอดู แก้ไข หรือลบข้อมูลได้ทางอีเมลด้านล่าง
      </p>

      <h2 style={h2}>ติดต่อเรา</h2>
      <p>
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
      </p>
    </Shell>
  );
}

export function DataDeletionPage() {
  return (
    <Shell title="การลบข้อมูลผู้ใช้">
      <p>คุณสามารถลบบัญชี Pawject และข้อมูลที่เกี่ยวข้องได้ด้วยตนเอง ดังนี้</p>

      <h2 style={h2}>วิธีที่ 1: ลบเองในระบบ</h2>
      <ol>
        <li>ล็อกอินเข้าสู่ <Link to="/">Pawject</Link></li>
        <li>ไปที่หน้า <strong>โปรไฟล์</strong></li>
        <li>เลือกลบบัญชีและยืนยัน (หากสมัครด้วยรหัสผ่านจะต้องกรอกรหัสผ่านเพื่อยืนยัน)</li>
      </ol>

      <h2 style={h2}>วิธีที่ 2: ขอลบทางอีเมล</h2>
      <p>
        ส่งอีเมลมาที่ <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> หัวข้อ
        “ขอลบข้อมูล Pawject” โดยใช้อีเมลเดียวกับที่ใช้ล็อกอิน เราจะลบข้อมูลภายใน 30 วัน
      </p>

      <h2 style={h2}>ผู้ที่ล็อกอินด้วย Facebook</h2>
      <p>
        นอกจากลบบัญชีใน Pawject แล้ว คุณสามารถนำแอปออกจากบัญชี Facebook ได้ที่
        การตั้งค่า → ความปลอดภัยและการเข้าสู่ระบบ → แอปและเว็บไซต์
      </p>

      <p style={{ marginTop: 24 }}>
        ดู <Link to="/privacy">นโยบายความเป็นส่วนตัว</Link>
      </p>
    </Shell>
  );
}
