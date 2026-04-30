import { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

// ─── SUPABASE — LIVE CONNECTION ───────────────────────────────────────────────
const SUPABASE_URL  = "https://mgpvfkuzurhzysorkbvh.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ncHZma3V6dXJoenlzb3JrYnZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3NTg3NDksImV4cCI6MjA5MjMzNDc0OX0.Po4Vfrzk8OcG8fR_0Fmp5Bq-2ZOS2qxq63_v7H-Mguo";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

// ─── THEME — Exact Uniedd Logo Colors ────────────────────────────────────────
// Blue: #1480ae (teal-blue from logo left)  Gold: #f0a03c (amber from logo right)
const T = {
  bg:"#060d14",       // very dark navy — matches logo dark bg
  surface:"#091520",  // dark blue-tinted surface
  card:"#0d1e2e",     // card bg
  border:"#153048",   // subtle border
  accent:"#1480ae",   // exact logo teal-blue
  accentL:"#14a0c8",  // logo lighter blue highlight
  accentD:"#0064a0",  // logo deep blue
  gold:"#f0a03c",     // exact logo amber/gold
  goldL:"#f0b43c",    // logo lighter gold
  goldD:"#dc8c28",    // logo darker gold
  green:"#10b981", red:"#ef4444", purple:"#8b5cf6",
  text:"#ddeaf5", muted:"#4e7a96", white:"#ffffff",
};

// ─── GLOBAL CSS ───────────────────────────────────────────────────────────────
const css = `
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{font-size:16px}
body{font-family:'DM Sans',sans-serif;background:${T.bg};color:${T.text};min-height:100vh;-webkit-font-smoothing:antialiased}
::-webkit-scrollbar{width:5px;height:5px}::-webkit-scrollbar-track{background:${T.bg}}::-webkit-scrollbar-thumb{background:${T.border};border-radius:8px}
input,textarea,select,button{font-family:'DM Sans',sans-serif}button{cursor:pointer}

.lms-root{display:flex;height:100vh;overflow:hidden}
.sidebar{width:240px;min-width:240px;background:${T.surface};border-right:1px solid ${T.border};display:flex;flex-direction:column;overflow-y:auto;transition:width .25s}
.sidebar-logo{padding:22px 18px 16px;border-bottom:1px solid ${T.border}}
.sidebar-role{font-size:10px;color:${T.muted};text-transform:uppercase;letter-spacing:1.4px;margin-top:3px}
.nav-item{display:flex;align-items:center;gap:10px;padding:10px 14px;margin:1px 8px;border-radius:9px;cursor:pointer;transition:all .15s;font-size:13.5px;color:${T.muted};font-weight:500}
.nav-item:hover{background:${T.card};color:${T.text}}
.nav-item.active{background:linear-gradient(135deg,rgba(20,128,174,.22),rgba(240,160,60,.10));color:${T.accentL};border-left:3px solid ${T.gold};padding-left:11px}
.nav-item .icon{font-size:16px;min-width:20px;text-align:center}
.sidebar-bottom{margin-top:auto;padding:12px 10px;border-top:1px solid ${T.border}}
.user-chip{display:flex;align-items:center;gap:10px;padding:9px 10px;border-radius:9px;background:${T.card};cursor:pointer;transition:background .15s}
.user-chip:hover{background:#1a2d45}
.avatar{width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,${T.accent},${T.gold});display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#fff;flex-shrink:0}
.avatar.sm{width:28px;height:28px;font-size:10px}
.avatar.lg{width:54px;height:54px;font-size:18px}
.user-chip-name{font-size:13px;font-weight:600;color:${T.text};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:135px}
.user-chip-role{font-size:11px;color:${T.muted}}
.main{flex:1;display:flex;flex-direction:column;overflow:hidden;min-width:0}
.topbar{padding:13px 28px;border-bottom:1px solid ${T.border};display:flex;align-items:center;justify-content:space-between;background:${T.surface};gap:12px}
.topbar-title{font-family:'Syne',sans-serif;font-size:clamp(15px,2vw,19px);font-weight:700;color:${T.white};white-space:nowrap}
.topbar-right{display:flex;align-items:center;gap:12px;flex-shrink:0}
.content{flex:1;overflow-y:auto;padding:clamp(14px,3vw,28px)}

.grid2{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px}
.grid3{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px}
.grid4{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px}

.card{background:${T.card};border:1px solid ${T.border};border-radius:14px;padding:clamp(14px,2vw,22px)}
.card-title{font-family:'Syne',sans-serif;font-size:12px;font-weight:700;color:${T.muted};text-transform:uppercase;letter-spacing:.7px;margin-bottom:14px;display:flex;align-items:center;justify-content:space-between}
.stat-card{background:${T.card};border:1px solid ${T.border};border-radius:14px;padding:clamp(14px,2vw,20px);position:relative;overflow:hidden;transition:border-color .2s,transform .15s}.stat-card:hover{border-color:var(--ac,${T.accent});transform:translateY(-2px)}
.stat-card::after{content:'';position:absolute;top:-20px;right:-20px;width:80px;height:80px;border-radius:50%;background:var(--ac,${T.accent});opacity:.08}
.stat-label{font-size:11px;color:${T.muted};text-transform:uppercase;letter-spacing:.7px;margin-bottom:6px}
.stat-value{font-family:'Syne',sans-serif;font-size:clamp(22px,3vw,30px);font-weight:800;color:${T.white};line-height:1}
.stat-sub{font-size:11px;color:${T.green};margin-top:4px}

.btn{display:inline-flex;align-items:center;gap:6px;padding:9px 18px;border-radius:8px;font-size:13px;font-weight:600;border:none;transition:all .15s;white-space:nowrap}
.btn-primary{background:linear-gradient(135deg,${T.accent},#1e6aaa);color:#fff;box-shadow:0 2px 10px ${T.accent}40}
.btn-primary:hover{box-shadow:0 4px 16px ${T.accent}60}
.btn-gold{background:linear-gradient(135deg,${T.gold},${T.goldD});color:#0a0e1a;font-weight:700}
.btn-zoom{background:linear-gradient(135deg,#2D8CFF,#1a5fd4);color:#fff;box-shadow:0 2px 10px #2D8CFF40}
.btn-zoom:hover{box-shadow:0 4px 16px #2D8CFF60}
.btn-outline{background:transparent;color:${T.accentL};border:1px solid ${T.border}}.btn-outline:hover{background:${T.card};border-color:${T.accentL}}
.btn-sm{padding:5px 12px;font-size:11.5px;border-radius:6px}
.btn-danger{background:#7f1d1d;color:${T.red}}
.btn-success{background:#064e3b;color:${T.green}}
.btn-full{width:100%;justify-content:center;padding:12px}
.btn:disabled{opacity:.45;cursor:not-allowed}

.zoom-card{background:linear-gradient(135deg,#071020,#0c1e3a);border:1px solid #2D8CFF35;border-radius:14px;padding:18px;position:relative;overflow:hidden}
.zoom-card::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse at top right,#2D8CFF12,transparent 60%)}
.zoom-badge{display:inline-flex;align-items:center;gap:5px;background:#2D8CFF18;border:1px solid #2D8CFF45;border-radius:20px;padding:3px 10px;font-size:11px;font-weight:600;color:#4fa8ff;margin-bottom:10px}

.badge{display:inline-block;padding:3px 10px;border-radius:20px;font-size:10.5px;font-weight:600}
.badge-blue{background:#0d2540;color:${T.accentL}}
.badge-green{background:#064e3b;color:${T.green}}
.badge-red{background:#7f1d1d;color:${T.red}}
.badge-gold{background:#3a2000;color:${T.gold}}
.badge-gray{background:#1e293b;color:${T.muted}}
.badge-purple{background:#3b0764;color:#c084fc}
.badge-zoom{background:#0d1e40;color:#4fa8ff}

.table-wrap{overflow-x:auto;border-radius:12px;border:1px solid ${T.border}}
table{width:100%;border-collapse:collapse;min-width:500px}
thead th{background:${T.surface};padding:11px 15px;text-align:left;font-size:10.5px;font-weight:700;color:${T.muted};text-transform:uppercase;letter-spacing:.7px;white-space:nowrap}
tbody tr{border-top:1px solid ${T.border};transition:background .1s}
tbody tr:hover{background:#ffffff05}
tbody td{padding:12px 15px;font-size:13px;color:${T.text};vertical-align:middle}

.progress-bar{height:6px;background:${T.border};border-radius:10px;overflow:hidden}
.progress-fill{height:100%;border-radius:10px;background:linear-gradient(90deg,${T.accent},${T.gold});transition:width .5s}

.input-field{width:100%;background:${T.surface};border:1px solid ${T.border};border-radius:9px;padding:10px 14px;color:${T.text};font-size:13.5px;outline:none;transition:border-color .15s;margin-bottom:12px}
.input-field:focus{border-color:${T.accent};box-shadow:0 0 0 3px ${T.accent}18}
textarea.input-field{resize:vertical;min-height:80px}
.input-label{font-size:11px;font-weight:600;color:${T.muted};text-transform:uppercase;letter-spacing:.5px;margin-bottom:5px}
.form-error{color:${T.red};font-size:12.5px;margin-bottom:10px;padding:9px 12px;background:#7f1d1d30;border-radius:8px}
.form-success{color:${T.green};font-size:12.5px;margin-bottom:10px;padding:9px 12px;background:#064e3b30;border-radius:8px}

.cal-grid7{display:grid;grid-template-columns:repeat(7,1fr);gap:3px}
.cal-day-hdr{text-align:center;font-size:10px;color:${T.muted};font-weight:700;padding:4px 0 8px;text-transform:uppercase}
.cal-cell{min-height:clamp(55px,8vw,72px);background:${T.surface};border:1px solid ${T.border};border-radius:8px;padding:5px 6px;cursor:pointer;transition:all .15s}
.cal-cell:hover{border-color:${T.accent}60;background:${T.card}}
.cal-cell.today{border-color:${T.gold};background:#1e1000}
.cal-cell.selected{border-color:${T.accentL};background:#0d2040}
.cal-cell.empty{background:transparent;border-color:transparent;pointer-events:none}
.cal-event-pill{font-size:9px;padding:2px 5px;border-radius:4px;margin-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#fff;font-weight:600}

.chat-wrap{display:flex;flex-direction:column;height:clamp(320px,45vh,440px)}
.chat-messages{flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:10px;padding:4px 0}
.msg{display:flex;gap:8px;align-items:flex-end}
.msg.me{flex-direction:row-reverse}
.msg-bubble{max-width:72%;padding:9px 13px;border-radius:14px;font-size:13.5px;line-height:1.5}
.msg.them .msg-bubble{background:${T.surface};color:${T.text};border-bottom-left-radius:3px}
.msg.me .msg-bubble{background:linear-gradient(135deg,${T.accent},#1e6aaa);color:#fff;border-bottom-right-radius:3px}
.chat-input-row{display:flex;gap:8px;padding-top:10px;border-top:1px solid ${T.border};margin-top:auto}
.chat-input{flex:1;background:${T.surface};border:1px solid ${T.border};border-radius:9px;padding:9px 13px;color:${T.text};font-size:13.5px;outline:none}
.chat-input:focus{border-color:${T.accent}}

.slip-preview{background:#fff;color:#0a0e1a;border-radius:10px;padding:22px;font-size:13px}
.slip-preview h2{font-family:'Syne',sans-serif;font-size:19px;color:#0d2449;margin-bottom:10px}
.slip-line{display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #e2e8f0}

.toggle{width:44px;height:24px;border-radius:12px;display:flex;align-items:center;padding:0 2px;cursor:pointer;transition:background .2s}
.toggle-knob{width:20px;height:20px;border-radius:50%;background:#fff;transition:transform .2s;box-shadow:0 1px 4px #0006}

.auth-wrap{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px;background:${T.bg};background-image:radial-gradient(ellipse at 10% 70%,rgba(20,128,174,.20) 0%,transparent 55%),radial-gradient(ellipse at 90% 15%,rgba(240,160,60,.14) 0%,transparent 50%)}
.auth-box{background:${T.surface};border:1px solid ${T.border};border-radius:20px;padding:clamp(28px,5vw,44px);width:min(440px,100%);animation:fadeUp .4s ease}
@keyframes fadeUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
.auth-logo{font-family:'Syne',sans-serif;font-size:28px;font-weight:800;text-align:center;margin-bottom:4px}
.auth-sub{text-align:center;color:${T.muted};font-size:13.5px;margin-bottom:26px}
.role-tabs{display:flex;background:${T.card};border-radius:10px;padding:3px;gap:3px;margin-bottom:18px}
.role-tab{flex:1;padding:8px 4px;text-align:center;font-size:12px;font-weight:600;border-radius:7px;cursor:pointer;transition:all .15s;color:${T.muted};border:none;background:transparent}
.role-tab.active{background:linear-gradient(135deg,${T.accent},#1e6aaa);color:#fff}
.auth-mode-row{display:flex;gap:6px;margin-bottom:18px}
.auth-mode-btn{flex:1;padding:9px;border-radius:8px;border:1px solid ${T.border};background:transparent;color:${T.muted};font-weight:600;font-size:12.5px;cursor:pointer;transition:all .15s}
.auth-mode-btn.active{border-color:${T.gold};background:#1e1000;color:${T.gold}}

.otp-row{display:flex;gap:10px;justify-content:center;margin-bottom:16px;flex-wrap:wrap}
.otp-input{width:52px;height:58px;text-align:center;font-size:24px;font-weight:700;background:${T.surface};border:2px solid ${T.border};border-radius:10px;color:${T.white};outline:none;transition:border-color .15s}
.otp-input:focus{border-color:${T.accent};box-shadow:0 0 0 3px ${T.accent}20}

.spinner{width:18px;height:18px;border:2px solid ${T.border};border-top-color:${T.accent};border-radius:50%;animation:spin .7s linear infinite;display:inline-block}
@keyframes spin{to{transform:rotate(360deg)}}
.loading-screen{display:flex;align-items:center;justify-content:center;height:100vh;flex-direction:column;gap:14px;background:${T.bg}}
.rt-dot{width:7px;height:7px;border-radius:50%;background:${T.green};display:inline-block;animation:pulse 2s infinite}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
.divider{border:none;border-top:1px solid ${T.border};margin:14px 0}
.page-title{font-family:'Syne',sans-serif;font-size:clamp(20px,3vw,26px);font-weight:800;color:${T.white};margin-bottom:4px}
.page-sub{font-size:13.5px;color:${T.muted};margin-bottom:20px}
.empty-state{text-align:center;padding:40px 20px;color:${T.muted};font-size:13.5px}
.resource-row{display:flex;align-items:center;gap:12px;padding:11px 0;border-bottom:1px solid ${T.border}}
.resource-row:last-child{border-bottom:none}

@media(max-width:900px){
  .sidebar{width:200px;min-width:200px}
  .grid4{grid-template-columns:repeat(auto-fit,minmax(150px,1fr))}
}
@media(max-width:700px){
  .lms-root{flex-direction:column}
  .sidebar{width:100%;min-width:unset;height:auto;flex-direction:row;overflow-x:auto;overflow-y:hidden;border-right:none;border-bottom:1px solid ${T.border}}
  .sidebar-logo,.sidebar-bottom{display:none}
  .nav-item{flex-direction:column;gap:3px;padding:8px 10px;font-size:10px;border-radius:8px;min-width:54px;text-align:center}
  .nav-item .icon{font-size:18px;min-width:unset}
  .nav-item.active{border-left:none;border-bottom:2px solid ${T.gold};padding-left:10px}
  .main{height:0;flex:1}
  .topbar{padding:10px 14px}
  .content{padding:12px}
  .grid2,.grid3,.grid4{grid-template-columns:1fr}
  .auth-box{padding:24px 18px}
}
`;

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const Avatar = ({ name = "?" }) => {
  const i = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  return <div className="avatar">{i}</div>;
};
const AvatarSm = ({ name = "?" }) => {
  const i = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  return <div className="avatar sm">{i}</div>;
};
const AvatarLg = ({ name = "?" }) => {
  const i = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  return <div className="avatar lg">{i}</div>;
};
const Badge = ({ color, children }) => <span className={`badge badge-${color}`}>{children}</span>;
const Spinner = () => <div className="spinner" />;

function StatCard({ label, value, sub, icon, ac = T.accent }) {
  return (
    <div className="stat-card" style={{ "--ac": ac }}>
      <span style={{ fontSize: 20 }}>{icon}</span>
      <div className="stat-label" style={{ marginTop: 8 }}>{label}</div>
      <div className="stat-value">{value ?? <Spinner />}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

// ─── REALTIME HOOK ────────────────────────────────────────────────────────────
function useTable(table, queryFn, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data: rows } = await queryFn();
    setData(rows);
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => { fetch(); }, [fetch]);

  useEffect(() => {
    const ch = supabase.channel(`rt-${table}-${Math.random()}`)
      .on("postgres_changes", { event: "*", schema: "public", table }, fetch)
      .subscribe();
    return () => supabase.removeChannel(ch);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, fetch]);

  return { data, loading, refetch: fetch };
}

// ─── CALENDAR ────────────────────────────────────────────────────────────────
function BigCalendar({ userRole }) {
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear]   = useState(new Date().getFullYear());
  const [sel, setSel]     = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newEv, setNewEv] = useState({ title: "", event_type: "class", time: "" });

  const MONTHS = ["","January","February","March","April","May","June","July","August","September","October","November","December"];
  const DAYS   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  const typeColors = { class:"#3b82f6", demo:"#f59e0b", meeting:"#8b5cf6", payment:"#ef4444", exam:"#10b981" };

  const { data: events, refetch } = useTable("events",
    () => {
      let q = supabase.from("events").select("*").eq("month", month).eq("year", year);
      if (userRole === "student") q = q.in("event_type", ["class","exam","payment"]);
      if (userRole === "teacher") q = q.in("event_type", ["class","exam","meeting"]);
      if (userRole === "sales")   q = q.in("event_type", ["demo","meeting","payment"]);
      return q.order("day");
    },
    [month, year, userRole]
  );

  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDay    = new Date(year, month - 1, 1).getDay();
  const todayDay    = new Date().getDate();
  const isNow       = new Date().getMonth() + 1 === month && new Date().getFullYear() === year;

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const evForDay   = d => (events || []).filter(e => e.day === d);
  const selEvents  = sel ? evForDay(sel) : [];

  const visTypes = userRole === "student" ? ["class","exam","payment"]
    : userRole === "teacher" ? ["class","exam","meeting"]
    : userRole === "sales"   ? ["demo","meeting","payment"]
    : ["class","demo","meeting","exam","payment"];

  const addEvent = async () => {
    if (!newEv.title || !sel) return;
    await supabase.from("events").insert({ ...newEv, day: sel, month, year });
    setShowAdd(false);
    setNewEv({ title: "", event_type: "class", time: "" });
    refetch();
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14, flexWrap:"wrap", gap:10 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <button className="cal-nav-btn" style={{ background:T.card, border:`1px solid ${T.border}`, color:T.text, padding:"5px 12px", borderRadius:7, fontSize:13, cursor:"pointer" }}
            onClick={() => { if(month===1){setMonth(12);setYear(y=>y-1)}else setMonth(m=>m-1); }}>‹</button>
          <span style={{ fontFamily:"Syne", fontSize:18, fontWeight:700, color:T.white }}>{MONTHS[month]} {year}</span>
          <button className="cal-nav-btn" style={{ background:T.card, border:`1px solid ${T.border}`, color:T.text, padding:"5px 12px", borderRadius:7, fontSize:13, cursor:"pointer" }}
            onClick={() => { if(month===12){setMonth(1);setYear(y=>y+1)}else setMonth(m=>m+1); }}>›</button>
          <div className="rt-dot" title="Live" />
        </div>
        <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
          {visTypes.map(t => (
            <div key={t} style={{ display:"flex", alignItems:"center", gap:5, fontSize:11.5, color:T.muted }}>
              <div style={{ width:9, height:9, borderRadius:2, background:typeColors[t] }} />
              <span style={{ textTransform:"capitalize" }}>{t}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 270px", gap:16 }}>
        {/* Grid */}
        <div>
          <div className="cal-grid7">
            {DAYS.map(d => <div key={d} className="cal-day-hdr">{d}</div>)}
            {cells.map((d, i) => {
              const evs = d ? evForDay(d) : [];
              return (
                <div key={i}
                  className={`cal-cell ${!d?"empty":""} ${d===todayDay&&isNow?"today":""} ${d===sel?"selected":""}`}
                  onClick={() => d && setSel(d === sel ? null : d)}>
                  {d && (
                    <>
                      <div style={{ fontSize:12, fontWeight:600, marginBottom:2, color:d===todayDay&&isNow?T.accentL:T.muted }}>{d}</div>
                      {evs.slice(0,2).map(e => (
                        <div key={e.id} className="cal-event-pill" style={{ background:typeColors[e.event_type]||"#3b82f6" }}>{e.title}</div>
                      ))}
                      {evs.length > 2 && <div style={{ fontSize:9, color:T.muted }}>+{evs.length-2}</div>}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Side panel */}
        <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:13, padding:18 }}>
          <div style={{ fontFamily:"Syne", fontSize:12.5, fontWeight:700, color:T.muted, textTransform:"uppercase", letterSpacing:".7px", marginBottom:12, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <span>{sel ? `${MONTHS[month]} ${sel}` : "Select a date"}</span>
            {sel && (userRole==="teacher"||userRole==="admin") && (
              <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}>+ Add</button>
            )}
          </div>

          {showAdd && (
            <div style={{ marginBottom:12, padding:12, background:T.surface, borderRadius:9 }}>
              <div className="input-label">Event Title</div>
              <input className="input-field" placeholder="e.g. Python Session 5" value={newEv.title} onChange={e=>setNewEv(p=>({...p,title:e.target.value}))}/>
              <div className="input-label">Type</div>
              <select className="input-field" value={newEv.event_type} onChange={e=>setNewEv(p=>({...p,event_type:e.target.value}))}>
                {["class","exam","meeting","demo","payment"].map(t=><option key={t}>{t}</option>)}
              </select>
              <div className="input-label">Time</div>
              <input className="input-field" type="time" value={newEv.time} onChange={e=>setNewEv(p=>({...p,time:e.target.value}))}/>
              <div style={{ display:"flex", gap:8 }}>
                <button className="btn btn-primary btn-sm" onClick={addEvent}>Save</button>
                <button className="btn btn-outline btn-sm" onClick={()=>setShowAdd(false)}>Cancel</button>
              </div>
            </div>
          )}

          {!sel && <div style={{ color:T.muted, fontSize:12.5, textAlign:"center", marginTop:24 }}>Click any date to view events</div>}
          {sel && selEvents.length === 0 && <div style={{ color:T.muted, fontSize:12.5, textAlign:"center", marginTop:24 }}>No events — {userRole==="teacher"||userRole==="admin"?"click + Add above":""}</div>}
          {selEvents.map(e => (
            <div key={e.id} style={{ display:"flex", gap:10, padding:"9px 0", borderBottom:`1px solid ${T.border}` }}>
              <div style={{ width:10, height:10, borderRadius:3, background:typeColors[e.event_type]||"#3b82f6", marginTop:4, flexShrink:0 }}/>
              <div>
                <div style={{ fontSize:13, fontWeight:600, color:T.text }}>{e.title}</div>
                <div style={{ fontSize:11, color:T.muted, marginTop:2 }}>{e.time}{e.teacher_name&&` · ${e.teacher_name}`}{e.batch&&` · ${e.batch}`}</div>
                <Badge color={e.event_type==="class"?"blue":e.event_type==="demo"?"gold":e.event_type==="meeting"?"purple":e.event_type==="payment"?"red":"green"}>{e.event_type}</Badge>
              </div>
            </div>
          ))}

          {events && events.length > 0 && (
            <>
              <div className="divider"/>
              <div style={{ fontSize:11, color:T.muted, fontWeight:600, textTransform:"uppercase", letterSpacing:".6px", marginBottom:8 }}>Month Total</div>
              {visTypes.map(t => {
                const c = (events||[]).filter(e=>e.event_type===t).length;
                return c > 0 ? (
                  <div key={t} style={{ display:"flex", justifyContent:"space-between", padding:"4px 0", fontSize:12 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                      <div style={{ width:7, height:7, borderRadius:2, background:typeColors[t] }}/>
                      <span style={{ color:T.muted, textTransform:"capitalize" }}>{t}s</span>
                    </div>
                    <span style={{ fontWeight:600 }}>{c}</span>
                  </div>
                ) : null;
              })}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── AUTH ─────────────────────────────────────────────────────────────────────
function AuthScreen({ onAuth }) {
  const [mode,     setMode]     = useState("login");   // login | signup | otp
  const [role,     setRole]     = useState("student");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [name,     setName]     = useState("");
  const [otp,      setOtp]      = useState(["","","","","",""]);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [msg,      setMsg]      = useState("");
  const otpRefs = Array.from({length:6}, () => null).map(() => ({ current: null }));

  // ── Email + Password Login ──
  const handleLogin = async () => {
    if (!email || !password) { setError("Please enter email and password."); return; }
    setLoading(true); setError("");
    const { data, error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) { setError(err.message); setLoading(false); return; }
    const { data: profile } = await supabase.from("profiles").select("*").eq("id", data.user.id).single();
    onAuth({ ...data.user, ...profile });
    setLoading(false);
  };

  // ── Sign Up ──
  const handleSignup = async () => {
    if (!email || !password || !name) { setError("Please fill all fields."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    setLoading(true); setError("");
    const { data, error: err } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: name, role }, emailRedirectTo: window.location.origin }
    });
    if (err) { setError(err.message); setLoading(false); return; }
    // Insert profile immediately
    if (data.user) {
      await supabase.from("profiles").upsert({ id: data.user.id, full_name: name, role, email });
    }
    setMsg("✅ Account created! Check your email to confirm, then sign in.");
    setMode("login"); setLoading(false);
  };

  // ── OTP / Magic Link ──
  const sendOTP = async () => {
    if (!email) { setError("Enter your email first."); return; }
    setLoading(true); setError("");
    const { error: err } = await supabase.auth.signInWithOtp({ email,
      options: { emailRedirectTo: window.location.origin }
    });
    if (err) { setError(err.message); setLoading(false); return; }
    setMsg(`✅ OTP sent to ${email}! Check your inbox.`);
    setMode("otp"); setLoading(false);
  };

  // ── Forgot Password ──
  const handleForgot = async () => {
    if (!email) { setError("Enter your email address first."); return; }
    setLoading(true); setError("");
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "?reset=true"
    });
    if (err) { setError(err.message); setLoading(false); return; }
    setMsg(`✅ Password reset link sent to ${email}! Check your inbox.`);
    setMode("login"); setLoading(false);
  };

  const verifyOTP = async () => {
    const token = otp.join("");
    if (token.length < 6) { setError("Enter the full 6-digit OTP."); return; }
    setLoading(true); setError("");
    const { data, error: err } = await supabase.auth.verifyOtp({ email, token, type: "email" });
    if (err) { setError(err.message); setLoading(false); return; }
    // Upsert profile with chosen role
    await supabase.from("profiles").upsert({ id: data.user.id, full_name: name || email.split("@")[0], role, email });
    const { data: profile } = await supabase.from("profiles").select("*").eq("id", data.user.id).single();
    onAuth({ ...data.user, ...profile });
    setLoading(false);
  };

  const handleOtpKey = (i, e) => {
    const val = e.target.value.replace(/\D/,"");
    if (!val && e.key === "Backspace" && i > 0) { otpRefs[i-1].current?.focus(); return; }
    if (!val) return;
    const next = [...otp]; next[i] = val;
    setOtp(next);
    if (i < 5) otpRefs[i+1].current?.focus();
  };

  if (mode === "otp") return (
    <div className="auth-wrap">
      <div className="auth-box">
        <div style={{textAlign:"center",marginBottom:8}}><img src={`data:image/png;base64,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`} alt="Uniedd" style={{height:70,objectFit:"contain"}}/></div>
        <div className="auth-sub">Enter the 6-digit code sent to<br/><strong style={{color:T.text}}>{email}</strong></div>
        {error && <div className="form-error">{error}</div>}
        <div className="otp-row">
          {otp.map((v,i) => (
            <input key={i} ref={otpRefs[i]} className="otp-input" maxLength={1} value={v}
              onChange={e => { const n=[...otp];n[i]=e.target.value.replace(/\D/,"");setOtp(n);if(e.target.value&&i<5)otpRefs[i+1].current?.focus(); }}
              onKeyDown={e=>handleOtpKey(i,e)}/>
          ))}
        </div>
        <button className="btn btn-primary btn-full" disabled={loading} onClick={verifyOTP}>
          {loading ? <Spinner/> : "Verify & Sign In"}
        </button>
        <div style={{textAlign:"center",marginTop:14}}>
          <button style={{background:"none",border:"none",color:T.accentL,fontSize:12.5,cursor:"pointer"}} onClick={()=>{setMode("login");setOtp(["","","","","",""]);setError("");}}>← Back to login</button>
        </div>
        <div style={{marginTop:14,padding:"10px 13px",background:T.card,borderRadius:9,fontSize:11.5,color:T.muted,textAlign:"center"}}>
          Didn't get the email? Check spam, or <button style={{background:"none",border:"none",color:T.accentL,cursor:"pointer",fontSize:11.5}} onClick={sendOTP}>resend OTP</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="auth-wrap">
      <div className="auth-box">
        <div style={{textAlign:"center",marginBottom:8}}><img src={`data:image/png;base64,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`} alt="Uniedd" style={{height:70,objectFit:"contain"}}/></div>
        <div className="auth-sub">Learning Management System</div>

        {mode!=="forgot"&&mode!=="otp"&&<div className="role-tabs">
          {["student","teacher","sales","admin"].map(r => (
            <button key={r} className={`role-tab ${role===r?"active":""}`} onClick={()=>{setRole(r);setError("");}}>
              {r.charAt(0).toUpperCase()+r.slice(1)}
            </button>
          ))}
        </div>}

        {mode!=="forgot"&&mode!=="otp"&&<div className="auth-mode-row">
          {["login","signup"].map(m => (
            <button key={m} className={`auth-mode-btn ${mode===m?"active":""}`} onClick={()=>{setMode(m);setError("");setMsg("");}}>
              {m==="login"?"Sign In":"Create Account"}
            </button>
          ))}
        </div>}


        {msg  && <div className="form-success">{msg}</div>}
        {error && <div className="form-error">{error}</div>}

        {mode==="signup" && (
          <>
            <div className="input-label">Full Name</div>
            <input className="input-field" placeholder="Your full name" value={name} onChange={e=>setName(e.target.value)}/>
          </>
        )}

        <div className="input-label">Email</div>
        <input className="input-field" placeholder="you@email.com" value={email} onChange={e=>setEmail(e.target.value)}/>

        <div className="input-label">Password</div>
        <input className="input-field" type="password" placeholder={mode==="signup"?"Min. 6 characters":"Your password"}
          value={password} onChange={e=>{setPassword(e.target.value);setError("");}}
          onKeyDown={e=>e.key==="Enter"&&(mode==="login"?handleLogin():handleSignup())}/>

        <button className="btn btn-primary btn-full" disabled={loading}
          onClick={mode==="login"?handleLogin:handleSignup} style={{marginBottom:10}}>
          {loading ? <Spinner/> : mode==="login" ? `Sign In as ${role.charAt(0).toUpperCase()+role.slice(1)}` : "Create Account"}
        </button>
        {mode==="login"&&(
          <div style={{textAlign:"center",marginBottom:8}}>
            <button onClick={()=>setMode("forgot")} style={{background:"none",border:"none",color:T.accentL,fontSize:12.5,cursor:"pointer",textDecoration:"underline"}}>
              Forgot password?
            </button>
          </div>
        )}

        <div style={{display:"flex",alignItems:"center",gap:10,margin:"4px 0 10px"}}>
          <div style={{flex:1,height:1,background:T.border}}/>
          <span style={{fontSize:11.5,color:T.muted}}>or</span>
          <div style={{flex:1,height:1,background:T.border}}/>
        </div>

        <button className="btn btn-outline btn-full" disabled={loading} onClick={sendOTP}>
          {loading ? <Spinner/> : "📧 Sign in with Email OTP"}
        </button>

        <div style={{marginTop:16,padding:"12px",background:T.card,borderRadius:9,fontSize:11.5,color:T.muted}}>
          <strong style={{color:T.text}}>Note:</strong> OTP is sent to your real email via Supabase.
          First user should register as <strong style={{color:T.accentL}}>Admin</strong>.
        </div>
      </div>
    </div>
  );
}

// ─── STUDENT PORTAL ──────────────────────────────────────────────────────────
function StudentPortal({ user, onLogout }) {
  const [tab, setTab] = useState("dashboard");
  const [chatMsg, setChatMsg] = useState("");

  const { data: classes }  = useTable("classes",  () => supabase.from("classes").select("*").order("class_date"), ["classes"]);
  const { data: resources} = useTable("resources", () => supabase.from("resources").select("*").order("created_at",{ascending:false}), ["resources"]);
  const { data: payments } = useTable("payments",  () => supabase.from("payments").select("*").eq("student_id",user.id).order("due_date"), ["payments"]);
  const { data: messages, refetch: refetchChat } = useTable("chat_messages",
    () => supabase.from("chat_messages").select("*,sender:profiles(full_name)").eq("room","support").order("created_at"), ["chat_messages"]);
  const { data: enrollment } = useTable("enrollments",
    () => supabase.from("enrollments").select("*,course:courses(*)").eq("student_id",user.id).maybeSingle(), ["enrollments"]);

  const sendChat = async () => {
    if (!chatMsg.trim()) return;
    await supabase.from("chat_messages").insert({ content: chatMsg, sender_id: user.id, room:"support" });
    setChatMsg(""); refetchChat();
  };

  const upcoming = (classes||[]).filter(c => new Date(c.class_date) >= new Date());
  const totalPaid = (payments||[]).filter(p=>p.status==="paid").reduce((s,p)=>s+Number(p.amount),0);
  const totalDue  = (payments||[]).filter(p=>p.status==="pending").reduce((s,p)=>s+Number(p.amount),0);

  const nav = [
    {id:"dashboard",icon:"⊞",label:"Dashboard"},
    {id:"calendar", icon:"📅",label:"Calendar"},
    {id:"classes",  icon:"🎓",label:"My Classes"},
    {id:"courses",  icon:"📚",label:"My Course"},
    {id:"resources",icon:"📂",label:"Resources"},
    {id:"payments", icon:"💳",label:"Payments"},
    {id:"profile",  icon:"👤",label:"Profile"},
    {id:"chat",     icon:"💬",label:"Support Chat"},
  ];

  return (
    <div className="lms-root">
      <aside className="sidebar">
        <div className="sidebar-logo"><div style={{marginBottom:4}}><img src={`data:image/png;base64,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`} alt="Uniedd" style={{height:36,objectFit:"contain"}}/></div><div className="sidebar-role">Student Portal</div></div>
        <div style={{padding:"6px 0"}}>
          {nav.map(n=><div key={n.id} className={`nav-item ${tab===n.id?"active":""}`} onClick={()=>setTab(n.id)}><span className="icon">{n.icon}</span><span>{n.label}</span></div>)}
        </div>
        <div className="sidebar-bottom">
          <div className="user-chip" onClick={onLogout}>
            <Avatar name={user.full_name||user.email}/>
            <div><div className="user-chip-name">{user.full_name||user.email}</div><div className="user-chip-role">Sign out</div></div>
          </div>
        </div>
      </aside>

      <div className="main">
        <div className="topbar">
          <div className="topbar-title">{nav.find(n=>n.id===tab)?.label}</div>
          <div className="topbar-right"><div className="rt-dot"/><span style={{fontSize:12,color:T.muted}}>Live</span><AvatarSm name={user.full_name||user.email}/></div>
        </div>
        <div className="content">

          {tab==="dashboard"&&(
            <div>
              <div className="page-title">Good day, {(user.full_name||"Student").split(" ")[0]}!</div>
              <div className="page-sub">Your learning overview — real-time from database.</div>
              <div className="grid4" style={{marginBottom:20}}>
                <div onClick={()=>setTab("classes")} style={{cursor:"pointer"}}><StatCard label="Upcoming Classes" value={upcoming.length} icon="📅"/></div>
                <div onClick={()=>setTab("resources")} style={{cursor:"pointer"}}><StatCard label="Resources" value={resources?.length??"-"} icon="📂" ac={T.green}/></div>
                <div onClick={()=>setTab("payments")} style={{cursor:"pointer"}}><StatCard label="Paid" value={`₹${totalPaid}`} icon="✅" ac={T.green}/></div>
                <div onClick={()=>setTab("payments")} style={{cursor:"pointer"}}><StatCard label="Due" value={`₹${totalDue}`} icon="⚠️" ac={T.red}/></div>
              </div>
              <div className="grid2">
                <div className="card">
                  <div className="card-title">Upcoming Classes <div className="rt-dot"/></div>
                  {upcoming.length===0&&<div className="empty-state">No upcoming classes yet</div>}
                  {upcoming.slice(0,4).map(c=>(
                    <div key={c.id} style={{padding:"10px 0",borderBottom:`1px solid ${T.border}`}}>
                      <div style={{display:"flex",alignItems:"center",gap:8}}><div style={{fontSize:13,fontWeight:600,color:T.text}}>{c.title}</div>{c.meet_link&&<span className="zoom-badge" style={{fontSize:10,padding:"2px 7px",marginBottom:0}}>📹 Zoom</span>}</div>
                      <div style={{fontSize:11.5,color:T.muted,marginTop:3}}>{new Date(c.class_date).toLocaleDateString()} · {c.start_time} · {c.batch||""}</div>
                      {c.meet_link&&<a href={c.meet_link} target="_blank" rel="noreferrer" className="btn btn-zoom btn-sm" style={{textDecoration:"none",marginTop:6,display:"inline-flex"}}>📹 Join Zoom</a>}
                    </div>
                  ))}
                </div>
                <div className="card">
                  <div className="card-title">Recent Resources <div className="rt-dot"/></div>
                  {(resources||[]).slice(0,3).map(r=>(
                    <div key={r.id} className="resource-row">
                      <div style={{width:32,height:32,borderRadius:7,background:r.resource_type==="pdf"?"#1e3a5f":"#064e3b",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15}}>
                        {r.resource_type==="pdf"?"📄":"▶️"}
                      </div>
                      <div style={{flex:1}}>
                        <div style={{fontSize:12.5,fontWeight:600,color:T.text}}>{r.title}</div>
                        <div style={{fontSize:11,color:T.muted}}>{r.resource_type?.toUpperCase()}</div>
                      </div>
                      {r.file_url&&<a href={r.file_url} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm" style={{textDecoration:"none"}}>↓</a>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab==="calendar"&&<div><div className="page-title">My Calendar</div><div className="page-sub">Classes, exams and payment deadlines — live.</div><div className="card"><BigCalendar userRole="student"/></div></div>}

          {tab==="classes"&&(
            <div>
              <div className="page-title">My Classes</div><div className="page-sub">All sessions from the database.</div>
              {(classes||[]).length===0&&<div className="empty-state">No classes scheduled yet</div>}
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                {(classes||[]).map(c=>{
                  const isPast = new Date(c.class_date)<new Date();
                  return (
                    <div key={c.id} className={`${isPast?"card":"zoom-card"}`} style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12}}>
                      <div>
                        <div style={{fontSize:14,fontWeight:600,color:T.white}}>{c.title}</div>
                        <div style={{fontSize:11.5,color:T.muted,marginTop:3,display:"flex",gap:12}}>
                          <span>📅 {new Date(c.class_date).toLocaleDateString()}</span>
                          <span>⏰ {c.start_time}</span>
                          {c.teacher_name&&<span>👨‍🏫 {c.teacher_name}</span>}
                        </div>
                      </div>
                      <div style={{display:"flex",gap:8,alignItems:"center"}}>
                        <Badge color={isPast?"gray":"blue"}>{isPast?"Done":"Upcoming"}</Badge>
                        {!isPast&&c.meet_link&&<a href={c.meet_link} target="_blank" rel="noreferrer" className="btn btn-zoom btn-sm" style={{textDecoration:"none"}}>📹 Join Zoom</a>}
                        {isPast&&c.recording_url&&<a href={c.recording_url} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm" style={{textDecoration:"none"}}>Recording</a>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {tab==="courses"&&(
            <div>
              <div className="page-title">My Course</div><div className="page-sub">Your enrolled course details.</div>
              {!enrollment&&<div className="empty-state">No course enrollment found. Contact your admin.</div>}
              {enrollment?.course&&(
                <div className="card">
                  <div style={{fontFamily:"Syne",fontSize:20,fontWeight:800,color:T.white,marginBottom:4}}>{enrollment.course.title}</div>
                  <div style={{fontSize:12.5,color:T.muted,marginBottom:14}}>Batch {enrollment.batch||"—"} · Fee ₹{enrollment.course.fee||"—"}</div>
                  <div className="progress-bar" style={{height:7,marginBottom:6}}><div className="progress-fill" style={{width:`${enrollment.progress||0}%`}}/></div>
                  <div style={{fontSize:11.5,color:T.muted}}>{enrollment.progress||0}% completed</div>
                </div>
              )}
            </div>
          )}

          {tab==="resources"&&(
            <div>
              <div className="page-title">Study Resources</div><div className="page-sub">Materials uploaded by your teacher.</div>
              <div className="card">
                {(resources||[]).length===0&&<div className="empty-state">No resources yet</div>}
                {(resources||[]).map(r=>(
                  <div key={r.id} className="resource-row">
                    <div style={{width:36,height:36,borderRadius:7,background:r.resource_type==="pdf"?"#1e3a5f":"#064e3b",display:"flex",alignItems:"center",justifyContent:"center",fontSize:17}}>
                      {r.resource_type==="pdf"?"📄":"▶️"}
                    </div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:13,fontWeight:600,color:T.text}}>{r.title}</div>
                      <div style={{fontSize:11,color:T.muted}}>{r.resource_type?.toUpperCase()} · {new Date(r.created_at).toLocaleDateString()}</div>
                    </div>
                    {r.file_url&&<a href={r.file_url} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm" style={{textDecoration:"none"}}>Download</a>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab==="payments"&&(
            <div>
              <div className="page-title">Payments</div><div className="page-sub">Your fee history — live from database.</div>
              <div className="grid3" style={{marginBottom:18}}>
                <div onClick={()=>setTab("payments")} style={{cursor:"pointer"}}><StatCard label="Paid" value={`₹${totalPaid}`} icon="✅" ac={T.green}/></div>
                <div onClick={()=>setTab("payments")} style={{cursor:"pointer"}}><StatCard label="Due" value={`₹${totalDue}`} icon="⚠️" ac={T.red}/></div>
                <StatCard label="Transactions" value={payments?.length??"-"} icon="📋"/>
              </div>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Description</th><th>Amount</th><th>Due Date</th><th>Status</th><th>Action</th></tr></thead>
                  <tbody>
                    {(payments||[]).length===0&&<tr><td colSpan={5} style={{textAlign:"center",color:T.muted,padding:20}}>No payment records</td></tr>}
                    {(payments||[]).map(p=>(
                      <tr key={p.id}>
                        <td>{p.description}</td>
                        <td style={{fontWeight:600}}>₹{p.amount}</td>
                        <td>{new Date(p.due_date).toLocaleDateString()}</td>
                        <td><Badge color={p.status==="paid"?"green":"gold"}>{p.status}</Badge></td>
                        <td>{p.status==="pending"&&p.payment_link
                          ?<a href={p.payment_link} target="_blank" rel="noreferrer" className="btn btn-primary btn-sm" style={{textDecoration:"none"}}>Pay Now</a>
                          :<button className="btn btn-outline btn-sm">Slip</button>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab==="profile"&&(
            <div>
              <div className="page-title">My Profile</div>
              <div className="card" style={{maxWidth:460}}>
                <div style={{display:"flex",gap:16,alignItems:"center",marginBottom:16}}>
                  <AvatarLg name={user.full_name||user.email}/>
                  <div>
                    <div style={{fontFamily:"Syne",fontSize:18,fontWeight:700,color:T.white}}>{user.full_name}</div>
                    <div style={{fontSize:12.5,color:T.muted}}>{user.email}</div>
                    <Badge color="blue">{(user.role||"student").charAt(0).toUpperCase()+(user.role||"student").slice(1)}</Badge>
                  </div>
                </div>
                <div className="divider"/>
                {[["Email",user.email],["Role",(user.role||"student").charAt(0).toUpperCase()+(user.role||"student").slice(1)],["Joined",new Date(user.created_at).toLocaleDateString()],["Course",enrollment?.course?.title||"—"],["Batch",enrollment?.batch||"—"]].map(([l,v])=>(
                  <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:`1px solid ${T.border}`,fontSize:12.5}}>
                    <span style={{color:T.muted}}>{l}</span><span style={{fontWeight:500}}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab==="chat"&&(
            <div>
              <div className="page-title">Support Chat</div><div className="page-sub">Real-time chat — messages saved to database.</div>
              <div className="card" style={{maxWidth:580}}>
                <div className="chat-wrap">
                  <div className="chat-messages">
                    {(messages||[]).length===0&&<div className="empty-state">No messages yet. Say hello!</div>}
                    {(messages||[]).map((m,i)=>(
                      <div key={i} className={`msg ${m.sender_id===user.id?"me":"them"}`}>
                        {m.sender_id!==user.id&&<AvatarSm name={m.sender?.full_name||"Support"}/>}
                        <div className="msg-bubble">{m.content}</div>
                      </div>
                    ))}
                  </div>
                  <div className="chat-input-row">
                    <input className="chat-input" value={chatMsg} onChange={e=>setChatMsg(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendChat()} placeholder="Type a message…"/>
                    <button className="btn btn-primary" onClick={sendChat}>Send</button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── TEACHER PORTAL ──────────────────────────────────────────────────────────
function TeacherPortal({ user, onLogout }) {
  const [tab, setTab]         = useState("dashboard");
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [nc, setNc]           = useState({title:"",class_date:"",start_time:"",duration:"1h",batch:"",meet_link:"",recording_url:""});

  const { data: classes }  = useTable("classes",  ()=>supabase.from("classes").select("*").eq("teacher_id",user.id).order("class_date"), ["classes"]);
  const { data: students } = useTable("enrollments", ()=>supabase.from("enrollments").select("*,student:profiles(*),course:courses(title)"), ["enrollments"]);
  const { data: resources, refetch: refetchRes } = useTable("resources", ()=>supabase.from("resources").select("*").order("created_at",{ascending:false}), ["resources"]);

  const addClass = async () => {
    if (!nc.title||!nc.class_date) return;
    setSaving(true);
    await supabase.from("classes").insert({ ...nc, teacher_id:user.id, teacher_name:user.full_name });
    // Also add to calendar events
    const d = new Date(nc.class_date);
    await supabase.from("events").insert({ title:nc.title, event_type:"class", day:d.getDate(), month:d.getMonth()+1, year:d.getFullYear(), time:nc.start_time, teacher_name:user.full_name, batch:nc.batch });
    setShowAdd(false); setNc({title:"",class_date:"",start_time:"",duration:"1h",batch:"",meet_link:"",recording_url:""}); setSaving(false);
  };

  const uploadResource = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const path = `resources/${Date.now()}-${file.name}`;
    await supabase.storage.from("resources").upload(path, file);
    const { data: urlData } = supabase.storage.from("resources").getPublicUrl(path);
    await supabase.from("resources").insert({ title:file.name, resource_type:file.type.includes("pdf")?"pdf":"video", file_url:urlData.publicUrl, uploaded_by:user.id });
    refetchRes();
  };

  const upcoming = (classes||[]).filter(c=>new Date(c.class_date)>=new Date());
  const nav = [
    {id:"dashboard",icon:"⊞",label:"Dashboard"},
    {id:"calendar", icon:"📅",label:"Full Calendar"},
    {id:"classes",  icon:"🎓",label:"My Classes"},
    {id:"students", icon:"👥",label:"Students"},
    {id:"resources",icon:"📂",label:"Resources"},
  ];

  return (
    <div className="lms-root">
      <aside className="sidebar">
        <div className="sidebar-logo"><div style={{marginBottom:4}}><img src={`data:image/png;base64,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`} alt="Uniedd" style={{height:36,objectFit:"contain"}}/></div><div className="sidebar-role">Teacher Portal</div></div>
        <div style={{padding:"6px 0"}}>{nav.map(n=><div key={n.id} className={`nav-item ${tab===n.id?"active":""}`} onClick={()=>setTab(n.id)}><span className="icon">{n.icon}</span><span>{n.label}</span></div>)}</div>
        <div className="sidebar-bottom">
          <div className="user-chip" onClick={onLogout}><Avatar name={user.full_name||user.email}/><div><div className="user-chip-name">{user.full_name}</div><div className="user-chip-role">Sign out</div></div></div>
        </div>
      </aside>
      <div className="main">
        <div className="topbar"><div className="topbar-title">{nav.find(n=>n.id===tab)?.label}</div><div className="topbar-right"><div className="rt-dot"/><AvatarSm name={user.full_name||user.email}/></div></div>
        <div className="content">
          {tab==="dashboard"&&(
            <div>
              <div className="page-title">Welcome, {user.full_name?.split(" ")[0]}</div>
              <div className="page-sub">Your teaching dashboard — live data.</div>
              <div className="grid4" style={{marginBottom:20}}>
                <div onClick={()=>setTab("classes")} style={{cursor:"pointer"}}><StatCard label="Total Classes" value={classes?.length??"-"} icon="🎓"/></div>
                <div onClick={()=>setTab("classes")} style={{cursor:"pointer"}}><StatCard label="Upcoming" value={upcoming.length} icon="📅" ac={T.gold}/></div>
                <div onClick={()=>setTab("students")} style={{cursor:"pointer"}}><StatCard label="Students" value={students?.length??"-"} icon="👥" ac={T.green}/></div>
                <div onClick={()=>setTab("resources")} style={{cursor:"pointer"}}><StatCard label="Resources" value={resources?.length??"-"} icon="📂" ac={T.purple}/></div>
              </div>
              <div className="grid2">
                <div className="card">
                  <div className="card-title">Upcoming Classes <div className="rt-dot"/></div>
                  {upcoming.length===0&&<div className="empty-state">No upcoming classes</div>}
                  {upcoming.slice(0,4).map(c=>(
                    <div key={c.id} style={{padding:"9px 0",borderBottom:`1px solid ${T.border}`}}>
                      <div style={{fontSize:13,fontWeight:600,color:T.text}}>{c.title}</div>
                      <div style={{fontSize:11.5,color:T.muted,marginTop:2}}>{new Date(c.class_date).toLocaleDateString()} · {c.start_time} · {c.batch}</div>
                    </div>
                  ))}
                </div>
                <div className="card">
                  <div className="card-title">Students <div className="rt-dot"/></div>
                  {(students||[]).slice(0,4).map(s=>(
                    <div key={s.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:`1px solid ${T.border}`}}>
                      <AvatarSm name={s.student?.full_name||"?"}/>
                      <div><div style={{fontSize:12.5,fontWeight:600,color:T.text}}>{s.student?.full_name}</div><div style={{fontSize:11,color:T.muted}}>{s.batch} · {s.course?.title}</div></div>
                    </div>
                  ))}
                  {(students||[]).length===0&&<div className="empty-state">No students yet</div>}
                </div>
              </div>
              <div style={{marginTop:16}}>
                <div className="card-title" style={{marginBottom:12}}>⚡ Quick Actions</div>
                <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                  <button className="btn btn-zoom" onClick={()=>{setTab("classes");setTimeout(()=>setShowAdd(true),100)}}>📹 Create Zoom Class</button>
                  <button className="btn btn-gold" onClick={()=>setTab("classes")}>🎓 Manage Classes</button>
                  <button className="btn btn-primary" onClick={()=>setTab("calendar")}>📅 Schedule Event</button>
                  <button className="btn btn-outline" onClick={()=>setTab("resources")}>📂 Upload Resource</button>
                </div>
              </div>
            </div>
          )}
          {tab==="calendar"&&<div><div className="page-title">Full Calendar</div><div className="page-sub">Click a date to add events. All events sync in real time.</div><div className="card"><BigCalendar userRole="teacher"/></div></div>}
          {tab==="classes"&&(
            <div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:18}}>
                <div><div className="page-title">My Classes</div><div className="page-sub">Create and manage sessions.</div></div>
                <button className="btn btn-primary" onClick={()=>setShowAdd(true)}>+ Create Class</button>
              </div>
              {showAdd&&(
                <div className="card" style={{marginBottom:16,borderColor:T.accent+"40"}}>
                  <div className="card-title">New Class</div>
                  <div className="grid2">
                    <div><div className="input-label">Title</div><input className="input-field" placeholder="Class title" value={nc.title} onChange={e=>setNc(p=>({...p,title:e.target.value}))}/></div>
                    <div><div className="input-label">Date</div><input className="input-field" type="date" value={nc.class_date} onChange={e=>setNc(p=>({...p,class_date:e.target.value}))}/></div>
                    <div><div className="input-label">Start Time</div><input className="input-field" type="time" value={nc.start_time} onChange={e=>setNc(p=>({...p,start_time:e.target.value}))}/></div>
                    <div><div className="input-label">Duration</div><input className="input-field" placeholder="e.g. 1h 30m" value={nc.duration} onChange={e=>setNc(p=>({...p,duration:e.target.value}))}/></div>
                    <div><div className="input-label">Batch</div><input className="input-field" placeholder="e.g. B-204" value={nc.batch} onChange={e=>setNc(p=>({...p,batch:e.target.value}))}/></div>
                    <div>
                      <div className="input-label" style={{display:"flex",alignItems:"center",gap:6}}>📹 Zoom Meeting Link</div>
                      <input className="input-field" placeholder="https://zoom.us/j/..." value={nc.meet_link} onChange={e=>setNc(p=>({...p,meet_link:e.target.value}))}/>
                      <div style={{fontSize:11,color:"#4fa8ff",marginTop:-8,marginBottom:12}}>💡 Create a meeting on <a href="https://zoom.us" target="_blank" rel="noreferrer" style={{color:"#4fa8ff"}}>zoom.us</a> → copy the invite link here</div>
                    </div>
                    <div><div className="input-label">🎬 Recording URL (after class)</div><input className="input-field" placeholder="https://zoom.us/rec/..." value={nc.recording_url} onChange={e=>setNc(p=>({...p,recording_url:e.target.value}))}/></div>
                  </div>
                  <div style={{display:"flex",gap:8}}>
                    <button className="btn btn-zoom" onClick={addClass} disabled={saving}>{saving?<Spinner/>:"📹 Save Class"}</button>
                    <button className="btn btn-outline" onClick={()=>setShowAdd(false)}>Cancel</button>
                  </div>
                </div>
              )}
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                {(classes||[]).length===0&&<div className="empty-state">No classes yet. Create your first one!</div>}
                {(classes||[]).map(c=>{
                  const isPast=new Date(c.class_date)<new Date();
                  return (
                    <div key={c.id} className={isPast?"card":"zoom-card"} style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12}}>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                          <div style={{fontSize:14,fontWeight:600,color:T.white}}>{c.title}</div>
                          {c.meet_link&&!isPast&&<span className="zoom-badge" style={{fontSize:10,padding:"2px 7px",marginBottom:0}}>📹 Zoom</span>}
                        </div>
                        <div style={{fontSize:11.5,color:T.muted,marginTop:4,display:"flex",gap:10,flexWrap:"wrap"}}>
                          <span>📅 {new Date(c.class_date).toLocaleDateString()}</span><span>⏰ {c.start_time}</span><span>👥 {c.batch}</span>
                        </div>
                        {c.meet_link&&!isPast&&<a href={c.meet_link} target="_blank" rel="noreferrer" style={{fontSize:11.5,color:"#4fa8ff",textDecoration:"none",marginTop:4,display:"inline-block"}}>🔗 {c.meet_link.slice(0,40)}...</a>}
                      </div>
                      <div style={{display:"flex",gap:8,alignItems:"center",flexShrink:0}}>
                        <Badge color={isPast?"gray":"blue"}>{isPast?"Done":"Upcoming"}</Badge>
                        {c.meet_link&&!isPast&&<a href={c.meet_link} target="_blank" rel="noreferrer" className="btn btn-zoom btn-sm" style={{textDecoration:"none"}}>Start</a>}
                        <button className="btn btn-danger btn-sm" onClick={()=>supabase.from("classes").delete().eq("id",c.id)}>Delete</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {tab==="students"&&(
            <div>
              <div className="page-title">Students</div><div className="page-sub">All enrolled students — live.</div>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Name</th><th>Email</th><th>Batch</th><th>Course</th><th>Enrolled</th></tr></thead>
                  <tbody>
                    {(students||[]).length===0&&<tr><td colSpan={5} style={{textAlign:"center",color:T.muted,padding:20}}>No students enrolled yet</td></tr>}
                    {(students||[]).map(s=>(
                      <tr key={s.id}>
                        <td><div style={{display:"flex",alignItems:"center",gap:9}}><AvatarSm name={s.student?.full_name||"?"}/><span style={{fontWeight:600}}>{s.student?.full_name}</span></div></td>
                        <td style={{color:T.muted}}>{s.student?.email}</td>
                        <td><Badge color="blue">{s.batch||"—"}</Badge></td>
                        <td>{s.course?.title||"—"}</td>
                        <td style={{fontSize:11,color:T.muted}}>{new Date(s.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {tab==="resources"&&(
            <div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:18}}>
                <div><div className="page-title">Resources</div><div className="page-sub">Files stored in Supabase Storage.</div></div>
                <label className="btn btn-primary" style={{cursor:"pointer"}}>+ Upload File<input type="file" style={{display:"none"}} accept=".pdf,.mp4,.doc,.docx,.pptx" onChange={uploadResource}/></label>
              </div>
              <div className="card">
                {(resources||[]).length===0&&<div className="empty-state">No resources yet. Upload your first file!</div>}
                {(resources||[]).map(r=>(
                  <div key={r.id} className="resource-row">
                    <div style={{width:36,height:36,borderRadius:7,background:r.resource_type==="pdf"?"#1e3a5f":"#064e3b",display:"flex",alignItems:"center",justifyContent:"center",fontSize:17}}>{r.resource_type==="pdf"?"📄":"▶️"}</div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:13,fontWeight:600,color:T.text}}>{r.title}</div>
                      <div style={{fontSize:11,color:T.muted}}>{r.resource_type?.toUpperCase()} · {new Date(r.created_at).toLocaleDateString()}</div>
                    </div>
                    <div style={{display:"flex",gap:7}}>
                      {r.file_url&&<a href={r.file_url} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm" style={{textDecoration:"none"}}>View</a>}
                      <button className="btn btn-danger btn-sm" onClick={()=>supabase.from("resources").delete().eq("id",r.id).then(refetchRes)}>Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── SALES PORTAL ─────────────────────────────────────────────────────────────

// ─── INVOICE TAB (Sales) ─────────────────────────────────────────────────────
function InvoiceTab({ user, supabase }) {
  const [inv, setInv] = useState({
    student_id:"", student_name:"", student_email:"", course_id:"", course_name:"",
    fee:0, discount:0, coupon:"", coupon_valid:false, notes:"", due_date:""
  });
  const [preview, setPreview] = useState(null);
  const [saving, setSaving]   = useState(false);
  const [msg, setMsg]         = useState("");

  const { data: students } = useTable("profiles", ()=>supabase.from("profiles").select("*").eq("role","student").order("full_name"), ["profiles"]);
  const { data: courses }  = useTable("courses",  ()=>supabase.from("courses").select("*").order("title"), ["courses"]);
  const { data: invoices } = useTable("payments",  ()=>supabase.from("payments").select("*").order("created_at",{ascending:false}).limit(20), ["payments"]);

  // Coupon codes (could be extended from DB)
  const COUPONS = { "UNIEDD10":10, "FIRST20":20, "SUMMER15":15, "WELCOME25":25, "STAFF50":50 };

  const applyCoupon = () => {
    const disc = COUPONS[inv.coupon.toUpperCase()];
    if (disc) {
      setInv(p=>({...p, coupon_valid:true, discount:disc}));
      setMsg(`✅ Coupon applied! ${disc}% discount`);
    } else {
      setInv(p=>({...p, coupon_valid:false}));
      setMsg("❌ Invalid coupon code");
    }
  };

  const finalAmount = Math.round(inv.fee - (inv.fee * inv.discount / 100));
  const invoiceNo   = `INV-${Date.now().toString().slice(-6)}`;

  const generatePreview = () => {
    if (!inv.student_name || !inv.course_name || !inv.fee) {
      setMsg("❌ Please fill student, course and fee."); return;
    }
    setPreview({...inv, finalAmount, invoiceNo, generatedBy: user.full_name, date: new Date().toLocaleDateString("en-IN")});
    setMsg("");
  };

  const saveInvoice = async () => {
    if (!preview) return;
    setSaving(true);
    const link = `https://pay.uniedd.com/inv/${preview.invoiceNo}`;
    await supabase.from("payments").insert({
      student_id:   inv.student_id || null,
      student_name: inv.student_name,
      student_email:inv.student_email,
      description:  `Course Fee – ${inv.course_name}`,
      amount:        preview.finalAmount,
      original_amount: inv.fee,
      discount_pct:  inv.discount,
      coupon_code:   inv.coupon || null,
      due_date:      inv.due_date || null,
      status:        "pending",
      invoice_no:    preview.invoiceNo,
      payment_link:  link,
      generated_by:  user.full_name,
      notes:         inv.notes,
    });
    setMsg(`✅ Invoice ${preview.invoiceNo} saved! Payment link: ${link}`);
    setSaving(false);
    setPreview(null);
    setInv({student_id:"", student_name:"", student_email:"", course_id:"", course_name:"", fee:0, discount:0, coupon:"", coupon_valid:false, notes:"", due_date:""});
  };

  return (
    <div>
      <div className="page-title">🧾 Invoice Generator</div>
      <div className="page-sub">Generate invoices with discount & coupon support — saved to database.</div>
      {msg && <div className={msg.startsWith("✅")?"form-success":"form-error"}>{msg}</div>}
      <div className="grid2">
        {/* Form */}
        <div className="card">
          <div className="card-title">New Invoice</div>

          <div className="input-label">Student</div>
          <select className="input-field" value={inv.student_id} onChange={e=>{
            const s = (students||[]).find(s=>s.id===e.target.value);
            setInv(p=>({...p, student_id:e.target.value, student_name:s?.full_name||"", student_email:s?.email||""}));
          }}>
            <option value="">— Select Student —</option>
            {(students||[]).map(s=><option key={s.id} value={s.id}>{s.full_name} ({s.email})</option>)}
          </select>

          <div className="input-label">Student Name (override)</div>
          <input className="input-field" placeholder="Or type manually" value={inv.student_name}
            onChange={e=>setInv(p=>({...p,student_name:e.target.value}))}/>

          <div className="input-label">Student Email</div>
          <input className="input-field" placeholder="student@email.com" value={inv.student_email}
            onChange={e=>setInv(p=>({...p,student_email:e.target.value}))}/>

          <div className="input-label">Course</div>
          <select className="input-field" value={inv.course_id} onChange={e=>{
            const c = (courses||[]).find(c=>c.id===e.target.value);
            setInv(p=>({...p, course_id:e.target.value, course_name:c?.title||"", fee:Number(c?.fee||0)}));
          }}>
            <option value="">— Select Course —</option>
            {(courses||[]).map(c=><option key={c.id} value={c.id}>{c.title} — ₹{c.fee}</option>)}
          </select>

          <div className="input-label">Course (override)</div>
          <input className="input-field" placeholder="Or type manually" value={inv.course_name}
            onChange={e=>setInv(p=>({...p,course_name:e.target.value}))}/>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <div>
              <div className="input-label">Fee (₹)</div>
              <input className="input-field" type="number" value={inv.fee||""} placeholder="0"
                onChange={e=>setInv(p=>({...p,fee:Number(e.target.value)}))}/>
            </div>
            <div>
              <div className="input-label">Due Date</div>
              <input className="input-field" type="date" value={inv.due_date}
                onChange={e=>setInv(p=>({...p,due_date:e.target.value}))}/>
            </div>
          </div>

          {/* Coupon */}
          <div className="input-label">Coupon Code</div>
          <div style={{display:"flex",gap:8,marginBottom:12}}>
            <input className="input-field" style={{marginBottom:0}} placeholder="e.g. FIRST20" value={inv.coupon}
              onChange={e=>setInv(p=>({...p,coupon:e.target.value,coupon_valid:false}))}
              onKeyDown={e=>e.key==="Enter"&&applyCoupon()}/>
            <button className="btn btn-gold btn-sm" onClick={applyCoupon}>Apply</button>
          </div>

          {/* Discount */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <div>
              <div className="input-label">Manual Discount (%)</div>
              <input className="input-field" type="number" min="0" max="100" value={inv.discount||""}
                placeholder="0" onChange={e=>setInv(p=>({...p,discount:Number(e.target.value),coupon_valid:false,coupon:""}))}/>
            </div>
            <div style={{display:"flex",flexDirection:"column",justifyContent:"flex-end",paddingBottom:12}}>
              <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:9,padding:"10px 14px"}}>
                <div style={{fontSize:11,color:T.muted}}>Final Amount</div>
                <div style={{fontFamily:"Syne",fontSize:22,fontWeight:800,color:T.gold}}>₹{finalAmount.toLocaleString("en-IN")}</div>
                {inv.discount>0&&<div style={{fontSize:11,color:T.green}}>Saved ₹{(inv.fee-finalAmount).toLocaleString("en-IN")} ({inv.discount}% off)</div>}
              </div>
            </div>
          </div>

          <div className="input-label">Notes (optional)</div>
          <textarea className="input-field" rows="2" placeholder="Additional notes…" value={inv.notes}
            onChange={e=>setInv(p=>({...p,notes:e.target.value}))}/>

          <div style={{display:"flex",gap:8}}>
            <button className="btn btn-primary" onClick={generatePreview}>👁 Preview Invoice</button>
            {preview && <button className="btn btn-gold" onClick={saveInvoice} disabled={saving}>{saving?<Spinner/>:"💾 Save & Generate Link"}</button>}
          </div>
        </div>

        {/* Preview */}
        <div>
          {preview ? (
            <div className="slip-preview" id="invoice-preview">
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
                <div>
                  <h2 style={{fontSize:22,fontWeight:800,color:"#0d2449",margin:0}}>INVOICE</h2>
                  <div style={{fontSize:12,color:"#64748b",marginTop:2}}>{preview.invoiceNo}</div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontWeight:700,fontSize:16,color:"#1480ae"}}>Uniedd</div>
                  <div style={{fontSize:11,color:"#64748b"}}>Learning Management System</div>
                  <div style={{fontSize:11,color:"#64748b"}}>{preview.date}</div>
                </div>
              </div>
              <div style={{background:"#f1f5f9",borderRadius:8,padding:"10px 14px",marginBottom:14}}>
                <div style={{fontSize:12,color:"#475569",fontWeight:600,marginBottom:6}}>BILL TO</div>
                <div style={{fontWeight:700,color:"#0f172a"}}>{preview.student_name}</div>
                {preview.student_email&&<div style={{fontSize:12,color:"#64748b"}}>{preview.student_email}</div>}
              </div>
              <div className="slip-line"><span style={{color:"#475569"}}>Course</span><span style={{fontWeight:600}}>{preview.course_name}</span></div>
              <div className="slip-line"><span style={{color:"#475569"}}>Original Fee</span><span>₹{Number(preview.fee).toLocaleString("en-IN")}</span></div>
              {preview.discount>0&&<div className="slip-line" style={{color:"#16a34a"}}><span>Discount ({preview.discount}%{preview.coupon?" – "+preview.coupon:""})</span><span>−₹{(preview.fee-preview.finalAmount).toLocaleString("en-IN")}</span></div>}
              <div className="slip-line" style={{fontWeight:700,fontSize:15}}><span>Total Amount</span><span style={{color:"#1480ae"}}>₹{preview.finalAmount.toLocaleString("en-IN")}</span></div>
              {preview.due_date&&<div className="slip-line"><span style={{color:"#475569"}}>Due Date</span><span style={{color:"#ef4444",fontWeight:600}}>{new Date(preview.due_date).toLocaleDateString("en-IN")}</span></div>}
              <div className="slip-line"><span style={{color:"#475569"}}>Generated By</span><span>{preview.generatedBy}</span></div>
              {preview.notes&&<div style={{marginTop:12,padding:"8px 12px",background:"#fef9c3",borderRadius:6,fontSize:12,color:"#713f12"}}><strong>Note:</strong> {preview.notes}</div>}
              <div style={{marginTop:16,padding:"10px 14px",background:"#1480ae",borderRadius:8,textAlign:"center",color:"#fff",fontSize:12}}>
                Pay securely at: <strong>pay.uniedd.com/inv/{preview.invoiceNo}</strong>
              </div>
              <div style={{marginTop:10,fontSize:10,color:"#94a3b8",textAlign:"center"}}>Click "Save & Generate Link" to finalize and create payment link</div>
            </div>
          ) : (
            <div className="card" style={{height:"100%",minHeight:200,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:8}}>
              <div style={{fontSize:40}}>🧾</div>
              <div style={{color:T.muted,fontSize:13}}>Fill the form and click Preview Invoice</div>
            </div>
          )}

          {/* Recent Invoices */}
          <div style={{marginTop:16}}>
            <div className="card-title" style={{marginBottom:10}}>Recent Invoices</div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Invoice</th><th>Student</th><th>Amount</th><th>Discount</th><th>Status</th></tr></thead>
                <tbody>
                  {(invoices||[]).filter(i=>i.invoice_no).slice(0,8).map(p=>(
                    <tr key={p.id}>
                      <td style={{fontSize:11,color:T.accentL,fontFamily:"monospace"}}>{p.invoice_no}</td>
                      <td style={{fontWeight:600}}>{p.student_name||"—"}</td>
                      <td>₹{Number(p.amount).toLocaleString("en-IN")}</td>
                      <td>{p.discount_pct?<span style={{color:T.green}}>{p.discount_pct}%</span>:"—"}</td>
                      <td><Badge color={p.status==="paid"?"green":"gold"}>{p.status}</Badge></td>
                    </tr>
                  ))}
                  {!(invoices||[]).some(i=>i.invoice_no)&&<tr><td colSpan={5} style={{textAlign:"center",color:T.muted,padding:16}}>No invoices yet</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── SALES CHAT TAB ───────────────────────────────────────────────────────────
function SalesChatTab({ user, supabase }) {
  const [room, setRoom]       = useState("sales-admin");
  const [chatMsg, setChatMsg] = useState("");
  const { data: admins }   = useTable("profiles", ()=>supabase.from("profiles").select("*").in("role",["admin","teacher"]).order("full_name"), ["profiles"]);
  const { data: messages, refetch } = useTable("chat_messages",
    ()=>supabase.from("chat_messages").select("*,sender:profiles(full_name,role)").eq("room",room).order("created_at"), ["chat_messages"]);

  const ROOMS = [
    {id:"sales-admin",   label:"Admin Channel",   icon:"🛡️",  desc:"Chat with Admins"},
    {id:"sales-teachers",label:"Teacher Channel", icon:"🎓",  desc:"Chat with Teachers"},
    {id:"sales-team",    label:"Sales Team",      icon:"📋",  desc:"Sales internal chat"},
  ];

  const sendMsg = async () => {
    if (!chatMsg.trim()) return;
    await supabase.from("chat_messages").insert({ content:chatMsg, sender_id:user.id, room });
    setChatMsg(""); refetch();
  };

  return (
    <div>
      <div className="page-title">💬 Team Chat</div>
      <div className="page-sub">Direct chat with Admin and Teachers — messages saved in real time.</div>
      <div style={{display:"grid",gridTemplateColumns:"220px 1fr",gap:16}}>
        {/* Channel list */}
        <div className="card" style={{padding:12}}>
          <div style={{fontSize:11,color:T.muted,fontWeight:700,textTransform:"uppercase",letterSpacing:".7px",marginBottom:10}}>Channels</div>
          {ROOMS.map(r=>(
            <div key={r.id} onClick={()=>setRoom(r.id)}
              style={{padding:"10px 12px",borderRadius:9,cursor:"pointer",marginBottom:4,
                background:room===r.id?`linear-gradient(135deg,rgba(20,128,174,.22),rgba(240,160,60,.10))`:"transparent",
                borderLeft:room===r.id?`3px solid ${T.gold}`:"3px solid transparent"}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontSize:16}}>{r.icon}</span>
                <div>
                  <div style={{fontSize:13,fontWeight:600,color:room===r.id?T.accentL:T.text}}>{r.label}</div>
                  <div style={{fontSize:10.5,color:T.muted}}>{r.desc}</div>
                </div>
              </div>
            </div>
          ))}
          <div className="divider" style={{margin:"12px 0"}}/>
          <div style={{fontSize:11,color:T.muted,fontWeight:700,textTransform:"uppercase",letterSpacing:".7px",marginBottom:8}}>Online</div>
          {(admins||[]).map(a=>(
            <div key={a.id} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 4px"}}>
              <div style={{position:"relative"}}>
                <Avatar name={a.full_name||a.email}/>
                <div style={{position:"absolute",bottom:0,right:0,width:8,height:8,borderRadius:"50%",background:T.green,border:`2px solid ${T.surface}`}}/>
              </div>
              <div>
                <div style={{fontSize:12,fontWeight:600,color:T.text}}>{a.full_name?.split(" ")[0]}</div>
                <div style={{fontSize:10,color:T.muted,textTransform:"capitalize"}}>{a.role}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Chat window */}
        <div className="card" style={{display:"flex",flexDirection:"column",minHeight:460}}>
          <div style={{display:"flex",alignItems:"center",gap:10,paddingBottom:12,borderBottom:`1px solid ${T.border}`,marginBottom:12}}>
            <span style={{fontSize:18}}>{ROOMS.find(r=>r.id===room)?.icon}</span>
            <div>
              <div style={{fontSize:14,fontWeight:700,color:T.white}}>{ROOMS.find(r=>r.id===room)?.label}</div>
              <div style={{fontSize:11,color:T.muted}}>{ROOMS.find(r=>r.id===room)?.desc}</div>
            </div>
            <div className="rt-dot" style={{marginLeft:"auto"}}/>
          </div>
          <div className="chat-wrap" style={{flex:1}}>
            <div className="chat-messages">
              {(messages||[]).length===0&&<div className="empty-state">No messages yet. Start the conversation!</div>}
              {(messages||[]).map((m,i)=>(
                <div key={i} className={`msg ${m.sender_id===user.id?"me":"them"}`}>
                  {m.sender_id!==user.id&&<Avatar name={m.sender?.full_name||"?"} className="sm"/>}
                  <div>
                    {m.sender_id!==user.id&&<div style={{fontSize:10.5,color:T.muted,marginBottom:2,paddingLeft:2}}>
                      {m.sender?.full_name} · <span style={{textTransform:"capitalize"}}>{m.sender?.role}</span>
                    </div>}
                    <div className="msg-bubble">{m.content}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="chat-input-row">
              <input className="chat-input" value={chatMsg}
                onChange={e=>setChatMsg(e.target.value)}
                onKeyDown={e=>e.key==="Enter"&&sendMsg()}
                placeholder={`Message ${ROOMS.find(r=>r.id===room)?.label}…`}/>
              <button className="btn btn-primary" onClick={sendMsg}>Send</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── ADMIN COURSES TAB ────────────────────────────────────────────────────────
function AdminCoursesTab({ courses, supabase, refetch }) {
  const [editing, setEditing] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving]   = useState(false);
  const blank = {title:"", description:"", fee:0, duration:"", level:"Beginner", category:"", batch_size:30, syllabus:"", prerequisites:"", mode:"Online", status:"Active"};
  const [nc, setNc] = useState(blank);

  const save = async () => {
    setSaving(true);
    if (editing) {
      await supabase.from("courses").update(nc).eq("id",editing);
    } else {
      await supabase.from("courses").insert(nc);
    }
    setEditing(null); setShowAdd(false); setNc(blank); refetch(); setSaving(false);
  };

  const del = async (id) => {
    if (window.confirm("Delete this course?")) { await supabase.from("courses").delete().eq("id",id); refetch(); }
  };

  const startEdit = (c) => { setNc({...c}); setEditing(c.id); setShowAdd(true); };

  const LEVELS    = ["Beginner","Intermediate","Advanced"];
  const MODES     = ["Online","Offline","Hybrid"];
  const STATUSES  = ["Active","Inactive","Upcoming","Archived"];
  const CATS      = ["Programming","Data Science","Design","Marketing","Finance","Language","Other"];

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:18}}>
        <div><div className="page-title">📚 Manage Courses</div><div className="page-sub">Create, edit and manage all courses — structure, fees and details.</div></div>
        <button className="btn btn-primary" onClick={()=>{setNc(blank);setEditing(null);setShowAdd(true)}}>+ Add Course</button>
      </div>

      {showAdd&&(
        <div className="card" style={{marginBottom:20,borderColor:T.accent+"40"}}>
          <div className="card-title">{editing?"✏️ Edit Course":"➕ New Course"}</div>
          <div className="grid2">
            <div><div className="input-label">Course Title</div><input className="input-field" placeholder="e.g. Full Stack Development" value={nc.title} onChange={e=>setNc(p=>({...p,title:e.target.value}))}/></div>
            <div><div className="input-label">Category</div>
              <select className="input-field" value={nc.category} onChange={e=>setNc(p=>({...p,category:e.target.value}))}>
                <option value="">— Select —</option>
                {CATS.map(c=><option key={c}>{c}</option>)}
              </select>
            </div>
            <div><div className="input-label">Fee (₹)</div><input className="input-field" type="number" placeholder="15000" value={nc.fee||""} onChange={e=>setNc(p=>({...p,fee:Number(e.target.value)}))}/></div>
            <div><div className="input-label">Duration</div><input className="input-field" placeholder="e.g. 3 Months / 48 Hours" value={nc.duration} onChange={e=>setNc(p=>({...p,duration:e.target.value}))}/></div>
            <div><div className="input-label">Level</div>
              <select className="input-field" value={nc.level} onChange={e=>setNc(p=>({...p,level:e.target.value}))}>
                {LEVELS.map(l=><option key={l}>{l}</option>)}
              </select>
            </div>
            <div><div className="input-label">Mode</div>
              <select className="input-field" value={nc.mode} onChange={e=>setNc(p=>({...p,mode:e.target.value}))}>
                {MODES.map(m=><option key={m}>{m}</option>)}
              </select>
            </div>
            <div><div className="input-label">Batch Size</div><input className="input-field" type="number" placeholder="30" value={nc.batch_size||""} onChange={e=>setNc(p=>({...p,batch_size:Number(e.target.value)}))}/></div>
            <div><div className="input-label">Status</div>
              <select className="input-field" value={nc.status} onChange={e=>setNc(p=>({...p,status:e.target.value}))}>
                {STATUSES.map(s=><option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div><div className="input-label">Description</div><textarea className="input-field" rows="2" placeholder="Course overview…" value={nc.description} onChange={e=>setNc(p=>({...p,description:e.target.value}))}/></div>
          <div><div className="input-label">Syllabus / Topics Covered</div><textarea className="input-field" rows="3" placeholder="Module 1: ..., Module 2: ..." value={nc.syllabus} onChange={e=>setNc(p=>({...p,syllabus:e.target.value}))}/></div>
          <div><div className="input-label">Prerequisites</div><input className="input-field" placeholder="e.g. Basic computer knowledge" value={nc.prerequisites} onChange={e=>setNc(p=>({...p,prerequisites:e.target.value}))}/></div>
          <div style={{display:"flex",gap:8}}>
            <button className="btn btn-primary" onClick={save} disabled={saving}>{saving?<Spinner/>:editing?"💾 Update Course":"💾 Save Course"}</button>
            <button className="btn btn-outline" onClick={()=>{setShowAdd(false);setEditing(null)}}>Cancel</button>
          </div>
        </div>
      )}

      {/* Course Cards */}
      {(courses||[]).length===0&&!showAdd&&<div className="empty-state">No courses yet. Add your first course!</div>}
      <div className="grid2">
        {(courses||[]).map(c=>(
          <div key={c.id} className="card" style={{position:"relative"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontFamily:"Syne",fontSize:16,fontWeight:800,color:T.white,marginBottom:4}}>{c.title}</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                  <Badge color="blue">{c.level||"Beginner"}</Badge>
                  <Badge color={c.mode==="Online"?"zoom":c.mode==="Offline"?"gold":"purple"}>{c.mode||"Online"}</Badge>
                  <Badge color={c.status==="Active"?"green":c.status==="Upcoming"?"blue":c.status==="Inactive"?"red":"gray"}>{c.status||"Active"}</Badge>
                  {c.category&&<Badge color="gray">{c.category}</Badge>}
                </div>
              </div>
              <div style={{textAlign:"right",flexShrink:0,marginLeft:12}}>
                <div style={{fontFamily:"Syne",fontSize:20,fontWeight:800,color:T.gold}}>₹{Number(c.fee||0).toLocaleString("en-IN")}</div>
                <div style={{fontSize:11,color:T.muted}}>{c.duration||"—"}</div>
              </div>
            </div>
            {c.description&&<div style={{fontSize:12.5,color:T.muted,marginBottom:10,lineHeight:1.5}}>{c.description}</div>}
            {c.syllabus&&(
              <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:8,padding:"10px 12px",marginBottom:10}}>
                <div style={{fontSize:10.5,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:".6px",marginBottom:6}}>Syllabus</div>
                <div style={{fontSize:12,color:T.text,lineHeight:1.6,whiteSpace:"pre-line"}}>{c.syllabus}</div>
              </div>
            )}
            <div style={{display:"flex",gap:12,flexWrap:"wrap",fontSize:12,color:T.muted,marginBottom:12}}>
              {c.batch_size&&<span>👥 Max {c.batch_size} students</span>}
              {c.prerequisites&&<span>📋 Req: {c.prerequisites}</span>}
            </div>
            <div style={{display:"flex",gap:8}}>
              <button className="btn btn-outline btn-sm" onClick={()=>startEdit(c)}>✏️ Edit</button>
              <button className="btn btn-danger btn-sm" onClick={()=>del(c.id)}>🗑 Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SalesPortal({ user, onLogout }) {
  const [tab, setTab]   = useState("dashboard");
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [nl, setNl] = useState({full_name:"",phone:"",email:"",course_interest:"",source:"Website",notes:""});

  const { data: leads } = useTable("leads", ()=>supabase.from("leads").select("*").order("created_at",{ascending:false}), ["leads"]);
  const { data: payments } = useTable("payments", ()=>supabase.from("payments").select("*").order("created_at",{ascending:false}), ["payments"]);

  const addLead = async () => {
    if (!nl.full_name) return;
    setSaving(true);
    await supabase.from("leads").insert({...nl, assigned_to:user.id, status:"New"});
    setNl({full_name:"",phone:"",email:"",course_interest:"",source:"Website",notes:""}); setShowAdd(false); setSaving(false);
  };

  const converted = (leads||[]).filter(l=>l.status==="Converted").length;
  const revenue   = (payments||[]).filter(p=>p.status==="paid").reduce((s,p)=>s+Number(p.amount),0);

  const nav = [
    {id:"dashboard",icon:"⊞",label:"Dashboard"},
    {id:"calendar", icon:"📅",label:"Full Calendar"},
    {id:"leads",    icon:"📋",label:"Leads"},
    {id:"demos",    icon:"🗓",label:"Demo Scheduler"},
    {id:"invoice",  icon:"🧾",label:"Invoice"},
    {id:"billing",  icon:"💳",label:"Billing"},
    {id:"chat",     icon:"💬",label:"Team Chat"},
  ];

  return (
    <div className="lms-root">
      <aside className="sidebar">
        <div className="sidebar-logo"><div style={{marginBottom:4}}><img src={`data:image/png;base64,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`} alt="Uniedd" style={{height:36,objectFit:"contain"}}/></div><div className="sidebar-role">Sales Portal</div></div>
        <div style={{padding:"6px 0"}}>{nav.map(n=><div key={n.id} className={`nav-item ${tab===n.id?"active":""}`} onClick={()=>setTab(n.id)}><span className="icon">{n.icon}</span><span>{n.label}</span></div>)}</div>
        <div className="sidebar-bottom">
          <div className="user-chip" onClick={onLogout}><Avatar name={user.full_name||user.email}/><div><div className="user-chip-name">{user.full_name}</div><div className="user-chip-role">Sign out</div></div></div>
        </div>
      </aside>
      <div className="main">
        <div className="topbar"><div className="topbar-title">{nav.find(n=>n.id===tab)?.label}</div><div className="topbar-right"><div className="rt-dot"/><AvatarSm name={user.full_name||user.email}/></div></div>
        <div className="content">
          {tab==="dashboard"&&(
            <div>
              <div className="page-title">Sales Overview</div><div className="page-sub">Live CRM data from database.</div>
              <div className="grid4" style={{marginBottom:20}}>
                <StatCard label="Total Leads" value={leads?.length??"-"} icon="📋"/>
                <StatCard label="Converted" value={converted} icon="✅" ac={T.green}/>
                <StatCard label="Conversion %" value={leads?.length?`${Math.round(converted/leads.length*100)}%`:"—"} icon="📈" ac={T.gold}/>
                <StatCard label="Revenue" value={`₹${revenue}`} icon="💰" ac={T.purple}/>
              </div>
              <div className="card">
                <div className="card-title">Recent Leads <div className="rt-dot"/></div>
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Name</th><th>Course</th><th>Source</th><th>Status</th><th>Date</th></tr></thead>
                    <tbody>
                      {(leads||[]).length===0&&<tr><td colSpan={5} style={{textAlign:"center",color:T.muted}}>No leads yet</td></tr>}
                      {(leads||[]).slice(0,6).map(l=>(
                        <tr key={l.id}>
                          <td style={{fontWeight:600}}>{l.full_name}</td><td>{l.course_interest}</td>
                          <td><Badge color="gray">{l.source}</Badge></td>
                          <td><Badge color={l.status==="Converted"?"green":l.status==="New"?"blue":l.status?.includes("Demo")?"gold":"gray"}>{l.status}</Badge></td>
                          <td style={{fontSize:11,color:T.muted}}>{new Date(l.created_at).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div style={{marginTop:16}}>
                <div className="card-title" style={{marginBottom:12}}>⚡ Quick Actions</div>
                <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                  <button className="btn btn-primary" onClick={()=>setTab("invoice")}>🧾 Generate Invoice</button>
                  <button className="btn btn-gold" onClick={()=>setTab("leads")}>📋 Add Lead</button>
                  <button className="btn btn-outline" onClick={()=>setTab("demos")}>🗓 Schedule Demo</button>
                  <button className="btn btn-zoom" onClick={()=>setTab("chat")}>💬 Team Chat</button>
                </div>
              </div>
            </div>
          )}
          {tab==="calendar"&&<div><div className="page-title">Full Calendar</div><div className="page-sub">Demos, meetings and payment deadlines — live.</div><div className="card"><BigCalendar userRole="sales"/></div></div>}
          {tab==="leads"&&(
            <div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:18}}>
                <div><div className="page-title">Leads</div><div className="page-sub">Live CRM — updates save to database instantly.</div></div>
                <button className="btn btn-primary" onClick={()=>setShowAdd(true)}>+ Add Lead</button>
              </div>
              {showAdd&&(
                <div className="card" style={{marginBottom:16,borderColor:T.accent+"40"}}>
                  <div className="card-title">New Lead</div>
                  <div className="grid2">
                    <div><div className="input-label">Full Name</div><input className="input-field" value={nl.full_name} onChange={e=>setNl(p=>({...p,full_name:e.target.value}))} placeholder="Lead name"/></div>
                    <div><div className="input-label">Phone</div><input className="input-field" value={nl.phone} onChange={e=>setNl(p=>({...p,phone:e.target.value}))} placeholder="Phone"/></div>
                    <div><div className="input-label">Email</div><input className="input-field" value={nl.email} onChange={e=>setNl(p=>({...p,email:e.target.value}))} placeholder="Email"/></div>
                    <div><div className="input-label">Course Interest</div><input className="input-field" value={nl.course_interest} onChange={e=>setNl(p=>({...p,course_interest:e.target.value}))} placeholder="e.g. Data Science"/></div>
                    <div><div className="input-label">Source</div>
                      <select className="input-field" value={nl.source} onChange={e=>setNl(p=>({...p,source:e.target.value}))}>
                        {["Website","Referral","LinkedIn","Ad","Walk-in","Cold Call"].map(s=><option key={s}>{s}</option>)}
                      </select>
                    </div>
                    <div><div className="input-label">Notes</div><input className="input-field" value={nl.notes} onChange={e=>setNl(p=>({...p,notes:e.target.value}))} placeholder="Notes…"/></div>
                  </div>
                  <div style={{display:"flex",gap:8}}>
                    <button className="btn btn-primary" onClick={addLead} disabled={saving}>{saving?<Spinner/>:"Save Lead"}</button>
                    <button className="btn btn-outline" onClick={()=>setShowAdd(false)}>Cancel</button>
                  </div>
                </div>
              )}
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Name</th><th>Phone</th><th>Course</th><th>Source</th><th>Status</th></tr></thead>
                  <tbody>
                    {(leads||[]).length===0&&<tr><td colSpan={5} style={{textAlign:"center",color:T.muted}}>No leads yet</td></tr>}
                    {(leads||[]).map(l=>(
                      <tr key={l.id}>
                        <td style={{fontWeight:600}}>{l.full_name}</td><td style={{color:T.muted}}>{l.phone}</td><td>{l.course_interest}</td>
                        <td><Badge color="gray">{l.source}</Badge></td>
                        <td>
                          <select style={{background:T.surface,border:`1px solid ${T.border}`,color:T.text,borderRadius:6,padding:"4px 8px",fontSize:11.5}}
                            value={l.status} onChange={e=>supabase.from("leads").update({status:e.target.value}).eq("id",l.id)}>
                            {["New","Contacted","Demo Scheduled","Follow-up","Converted","Lost"].map(s=><option key={s}>{s}</option>)}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {tab==="demos"&&(
            <div>
              <div className="page-title">Demo Scheduler</div><div className="page-sub">Schedule demos with teacher availability view.</div>
              <div className="grid2">
                <div className="card">
                  <div className="card-title">Schedule Demo</div>
                  <div className="input-label">Select Lead</div>
                  <select className="input-field">{(leads||[]).filter(l=>l.status!=="Converted").map(l=><option key={l.id} value={l.id}>{l.full_name} – {l.course_interest}</option>)}</select>
                  <div className="input-label">Teacher</div>
                  <input className="input-field" placeholder="Teacher name" id="demo-teacher"/>
                  <div className="input-label">Date & Time</div>
                  <input className="input-field" type="datetime-local" id="demo-dt"/>
                  <div className="input-label">Meet Link</div>
                  <input className="input-field" placeholder="https://zoom.us/j/..." id="demo-link"/>
                  <div className="input-label">Notes</div>
                  <textarea className="input-field" placeholder="Demo brief…" id="demo-notes"/>
                  <button className="btn btn-primary btn-full" onClick={async()=>{
                    const dt = new Date(document.getElementById("demo-dt")?.value||Date.now());
                    await supabase.from("events").insert({ title:`Demo – ${document.getElementById("demo-teacher")?.value||"Lead"}`, event_type:"demo", day:dt.getDate(), month:dt.getMonth()+1, year:dt.getFullYear(), time:dt.toTimeString().slice(0,5), sales:user.full_name });
                    alert("✅ Demo scheduled & added to calendar!");
                  }}>Schedule & Add to Calendar</button>
                </div>
                <div className="card">
                  <div className="card-title">Availability Calendar</div>
                  <BigCalendar userRole="sales"/>
                </div>
              </div>
            </div>
          )}
          {tab==="invoice"&&<InvoiceTab user={user} supabase={supabase}/>}
          {tab==="billing"&&(
            <div>
              <div className="page-title">Billing</div><div className="page-sub">Generate payment slips saved to database.</div>
              <div className="grid2">
                <div className="card">
                  <div className="card-title">Generate Payment Slip</div>
                  {[["Student Name","text","b-name"],["Course","text","b-course"],["Amount (₹)","number","b-amount"],["Due Date","date","b-due"]].map(([l,t,id])=>(
                    <div key={id}><div className="input-label">{l}</div><input className="input-field" type={t} id={id}/></div>
                  ))}
                  <button className="btn btn-primary btn-full" onClick={async()=>{
                    const name   = document.getElementById("b-name")?.value;
                    const course = document.getElementById("b-course")?.value;
                    const amount = document.getElementById("b-amount")?.value;
                    const due    = document.getElementById("b-due")?.value;
                    if (!name||!amount||!due){alert("Fill all fields");return;}
                    const link = `https://pay.uniedd.com/inv/${Date.now()}`;
                    await supabase.from("payments").insert({ student_name:name, description:`Course Fee – ${course}`, amount, due_date:due, status:"pending", payment_link:link });
                    alert(`✅ Slip saved!\nPayment link: ${link}`);
                  }}>Generate & Save to Database</button>
                </div>
                <div>
                  <div className="card-title">Recent Bills</div>
                  <div className="table-wrap">
                    <table>
                      <thead><tr><th>Student</th><th>Amount</th><th>Due</th><th>Status</th></tr></thead>
                      <tbody>
                        {(payments||[]).slice(0,5).map(p=>(
                          <tr key={p.id}>
                            <td style={{fontWeight:600}}>{p.student_name||"—"}</td>
                            <td>₹{p.amount}</td>
                            <td style={{fontSize:11}}>{p.due_date?new Date(p.due_date).toLocaleDateString():"—"}</td>
                            <td><Badge color={p.status==="paid"?"green":"gold"}>{p.status}</Badge></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}
          {tab==="chat"&&<SalesChatTab user={user} supabase={supabase}/>}
        </div>
      </div>
    </div>
  );
}

// ─── ADMIN PORTAL ─────────────────────────────────────────────────────────────
function AdminPortal({ user, onLogout }) {
  const [tab, setTab] = useState("dashboard");
  const [perms, setPerms] = useState({ student_chat:true, student_resources:true, student_payments:true, teacher_create:true, teacher_upload:true, sales_leads:true, sales_billing:true, sales_demo:true });
  const { data: courses, refetch: refetchCourses } = useTable("courses", ()=>supabase.from("courses").select("*").order("created_at",{ascending:false}), ["courses"]);

  const { data: profiles } = useTable("profiles",  ()=>supabase.from("profiles").select("*"), ["profiles"]);
  const { data: classes }  = useTable("classes",   ()=>supabase.from("classes").select("*"),  ["classes"]);
  const { data: leads }    = useTable("leads",     ()=>supabase.from("leads").select("*"),    ["leads"]);
  const { data: payments } = useTable("payments",  ()=>supabase.from("payments").select("*"), ["payments"]);

  const revenue = (payments||[]).filter(p=>p.status==="paid").reduce((s,p)=>s+Number(p.amount),0);

  const nav = [
    {id:"dashboard",   icon:"⊞",label:"Dashboard"},
    {id:"calendar",    icon:"📅",label:"Full Calendar"},
    {id:"users",       icon:"👥",label:"All Users"},
    {id:"permissions", icon:"🔒",label:"Permissions"},
    {id:"data",        icon:"🗄",label:"Data Center"},
    {id:"settings",    icon:"⚙️",label:"Settings"},
  ];

  return (
    <div className="lms-root">
      <aside className="sidebar">
        <div className="sidebar-logo"><div style={{marginBottom:4}}><img src={`data:image/png;base64,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`} alt="Uniedd" style={{height:36,objectFit:"contain"}}/></div><div className="sidebar-role">Admin Portal</div></div>
        <div style={{padding:"6px 0"}}>{nav.map(n=><div key={n.id} className={`nav-item ${tab===n.id?"active":""}`} onClick={()=>setTab(n.id)}><span className="icon">{n.icon}</span><span>{n.label}</span></div>)}</div>
        <div className="sidebar-bottom">
          <div className="user-chip" onClick={onLogout}><Avatar name={user.full_name||user.email}/><div><div className="user-chip-name">{user.full_name}</div><div className="user-chip-role">Sign out</div></div></div>
        </div>
      </aside>
      <div className="main">
        <div className="topbar"><div className="topbar-title">{nav.find(n=>n.id===tab)?.label}</div><div className="topbar-right"><div className="rt-dot"/><Badge color="red">Admin</Badge><AvatarSm name={user.full_name||user.email}/></div></div>
        <div className="content">
          {tab==="dashboard"&&(
            <div>
              <div className="page-title">Platform Overview</div><div className="page-sub">Live metrics — real Supabase data.</div>
              <div className="grid4" style={{marginBottom:20}}>
                <StatCard label="Total Users" value={profiles?.length??"-"} icon="👥"/>
                <StatCard label="Classes" value={classes?.length??"-"} icon="🎓" ac={T.green}/>
                <StatCard label="Revenue" value={`₹${revenue}`} icon="💰" ac={T.gold}/>
                <StatCard label="Open Leads" value={(leads||[]).filter(l=>l.status!=="Converted"&&l.status!=="Lost").length} icon="📋" ac={T.purple}/>
              </div>
              <div className="grid2">
                <div className="card">
                  <div className="card-title">Users by Role <div className="rt-dot"/></div>
                  {["student","teacher","sales","admin"].map(r=>{
                    const c=(profiles||[]).filter(p=>p.role===r).length;
                    const cols={student:T.accentL,teacher:T.green,sales:T.gold,admin:T.red};
                    return <div key={r} style={{padding:"8px 0",borderBottom:`1px solid ${T.border}`}}>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}><span style={{fontSize:12.5,textTransform:"capitalize"}}>{r}</span><span style={{fontSize:12.5,fontWeight:700,color:cols[r]}}>{c}</span></div>
                      <div className="progress-bar"><div className="progress-fill" style={{width:`${profiles?.length?Math.round(c/profiles.length*100):0}%`,background:cols[r]}}/></div>
                    </div>;
                  })}
                </div>
                <div className="card">
                  <div className="card-title">System</div>
                  {[["Supabase DB","Connected",T.green],["Real-time","Active",T.green],["Auth","Online",T.green],["Storage","Online",T.green],["Project","mgpvfkuz…",T.accentL]].map(([l,v,c])=>(
                    <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:`1px solid ${T.border}`,fontSize:12.5}}>
                      <span style={{color:T.muted}}>{l}</span><span style={{fontWeight:600,color:c}}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          {tab==="calendar"&&<div><div className="page-title">Full Platform Calendar</div><div className="page-sub">All events across every role. Click a date to add or view.</div><div className="card"><BigCalendar userRole="admin"/></div></div>}
          {tab==="courses"&&<AdminCoursesTab courses={courses} supabase={supabase} refetch={refetchCourses}/>}
          {tab==="users"&&(
            <div>
              <div className="page-title">All Users</div><div className="page-sub">Manage accounts and roles — changes save instantly.</div>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>User</th><th>Email</th><th>Role</th><th>Joined</th><th>Change Role</th></tr></thead>
                  <tbody>
                    {(profiles||[]).length===0&&<tr><td colSpan={5} style={{textAlign:"center",color:T.muted,padding:20}}>No users yet</td></tr>}
                    {(profiles||[]).map(u=>(
                      <tr key={u.id}>
                        <td><div style={{display:"flex",alignItems:"center",gap:9}}><AvatarSm name={u.full_name||"?"}/><span style={{fontWeight:600}}>{u.full_name}</span></div></td>
                        <td style={{color:T.muted,fontSize:11.5}}>{u.email}</td>
                        <td><Badge color={u.role==="admin"?"red":u.role==="teacher"?"green":u.role==="sales"?"gold":"blue"}>{u.role}</Badge></td>
                        <td style={{fontSize:11,color:T.muted}}>{new Date(u.created_at).toLocaleDateString()}</td>
                        <td>
                          <select style={{background:T.surface,border:`1px solid ${T.border}`,color:T.text,borderRadius:6,padding:"4px 8px",fontSize:11.5}}
                            value={u.role} onChange={async e=>await supabase.from("profiles").update({role:e.target.value}).eq("id",u.id)}>
                            {["student","teacher","sales","admin"].map(r=><option key={r}>{r}</option>)}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {tab==="permissions"&&(
            <div>
              <div className="page-title">Permissions</div><div className="page-sub">Toggle feature access per role.</div>
              <div className="grid2">
                {[
                  {role:"Student",color:"blue",keys:["student_chat","student_resources","student_payments"],labels:["Chat Support","Access Resources","View Payments"]},
                  {role:"Teacher",color:"green",keys:["teacher_create","teacher_upload"],labels:["Create Classes","Upload Resources"]},
                  {role:"Sales",color:"gold",keys:["sales_leads","sales_billing","sales_demo"],labels:["Add Leads","Generate Bills","Schedule Demos"]},
                ].map(sec=>(
                  <div key={sec.role} className="card">
                    <div className="card-title"><span>{sec.role} Permissions</span><Badge color={sec.color}>{sec.role}</Badge></div>
                    {sec.keys.map((k,i)=>(
                      <div key={k} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"11px 0",borderBottom:`1px solid ${T.border}`}}>
                        <span style={{fontSize:13}}>{sec.labels[i]}</span>
                        <div className="toggle" style={{background:perms[k]?T.accent:T.border,justifyContent:perms[k]?"flex-end":"flex-start"}}
                          onClick={async()=>{
                            const v=!perms[k]; setPerms(p=>({...p,[k]:v}));
                            await supabase.from("permissions").upsert({key:k,enabled:v,updated_by:user.id});
                          }}>
                          <div className="toggle-knob"/>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
          {tab==="data"&&(
            <div>
              <div className="page-title">Data Center</div><div className="page-sub">All tables in your Supabase database — live row counts.</div>
              <div className="grid3" style={{marginBottom:18}}>
                <StatCard label="Total Records" value={(profiles?.length||0)+(classes?.length||0)+(leads?.length||0)+(payments?.length||0)} icon="🗄"/>
                <StatCard label="Users" value={profiles?.length??"-"} icon="👥" ac={T.green}/>
                <StatCard label="Revenue" value={`₹${revenue}`} icon="💰" ac={T.gold}/>
              </div>
              <div className="card">
                {[["profiles","Users",(profiles||[]).length],["classes","Classes",(classes||[]).length],["leads","Leads",(leads||[]).length],["payments","Payments",(payments||[]).length]].map(([t,n,c])=>(
                  <div key={t} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"11px 0",borderBottom:`1px solid ${T.border}`}}>
                    <div>
                      <div style={{fontSize:13,fontWeight:600,color:T.text}}>{n}</div>
                      <div style={{fontSize:11,color:T.muted}}>{c} records · table: {t}</div>
                    </div>
                    <a href={`${SUPABASE_URL}/rest/v1/${t}?select=*&apikey=${SUPABASE_ANON}`} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm" style={{textDecoration:"none"}}>View in DB</a>
                  </div>
                ))}
              </div>
            </div>
          )}
          {tab==="settings"&&(
            <div>
              <div className="page-title">Settings</div><div className="page-sub">Platform configuration.</div>
              <div className="grid2">
                <div className="card">
                  <div className="card-title">General</div>
                  <div className="input-label">Platform Name</div><input className="input-field" defaultValue="Uniedd Learning Platform"/>
                  <div className="input-label">Support Email</div><input className="input-field" defaultValue="support@uniedd.com"/>
                  <div className="input-label">Timezone</div>
                  <select className="input-field"><option>Asia/Kolkata (IST)</option><option>UTC</option></select>
                  <button className="btn btn-primary">Save Changes</button>
                </div>
                <div className="card">
                  <div className="card-title">Supabase Connection</div>
                  <div style={{padding:"10px 13px",background:T.surface,borderRadius:9,marginBottom:12}}>
                    <div style={{fontSize:11,color:T.muted,marginBottom:4}}>PROJECT URL</div>
                    <div style={{fontSize:12,color:T.accentL,wordBreak:"break-all"}}>{SUPABASE_URL}</div>
                  </div>
                  <div style={{padding:"10px 13px",background:"#064e3b30",borderRadius:9,color:T.green,fontSize:13}}>
                    <div className="rt-dot" style={{display:"inline-block",marginRight:8}}/>Connected & Real-time Active
                  </div>
                  <div className="divider"/>
                  <div className="card-title">Payment Gateway</div>
                  <select className="input-field"><option>Razorpay</option><option>Stripe</option><option>PayU</option></select>
                  <button className="btn btn-primary">Save</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Restore session from localStorage
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const { data: profile } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
        setUser({ ...session.user, ...profile });
      }
      setLoading(false);
    });
    // Listen for sign-out
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") setUser(null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  if (loading) return (
    <>
      <style>{css}</style>
      <div className="loading-screen">
        <div style={{ fontFamily:"Syne", fontSize:26, fontWeight:800, color:T.white }}>
          Uni<span style={{ color:T.accent }}>edd</span>
        </div>
        <Spinner />
        <p>Connecting to Supabase…</p>
      </div>
    </>
  );

  return (
    <>
      <style>{css}</style>
      {!user && <AuthScreen onAuth={setUser} />}
      {user?.role === "student" && <StudentPortal user={user} onLogout={handleLogout} />}
      {user?.role === "teacher" && <TeacherPortal user={user} onLogout={handleLogout} />}
      {user?.role === "sales"   && <SalesPortal   user={user} onLogout={handleLogout} />}
      {user?.role === "admin"   && <AdminPortal   user={user} onLogout={handleLogout} />}
      {user && !["student","teacher","sales","admin"].includes(user?.role) && (
        <div className="loading-screen">
          <p style={{ color:T.red }}>No role assigned. Ask your admin to set your role.</p>
          <button className="btn btn-outline" onClick={handleLogout} style={{ marginTop:10 }}>Sign Out</button>
        </div>
      )}
    </>
  );
}
