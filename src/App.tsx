import { useState, useEffect, useRef } from "react";

const Y = "#F5C800";
const BK = "#0a0a0a";
const S1 = "#111114";
const S2 = "#18181c";
const S3 = "#222226";
const BR = "rgba(255,255,255,0.08)";

// ── Storage helpers ──────────────────────────────────────────
async function stGet(key, shared = false) {
  try { const r = await window.storage.get(key, shared); return r ? JSON.parse(r.value) : null; } catch { return null; }
}
async function stSet(key, val, shared = false) {
  try { await window.storage.set(key, JSON.stringify(val), shared); } catch {}
}

// ── Firebase helpers (no config shown in UI) ─────────────────
const FB = { p: "colosseum-9fceb", k: "AIzaSyBLh642WP3cVyMP1u_P_KgJvgorQBbMTSo", b: "colosseum-9fceb.firebasestorage.app" };

async function fsGet(col) {
  try {
    const r = await fetch("https://firestore.googleapis.com/v1/projects/" + FB.p + "/databases/(default)/documents/" + col + "?key=" + FB.k + "&orderBy=ts+desc&pageSize=30");
    const d = await r.json();
    if (!d.documents) return [];
    return d.documents.map(doc => {
      const f = doc.fields || {};
      return { id: doc.name.split("/").pop(), user: f.user?.stringValue || "", caption: f.caption?.stringValue || "", imageUrl: f.imageUrl?.stringValue || "", emoji: f.emoji?.stringValue || "🍺", likes: parseInt(f.likes?.integerValue || 0), ts: parseInt(f.ts?.integerValue || 0), time: f.time?.stringValue || "" };
    });
  } catch { return []; }
}

async function fsAdd(col, data) {
  const fields = {};
  Object.entries(data).forEach(([k, v]) => { fields[k] = typeof v === "number" ? { integerValue: v } : { stringValue: String(v) }; });
  try { await fetch("https://firestore.googleapis.com/v1/projects/" + FB.p + "/databases/(default)/documents/" + col + "?key=" + FB.k, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fields }) }); } catch {}
}

async function fsUpdate(col, id, data) {
  const fields = {};
  const mask = Object.keys(data).map(k => "updateMask.fieldPaths=" + k).join("&");
  Object.entries(data).forEach(([k, v]) => { fields[k] = typeof v === "number" ? { integerValue: v } : { stringValue: String(v) }; });
  try { await fetch("https://firestore.googleapis.com/v1/projects/" + FB.p + "/databases/(default)/documents/" + col + "/" + id + "?key=" + FB.k + "&" + mask, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fields }) }); } catch {}
}

async function uploadImage(file, path) {
  const base64 = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result.split(",")[1]); r.onerror = rej; r.readAsDataURL(file); });
  const resp = await fetch("https://firebasestorage.googleapis.com/v0/b/" + FB.b + "/o?uploadType=media&name=" + encodeURIComponent(path) + "&key=" + FB.k, { method: "POST", headers: { "Content-Type": file.type }, body: Uint8Array.from(atob(base64), c => c.charCodeAt(0)) });
  const d = await resp.json();
  return "https://firebasestorage.googleapis.com/v0/b/" + FB.b + "/o/" + encodeURIComponent(path) + "?alt=media&token=" + d.downloadTokens;
}

function Logo({ s = 46 }) {
  return (
    <svg width={s} height={s} viewBox="0 0 200 200">
      <rect width="200" height="200" fill={Y} rx="26" />
      <ellipse cx="100" cy="155" rx="70" ry="10" fill="#999" opacity="0.35" />
      <rect x="32" y="84" width="136" height="66" rx="68" fill="#f0f0f0" stroke="#222" strokeWidth="3" />
      <ellipse cx="100" cy="84" rx="68" ry="17" fill="#ccc" stroke="#222" strokeWidth="3" />
      <rect x="80" y="112" width="40" height="38" rx="4" fill="#bbb" stroke="#222" strokeWidth="2" />
      <rect x="44" y="102" width="18" height="22" rx="3" fill="#ccc" stroke="#1a1a1a" strokeWidth="1.5" />
      <rect x="138" y="102" width="18" height="22" rx="3" fill="#ccc" stroke="#1a1a1a" strokeWidth="1.5" />
    </svg>
  );
}

const MENU = [
  { cat: "🍺 חבית", items: [{ n: "שליש", p: "3 ניקובים" }, { n: "חצי", p: "4 ניקובים" }] },
  { cat: "🍾 בקבוק", items: [{ n: "קורונה", p: "2 ניקובים" }, { n: "גולדסטאר", p: "2 ניקובים" }, { n: "הייניקן", p: "2 ניקובים" }, { n: "באדוייזר", p: "2 ניקובים" }, { n: "סטלה", p: "3 ניקובים" }, { n: "ויינשטפן", p: "3 ניקובים" }, { n: "מלכה", p: "3 ניקובים" }, { n: "צייסר", p: "3 ניקובים" }] },
  { cat: "🥃 חריפים", items: [{ n: "ארק", p: "2/3 ניקובים" }, { n: "אוזו", p: "2/3 ניקובים" }, { n: "וויסקי", p: "3/4 ניקובים" }, { n: "וודקה", p: "3/4 ניקובים" }, { n: "ואן גוך טעמים", p: "3/4 ניקובים" }] },
  { cat: "🍷 יין", items: [{ n: "יין לבן / אדום", p: "3 ניקובים" }, { n: "קאוה", p: "3 ניקובים" }, { n: "למברוסקו", p: "3 ניקובים" }] },
  { cat: "🍸 קוקטיילים", items: [{ n: "קייפירינייה", p: "4 ניקובים" }, { n: "קמפרי ליידי", p: "4 ניקובים" }, { n: "אמרטו סוואר", p: "4 ניקובים" }, { n: "מיזורי סוואר", p: "4 ניקובים" }, { n: "וויסקי סוואר", p: "4 ניקובים" }, { n: "אפרול שפריץ", p: "4 ניקובים" }, { n: "ג׳ין טוניק", p: "4 ניקובים" }, { n: "ארק לימונים", p: "4 ניקובים" }] },
  { cat: "🥤 קלה", items: [{ n: "קולה / זירו / ספרייט / פנטה", p: "1 ניקוב" }, { n: "מים / סודה / ענבים / תפוזים", p: "1 ניקוב" }, { n: "פיוז טי", p: "1 ניקוב" }, { n: "משקה אנרגיה", p: "2 ניקובים" }] },
  { cat: "☕ חמה", items: [{ n: "תה נענע", p: "1 ניקוב" }, { n: "קפה הפוך", p: "1 ניקוב" }, { n: "אספרסו", p: "1 ניקוב" }, { n: "שוקו חם", p: "1 ניקוב" }, { n: "קפה קר / שוקו קר", p: "1 ניקוב" }] },
  { cat: "🍕 אוכל", items: [{ n: "פיצה", p: "6 ניקובים" }] },
];

const EVENTS = [
  { d: "30/05", full: "2026-05-30", t: "ערב ג׳אז", c: "#c084fc", genre: "jazz" },
  { d: "06/06", full: "2026-06-06", t: "קוויז ליגה", c: "#34d399", genre: "quiz" },
  { d: "13/06", full: "2026-06-13", t: "ערב קאברים", c: "#fb923c", genre: "rock" },
  { d: "20/06", full: "2026-06-20", t: "מסיבת קיץ", c: Y, genre: "party" },
  { d: "27/06", full: "2026-06-27", t: "ערב שישי פתוח", c: "#60a5fa", genre: "open" },
  { d: "04/07", full: "2026-07-04", t: "DJ Night", c: Y, genre: "party" },
  { d: "11/07", full: "2026-07-11", t: "ערב ג׳אז", c: "#c084fc", genre: "jazz" },
  { d: "18/07", full: "2026-07-18", t: "קוויז ליגה", c: "#34d399", genre: "quiz" },
];
const evMap = {};
EVENTS.forEach(e => { evMap[e.full] = e; });

const STAFF_GROUPS = [
  {
    title: "ועדת קולוסיאום", color: Y,
    members: [
      { n: "שלומי ברנס" }, { n: "עומר קאופמן" }, { n: "יזהר גיל" },
      { n: "טלי טבלן" }, { n: "שרון צח" },
    ]
  },
  {
    title: "אחראים", color: "#c084fc",
    members: [
      { n: "ליאור שפנר", r: "אחראי בר" },
      { n: "נטע גיטמול", r: "אחראית ברמנים" },
      { n: "עידן רם", r: "אחראי רכש אלכוהול" },
      { n: "זכי רותם", r: "אחראי רכש כללי" },
      { n: "חיים אלימלך", r: "אחראי ציוד הגברה" },
    ]
  },
  {
    title: "צוות אירועים והופעות", color: "#34d399",
    members: [
      { n: "שי גול" }, { n: "שרון צח" }, { n: "חיים אלימלך" },
      { n: "טלי טבלן" }, { n: "יהודית ריינהולד" }, { n: "יואב כהן" },
      { n: "ליאור שפנר" }, { n: "לימור פרייס" }, { n: "מיטל אלון זערור" },
      { n: "רעות אילת" },
    ]
  },
  {
    title: "צוות בינוי, אחזקה ופרויקטים", color: "#fb923c",
    members: [
      { n: "יזהר גיל" }, { n: "שי פרייס" }, { n: "יואב כהן" },
      { n: "סיון גיטמול" }, { n: "עידן זנדני" }, { n: "עידן רם" }, { n: "שי גול" },
    ]
  },
];

const VOLS = [
  { r: "ברמן/ית", e: "🍸", s: "הכנת משקאות" },
  { r: "ניקיון", e: "🧹", s: "לפני ואחרי" },
  { r: "תפאורה", e: "🎨", s: "עיצוב המקום" },
  { r: "תחזוקה", e: "🔧", s: "תיקונים שוטפים" },
  { r: "בישול", e: "🍳", s: "הכנת אוכל" },
];

const SPIRITS = ["ג׳ין", "ערק", "רום", "וויסקי", "וודקה", "טקילה", "אמרטו", "אפרול"];
const MONTHS = ["ינואר","פברואר","מרץ","אפריל","מאי","יוני","יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר"];
const DAYS = ["א","ב","ג","ד","ה","ו","ש"];
const GENRE_LABELS = { jazz:"ג׳אז", rock:"רוק/קאברים", party:"מסיבות/DJ", quiz:"קוויז", "80s":"שנות ה-80", greek:"יוונית", karaoke:"קריוקי", standup:"סטנדאפ" };
const ALL_GENRES = Object.keys(GENRE_LABELS);

const TABS = [
  { id: "home", e: "🏠", l: "בית" },
  { id: "menu", e: "🍺", l: "תפריט" },
  { id: "events", e: "📅", l: "לוח" },
  { id: "ticket", e: "🎫", l: "כרטיסייה" },
  { id: "social", e: "👥", l: "חברתי" },
  { id: "points", e: "⭐", l: "נקודות" },
  { id: "contact", e: "📞", l: "קשר" },
];

const card = { background: S2, borderRadius: 18, padding: "14px 16px", marginBottom: 10, border: "1px solid " + BR };
const inp = { width: "100%", background: S2, border: "1px solid " + BR, borderRadius: 13, padding: "13px 15px", fontSize: 14, color: "#fff", textAlign: "right", marginBottom: 10, outline: "none", fontFamily: "inherit", display: "block" };
function pill(on) { return { padding: "7px 14px", borderRadius: 30, border: "1.5px solid " + (on ? Y : BR), background: on ? Y : S2, color: on ? BK : "#777", fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0, fontFamily: "inherit" }; }
function sbtn(ok) { return { width: "100%", border: "none", borderRadius: 13, padding: 14, fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", background: ok ? Y : S3, color: ok ? BK : "#444", transition: "all 0.2s" }; }

// ── Birthday ─────────────────────────────────────────────────
function BirthdayModal({ name, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 9000); return () => clearTimeout(t); }, []);
  const emojis = ["🎂","🎉","🥳","🎈","🍾","✨","🎊","💫"];
  const drops = Array.from({ length: 18 }, (_, i) => ({ left: (i * 5.5) % 100, delay: (i * 0.2) % 2.5 }));
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 999, background: "rgba(0,0,0,0.93)", display: "flex", alignItems: "center", justifyContent: "center", direction: "rtl" }}>
      <style>{`@keyframes fall{0%{top:-40px;opacity:1}100%{top:110%;opacity:0}}@keyframes bdp{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}`}</style>
      {drops.map((d, i) => <div key={i} style={{ position: "fixed", top: -40, left: d.left + "%", fontSize: 22, animation: "fall 3s " + d.delay + "s infinite linear", pointerEvents: "none" }}>{emojis[i % emojis.length]}</div>)}
      <div style={{ background: "linear-gradient(135deg,#1a0a00,#0d0d0d)", border: "2px solid " + Y, borderRadius: 28, padding: 32, textAlign: "center", maxWidth: 300, width: "90%", animation: "bdp 1.5s infinite", position: "relative" }}>
        <div style={{ fontSize: 60 }}>🎂</div>
        <div style={{ fontSize: 26, fontWeight: 900, color: Y, marginTop: 10 }}>יום הולדת שמח!</div>
        <div style={{ fontSize: 22, fontWeight: 800, marginTop: 6 }}>{name} 🎉</div>
        <div style={{ background: "rgba(245,200,0,0.1)", border: "1px solid rgba(245,200,0,0.25)", borderRadius: 14, padding: "12px 16px", margin: "16px 0" }}>
          <div style={{ fontSize: 12, color: Y, fontWeight: 700 }}>🎁 מתנה מהקולוסיאום</div>
          <div style={{ fontSize: 20, fontWeight: 900, marginTop: 4 }}>צ׳ייסר חינם!</div>
          <div style={{ fontSize: 11, color: "#666", marginTop: 4 }}>הצג לברמן עד חצות</div>
        </div>
        <button onClick={onClose} style={{ background: Y, color: BK, border: "none", borderRadius: 12, padding: "12px 28px", fontSize: 15, fontWeight: 800, cursor: "pointer" }}>תודה! 🥳</button>
      </div>
    </div>
  );
}

// ── Calendar ──────────────────────────────────────────────────
function CalendarView() {
  const [yr, setYr] = useState(2026);
  const [mo, setMo] = useState(4);
  const [sel, setSel] = useState(null);
  function key(d) { return yr + "-" + String(mo + 1).padStart(2, "0") + "-" + String(d).padStart(2, "0"); }
  const first = new Date(yr, mo, 1).getDay();
  const total = new Date(yr, mo + 1, 0).getDate();
  function prev() { if (mo === 0) { setMo(11); setYr(yr - 1); } else { setMo(mo - 1); } setSel(null); }
  function next() { if (mo === 11) { setMo(0); setYr(yr + 1); } else { setMo(mo + 1); } setSel(null); }
  const selEv = sel ? evMap[key(sel)] : null;
  const nb = { background: S3, border: "1px solid " + BR, borderRadius: 11, width: 36, height: 36, color: "#888", fontSize: 18, cursor: "pointer" };
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <button onClick={prev} style={nb}>‹</button>
        <span style={{ fontWeight: 800, fontSize: 15 }}>{MONTHS[mo]} {yr}</span>
        <button onClick={next} style={nb}>›</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 3 }}>
        {DAYS.map(d => <div key={d} style={{ textAlign: "center", fontSize: 10, color: "#444", fontWeight: 700, paddingBottom: 6 }}>{d}</div>)}
        {Array.from({ length: first }).map((_, i) => <div key={"x" + i} />)}
        {Array.from({ length: total }, (_, i) => i + 1).map(d => {
          const k = key(d), ev = evMap[k], isSel = sel === d, isToday = k === "2026-05-27";
          const bg = isSel ? "rgba(245,200,0,0.15)" : isToday ? "rgba(245,200,0,0.08)" : ev ? S3 : "transparent";
          const bo = isSel ? "1.5px solid " + Y : isToday ? "1px solid rgba(245,200,0,0.3)" : ev ? "1px solid " + BR : "1px solid transparent";
          return (
            <div key={d} onClick={() => setSel(sel === d ? null : d)} style={{ aspectRatio: "1", borderRadius: 10, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer", background: bg, border: bo, fontSize: 12, color: (isSel || isToday) ? Y : ev ? "#fff" : "#444", fontWeight: ev ? 800 : 400 }}>
              {d}
              {ev && <div style={{ width: 4, height: 4, borderRadius: "50%", background: ev.c, marginTop: 2 }} />}
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
        {[["#c084fc","מוסיקה"],["#34d399","קוויז"],[Y,"מסיבה"],["#60a5fa","פתוח"],["#fb923c","קאברים"]].map(([c, l]) => (
          <div key={l} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: c }} />
            <span style={{ fontSize: 11, color: "#555" }}>{l}</span>
          </div>
        ))}
      </div>
      {sel && (
        <div style={{ marginTop: 12, background: S3, borderRadius: 13, padding: 12, border: "1px solid " + (selEv ? selEv.c + "44" : BR) }}>
          {selEv ? <div style={{ display: "flex", alignItems: "center", gap: 8 }}><div style={{ width: 8, height: 8, borderRadius: "50%", background: selEv.c }} /><span style={{ fontWeight: 700, fontSize: 14 }}>{selEv.t}</span></div>
            : <span style={{ fontSize: 12, color: "#444" }}>אין אירוע ביום זה</span>}
        </div>
      )}
    </div>
  );
}

// ── AI Bar ────────────────────────────────────────────────────
function AIBar() {
  const [spirit, setSpirit] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  async function suggest() {
    if (!spirit) return;
    setLoading(true); setResult(null);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "anthropic-dangerous-direct-browser-access": "true"
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 800,
          messages: [{ role: "user", content: "אתה ברמן מקצועי בפאב ישראלי. הצע 2 קוקטיילים עם " + spirit + ". כל אחד: שם, חומרים, הכנה קצרה. עברית, חמה ומקצועית." }]
        })
      });
      const d = await res.json();
      if (d.error) { setResult("שגיאה: " + d.error.message); }
      else { setResult(d.content ? d.content.map(b => b.text || "").join("") : "לא הצלחתי להביא הצעות."); }
    } catch (err) { setResult("שגיאה בחיבור. נסה שוב."); }
    setLoading(false);
  }

  return (
    <div style={{ background: S1, borderRadius: 20, padding: 18, border: "1px solid " + BR, marginTop: 18, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 0% 0%,rgba(192,132,252,0.07),transparent 60%)", pointerEvents: "none" }} />
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, position: "relative" }}>
        <span style={{ fontSize: 20 }}>🤖</span>
        <span style={{ color: Y, fontSize: 15, fontWeight: 800 }}>הבר החכם</span>
      </div>
      <div style={{ color: "#555", fontSize: 12, marginBottom: 14, position: "relative" }}>בחר בסיס וקבל המלצת קוקטייל</div>
      <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 14 }}>
        {SPIRITS.map(s => <button key={s} onClick={() => setSpirit(spirit === s ? "" : s)} style={pill(spirit === s)}>{s}</button>)}
      </div>
      <button onClick={suggest} disabled={!spirit || loading} style={sbtn(!!spirit && !loading)}>
        {loading ? "⏳ מכין הצעה..." : "🍹 הצע לי קוקטייל"}
      </button>
      {result && <div style={{ marginTop: 14, background: "rgba(255,255,255,0.03)", border: "1px solid " + BR, borderRadius: 14, padding: 14, color: "#ccc", fontSize: 13, lineHeight: 1.85, whiteSpace: "pre-wrap", position: "relative" }}>{result}</div>}
    </div>
  );
}

// ── Barcode ───────────────────────────────────────────────────
function Barcode() {
  const pat = [3,1,2,1,3,2,1,2,3,1,2,1,3,2,3,1,2,1,3,2,1,3,2,1,2,3,1,2,1,3,2,1,3,1,2];
  let x = 4; const bars = [];
  pat.forEach((w, i) => { bars.push(<rect key={i} x={x} y={0} width={w * 3} height={68} fill="white" rx={1.5} />); x += w * 3 + [1,2,1][i % 3]; });
  return (
    <div style={{ background: "#050507", borderRadius: 22, padding: "26px 20px", textAlign: "center", border: "1px solid " + BR }}>
      <div style={{ color: "#333", fontSize: 10, letterSpacing: 3, fontWeight: 700, marginBottom: 16 }}>כרטיסייה דיגיטלית</div>
      <svg width={x} height={68} viewBox={"0 0 " + x + " 68"} style={{ display: "block", margin: "0 auto" }}>{bars}</svg>
      <div style={{ color: "#222", fontSize: 10, marginTop: 12, letterSpacing: 4, fontFamily: "monospace" }}>4821 · 0042 · KC</div>
      <div style={{ color: Y, fontSize: 12, marginTop: 10, fontWeight: 600 }}>הצג לסריקה בקופה ✓</div>
    </div>
  );
}

// ── Feed ──────────────────────────────────────────────────────
function FeedPage({ userName, setUserName }) {
  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [caption, setCaption] = useState("");
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [posting, setPosting] = useState(false);
  const [pct, setPct] = useState(0);
  const fileRef = useRef();
  const emojis = ["🍺","🎸","🎉","🥂","🎊","🍻","💃","🎵","🔥","✨"];

  useEffect(() => { load(); }, []);
  async function load() { setLoading(true); setFeed(await fsGet("feed")); setLoading(false); }

  function onFile(e) {
    const f = e.target.files[0]; if (!f) return; setImage(f);
    const r = new FileReader(); r.onload = ev => setPreview(ev.target.result); r.readAsDataURL(f);
  }

  async function post() {
    if (!caption.trim() || !userName.trim()) return;
    setPosting(true); setPct(10);
    let imageUrl = "";
    try {
      if (image) { setPct(30); imageUrl = await uploadImage(image, "feed/" + Date.now() + "_" + image.name); setPct(80); }
      const now = new Date();
      await fsAdd("feed", { user: userName, caption: caption.trim(), imageUrl, emoji: emojis[Math.floor(Math.random() * emojis.length)], likes: 0, ts: Date.now(), time: now.getHours() + ":" + String(now.getMinutes()).padStart(2, "0") });
      setPct(100); setCaption(""); setImage(null); setPreview(null); await load();
    } catch { alert("שגיאה. נסה שוב."); }
    setPosting(false); setPct(0);
  }

  async function like(p) {
    setFeed(prev => prev.map(x => x.id === p.id ? { ...x, likes: x.likes + 1 } : x));
    await fsUpdate("feed", p.id, { likes: p.likes + 1 });
  }

  function share(p) {
    const text = p.user + " מהקולוסיאום: " + p.caption + " 🍺";
    if (navigator.share) { navigator.share({ title: "הקולוסיאום", text, url: "https://colosseum-avigdor.com" }); }
    else if (navigator.clipboard) { navigator.clipboard.writeText(text); alert("הועתק!"); }
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 17, fontWeight: 800 }}>פיד חי 📸</div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#34d399", boxShadow: "0 0 8px #34d399" }} />
          <span style={{ fontSize: 11, color: "#34d399", fontWeight: 700 }}>חי</span>
        </div>
      </div>
      <div style={{ ...card, background: S1, marginBottom: 18 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: Y, marginBottom: 12 }}>📤 שתף רגע מהערב</div>
        <input style={inp} placeholder="השם שלך" value={userName} onChange={e => setUserName(e.target.value)} />
        <textarea style={{ ...inp, minHeight: 70, resize: "none" }} placeholder="מה קורה בקולוסיאום? 🍺" value={caption} onChange={e => setCaption(e.target.value)} />
        {preview && <div style={{ position: "relative", marginBottom: 10 }}><img src={preview} alt="" style={{ width: "100%", borderRadius: 14, maxHeight: 200, objectFit: "cover" }} /><button onClick={() => { setImage(null); setPreview(null); }} style={{ position: "absolute", top: 8, left: 8, background: "rgba(0,0,0,0.7)", border: "none", borderRadius: "50%", width: 28, height: 28, color: "#fff", fontSize: 14, cursor: "pointer" }}>✕</button></div>}
        {posting && pct > 0 && pct < 100 && <div style={{ marginBottom: 10 }}><div style={{ background: S3, borderRadius: 10, height: 6 }}><div style={{ background: Y, borderRadius: 10, height: "100%", width: pct + "%", transition: "width 0.3s" }} /></div></div>}
        <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
          <button onClick={() => fileRef.current.click()} style={{ flex: 1, background: S3, border: "1px solid " + BR, borderRadius: 12, padding: "11px", fontSize: 13, color: "#aaa", cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>📷 {image ? "נבחרה ✓" : "הוסף תמונה"}</button>
          <input ref={fileRef} type="file" accept="image/*,video/*" style={{ display: "none" }} onChange={onFile} />
          <button onClick={post} disabled={posting || !caption.trim() || !userName.trim()} style={{ ...sbtn(!posting && !!caption.trim() && !!userName.trim()), flex: 2, padding: "11px" }}>{posting ? "מפרסם..." : "פרסם 🚀"}</button>
        </div>
        <div style={{ borderTop: "1px solid " + BR, paddingTop: 12 }}>
          <div style={{ fontSize: 11, color: "#555", marginBottom: 8, fontWeight: 700 }}>שתף ברשתות</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
            {[{ l: "WhatsApp", i: "💬", c: "#25d366", u: "https://wa.me/?text=ערב מדהים בקולוסיאום! 🍺" }, { l: "Facebook", i: "📘", c: "#1877f2", u: "https://www.facebook.com/sharer/sharer.php?u=https://colosseum-avigdor.com" }, { l: "Instagram", i: "📸", c: "#e1306c", u: "https://www.instagram.com/" }, { l: "X", i: "🐦", c: "#aaa", u: "https://twitter.com/intent/tweet?text=ערב מדהים!" }].map(s => (
              <a key={s.l} href={s.u} target="_blank" rel="noreferrer" style={{ display: "flex", alignItems: "center", gap: 5, background: s.c + "18", border: "1px solid " + s.c + "33", borderRadius: 10, padding: "6px 12px", color: s.c, fontSize: 12, fontWeight: 700, textDecoration: "none" }}><span>{s.i}</span>{s.l}</a>
            ))}
          </div>
          <button onClick={() => { if (navigator.share) navigator.share({ title: "הקולוסיאום", text: "ערב מדהים בקולוסיאום אביגדור! 🍺", url: "https://colosseum-avigdor.com" }); }} style={{ ...sbtn(true), padding: 12, fontSize: 13 }}>📱 שתף דרך הטלפון</button>
        </div>
      </div>
      {loading ? <div style={{ textAlign: "center", color: "#555", padding: 30 }}>⏳ טוען...</div> :
        feed.length === 0 ? <div style={{ ...card, textAlign: "center", padding: 30 }}><div style={{ fontSize: 36, marginBottom: 8 }}>📸</div><div style={{ fontSize: 14, color: "#555" }}>היה הראשון לפרסם!</div></div> :
        feed.map(p => (
          <div key={p.id} style={card}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <div style={{ width: 38, height: 38, borderRadius: "50%", background: "rgba(245,200,0,0.15)", border: "1px solid rgba(245,200,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{p.emoji}</div>
              <div><div style={{ fontWeight: 700, fontSize: 14 }}>{p.user}</div><div style={{ fontSize: 11, color: "#555" }}>{p.time}</div></div>
            </div>
            {p.imageUrl && <img src={p.imageUrl} alt="" style={{ width: "100%", borderRadius: 14, maxHeight: 260, objectFit: "cover", marginBottom: 10 }} />}
            <div style={{ fontSize: 14, color: "#ddd", marginBottom: 10, lineHeight: 1.5 }}>{p.caption}</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => like(p)} style={{ background: "transparent", border: "1px solid " + BR, borderRadius: 8, padding: "5px 12px", color: "#aaa", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>❤️ {p.likes}</button>
              <button onClick={() => share(p)} style={{ background: "transparent", border: "1px solid " + BR, borderRadius: 8, padding: "5px 12px", color: "#aaa", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>📤 שתף</button>
            </div>
          </div>
        ))
      }
    </div>
  );
}

// ── Social ────────────────────────────────────────────────────
function SocialPage({ userPrefs, setUserPrefs, userName, setUserName, setShowBirthday, setBirthdayName }) {
  const [sub, setSub] = useState("feed");
  const [status, setStatus] = useState([]);
  const [bdName, setBdName] = useState("");
  const [bdDone, setBdDone] = useState(false);
  const toggle = s => setStatus(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s]);
  const toggleG = g => setUserPrefs(p => p.includes(g) ? p.filter(x => x !== g) : [...p, g]);
  const matched = EVENTS.filter(ev => userPrefs.includes(ev.genre));

  return (
    <div style={{ padding: "18px 14px 10px" }}>
      <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 16 }}>חברתי ✨</div>
      <div style={{ display: "flex", gap: 8, overflowX: "auto", marginBottom: 20, paddingBottom: 4, scrollbarWidth: "none" }}>
        {[["feed","📸 פיד"],["prefs","🎵 טעמים"],["who","👋 מי פה?"],["birthday","🎂 יום הולדת"]].map(([id, l]) => (
          <button key={id} onClick={() => setSub(id)} style={{ ...pill(sub === id), fontSize: 11, padding: "6px 12px" }}>{l}</button>
        ))}
      </div>
      {sub === "feed" && <FeedPage userName={userName} setUserName={setUserName} />}
      {sub === "prefs" && (
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 6 }}>הז׳אנרים שאתה אוהב</div>
          <div style={{ fontSize: 12, color: "#555", marginBottom: 14 }}>נמליץ לך על ערבים מתאימים</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
            {ALL_GENRES.map(g => <button key={g} onClick={() => toggleG(g)} style={pill(userPrefs.includes(g))}>{GENRE_LABELS[g]}</button>)}
          </div>
          {userPrefs.length > 0 && matched.length > 0 && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: Y, marginBottom: 10 }}>🎯 מומלץ לך:</div>
              {matched.map((ev, i) => (
                <div key={i} style={{ ...card, borderRight: "3px solid " + ev.c, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div><div style={{ fontWeight: 800, fontSize: 14 }}>{ev.t}</div><div style={{ fontSize: 11, color: "#555", marginTop: 2 }}>{ev.d}</div></div>
                  <div style={{ background: ev.c + "22", color: ev.c, fontSize: 10, fontWeight: 700, borderRadius: 20, padding: "3px 10px" }}>מומלץ!</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {sub === "who" && (
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 6 }}>מי חדש פה? 👋</div>
          <input style={inp} placeholder="השם שלך" value={userName} onChange={e => setUserName(e.target.value)} />
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
            {[["firsttime","🌟 פעם ראשונה בקולוסיאום"],["alone","🙋 הגעתי לבד"],["open","😊 פתוח/ה להכיר"]].map(([id, label]) => (
              <button key={id} onClick={() => toggle(id)} style={{ background: status.includes(id) ? "rgba(245,200,0,0.08)" : S1, border: "1.5px solid " + (status.includes(id) ? Y : BR), borderRadius: 14, padding: "13px 16px", textAlign: "right", cursor: "pointer", color: "#fff", fontFamily: "inherit", fontSize: 14, fontWeight: status.includes(id) ? 700 : 400 }}>{label}</button>
            ))}
          </div>
          {status.length > 0 && userName && <div style={{ background: "rgba(52,211,153,0.06)", border: "1.5px solid rgba(52,211,153,0.3)", borderRadius: 16, padding: 16, textAlign: "center" }}><div style={{ fontSize: 16, fontWeight: 800, color: "#34d399" }}>הסטטוס שלך פעיל! 🎉</div></div>}
        </div>
      )}
      {sub === "birthday" && (
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 6 }}>יום הולדת? 🎂</div>
          <div style={{ fontSize: 12, color: "#555", marginBottom: 16 }}>שמו יופיע על המסכים בפאב!</div>
          {!bdDone ? (
            <>
              <input style={inp} placeholder="שם של בעל/ת יום ההולדת" value={bdName} onChange={e => setBdName(e.target.value)} />
              <button onClick={() => { if (bdName) { setBdDone(true); setBirthdayName(bdName); setTimeout(() => setShowBirthday(true), 400); } }} style={sbtn(!!bdName)}>🎉 הפעל מצב יום הולדת!</button>
            </>
          ) : (
            <div style={{ background: "rgba(245,200,0,0.06)", border: "1.5px solid rgba(245,200,0,0.3)", borderRadius: 16, padding: 20, textAlign: "center" }}>
              <div style={{ fontSize: 36 }}>🎂</div>
              <div style={{ fontSize: 17, fontWeight: 800, color: Y, marginTop: 8 }}>מצב יום הולדת פעיל!</div>
              <div style={{ fontSize: 14, color: "#aaa", marginTop: 6 }}>{bdName} מקבל/ת הפתעה!</div>
              <button onClick={() => { setBdDone(false); setBdName(""); }} style={{ background: "transparent", border: "1px solid " + BR, borderRadius: 10, padding: "8px 16px", color: "#666", fontSize: 12, cursor: "pointer", marginTop: 12, fontFamily: "inherit" }}>איפוס</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Points ────────────────────────────────────────────────────
function PointsPage({ userName }) {
  const [pts, setPts] = useState(null);
  const [done, setDone] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    async function load() {
      const p = await stGet("pts-" + (userName || "guest")); setPts(p !== null ? p : 35);
      const d = await stGet("da-" + (userName || "guest")); setDone(d || []);
      setLoading(false);
    }
    load();
  }, [userName]);

  async function add(p, id) {
    if (done.includes(id)) return;
    const np = (pts || 0) + p, nd = [...done, id];
    setPts(np); setDone(nd);
    await stSet("pts-" + (userName || "guest"), np);
    await stSet("da-" + (userName || "guest"), nd);
  }

  async function redeem(p, name) {
    if ((pts || 0) < p) return;
    const np = (pts || 0) - p; setPts(np);
    await stSet("pts-" + (userName || "guest"), np);
    alert("🎉 מימשת: " + name + "! הצג לברמן.");
  }

  const actions = [{ id: "checkin", l: "הגעה לערב", p: 10, e: "📍" }, { id: "story", l: "העלאת סטורי", p: 15, e: "📸" }, { id: "share", l: "שיתוף אירוע", p: 8, e: "📢" }, { id: "refer", l: "המלצה לחבר", p: 20, e: "👥" }, { id: "photo", l: "פרסום בפיד", p: 12, e: "🖼️" }];
  const rewards = [{ name: "צ׳ייסר חינם", p: 50, e: "🥃" }, { name: "הנחה 20%", p: 80, e: "💰" }, { name: "כניסה חינם", p: 150, e: "🎫" }, { name: "VIP ערב שלם", p: 300, e: "👑" }];

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: "#555" }}>טוען...</div>;

  const pct = Math.min(((pts || 0) / 300) * 100, 100);
  return (
    <div style={{ padding: "18px 14px 10px" }}>
      <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 4 }}>מטבעות קולוסיאום ⭐</div>
      <div style={{ fontSize: 12, color: "#555", marginBottom: 20 }}>צבור נקודות והמר להטבות</div>
      <div style={{ background: "linear-gradient(135deg,#1a1500,#0d0d0d)", border: "1.5px solid rgba(245,200,0,0.3)", borderRadius: 22, padding: 22, marginBottom: 20, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 80% 20%,rgba(245,200,0,0.12),transparent 60%)", pointerEvents: "none" }} />
        <div style={{ position: "relative" }}>
          <div style={{ fontSize: 12, color: "#666", marginBottom: 6 }}>{userName || "אורח"} · קיץ 2026</div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 8, marginBottom: 16 }}>
            <div style={{ fontSize: 52, fontWeight: 900, color: Y, lineHeight: 1 }}>{pts}</div>
            <div style={{ fontSize: 16, color: "#666", marginBottom: 8 }}>נקודות</div>
          </div>
          <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 10, height: 10, marginBottom: 6 }}>
            <div style={{ background: "linear-gradient(90deg," + Y + ",#ffb800)", borderRadius: 10, height: "100%", width: pct + "%", transition: "width 0.5s" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#555" }}><span>0</span><span>VIP ב-300 ⭐</span></div>
        </div>
      </div>
      <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 12 }}>צבור נקודות</div>
      {actions.map(a => (
        <div key={a.id} style={{ ...card, display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 24 }}>{a.e}</span>
          <div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 14 }}>{a.l}</div><div style={{ fontSize: 12, color: Y, marginTop: 2 }}>+{a.p} נקודות</div></div>
          <button onClick={() => add(a.p, a.id)} disabled={done.includes(a.id)} style={{ background: done.includes(a.id) ? S3 : Y, color: done.includes(a.id) ? "#555" : BK, border: "none", borderRadius: 10, padding: "7px 14px", fontSize: 12, fontWeight: 800, cursor: done.includes(a.id) ? "default" : "pointer", fontFamily: "inherit" }}>{done.includes(a.id) ? "✓" : "צבור"}</button>
        </div>
      ))}
      <div style={{ fontSize: 14, fontWeight: 800, marginTop: 20, marginBottom: 12 }}>הטבות</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {rewards.map((r, i) => {
          const can = (pts || 0) >= r.p;
          return (
            <div key={i} onClick={() => redeem(r.p, r.name)} style={{ background: can ? "rgba(245,200,0,0.06)" : S1, border: "1.5px solid " + (can ? "rgba(245,200,0,0.3)" : BR), borderRadius: 18, padding: "16px 14px", textAlign: "center", cursor: can ? "pointer" : "default" }}>
              <div style={{ fontSize: 30, marginBottom: 6 }}>{r.e}</div>
              <div style={{ fontSize: 13, fontWeight: 800 }}>{r.name}</div>
              <div style={{ fontSize: 12, color: can ? Y : "#444", marginTop: 4, fontWeight: 700 }}>{r.p} ⭐</div>
              {can && <div style={{ fontSize: 10, color: "#34d399", marginTop: 4 }}>לחץ למימוש</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("home");
  const [mc, setMc] = useState(0);
  const [selPlan, setSelPlan] = useState(1);
  const [cName, setCName] = useState(""); const [cMsg, setCMsg] = useState(""); const [cDone, setCDone] = useState(false);
  const [userPrefs, setUserPrefs] = useState([]);
  const [userName, setUserName] = useState("");
  const [showBirthday, setShowBirthday] = useState(false);
  const [birthdayName, setBirthdayName] = useState("");

  useEffect(() => { stGet("user-name").then(n => { if (n) setUserName(n); }); }, []);
  useEffect(() => { if (userName) stSet("user-name", userName); }, [userName]);

  const pg = { padding: "18px 14px 10px" };

  // Navigation URLs
  const ADDRESS = "מושב אביגדור";
  const gmapsUrl = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(ADDRESS);
  const wazeUrl = "https://waze.com/ul?q=" + encodeURIComponent(ADDRESS) + "&navigate=yes";

  return (
    <div style={{ fontFamily: "-apple-system,BlinkMacSystemFont,sans-serif", direction: "rtl", background: BK, minHeight: "100vh", maxWidth: 430, margin: "0 auto", paddingBottom: 80, color: "#fff" }}>
      {showBirthday && <BirthdayModal name={birthdayName} onClose={() => setShowBirthday(false)} />}

      {/* HEADER */}
      <div style={{ background: "rgba(10,10,10,0.95)", padding: "13px 18px", borderBottom: "1px solid " + BR, display: "flex", alignItems: "center", gap: 12, position: "sticky", top: 0, zIndex: 50, backdropFilter: "blur(20px)" }}>
        <Logo s={46} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 19, fontWeight: 900, background: "linear-gradient(135deg,#fff 40%,#F5C800)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>הקולוסיאום</div>
          <div style={{ fontSize: 11, color: "#555" }}>מושב אביגדור · פתוח חמישי ושישי</div>
        </div>
        <div style={{ background: "rgba(245,200,0,0.1)", border: "1px solid rgba(245,200,0,0.2)", borderRadius: 8, padding: "5px 10px", fontSize: 10, color: Y, fontWeight: 700 }}>💳 ניקובים</div>
      </div>

      {/* HOME */}
      {tab === "home" && (
        <div style={pg}>
          <div style={{ background: "linear-gradient(160deg,#1a1500,#0d0d0d)", border: "1px solid rgba(245,200,0,0.15)", borderRadius: 22, padding: "24px 18px", marginBottom: 18, position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 0%,rgba(245,200,0,0.13),transparent 60%)", pointerEvents: "none" }} />
            <div style={{ position: "relative", textAlign: "center" }}>
              <div style={{ fontSize: 22, fontWeight: 900, background: "linear-gradient(135deg,#fff,#F5C800)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>ברוכים הבאים!</div>
              <div style={{ fontSize: 13, color: "#555", marginTop: 4 }}>הפאב הקהילתי של מושב אביגדור 🍻</div>
            </div>
          </div>

          <div style={{ fontSize: 10, color: "#333", letterSpacing: "2px", textTransform: "uppercase", fontWeight: 700, marginBottom: 10 }}>האירוע הקרוב</div>
          <div onClick={() => setTab("events")} style={{ ...card, display: "flex", justifyContent: "space-between", alignItems: "center", borderRight: "3px solid #c084fc", cursor: "pointer", marginBottom: 20 }}>
            <div>
              <div style={{ background: "rgba(192,132,252,0.15)", color: "#c084fc", fontSize: 10, fontWeight: 700, borderRadius: 20, padding: "3px 10px", display: "inline-block", marginBottom: 7 }}>אירוע מיוחד</div>
              <div style={{ fontSize: 17, fontWeight: 800 }}>{EVENTS[0].t}</div>
              <div style={{ fontSize: 12, color: "#555", marginTop: 3 }}>יום שישי {EVENTS[0].d} ←</div>
            </div>
            <div style={{ minWidth: 52, textAlign: "center", borderRadius: 14, padding: 10, border: "1px solid rgba(192,132,252,0.4)", color: "#c084fc" }}>
              <div style={{ fontSize: 24, fontWeight: 900, lineHeight: 1 }}>{EVENTS[0].d.split("/")[0]}</div>
              <div style={{ fontSize: 10, marginTop: 2 }}>מאי</div>
            </div>
          </div>

          <div style={{ fontSize: 10, color: "#333", letterSpacing: "2px", textTransform: "uppercase", fontWeight: 700, marginBottom: 10 }}>מה רצית?</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
            {[
              { e: "🍺", l: "תפריט", s: "כרטיסיית ניקובים", id: "menu", gc: "rgba(251,146,60,0.08)", bc: "rgba(251,146,60,0.18)", glow: "#fb923c" },
              { e: "📅", l: "לוח שנה", s: "אירועים קרובים", id: "events", gc: "rgba(192,132,252,0.08)", bc: "rgba(192,132,252,0.18)", glow: "#c084fc" },
              { e: "📸", l: "פיד חי", s: "תמונות מהערב", id: "social", gc: "rgba(52,211,153,0.08)", bc: "rgba(52,211,153,0.18)", glow: "#34d399" },
              { e: "⭐", l: "נקודות", s: "הטבות ומטבעות", id: "points", gc: "rgba(245,200,0,0.08)", bc: "rgba(245,200,0,0.18)", glow: Y },
            ].map(x => (
              <button key={x.id} onClick={() => setTab(x.id)} style={{ border: "1px solid " + x.bc, borderRadius: 20, padding: "18px 16px", textAlign: "right", cursor: "pointer", color: "#fff", background: "linear-gradient(135deg," + x.gc + "," + BK + ")", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: -20, left: -20, width: 80, height: 80, borderRadius: "50%", background: x.glow, filter: "blur(28px)", opacity: 0.3 }} />
                <div style={{ fontSize: 26, marginBottom: 10, position: "relative" }}>{x.e}</div>
                <div style={{ fontSize: 14, fontWeight: 800, position: "relative" }}>{x.l}</div>
                <div style={{ fontSize: 11, color: "#555", marginTop: 3, position: "relative" }}>{x.s}</div>
              </button>
            ))}
          </div>
          <div style={{ background: S1, borderRadius: 13, padding: "11px 14px", border: "1px solid " + BR, textAlign: "center", fontSize: 11, color: "#2e2e2e" }}>
            ⚠️ אלכוהול מגיל 18 בלבד &nbsp;·&nbsp; 💳 תשלום בכרטיסייה בלבד
          </div>
        </div>
      )}

      {/* MENU */}
      {tab === "menu" && (
        <div style={pg}>
          <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 16 }}>תפריט הבר</div>
          <div style={{ display: "flex", gap: 7, overflowX: "auto", paddingBottom: 4, marginBottom: 16, scrollbarWidth: "none" }}>
            {MENU.map((c, i) => <button key={i} onClick={() => setMc(i)} style={pill(mc === i)}>{c.cat}</button>)}
          </div>
          {MENU[mc].items.map((item, i) => (
            <div key={i} style={{ ...card, display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{item.n}</div>
              <div style={{ background: Y, color: BK, borderRadius: 10, padding: "5px 12px", fontWeight: 900, fontSize: 12, flexShrink: 0 }}>{item.p}</div>
            </div>
          ))}
          <AIBar />
        </div>
      )}

      {/* EVENTS */}
      {tab === "events" && (
        <div style={pg}>
          <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 16 }}>לוח אירועים</div>
          <div style={{ ...card, padding: 20, marginBottom: 20 }}><CalendarView /></div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#555", marginBottom: 10 }}>כל האירועים</div>
          {EVENTS.map((ev, i) => (
            <div key={i} style={{ ...card, display: "flex", justifyContent: "space-between", alignItems: "center", borderRight: "3px solid " + ev.c }}>
              <div><div style={{ fontWeight: 800, fontSize: 14 }}>{ev.t}</div><div style={{ fontSize: 11, color: "#555", marginTop: 3 }}>יום שישי {ev.d}</div></div>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: ev.c, boxShadow: "0 0 8px " + ev.c }} />
            </div>
          ))}
        </div>
      )}

      {/* TICKET */}
      {tab === "ticket" && (
        <div style={pg}>
          <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 4 }}>כרטיסייה</div>
          <div style={{ fontSize: 12, color: "#444", marginBottom: 18 }}>כל ניקוב = יחידת תשלום אחת</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
            {[{ n: 10, p: 200 }, { n: 20, p: 350 }, { n: 30, p: 480 }].map(({ n, p }, i) => (
              <div key={i} onClick={() => setSelPlan(i)} style={{ background: S1, borderRadius: 18, padding: "16px 8px", textAlign: "center", border: "1.5px solid " + (selPlan === i ? Y : BR), cursor: "pointer", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: -20, left: "50%", transform: "translateX(-50%)", width: 60, height: 60, background: Y, borderRadius: "50%", filter: "blur(25px)", opacity: 0.1 }} />
                <div style={{ fontSize: 26, fontWeight: 900, color: Y, position: "relative" }}>{n}</div>
                <div style={{ fontSize: 10, color: "#444", marginBottom: 8, position: "relative" }}>ניקובים</div>
                <div style={{ fontSize: 14, fontWeight: 800, position: "relative" }}>{p}₪</div>
              </div>
            ))}
          </div>
          <Barcode />
        </div>
      )}

      {/* SOCIAL */}
      {tab === "social" && <SocialPage userPrefs={userPrefs} setUserPrefs={setUserPrefs} userName={userName} setUserName={setUserName} setShowBirthday={setShowBirthday} setBirthdayName={setBirthdayName} />}

      {/* POINTS */}
      {tab === "points" && <PointsPage userName={userName} />}

      {/* CONTACT */}
      {tab === "contact" && (
        <div style={pg}>
          <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 16 }}>צור קשר</div>
          <div style={{ ...card, marginBottom: 18 }}>
            {[["📍", "מושב אביגדור, ישראל"], ["⏰", "ימי חמישי ושישי 20:00–02:00"], ["📱", "050-1234567"]].map(([ic, tx], i) => (
              <div key={i} style={{ display: "flex", gap: 14, alignItems: "center", padding: "10px 0", borderBottom: i < 2 ? "1px solid " + BR : "none" }}>
                <span style={{ fontSize: 20 }}>{ic}</span><span style={{ fontSize: 14, color: "#bbb" }}>{tx}</span>
              </div>
            ))}
          </div>

          {/* Navigation */}
          <div style={{ fontSize: 13, fontWeight: 700, color: "#888", marginBottom: 10 }}>ניווט למקום</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 18 }}>
            <a href={gmapsUrl} target="_blank" rel="noreferrer" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, background: "rgba(66,133,244,0.1)", border: "1px solid rgba(66,133,244,0.25)", borderRadius: 18, padding: "18px 14px", textDecoration: "none", cursor: "pointer" }}>
              <span style={{ fontSize: 32 }}>🗺️</span>
              <span style={{ fontSize: 14, fontWeight: 800, color: "#4285f4" }}>Google Maps</span>
              <span style={{ fontSize: 11, color: "#555" }}>פתח ניווט</span>
            </a>
            <a href={wazeUrl} target="_blank" rel="noreferrer" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, background: "rgba(0,210,255,0.08)", border: "1px solid rgba(0,210,255,0.2)", borderRadius: 18, padding: "18px 14px", textDecoration: "none", cursor: "pointer" }}>
              <span style={{ fontSize: 32 }}>🚗</span>
              <span style={{ fontSize: 14, fontWeight: 800, color: "#00d2ff" }}>Waze</span>
              <span style={{ fontSize: 11, color: "#555" }}>פתח ניווט</span>
            </a>
          </div>

          {/* Staff groups */}
          <div style={{ fontSize: 13, fontWeight: 700, color: "#888", marginBottom: 12 }}>בעלי תפקידים</div>
          {STAFF_GROUPS.map((g, gi) => (
            <div key={gi} style={{ ...card, marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <div style={{ width: 4, height: 18, borderRadius: 2, background: g.color }} />
                <div style={{ fontSize: 14, fontWeight: 800, color: g.color }}>{g.title}</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {g.members.map((m, mi) => (
                  <div key={mi} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 34, height: 34, borderRadius: "50%", background: g.color + "20", border: "1.5px solid " + g.color + "44", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: g.color, flexShrink: 0 }}>
                      {m.n.slice(0, 1)}
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>{m.n}</div>
                      {m.r && <div style={{ fontSize: 11, color: "#555", marginTop: 1 }}>{m.r}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Contact form */}
          {!cDone ? (
            <>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#888", marginBottom: 10 }}>פתח קריאה</div>
              <input style={inp} placeholder="שם" value={cName} onChange={e => setCName(e.target.value)} />
              <textarea style={{ ...inp, minHeight: 90, resize: "vertical" }} placeholder="במה נוכל לעזור?" value={cMsg} onChange={e => setCMsg(e.target.value)} />
              <div style={{ fontSize: 11, color: "#333", marginBottom: 10 }}>⏱ זמן תגובה: עד 24 שעות</div>
              <button onClick={() => { if (cName && cMsg) setCDone(true); }} style={sbtn(!!(cName && cMsg))}>שלח פנייה</button>
            </>
          ) : (
            <div style={{ borderRadius: 20, padding: 28, textAlign: "center", background: "rgba(52,211,153,0.05)", border: "1.5px solid rgba(52,211,153,0.3)" }}>
              <div style={{ fontSize: 40 }}>✅</div>
              <div style={{ fontSize: 17, fontWeight: 800, color: "#34d399", marginTop: 10 }}>פנייתך התקבלה!</div>
              <div style={{ fontSize: 13, color: "#666", marginTop: 8 }}>ניצור קשר בהקדם, {cName}.</div>
            </div>
          )}
        </div>
      )}

      {/* NAV */}
      <nav style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 430, background: "rgba(10,10,10,0.97)", display: "flex", borderTop: "1px solid " + BR, zIndex: 100, backdropFilter: "blur(20px)" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ flex: 1, background: "none", border: "none", cursor: "pointer", color: tab === t.id ? Y : "#333", fontSize: 9, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "10px 2px 7px", fontFamily: "inherit" }}>
            <span style={{ fontSize: 18 }}>{t.e}</span>
            <span style={{ fontWeight: tab === t.id ? 700 : 400 }}>{t.l}</span>
            {tab === t.id && <div style={{ width: 4, height: 4, borderRadius: "50%", background: Y }} />}
          </button>
        ))}
      </nav>
    </div>
  );
}
