import { useState, useEffect, createContext, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import { formatCurrency, formatPhone, buildCSV } from "../utils/format.js";

/* ═══════════════════════════════════════════════
   THEME TOKENS — DARK & LIGHT
═══════════════════════════════════════════════ */
const DARK = {
  bg0:"#080808", bg1:"#0F0F0F", bg2:"#141414", bg3:"#1C1C1C",
  bg4:"#242424", bg5:"#2E2E2E",
  t1:"#F2F2F2", t2:"#A3A3A3", t3:"#666666", t4:"#383838",
  b1:"rgba(255,255,255,0.08)", b2:"rgba(255,255,255,0.04)",
  bStrong:"rgba(255,255,255,0.14)",
  accent:"#FFFFFF", accentText:"#080808",
  shadow:"rgba(0,0,0,0.55)",
  isDark: true,
};
const LIGHT = {
  bg0:"#F0F0F0", bg1:"#FAFAFA", bg2:"#FFFFFF", bg3:"#F5F5F5",
  bg4:"#EBEBEB", bg5:"#DEDEDE",
  t1:"#111111", t2:"#555555", t3:"#999999", t4:"#C8C8C8",
  b1:"rgba(0,0,0,0.08)", b2:"rgba(0,0,0,0.04)",
  bStrong:"rgba(0,0,0,0.16)",
  accent:"#111111", accentText:"#FFFFFF",
  shadow:"rgba(0,0,0,0.10)",
  isDark: false,
};
/* shared color tokens — badges/tags/alerts keep color in both modes */
const C = {
  green:"#22C55E",  greenBg:"rgba(34,197,94,0.12)",
  blue:"#3B82F6",   blueBg:"rgba(59,130,246,0.12)",
  purple:"#A855F7", purpleBg:"rgba(168,85,247,0.12)",
  red:"#EF4444",    redBg:"rgba(239,68,68,0.12)",
  amber:"#F59E0B",  amberBg:"rgba(245,158,11,0.12)",
  cyan:"#06B6D4",   cyanBg:"rgba(6,182,212,0.12)",
  orange:"#F97316", orangeBg:"rgba(249,115,22,0.12)",
  pink:"#EC4899",   pinkBg:"rgba(236,72,153,0.12)",
};

const ThemeCtx = createContext(DARK);
const useT = () => useContext(ThemeCtx);

const API_URL = import.meta.env.VITE_API_URL || "https://united-hub-3a6p.onrender.com";

function apiGet(token, path) {
  if (!API_URL || !token) return Promise.reject(new Error("API não configurada"));
  return fetch(`${API_URL}${path}`, { headers: { Authorization: `Bearer ${token}` } });
}
function apiPost(token, path, body) {
  if (!API_URL || !token) return Promise.reject(new Error("API não configurada"));
  return fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body ?? {}),
  });
}
function apiPut(token, path, body) {
  if (!API_URL || !token) return Promise.reject(new Error("API não configurada"));
  return fetch(`${API_URL}${path}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body ?? {}),
  });
}

/* ═══════════════════════════════════════════════
   Estilos (tags/cores) e navegação — dados vêm da API
═══════════════════════════════════════════════ */
const TYPE_TAG = {
  "Landing Page":{ c:C.blue,   bg:C.blueBg   },
  "Criativo":    { c:C.amber,  bg:C.amberBg  },
  "Campanha":    { c:C.purple, bg:C.purpleBg },
  "Vídeo":       { c:C.pink,   bg:C.pinkBg   },
  "Automação":   { c:C.cyan,   bg:C.cyanBg   },
  "Funil":       { c:C.orange, bg:C.orangeBg },
  "Estratégia":  { c:C.green,  bg:C.greenBg  },
  "Relatório":   { c:"#888",   bg:"rgba(128,128,128,0.12)" },
};
const PRIO_TAG = {
  "Alta":  { c:C.red,   bg:C.redBg   },
  "Média": { c:C.amber, bg:C.amberBg },
  "Baixa": { c:"#888",  bg:"rgba(128,128,128,0.1)" },
};

/* Dados de exemplo para testar o Kanban quando a API não retorna dados */
const KANBAN_SAMPLE = {
  columns: [
    { id: "backlog", label: "Backlog", dot: "#94A3B8", cards: [
      { id: "c1", title: "Brief da campanha Q2", type: "Campanha", priority: "Alta", owner: "Maria Silva", due: "15/03", comments: 2, files: 1 },
      { id: "c2", title: "Revisar landing de captação", type: "Landing Page", priority: "Média", owner: "João Santos", due: "18/03", comments: 0, files: 3 },
    ]},
    { id: "doing", label: "Em andamento", dot: "#3B82F6", cards: [
      { id: "c3", title: "Vídeo institucional 30s", type: "Vídeo", priority: "Alta", owner: "Ana Costa", due: "12/03", comments: 5, files: 2 },
      { id: "c4", title: "Automação de lead nurturing", type: "Automação", priority: "Média", owner: "Pedro Lima", due: "20/03", comments: 1, files: 0 },
    ]},
    { id: "review", label: "Revisão", dot: "#F59E0B", cards: [
      { id: "c5", title: "Criativos para Meta Ads", type: "Criativo", priority: "Alta", owner: "Maria Silva", due: "10/03", comments: 3, files: 4 },
    ]},
    { id: "done", label: "Concluído", dot: "#22C55E", cards: [
      { id: "c6", title: "Landing page produto X", type: "Landing Page", priority: "Baixa", owner: "João Santos", due: "05/03", comments: 0, files: 1 },
    ]},
  ],
};

const RPT_COLOR = { "Mensal":C.blue,"Campanha":C.purple,"Estratégico":C.amber,"Tráfego":C.cyan,"Crescimento":C.green };
const FMT_COLOR = { "Vídeo":C.blue,"Ebook":C.purple,"Guia":C.green,"Treinamento":C.amber };
const LVL_COLOR = { "Iniciante":C.green,"Intermediário":C.amber,"Avançado":C.red };
const NAV = [
  { id:"dashboard",  icon:"⬡",  label:"Dashboard"     },
  { id:"relatorios", icon:"◎",  label:"Relatórios"    },
  { id:"materiais",  icon:"◻",  label:"Materiais"     },
  { id:"reunioes",   icon:"◷",  label:"Reuniões",  b:2, locked:true },
  { id:"financeiro", icon:"◇",  label:"Financeiro"    },
  { id:"academy",    icon:"◆",  label:"Academy",       locked:true },
  { id:"suporte",    icon:"◉",  label:"Suporte",   b:1 },
  { id:"config",     icon:"⚙",  label:"Configurações" },
];

/* ═══════════════════════════════════════════════
   PRIMITIVES
═══════════════════════════════════════════════ */
function Card({ children, style = {}, lift = false }) {
  const t = useT();
  const [h, setH] = useState(false);
  return (
    <div
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        background: t.bg2,
        border: `1px solid ${h && lift ? t.bStrong : t.b1}`,
        borderRadius: 12,
        transition: "border-color .18s, box-shadow .18s, transform .18s",
        boxShadow: h && lift ? `0 8px 28px ${t.shadow}` : `0 1px 4px ${t.shadow}`,
        transform: h && lift ? "translateY(-2px)" : "none",
        ...style,
      }}
    >{children}</div>
  );
}

function Btn({ children, onClick, variant = "primary", size = "md" }) {
  const t = useT();
  const [h, setH] = useState(false);
  const v = {
    primary: { bg: h ? (t.isDark ? "#E0E0E0" : "#333") : t.accent, color: t.accentText, border: `1px solid ${t.accent}` },
    ghost:   { bg: h ? t.bg3 : "transparent", color: t.t2, border: `1px solid ${t.b1}` },
    subtle:  { bg: h ? t.bg4 : t.bg3,         color: t.t2, border: `1px solid ${t.b1}` },
  }[variant] || {};
  const pad = size === "sm" ? "5px 13px" : size === "lg" ? "11px 26px" : "8px 18px";
  return (
    <button onClick={onClick}
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ padding: pad, borderRadius: 8, cursor: "pointer", fontSize: size === "sm" ? 11 : 12,
        fontWeight: 700, background: v.bg, color: v.color, border: v.border, transition: "all .15s" }}>
      {children}
    </button>
  );
}

/* Badge — always colored */
const Tag = ({ label, color, bg }) => (
  <span style={{ display:"inline-flex", alignItems:"center", fontSize:10, fontWeight:700,
    padding:"3px 9px", borderRadius:5, letterSpacing:.5, textTransform:"uppercase",
    color, background: bg || `${color}15`, border:`1px solid ${color}22` }}>
    {label}
  </span>
);

const StatusBadge = ({ status }) => {
  const map = {
    "Pago":        { c:C.green,  bg:C.greenBg  },
    "Pendente":    { c:C.amber,  bg:C.amberBg  },
    "Vencido":     { c:C.red,    bg:C.redBg    },
    "Em análise":  { c:C.blue,   bg:C.blueBg   },
    "Concluído":   { c:C.green,  bg:C.greenBg  },
    "Confirmada":  { c:C.green,  bg:C.greenBg  },
    "Conectado":   { c:C.green,  bg:C.greenBg  },
    "Desconectado":{ c:C.red,    bg:C.redBg    },
  };
  const s = map[status] || { c:"#888", bg:"rgba(128,128,128,0.1)" };
  return <span style={{ fontSize:11, fontWeight:600, padding:"3px 10px", borderRadius:20, color:s.c, background:s.bg }}>{status}</span>;
};

const DeltaBadge = ({ delta, pos = true }) => (
  <span style={{ fontSize:10, fontWeight:700, padding:"3px 9px", borderRadius:5,
    color: pos ? C.green : C.red, background: pos ? C.greenBg : C.redBg }}>{delta}</span>
);

function FilterPill({ label, active, onClick }) {
  const t = useT();
  const [h, setH] = useState(false);
  return (
    <button onClick={onClick}
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ padding:"5px 13px", borderRadius:6, cursor:"pointer", fontSize:11, fontWeight:600,
        border: active ? `1px solid ${t.bStrong}` : `1px solid ${t.b1}`,
        background: active ? t.bg3 : (h ? t.bg3 : "transparent"),
        color: active ? t.t1 : t.t3, transition:"all .14s" }}>
      {label}
    </button>
  );
}
function FilterBar({ opts, active, onChange, label }) {
  const t = useT();
  return (
    <div style={{ display:"flex", alignItems:"center", gap:4, flexWrap:"wrap" }}>
      {label && <span style={{ color:t.t4, fontSize:9, fontWeight:700, letterSpacing:1.8, textTransform:"uppercase", marginRight:4 }}>{label}</span>}
      {opts.map(o => <FilterPill key={o} label={o} active={active===o} onClick={() => onChange(o)}/>)}
    </div>
  );
}
function PageHeader({ title, subtitle, action }) {
  const t = useT();
  return (
    <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:28, paddingBottom:20, borderBottom:`1px solid ${t.b1}` }}>
      <div>
        <h1 style={{ color:t.t1, fontSize:22, fontWeight:800, letterSpacing:-0.5 }}>{title}</h1>
        {subtitle && <p style={{ color:t.t3, fontSize:12, marginTop:5, lineHeight:1.6 }}>{subtitle}</p>}
      </div>
      {action && <div style={{ marginTop:2 }}>{action}</div>}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   VISUALIZATIONS
═══════════════════════════════════════════════ */
function BarChart({ data, period = "12m", dataKey = "leads" }) {
  const t = useT();
  const slice = { "7d":1,"30d":2,"90d":3,"12m":6 }[period] || 6;
  const items = data.slice(-slice);
  const max = Math.max(...items.map(d => d[dataKey]));
  return (
    <div style={{ display:"flex", alignItems:"flex-end", gap:7, height:72 }}>
      {items.map((d, i) => {
        const isLast = i === items.length - 1;
        const h = Math.max(5, (d[dataKey] / max) * 60);
        return (
          <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:5 }}>
            <div style={{ position:"relative", width:"100%", display:"flex", justifyContent:"center" }}>
              {isLast && (
                <div style={{ position:"absolute", bottom:"100%", marginBottom:5,
                  background:t.bg3, border:`1px solid ${t.b1}`, borderRadius:4,
                  padding:"2px 7px", color:t.t1, fontSize:9, fontWeight:700, whiteSpace:"nowrap" }}>
                  {d[dataKey].toLocaleString("pt-BR")}
                </div>
              )}
              <div style={{ width:"100%", borderRadius:"3px 3px 0 0", height:`${h}px`,
                background: isLast ? t.accent : t.bg4,
                opacity: isLast ? 1 : (t.isDark ? 1 : 0.5),
                transition:"height .7s cubic-bezier(.4,0,.2,1)" }}/>
            </div>
            <span style={{ fontSize:9, color:t.t4, fontWeight:500 }}>{d.m}</span>
          </div>
        );
      })}
    </div>
  );
}

function FunnelViz({ data }) {
  const t = useT();
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
      {data.map((item, i) => (
        <div key={i} style={{ display:"flex", alignItems:"center", gap:14 }}>
          <span style={{ width:72, textAlign:"right", fontSize:11, color:t.t3, flexShrink:0 }}>{item.s}</span>
          <div style={{ flex:1, height:32, background:t.bg3, borderRadius:6, overflow:"hidden" }}>
            <div style={{ height:"100%", width:`${item.p}%`,
              background: t.isDark ? `rgba(255,255,255,${0.14 - i*0.025})` : `rgba(0,0,0,${0.12 - i*0.02})`,
              borderRadius:6, display:"flex", alignItems:"center", paddingLeft:10,
              transition:"width 1s cubic-bezier(.4,0,.2,1)" }}>
              <span style={{ fontSize:11, fontWeight:700, color: i < 2 ? t.t1 : t.t2, whiteSpace:"nowrap" }}>
                {item.v.toLocaleString("pt-BR")}
              </span>
            </div>
          </div>
          <span style={{ width:34, textAlign:"right", fontSize:11, color:t.t2, fontWeight:700 }}>{item.p}%</span>
        </div>
      ))}
    </div>
  );
}

function ScoreRing({ score }) {
  const t = useT();
  const r = 52, circ = 2 * Math.PI * r, fill = (score / 100) * circ;
  return (
    <svg width="128" height="128" viewBox="0 0 140 140">
      <circle cx="70" cy="70" r={r} fill="none" stroke={t.bg4} strokeWidth="9"/>
      <circle cx="70" cy="70" r={r} fill="none" stroke={t.accent} strokeWidth="9"
        strokeDasharray={`${fill} ${circ}`} strokeLinecap="round" transform="rotate(-90 70 70)"
        style={{ transition:"stroke-dasharray 1.2s ease" }}/>
      <text x="70" y="64" textAnchor="middle" fill={t.t1} fontSize="26" fontWeight="800">{score}</text>
      <text x="70" y="82" textAnchor="middle" fill={t.t3} fontSize="10">Score</text>
    </svg>
  );
}

/* ═══════════════════════════════════════════════
   THEME TOGGLE BUTTON
═══════════════════════════════════════════════ */
function ThemeToggle({ isDark, onToggle }) {
  const t = useT();
  const [h, setH] = useState(false);
  return (
    <button
      onClick={onToggle}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      title={isDark ? "Modo Claro" : "Modo Escuro"}
      style={{
        width: 60, height: 30, borderRadius: 15,
        background: h ? t.bg4 : t.bg3,
        border: `1px solid ${t.bStrong}`,
        cursor: "pointer", position: "relative",
        transition: "all .2s", flexShrink: 0,
        display: "flex", alignItems: "center",
        padding: "0 4px",
      }}
    >
      {/* track icons */}
      <span style={{ position:"absolute", left:7,  fontSize:11, opacity: isDark ? 0.3 : 1, transition:"opacity .2s" }}>☀</span>
      <span style={{ position:"absolute", right:7, fontSize:11, opacity: isDark ? 1 : 0.3, transition:"opacity .2s" }}>☽</span>
      {/* pill */}
      <div style={{
        width: 22, height: 22, borderRadius: "50%",
        background: t.accent,
        position: "absolute",
        left: isDark ? 33 : 4,
        transition: "left .22s cubic-bezier(.4,0,.2,1)",
        boxShadow: `0 1px 5px ${t.shadow}`,
      }}/>
    </button>
  );
}

/* ═══════════════════════════════════════════════
   MODE SWITCH
═══════════════════════════════════════════════ */
function ModeSwitch({ mode, onChange, canProducao = true, canPerformance = true, performanceDisabledReason = "" }) {
  const t = useT();
  if (!canProducao && !canPerformance) return null;
  return (
    <div style={{ position:"relative", display:"inline-flex", background:t.bg3, border:`1px solid ${t.b1}`, borderRadius:11, padding:3, gap:1 }}>
      <div style={{ position:"absolute", top:3, bottom:3, left: mode==="producao" ? 3 : "calc(50% + 1px)", width:"calc(50% - 4px)",
        background:t.accent, borderRadius:9, transition:"left .26s cubic-bezier(.4,0,.2,1)", boxShadow:`0 1px 6px ${t.shadow}` }}/>
      {[{ id:"producao",label:"Produção",icon:"⬡" },{ id:"performance",label:"Performance",icon:"◈" }].map(opt => (
        <button
          key={opt.id}
          onClick={() => onChange(opt.id)}
          disabled={(opt.id === "producao" && !canProducao) || (opt.id === "performance" && !canPerformance)}
          title={opt.id === "performance" && !canPerformance ? (performanceDisabledReason || "Recurso indisponível") : ""}
          style={{ position:"relative", zIndex:1, display:"flex", alignItems:"center", gap:6,
            padding:"8px 20px", background:"transparent", border:"none", borderRadius:9,
            cursor: ((opt.id === "producao" && !canProducao) || (opt.id === "performance" && !canPerformance)) ? "not-allowed" : "pointer",
            opacity: ((opt.id === "producao" && !canProducao) || (opt.id === "performance" && !canPerformance)) ? 0.55 : 1,
            minWidth:128, justifyContent:"center", transition:"all .2s" }}
        >
          <span style={{ fontSize:12, color: mode===opt.id ? t.accentText : t.t3, transition:"color .22s" }}>{opt.icon}</span>
          <span style={{ fontSize:12, fontWeight:700, color: mode===opt.id ? t.accentText : t.t3, transition:"color .22s" }}>{opt.label}</span>
          {opt.id === "performance" && !canPerformance && (
            <span style={{ fontSize: 11, color: mode===opt.id ? t.accentText : t.t3, marginLeft: 2 }} title={performanceDisabledReason || "Recurso indisponível"}>🔒</span>
          )}
        </button>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   PAGE: DASHBOARD (dados da API: /api/cliente/dashboard/*)
═══════════════════════════════════════════════ */
function DashboardPage({ onNav }) {
  const t = useT();
  const { token } = useAuth();
  const [kpis, setKpis] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [funnel, setFunnel] = useState([]);
  const [score, setScore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token || !API_URL) { setLoading(false); return; }
    let cancelled = false;
    const q = [
      apiGet(token, "/api/cliente/dashboard/kpis").then(r => r.ok ? r.json().catch(() => []) : []).catch(() => []),
      apiGet(token, "/api/cliente/dashboard/chart").then(r => r.ok ? r.json().catch(() => []) : []).catch(() => []),
      apiGet(token, "/api/cliente/dashboard/funnel").then(r => r.ok ? r.json().catch(() => []) : []).catch(() => []),
      apiGet(token, "/api/cliente/dashboard/score").then(r => r.ok ? r.json().catch(() => null) : null).catch(() => null),
    ];
    Promise.all(q).then(([k, c, f, s]) => {
      if (cancelled) return;
      const kpiRaw = Array.isArray(k) ? k : (k?.items ?? k?.kpis ?? k?.data ?? []);
      setKpis(Array.isArray(kpiRaw) ? kpiRaw : []);
      const cd = Array.isArray(c) ? c : (c?.points ?? c?.items ?? c?.data ?? []);
      setChartData(Array.isArray(cd) ? cd : []);
      const funRaw = Array.isArray(f) ? f : (f?.stages ?? f?.items ?? f?.data ?? []);
      setFunnel(Array.isArray(funRaw) ? funRaw : []);
      const scoreVal = s?.score ?? s?.Score ?? (s != null && typeof s === "object" && "score" in s ? s.score : null);
      setScore(scoreVal != null ? scoreVal : (s != null && typeof s === "object" ? s : null));
    }).catch(() => { if (!cancelled) setError("Erro ao carregar dashboard"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [token]);

  const normKpi = (k) => ({ label: k.label ?? k.Label ?? "—", value: k.value ?? k.Value ?? "—", delta: k.delta ?? k.Delta ?? "", sub: k.sub ?? k.Sub ?? "" });
  const kpiList = kpis.length ? kpis.map(normKpi) : [
    { label: "Leads Gerados", value: "—", delta: "", sub: "" },
    { label: "Investimento", value: "—", delta: "", sub: "" },
    { label: "CAC", value: "—", delta: "", sub: "" },
    { label: "ROI", value: "—", delta: "", sub: "" },
  ];
  const chartPoints = (chartData.length ? chartData : []).map((x) => ({
    m: x.m ?? x.M ?? x.label ?? x.Label ?? x.period ?? x.Period ?? "—",
    leads: x.leads ?? x.Leads ?? x.value ?? x.Value ?? 0,
    inv: x.inv ?? x.Inv ?? x.investimento ?? 0,
    conv: x.conv ?? x.Conv ?? x.conversoes ?? 0,
  }));
  const funnelStages = (funnel.length ? funnel : []).map((x) => ({
    s: x.s ?? x.S ?? x.stage ?? x.Stage ?? x.label ?? x.Label ?? "—",
    v: x.v ?? x.V ?? x.value ?? x.Value ?? 0,
    p: x.p ?? x.P ?? x.percent ?? 0,
  }));

  if (loading) return <div style={{ padding: 24, color: t.t3, fontSize: 13 }}>Carregando dashboard...</div>;
  if (error) return <div style={{ padding: 24, color: C.red, fontSize: 13 }}>{error}</div>;

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Visão geral da sua conta."
        action={<div style={{ display:"flex", gap:8 }}><Btn variant="ghost" size="sm">↓ Exportar</Btn><Btn size="sm">+ Solicitação</Btn></div>}/>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:16 }}>
        {kpiList.slice(0, 4).map((k,i) => (
          <Card key={i} lift style={{ padding:"20px 22px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:16 }}>
              <span style={{ color:t.t3, fontSize:11 }}>{k.label}</span>
              {k.delta && <DeltaBadge delta={k.delta}/>}
            </div>
            <div style={{ color:t.t1, fontSize:24, fontWeight:800, letterSpacing:-0.5 }}>{k.value}</div>
            <div style={{ color:t.t4, fontSize:10, marginTop:4 }}>{k.sub || ""}</div>
          </Card>
        ))}
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 260px", gap:12, marginBottom:12 }}>
        <Card style={{ padding:"22px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:20 }}>
            <div><div style={{ color:t.t1, fontWeight:700, fontSize:13 }}>Leads por Período</div><div style={{ color:t.t3, fontSize:11, marginTop:2 }}>Dados da API</div></div>
          </div>
          <BarChart data={chartPoints.length ? chartPoints : []}/>
        </Card>
        <Card style={{ padding:"22px" }}>
          <div style={{ color:t.t1, fontWeight:700, fontSize:13, marginBottom:20 }}>Funil de Aquisição</div>
          <FunnelViz data={funnelStages}/>
        </Card>
        <Card style={{ padding:"22px", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
          <div style={{ color:t.t3, fontSize:9, letterSpacing:2.5, textTransform:"uppercase", marginBottom:14 }}>Growth Score</div>
          <ScoreRing score={score != null ? Number(score) : 0}/>
          <div style={{ marginTop:14, textAlign:"center" }}>
            <div style={{ color:t.t1, fontSize:12, fontWeight:700 }}>Performance</div>
            <div style={{ color:t.t3, fontSize:10, marginTop:3 }}>Dados da API</div>
          </div>
        </Card>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
        <Card style={{ padding:"22px" }}>
          <div style={{ color:t.t1, fontWeight:700, fontSize:13, marginBottom:18 }}>Central de Insights</div>
          <div style={{ color:t.t3, fontSize:12 }}>Sem insights no momento.</div>
        </Card>
        <Card style={{ padding:"22px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
            <div style={{ color:t.t1, fontWeight:700, fontSize:13 }}>Próximas Entregas</div>
            <button onClick={() => onNav("producao")} style={{ background:"transparent", border:"none", color:t.t3, fontSize:11, cursor:"pointer", fontWeight:600 }}>Ver tudo →</button>
          </div>
          <div style={{ color:t.t3, fontSize:12 }}>Consulte a aba Produção para ver as entregas.</div>
        </Card>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   PAGE: PRODUÇÃO — Visual Trello (listas + cards)
═══════════════════════════════════════════════ */
const LIST_WIDTH_TRELLO = 272;
function KanbanCard({ card, draggable, onDragStart, onClick }) {
  const t = useT();
  const [h, setH] = useState(false);
  const tt = TYPE_TAG[card.type] || { c:"#888", bg:"rgba(128,128,128,.1)" };
  const pt = PRIO_TAG[card.priority] || { c:"#888", bg:"rgba(128,128,128,.1)" };
  const ownerStr = typeof card.owner === "string" ? card.owner : (card.owner?.name || card.owner_uuid || "—");
  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(card); } } : undefined}
      draggable={!!draggable}
      onDragStart={draggable ? (e) => { e.dataTransfer.setData("text/plain", JSON.stringify({ cardId: card.id, columnId: card.column_id })); e.dataTransfer.effectAllowed = "move"; onDragStart?.(e); } : undefined}
      onClick={onClick ? () => onClick(card) : undefined}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        background: t.isDark ? "#252628" : "#fff",
        border: `1px solid ${t.isDark ? "rgba(255,255,255,.08)" : "rgba(0,0,0,.06)"}`,
        borderRadius: 8,
        padding: 0,
        cursor: draggable ? "grab" : "pointer",
        boxShadow: h ? (t.isDark ? "0 4px 12px rgba(0,0,0,.4)" : "0 2px 8px rgba(0,0,0,.12)") : "none",
        transition: "box-shadow .15s, transform .15s",
        transform: h ? "translateY(-1px)" : "none",
      }}
    >
      {/* Labels no topo (barras estilo Trello) */}
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", padding: "8px 12px 0" }}>
        <span style={{ height: 8, borderRadius: 4, minWidth: 40, background: tt.c, opacity: 0.9 }}/>
        <span style={{ height: 8, borderRadius: 4, minWidth: 32, background: pt.c, opacity: 0.9 }}/>
      </div>
      <div style={{ padding: "8px 12px 12px" }}>
        <div style={{ color: t.t1, fontSize: 14, fontWeight: 600, lineHeight: 1.4, marginBottom: 10 }}>{card.title || card.titulo || "—"}</div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {(card.comments ?? card.comentarios ?? 0) > 0 && <span style={{ fontSize: 12, color: t.t4 }} title="Comentários">💬 {card.comments ?? card.comentarios}</span>}
            {(card.files ?? card.arquivos ?? 0) > 0 && <span style={{ fontSize: 12, color: t.t4 }} title="Anexos">📎 {card.files ?? card.arquivos}</span>}
          </div>
          <span style={{ fontSize: 11, color: t.t4, fontWeight: 600 }}>{card.due || card.prazo || "—"}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8 }}>
          <div style={{ width: 24, height: 24, borderRadius: "50%", background: t.bg4, border: `1px solid ${t.b1}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 9, fontWeight: 800, color: t.t2 }}>{ownerStr.split(" ").map(p => p[0]).join("").slice(0, 2) || "?"}</span>
          </div>
          <span style={{ fontSize: 11, color: t.t3 }}>{ownerStr}</span>
        </div>
      </div>
    </div>
  );
}
function ProducaoPage() {
  const t = useT();
  const { token } = useAuth();
  const [filter, setFilter] = useState("Todos");
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [usandoExemplo, setUsandoExemplo] = useState(false);
  const [modalSolicitacao, setModalSolicitacao] = useState(false);
  const [formSolicitacao, setFormSolicitacao] = useState({ titulo: "", tipo: "Campanha", prioridade: "Média", descricao: "" });
  const [submitError, setSubmitError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedCard, setSelectedCard] = useState(null);

  const loadProducao = () => {
    if (!API_URL || !token) return Promise.resolve();
    return apiGet(token, "/api/cliente/producao")
      .then((res) => res.ok ? res.json().catch(() => ({})) : Promise.reject(new Error("Erro ao carregar")))
      .then((data) => {
        const cols = Array.isArray(data?.columns) ? data.columns : Array.isArray(data) ? data : [];
        setColumns(cols.length ? cols : KANBAN_SAMPLE.columns);
        setUsandoExemplo(cols.length === 0);
      })
      .catch(() => { setColumns(KANBAN_SAMPLE.columns); setUsandoExemplo(true); });
  };

  useEffect(() => {
    let cancelled = false;
    if (!API_URL || !token) {
      setColumns(KANBAN_SAMPLE.columns);
      setUsandoExemplo(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    setUsandoExemplo(false);
    apiGet(token, "/api/cliente/producao")
      .then((res) => {
        if (!res.ok) throw new Error(res.status === 403 ? "Sem permissão para Produção" : "Erro ao carregar produção");
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        const cols = Array.isArray(data?.columns) ? data.columns : Array.isArray(data) ? data : [];
        if (cols.length === 0) {
          setColumns(KANBAN_SAMPLE.columns);
          setUsandoExemplo(true);
        } else {
          setColumns(cols);
          setUsandoExemplo(false);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e.message || "Erro ao carregar produção");
          setColumns(KANBAN_SAMPLE.columns);
          setUsandoExemplo(true);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [token]);

  const handleNovaSolicitacao = (e) => {
    e?.preventDefault?.();
    if (!formSolicitacao.titulo?.trim()) { setSubmitError("Informe o título da solicitação."); return; }
    setSubmitError(null);
    setSubmitting(true);
    apiPost(token, "/api/cliente/producao/solicitacoes", {
      titulo: formSolicitacao.titulo.trim(),
      tipo: formSolicitacao.tipo,
      prioridade: formSolicitacao.prioridade,
      descricao: formSolicitacao.descricao?.trim() || undefined,
    })
      .then((res) => {
        if (!res.ok) return res.json().then((d) => Promise.reject(new Error(d?.message || d?.error || "Erro ao enviar")));
        setModalSolicitacao(false);
        setFormSolicitacao({ titulo: "", tipo: "Campanha", prioridade: "Média", descricao: "" });
        return loadProducao();
      })
      .catch((err) => setSubmitError(err?.message || "Erro ao enviar"))
      .finally(() => setSubmitting(false));
  };

  const cols = columns.map((c) => ({
    ...c,
    cards: (c.cards || []).filter((x) => filter === "Todos" || x.type === filter),
  }));

  return (
    <div>
      <PageHeader title="Produção" subtitle="Esteira de execução de todas as entregas da sua conta."
        action={<Btn onClick={() => { setModalSolicitacao(true); setSubmitError(null); }}>+ Nova Solicitação</Btn>}/>
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:22 }}>
        <FilterBar opts={["Todos","Campanha","Criativo","Vídeo","Landing Page","Automação"]} active={filter} onChange={setFilter} label="TIPO"/>
        <div style={{ flex:1 }}/>
        <Btn variant="ghost" size="sm">⚙ Filtros</Btn>
      </div>
      {error && (
        <div style={{ padding:12, marginBottom:16, background:C.redBg, color:C.red, borderRadius:10, fontSize:12 }}>{error}</div>
      )}
      {usandoExemplo && (
        <div style={{ padding:10, marginBottom:14, background:C.blueBg, color:C.blue, borderRadius:8, fontSize:12, display:"flex", alignItems:"center", gap:8 }}>
          <span>ℹ️</span>
          <span><strong>Dados de exemplo:</strong> o Kanban está exibindo cards fictícios para você testar a tela. Quando o backend implementar <code style={{ background:"rgba(0,0,0,0.06)", padding:"2px 6px", borderRadius:4 }}>GET /api/cliente/producao</code>, os dados reais aparecerão aqui.</span>
        </div>
      )}
      {loading ? (
        <div style={{ padding:24, textAlign:"center", color:t.t3, fontSize:13 }}>Carregando produção...</div>
      ) : (
        <div style={{ background: t.isDark ? "#1e2128" : "#f4f5f7", borderRadius: 12, padding: "16px 12px", overflowX: "auto", minHeight: 420 }}>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            {cols.map((col) => (
              <div key={col.id} style={{ width: LIST_WIDTH_TRELLO, flexShrink: 0, background: t.isDark ? "#2c2e33" : "#ebecf0", borderRadius: 8, padding: 8, maxHeight: "calc(100vh - 280px)", display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, padding: "4px 4px 0" }}>
                  <span style={{ color: t.t1, fontSize: 14, fontWeight: 700 }}>{col.label}</span>
                  <span style={{ color: t.t3, fontSize: 12, fontWeight: 600, background: t.isDark ? "rgba(255,255,255,.08)" : "rgba(0,0,0,.06)", padding: "2px 8px", borderRadius: 10 }}>{(col.cards || []).length}</span>
                </div>
                <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
                  {(col.cards || []).map((c) => <KanbanCard key={c.id ?? c.uuid} card={{ ...c, column_id: c.column_id || col.id }} onClick={(card) => setSelectedCard(card)}/>)}
                  {(col.cards || []).length === 0 && (
                    <div style={{ padding: "20px 12px", textAlign: "center", color: t.t4, fontSize: 12 }}>Nenhum card</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal Detalhe do card (somente leitura — cliente só visualiza) */}
      {selectedCard && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.6)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", backdropFilter:"blur(4px)" }} onClick={() => setSelectedCard(null)}>
          <div onClick={e => e.stopPropagation()} style={{ width:"100%", maxWidth:520, maxHeight:"90vh", overflowY:"auto", background:t.bg2, border:`1px solid ${t.b1}`, borderRadius:14, boxShadow:"0 24px 64px rgba(0,0,0,.5)" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"16px 20px", borderBottom:`1px solid ${t.b1}` }}>
              <span style={{ color:t.t1, fontSize:15, fontWeight:700 }}>Detalhe do card</span>
              <button type="button" onClick={() => setSelectedCard(null)} style={{ background:"none", border:"none", color:t.t3, fontSize:20, cursor:"pointer" }} aria-label="Fechar">×</button>
            </div>
            <div style={{ padding:20 }}>
              <div style={{ marginBottom:16 }}>
                <div style={{ color:t.t4, fontSize:10, fontWeight:700, letterSpacing:1.5, textTransform:"uppercase", marginBottom:4 }}>Título</div>
                <div style={{ color:t.t1, fontSize:16, fontWeight:600 }}>{selectedCard.title || selectedCard.titulo || "—"}</div>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:16, marginBottom:16 }}>
                <div>
                  <div style={{ color:t.t4, fontSize:10, fontWeight:700, letterSpacing:1.5, textTransform:"uppercase", marginBottom:4 }}>Tipo</div>
                  <div style={{ color:t.t1, fontSize:13 }}>{selectedCard.type || selectedCard.tipo || "—"}</div>
                </div>
                <div>
                  <div style={{ color:t.t4, fontSize:10, fontWeight:700, letterSpacing:1.5, textTransform:"uppercase", marginBottom:4 }}>Prioridade</div>
                  <div style={{ color:t.t1, fontSize:13 }}>{selectedCard.priority || selectedCard.prioridade || "—"}</div>
                </div>
                <div>
                  <div style={{ color:t.t4, fontSize:10, fontWeight:700, letterSpacing:1.5, textTransform:"uppercase", marginBottom:4 }}>Prazo</div>
                  <div style={{ color:t.t1, fontSize:13 }}>{selectedCard.due || selectedCard.prazo || "—"}</div>
                </div>
              </div>
              {(selectedCard.description || selectedCard.descricao) && (
                <div style={{ marginBottom:16 }}>
                  <div style={{ color:t.t4, fontSize:10, fontWeight:700, letterSpacing:1.5, textTransform:"uppercase", marginBottom:4 }}>Descrição</div>
                  <div style={{ color:t.t2, fontSize:13, lineHeight:1.6, whiteSpace:"pre-wrap" }}>{selectedCard.description || selectedCard.descricao}</div>
                </div>
              )}
              <div style={{ marginBottom:16 }}>
                <div style={{ color:t.t4, fontSize:10, fontWeight:700, letterSpacing:1.5, textTransform:"uppercase", marginBottom:8 }}>Comentários</div>
                {(() => {
                  const list = selectedCard.comments_list ?? selectedCard.comments ?? [];
                  const arr = Array.isArray(list) ? list : [];
                  return arr.length > 0 ? arr.map((com, i) => (
                    <div key={i} style={{ padding:"8px 12px", background:t.bg3, borderRadius:8, marginBottom:6, fontSize:12, color:t.t1 }}>{typeof com === "string" ? com : (com.content || com.texto || com.body || "—")}</div>
                  )) : <div style={{ color:t.t4, fontSize:12 }}>Nenhum comentário.</div>;
                })()}
              </div>
              <div style={{ display:"flex", justifyContent:"flex-end" }}>
                <Btn variant="ghost" onClick={() => setSelectedCard(null)}>Fechar</Btn>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nova Solicitação (cliente pede; vira card no Kanban do admin) */}
      {modalSolicitacao && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.6)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", backdropFilter:"blur(4px)" }} onClick={() => !submitting && setModalSolicitacao(false)}>
          <div onClick={e => e.stopPropagation()} style={{ width:"100%", maxWidth:480, maxHeight:"90vh", overflowY:"auto", background:t.bg2, border:`1px solid ${t.b1}`, borderRadius:14, boxShadow:"0 24px 64px rgba(0,0,0,.5)" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"16px 20px", borderBottom:`1px solid ${t.b1}` }}>
              <span style={{ color:t.t1, fontSize:15, fontWeight:700 }}>Nova Solicitação</span>
              <button type="button" onClick={() => !submitting && setModalSolicitacao(false)} style={{ background:"none", border:"none", color:t.t3, fontSize:20, cursor:"pointer" }}>×</button>
            </div>
            <form onSubmit={handleNovaSolicitacao} style={{ padding:20 }}>
              {submitError && <div style={{ marginBottom:12, padding:10, background:C.redBg, color:C.red, borderRadius:8, fontSize:12 }}>{submitError}</div>}
              <div style={{ marginBottom:14 }}>
                <label style={{ color:t.t3, fontSize:9, fontWeight:800, letterSpacing:1.5, textTransform:"uppercase", display:"block", marginBottom:6 }}>Título *</label>
                <input value={formSolicitacao.titulo} onChange={e => setFormSolicitacao(f => ({ ...f, titulo: e.target.value }))} placeholder="Ex: Criativos para campanha de verão" required
                  style={{ width:"100%", padding:"10px 14px", background:t.bg3, border:`1px solid ${t.b1}`, borderRadius:8, color:t.t1, fontSize:12, outline:"none" }}/>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:14 }}>
                <div>
                  <label style={{ color:t.t3, fontSize:9, fontWeight:800, letterSpacing:1.5, textTransform:"uppercase", display:"block", marginBottom:6 }}>Tipo</label>
                  <select value={formSolicitacao.tipo} onChange={e => setFormSolicitacao(f => ({ ...f, tipo: e.target.value }))}
                    style={{ width:"100%", padding:"10px 14px", background:t.bg3, border:`1px solid ${t.b1}`, borderRadius:8, color:t.t1, fontSize:12, outline:"none" }}>
                    <option value="Campanha">Campanha</option>
                    <option value="Criativo">Criativo</option>
                    <option value="Vídeo">Vídeo</option>
                    <option value="Landing Page">Landing Page</option>
                    <option value="Automação">Automação</option>
                  </select>
                </div>
                <div>
                  <label style={{ color:t.t3, fontSize:9, fontWeight:800, letterSpacing:1.5, textTransform:"uppercase", display:"block", marginBottom:6 }}>Prioridade</label>
                  <select value={formSolicitacao.prioridade} onChange={e => setFormSolicitacao(f => ({ ...f, prioridade: e.target.value }))}
                    style={{ width:"100%", padding:"10px 14px", background:t.bg3, border:`1px solid ${t.b1}`, borderRadius:8, color:t.t1, fontSize:12, outline:"none" }}>
                    <option value="Baixa">Baixa</option>
                    <option value="Média">Média</option>
                    <option value="Alta">Alta</option>
                  </select>
                </div>
              </div>
              <div style={{ marginBottom:18 }}>
                <label style={{ color:t.t3, fontSize:9, fontWeight:800, letterSpacing:1.5, textTransform:"uppercase", display:"block", marginBottom:6 }}>Descrição (opcional)</label>
                <textarea value={formSolicitacao.descricao} onChange={e => setFormSolicitacao(f => ({ ...f, descricao: e.target.value }))} rows={3} placeholder="Detalhes do que você precisa..."
                  style={{ width:"100%", padding:"10px 14px", background:t.bg3, border:`1px solid ${t.b1}`, borderRadius:8, color:t.t1, fontSize:12, outline:"none", resize:"vertical" }}/>
              </div>
              <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
                <Btn variant="ghost" type="button" onClick={() => !submitting && setModalSolicitacao(false)}>Cancelar</Btn>
                <Btn type="submit" disabled={submitting}>{submitting ? "Enviando…" : "Enviar solicitação"}</Btn>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   PAGE: PERFORMANCE (dados da API)
═══════════════════════════════════════════════ */
const CANAL_LABELS_CLIENT = { meta_ads: "Meta Ads", google_ads: "Google Ads", organico: "Orgânico", outros: "Outros" };

function PerformancePage() {
  const t = useT();
  const { token, user } = useAuth();
  const [planoNome, setPlanoNome] = useState("");
  const [planoLoading, setPlanoLoading] = useState(true);
  const [planoError, setPlanoError] = useState(false);
  const normPlan = (v) => String(v || "").trim().toLowerCase();
  const isStarterPlan = (v) => {
    const s = normPlan(v);
    return s === "starter" || s.includes("starter");
  };
  const baseCanPerformance = user?.can_performance === true;
  const planFromUser = user?.plano ?? user?.plan ?? user?.plano_nome ?? user?.plan_name ?? user?.planoName;
  const isStarter = isStarterPlan(planoNome) || isStarterPlan(planFromUser);
  // Segurança: se o plano ainda não carregou, não libera Performance.
  // Regra de negócio: Starter bloqueia. Growth+ libera (desde que can_performance=true).
  // Não bloqueie Growth por atraso/erro ao carregar o plano; use o carregamento apenas para mensagem.
  const canPerformance = baseCanPerformance && !isStarter;
  const [channel, setChannel] = useState("Todos");
  const [period, setPeriod] = useState("12m");
  const [kpis, setKpis] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [funnel, setFunnel] = useState([]);
  const [performanceChannels, setPerformanceChannels] = useState(null); // de GET /api/auth/me (user) ou GET /api/cliente/config/perfil
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!token || !API_URL) { setPlanoLoading(false); return; }
    let cancelled = false;
    setPlanoLoading(true);
    setPlanoError(false);
    apiGet(token, "/api/cliente/financeiro/plano")
      .then(r => r.ok ? r.json().catch(() => null) : null)
      .then((pl) => {
        if (cancelled) return;
        const nome = pl?.nome ?? pl?.plano ?? pl?.name ?? pl?.plan ?? pl?.data?.nome ?? pl?.data?.plano ?? "";
        const nomeStr = String(nome || "").trim();
        if (!nomeStr) throw new Error("plano vazio");
        setPlanoNome(nomeStr);
      })
      .catch(() => { if (!cancelled) setPlanoError(true); })
      .finally(() => { if (!cancelled) setPlanoLoading(false); });
    return () => { cancelled = true; };
  }, [token]);

  useEffect(() => {
    if (!canPerformance) { setLoading(false); return; }
    if (!token || !API_URL) { setLoading(false); return; }
    let cancelled = false;
    const pathChart = `/api/cliente/dashboard/chart${period ? `?period=${period}` : ""}`;
    // performance_channels: backend devolve na raiz em GET /api/auth/me (user) e GET /api/cliente/config/perfil (cliente). Ver docs/performance-channels-api.md.
    const getPerfil = (path) => apiGet(token, path).then(r => r.ok ? r.json().catch(() => ({})) : {}).catch(() => ({}));
    const toSnake = (s) => String(s || "").replace(/([A-Z])/g, "_$1").toLowerCase().replace(/^_/, "") || s;
    const extractPc = (obj) => {
      if (!obj || typeof obj !== "object") return null;
      const pc = obj.performance_channels ?? obj.performanceChannels ?? obj.PerformanceChannels
        ?? obj.data?.performance_channels ?? obj.data?.user?.performance_channels ?? obj.data?.cliente?.performance_channels
        ?? obj.client?.performance_channels ?? obj.cliente?.performance_channels ?? obj.user?.performance_channels ?? null;
      if (!pc || typeof pc !== "object" || Array.isArray(pc)) return null;
      const keysMap = { meta_ads: ["meta_ads", "metaAds", "Meta_ads", "MetaAds"], google_ads: ["google_ads", "googleAds", "Google_ads", "GoogleAds"], organico: ["organico", "Organico"], outros: ["outros", "Outros"] };
      const normalized = {};
      const pick = (raw) => {
        if (!raw || typeof raw !== "object") return null;
        const g = raw.gasto ?? raw.Gasto ?? raw.gasto_val ?? "";
        const l = raw.leads ?? raw.Leads ?? "";
        const c = raw.conversoes ?? raw.Conversoes ?? "";
        if (g === "" && l === "" && c === "") return null;
        return { gasto: g, leads: l, conversoes: c };
      };
      Object.keys(keysMap).forEach((stdKey) => {
        const variants = keysMap[stdKey];
        const raw = variants.map((v) => pc[v]).find((x) => x != null && typeof x === "object");
        const val = pick(raw);
        if (val) normalized[stdKey] = val;
      });
      Object.keys(pc).forEach((k) => {
        const stdKey = toSnake(k);
        if (normalized[stdKey]) return;
        const raw = pc[k];
        const val = pick(raw);
        if (val) normalized[stdKey] = val;
      });
      return Object.keys(normalized).length ? normalized : null;
    };
    const getAuthMe = () => apiGet(token, "/api/auth/me").then(r => r.ok ? r.json().catch(() => ({})) : {}).catch(() => ({}));
    Promise.all([
      apiGet(token, "/api/cliente/dashboard/kpis").then(r => r.ok ? r.json().catch(() => []) : []).catch(() => []),
      apiGet(token, pathChart).then(r => r.ok ? r.json().catch(() => []) : []).catch(() => []),
      apiGet(token, "/api/cliente/dashboard/funnel").then(r => r.ok ? r.json().catch(() => []) : []).catch(() => []),
      getPerfil("/api/cliente/config/perfil"),
      getAuthMe(),
    ]).then(([k, c, f, perfilRes, authMeRes]) => {
      if (cancelled) return;
      const kpiRaw = Array.isArray(k) ? k : (k?.items ?? k?.kpis ?? k?.data ?? []);
      setKpis(Array.isArray(kpiRaw) ? kpiRaw : []);
      const cd = Array.isArray(c) ? c : (c?.points ?? c?.items ?? c?.data ?? []);
      setChartData(Array.isArray(cd) ? cd : []);
      const funRaw = Array.isArray(f) ? f : (f?.stages ?? f?.items ?? f?.data ?? []);
      setFunnel(Array.isArray(funRaw) ? funRaw : []);
      const pcPerfil = extractPc(perfilRes);
      const pcAuthMe = extractPc(authMeRes);
      const pcUser = extractPc(user);
      setPerformanceChannels(pcPerfil || pcAuthMe || pcUser || null);
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [token, period, user, refreshKey, canPerformance]);

  const normKpiPerf = (k) => ({ label: k.label ?? k.Label ?? "—", value: k.value ?? k.Value ?? "—", delta: k.delta ?? k.Delta ?? "", sub: k.sub ?? k.Sub ?? "" });
  const kpisFromApi = kpis.length ? kpis.map(normKpiPerf) : [];
  const hasChannelData = performanceChannels && Object.keys(performanceChannels).length > 0;
  const getChVal = (ch, field) => {
      const v = ch?.[field] ?? ch?.[field === "gasto" ? "Gasto" : field === "leads" ? "Leads" : "Conversoes"];
      if (v == null || v === "") return 0;
      if (typeof v === "number" && !Number.isNaN(v)) return v;
      const s = String(v).trim().replace(/\s/g, "");
      if (field === "gasto") { const n = Number(s.replace(/\./g, "").replace(",", ".")); return Number.isNaN(n) ? 0 : n; }
      const n = Number(s.replace(/\D/g, ""));
      return Number.isNaN(n) ? 0 : n;
    };
  const totalsFromChannels = hasChannelData ? (() => {
    let leads = 0, conversoes = 0, gasto = 0;
    Object.keys(performanceChannels || {}).forEach((key) => {
      const ch = performanceChannels[key] || {};
      leads += getChVal(ch, "leads");
      conversoes += getChVal(ch, "conversoes");
      gasto += getChVal(ch, "gasto");
    });
    return { leads, conversoes, gasto };
  })() : null;
  const kpiList = kpisFromApi.length ? kpisFromApi : (totalsFromChannels ? [
    { label: "Leads", value: totalsFromChannels.leads.toLocaleString("pt-BR"), delta: "", sub: "Total dos canais" },
    { label: "Conversões", value: totalsFromChannels.conversoes.toLocaleString("pt-BR"), delta: "", sub: "Total dos canais" },
    { label: "Gasto", value: totalsFromChannels.gasto > 0 ? `R$ ${totalsFromChannels.gasto.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—", delta: "", sub: "Total dos canais" },
    { label: "Canais", value: Object.keys(performanceChannels || {}).length, delta: "", sub: "Com dados" },
  ] : [{ label: "—", value: "—", delta: "", sub: "" }, { label: "—", value: "—", delta: "", sub: "" }, { label: "—", value: "—", delta: "", sub: "" }, { label: "—", value: "—", delta: "", sub: "" }]);
  const chartPoints = (chartData.length ? chartData : []).map((x) => ({ m: x.m ?? x.M ?? x.label ?? x.Label ?? "—", leads: x.leads ?? x.Leads ?? x.value ?? x.Value ?? 0, inv: x.inv ?? x.Inv ?? 0, conv: x.conv ?? x.Conv ?? 0 }));
  const funnelStages = (funnel.length ? funnel : []).map((x) => ({ s: x.s ?? x.S ?? x.stage ?? x.Stage ?? x.label ?? x.Label ?? "—", v: x.v ?? x.V ?? x.value ?? x.Value ?? 0, p: x.p ?? x.P ?? 0 }));

  if (planoLoading) return <div style={{ padding: 24, color: t.t3, fontSize: 13 }}>Carregando plano...</div>;

  if (!canPerformance) {
    return (
      <div style={{ padding: 24 }}>
        <Card style={{ padding: 22, background: t.bg2, border: `1px solid ${t.b1}` }}>
          <div style={{ color: t.t1, fontWeight: 800, fontSize: 14, marginBottom: 6 }}>Acesso ao painel de Performance bloqueado</div>
          <div style={{ color: t.t3, fontSize: 12, lineHeight: 1.6 }}>
            Para acessar o painel de Performance, você precisa <strong>adquirir um plano acima do atual</strong> (plano <strong>Growth</strong> ou superior).
          </div>
          {!!planoNome && (
            <div style={{ marginTop: 10, color: t.t4, fontSize: 11 }}>
              Plano atual: <strong style={{ color: t.t2 }}>{planoNome}</strong>
            </div>
          )}
          {planoError && !planoNome && (
            <div style={{ marginTop: 10, color: t.t4, fontSize: 11 }}>
              Não foi possível confirmar seu plano agora. O acesso é bloqueado apenas quando o plano é identificado como Starter.
            </div>
          )}
        </Card>
      </div>
    );
  }

  if (loading) return <div style={{ padding: 24, color: t.t3, fontSize: 13 }}>Carregando performance...</div>;

  return (
    <div>
      <PageHeader title="Performance" subtitle="Métricas de marketing e resultados da sua conta."/>
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:22, flexWrap:"wrap" }}>
        <FilterBar opts={["Todos","Meta Ads","Google Ads","Orgânico","Outros"]} active={channel} onChange={setChannel} label="CANAL"/>
        <div style={{ width:1, height:16, background:t.b1, margin:"0 4px" }}/>
        <FilterBar opts={["7d","30d","90d","12m"]} active={period} onChange={setPeriod}/>
      </div>
      {!hasChannelData && (
        <Card style={{ padding:20, marginBottom:22, background:t.bg3, border:`1px solid ${t.b1}` }}>
          <div style={{ color:t.t2, fontSize:13, lineHeight:1.5 }}>
            Os números desta aba vêm do que o <strong>administrador</strong> preenche em <strong>Disponibilizar → Performance → Preencher informações por canal</strong>, para o mesmo cliente deste login.
          </div>
          <div style={{ color:t.t4, fontSize:11, marginTop:8, display:"flex", alignItems:"center", gap:12, flexWrap:"wrap" }}>
            <span>Se já preencheu e continua vazio: confira no admin se salvou para o cliente deste e-mail e clique em Recarregar.</span>
            <button type="button" onClick={() => setRefreshKey(k => k + 1)} style={{ padding:"6px 12px", borderRadius:6, border:"1px solid " + (t.b1 || "#444"), background:t.bg2, color:t.t1, cursor:"pointer", fontSize:12 }}>Recarregar</button>
          </div>
        </Card>
      )}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:14 }}>
        {kpiList.slice(0, 4).map((k,i) => (
          <Card key={i} lift style={{ padding:"20px 22px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:14 }}>
              <span style={{ color:t.t3, fontSize:11 }}>{k.label}</span>
              {k.delta && <DeltaBadge delta={k.delta}/>}
            </div>
            <div style={{ color:t.t1, fontSize:22, fontWeight:800, letterSpacing:-0.4 }}>{k.value}</div>
            <div style={{ color:t.t4, fontSize:10, marginTop:4 }}>{k.sub || ""}</div>
          </Card>
        ))}
      </div>
      {hasChannelData && (
        <Card style={{ padding:"20px 22px", marginBottom:22 }}>
          <div style={{ color:t.t1, fontWeight:700, fontSize:13, marginBottom:16 }}>Dados por canal (preenchidos pelo administrador)</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(200px, 1fr))", gap:12 }}>
            {["meta_ads", "google_ads", "organico", "outros"].concat(Object.keys(performanceChannels || {}).filter((k) => !["meta_ads", "google_ads", "organico", "outros"].includes(k))).filter((k, i, a) => a.indexOf(k) === i).map((key) => {
              const ch = performanceChannels[key] || {};
              const label = CANAL_LABELS_CLIENT[key] || key;
              const vGasto = getChVal(ch, "gasto");
              const vLeads = getChVal(ch, "leads");
              const vConv = getChVal(ch, "conversoes");
              if (vGasto === 0 && vLeads === 0 && vConv === 0) return null;
              return (
                <div key={key} style={{ padding:14, background:t.bg3, borderRadius:10, border:`1px solid ${t.b1}` }}>
                  <div style={{ color:t.t2, fontWeight:700, fontSize:12, marginBottom:10 }}>{label}</div>
                  <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                    {vGasto > 0 && <div style={{ fontSize:11 }}><span style={{ color:t.t4 }}>Gasto:</span> <span style={{ color:t.t1, fontWeight:600 }}>R$ {vGasto.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span></div>}
                    {vLeads > 0 && <div style={{ fontSize:11 }}><span style={{ color:t.t4 }}>Leads:</span> <span style={{ color:t.t1, fontWeight:600 }}>{vLeads.toLocaleString("pt-BR")}</span></div>}
                    {vConv > 0 && <div style={{ fontSize:11 }}><span style={{ color:t.t4 }}>Conversões:</span> <span style={{ color:t.t1, fontWeight:600 }}>{vConv.toLocaleString("pt-BR")}</span></div>}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
        <Card style={{ padding:"22px 22px 16px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:18 }}>
            <div><div style={{ color:t.t1, fontWeight:700, fontSize:13 }}>Leads por Período</div><div style={{ color:t.t3, fontSize:11, marginTop:2 }}>{channel==="Todos"?"Todos os canais":channel}</div></div>
          </div>
          <BarChart data={chartPoints} period={period}/>
        </Card>
        <Card style={{ padding:"22px 22px 16px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:18 }}>
            <div><div style={{ color:t.t1, fontWeight:700, fontSize:13 }}>Conversões</div><div style={{ color:t.t3, fontSize:11, marginTop:2 }}>Dados da API</div></div>
          </div>
          <BarChart data={chartPoints} period={period} dataKey="conv"/>
        </Card>
      </div>
      <Card style={{ padding:"24px 26px" }}>
        <div style={{ color:t.t1, fontWeight:700, fontSize:13, marginBottom:18 }}>Funil de Aquisição Completo</div>
        <FunnelViz data={funnelStages}/>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10, marginTop:20, paddingTop:20, borderTop:`1px solid ${t.b1}` }}>
          {funnelStages.map((f,i) => (
            <div key={i} style={{ textAlign:"center", padding:14, background:t.bg3, borderRadius:10, border:`1px solid ${t.b1}` }}>
              <div style={{ color:t.t1, fontSize:20, fontWeight:800 }}>{(f.v || 0).toLocaleString("pt-BR")}</div>
              <div style={{ color:t.t3, fontSize:11, marginTop:4 }}>{f.s}</div>
              {i>0 && <div style={{ color:t.t4, fontSize:9, marginTop:3 }}>{f.p}% do topo</div>}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   PAGE: RELATÓRIOS (API: /api/cliente/relatorios)
═══════════════════════════════════════════════ */
function RelatoriosPage() {
  const t = useT();
  const { token } = useAuth();
  const [tf, setTf] = useState("Todos");
  const [vw, setVw] = useState("list");
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!token || !API_URL) { setLoading(false); return; }
    let cancelled = false;
    apiGet(token, "/api/cliente/relatorios?limit=50&offset=0").then(r => r.ok ? r.json().catch(() => ({ items: [] })) : { items: [] }).then(data => {
      if (cancelled) return;
      setReports(Array.isArray(data?.items) ? data.items : []);
    }).catch(() => setReports([])).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [token]);
  const items = tf==="Todos" ? reports : reports.filter(r=>r.type===tf);
  const row = (r) => ({ id: r.id || r.uuid, title: r.title || r.titulo, type: r.type || r.tipo || "—", period: r.period || r.periodo || "—", owner: r.owner || "—", date: r.date || r.data || "—", pages: (r.pages ?? r.paginas) ?? "—", file_url: r.file_url || r.url || null });
  const rows = items.map(row);
  if (loading) return <div style={{ padding: 24, color: t.t3, fontSize: 13 }}>Carregando relatórios...</div>;
  return (
    <div>
      <PageHeader title="Relatórios" subtitle="Biblioteca de relatórios produzidos pela equipe United."
        action={
          <div style={{ display:"flex", gap:6 }}>
            {["list","grid"].map(v => (
              <button key={v} onClick={() => setVw(v)} style={{ padding:"6px 12px", borderRadius:7, background:vw===v?t.bg3:"transparent", border:`1px solid ${vw===v?t.bStrong:t.b1}`, color:vw===v?t.t1:t.t3, fontSize:12, cursor:"pointer" }}>
                {v==="list"?"☰ Lista":"⊞ Grade"}
              </button>
            ))}
          </div>
        }/>
      <div style={{ marginBottom:22 }}><FilterBar opts={["Todos","Mensal","Campanha","Estratégico","Tráfego","Crescimento"]} active={tf} onChange={setTf} label="TIPO"/></div>
      {vw==="list" ? (
        <div style={{ display:"flex", flexDirection:"column", gap:0, border:`1px solid ${t.b1}`, borderRadius:10, overflow:"hidden" }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 110px 110px 100px 80px", gap:12, padding:"9px 20px", background:t.bg3 }}>
            {["Relatório","Período","Data","Tipo",""].map((h,i) => (
              <span key={i} style={{ color:t.t4, fontSize:9, fontWeight:800, letterSpacing:1.4, textTransform:"uppercase" }}>{h}</span>
            ))}
          </div>
          {rows.map((r,i) => {
            const rc = RPT_COLOR[r.type]||"#888";
            return (
              <div key={r.id || i} style={{ display:"grid", gridTemplateColumns:"1fr 110px 110px 100px 80px", gap:12, padding:"13px 20px", alignItems:"center",
                background: t.bg2, borderTop:`1px solid ${t.b1}`, transition:"background .14s", cursor:"default" }}
                onMouseEnter={e => e.currentTarget.style.background=t.bg3}
                onMouseLeave={e => e.currentTarget.style.background=t.bg2}>
                <div>
                  <div style={{ color:t.t1, fontSize:12, fontWeight:600 }}>{r.title}</div>
                  <div style={{ color:t.t4, fontSize:10, marginTop:2 }}>{r.owner} · {r.pages} páginas</div>
                </div>
                <span style={{ color:t.t2, fontSize:12 }}>{r.period}</span>
                <span style={{ color:t.t3, fontSize:12 }}>{r.date}</span>
                <Tag label={r.type} color={rc} bg={`${rc}14`}/>
                {r.file_url ? <a href={r.file_url} target="_blank" rel="noopener noreferrer" style={{ padding:"5px 13px", borderRadius:8, border:`1px solid ${t.b1}`, background:"transparent", color:t.t2, fontSize:11, fontWeight:700, textDecoration:"none" }}>↓ PDF</a> : <Btn variant="ghost" size="sm">↓ PDF</Btn>}
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12 }}>
          {rows.map((r,i) => {
            const rc = RPT_COLOR[r.type]||"#888";
            return (
              <Card key={r.id || i} lift style={{ padding:"22px", cursor:"default" }}>
                <div style={{ height:80, background:t.bg3, borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:16, border:`1px solid ${t.b1}` }}>
                  <span style={{ color:t.t3, fontSize:32 }}>◎</span>
                </div>
                <Tag label={r.type} color={rc} bg={`${rc}14`}/>
                <div style={{ color:t.t1, fontSize:13, fontWeight:700, margin:"10px 0 4px", lineHeight:1.4 }}>{r.title}</div>
                <div style={{ color:t.t3, fontSize:11, marginBottom:16 }}>{r.period} · {r.pages} pág.</div>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", paddingTop:14, borderTop:`1px solid ${t.b1}` }}>
                  <span style={{ color:t.t4, fontSize:11 }}>{r.date}</span>
                  {r.file_url ? <a href={r.file_url} target="_blank" rel="noopener noreferrer" style={{ padding:"5px 13px", borderRadius:8, border:`1px solid ${t.b1}`, background:"transparent", color:t.t2, fontSize:11, fontWeight:700, textDecoration:"none" }}>↓ Baixar</a> : <Btn size="sm">↓ Baixar</Btn>}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   PAGE: MATERIAIS (API: pastas + arquivos)
═══════════════════════════════════════════════ */
function MateriaisPage() {
  const t = useT();
  const { token } = useAuth();
  const [folder, setFolder] = useState(null);
  const [search, setSearch] = useState("");
  const [pastas, setPastas] = useState([]);
  const [arquivos, setArquivos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState("");
  const [downloadError, setDownloadError] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [uploadForm, setUploadForm] = useState({ pasta_uuid: "", nome: "", extensao: "", tamanho: "", url: "" });
  const [uploadStatus, setUploadStatus] = useState({ loading: false, error: "" });
  const loadData = () => {
    if (!token || !API_URL) return;
    apiGet(token, "/api/cliente/materiais/pastas").then(r => r.ok ? r.json().catch(() => []) : []).then(data => setPastas(Array.isArray(data) ? data : (data?.items || []))).catch(() => setPastas([]));
    apiGet(token, "/api/cliente/materiais/arquivos?limit=100&offset=0").then(r => r.ok ? r.json().catch(() => ({})) : {}).then(data => setArquivos(Array.isArray(data) ? data : (data?.items || []))).catch(() => setArquivos([]));
  };
  useEffect(() => {
    if (!token || !API_URL) { setLoading(false); return; }
    let cancelled = false;
    Promise.all([
      apiGet(token, "/api/cliente/materiais/pastas").then(r => r.ok ? r.json().catch(() => []) : []).then(data => { if (!cancelled) setPastas(Array.isArray(data) ? data : (data?.items || [])); }).catch(() => setPastas([])),
      apiGet(token, "/api/cliente/materiais/arquivos?limit=100&offset=0").then(r => r.ok ? r.json().catch(() => ({})) : {}).then(data => { if (!cancelled) setArquivos(Array.isArray(data) ? data : (data?.items || [])); }).catch(() => setArquivos([])),
    ]).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [token]);
  const handleUpload = async (e) => {
    e.preventDefault();
    if (!uploadForm.nome?.trim()) { setUploadStatus({ loading: false, error: "Informe o nome do arquivo." }); return; }
    setUploadStatus({ loading: true, error: "" });
    try {
      const body = { nome: uploadForm.nome.trim(), extensao: uploadForm.extensao.trim() || "pdf", tamanho: parseInt(uploadForm.tamanho, 10) || 0, url: uploadForm.url.trim() || undefined };
      if (uploadForm.pasta_uuid) body.pasta_uuid = uploadForm.pasta_uuid;
      const res = await apiPost(token, "/api/cliente/materiais/upload", body);
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err?.error || "Erro ao enviar"); }
      setShowUpload(false);
      setUploadForm({ pasta_uuid: "", nome: "", extensao: "", tamanho: "", url: "" });
      loadData();
    } catch (err) { setUploadStatus({ loading: false, error: err.message || "Erro" }); return; }
    setUploadStatus({ loading: false, error: "" });
  };
  const folders = pastas.map(p => ({ id: p.uuid || p.id, label: p.nome || p.label, icon: p.icone || "◻", count: p.count ?? 0, size: p.size || "—" }));
  const fdata = folders.find(f=>f.id===folder);
  const allFiles = arquivos.map(a => ({ name: a.nome || a.name, ext: (a.extensao || a.ext || "").toUpperCase(), size: a.tamanho || a.size || "—", date: a.data || a.date || "—", pasta_uuid: a.pasta_uuid, url: a.url || null }));
  const files = folder ? allFiles.filter(f=>!f.pasta_uuid || f.pasta_uuid===folder).filter(f=>f.name.toLowerCase().includes(search.toLowerCase())) : allFiles.slice(0, 5);

  const buildFilename = (f) => {
    const rawName = (f?.name || "arquivo").trim();
    const ext = String(f?.ext || "").trim().toLowerCase();
    const hasExt = ext && rawName.toLowerCase().endsWith(`.${ext}`);
    return hasExt ? rawName : (ext ? `${rawName}.${ext}` : rawName);
  };

  const downloadArquivo = async (f) => {
    setDownloadError("");
    const url = f?.url;
    if (!url) { setDownloadError("Este arquivo não tem URL para download."); return; }
    const filename = buildFilename(f);
    setDownloading(filename);
    try {
      const isHttp = /^https?:\/\//i.test(url);
      const isApiUrl = API_URL && (url.startsWith(API_URL) || url.startsWith("/"));

      // Para URL pública (http), tenta baixar via <a download>. Para rota protegida (API), baixa como blob com Bearer token.
      if (isHttp && !isApiUrl) {
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.rel = "noopener noreferrer";
        document.body.appendChild(a);
        a.click();
        a.remove();
        return;
      }

      const fullUrl = url.startsWith("http") ? url : `${API_URL}${url}`;
      const res = await fetch(fullUrl, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || err?.message || `Erro ao baixar (${res.status})`);
      }
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      setDownloadError(err?.message || "Erro ao baixar arquivo.");
    } finally {
      setDownloading("");
    }
  };

  const Row = ({ f, i, last }) => (
    <div style={{ display:"flex", alignItems:"center", gap:14, padding:"13px 18px",
      background:t.bg2, borderTop:i>0?`1px solid ${t.b1}`:undefined, transition:"background .14s" }}
      onMouseEnter={e=>e.currentTarget.style.background=t.bg3}
      onMouseLeave={e=>e.currentTarget.style.background=t.bg2}>
      <div style={{ width:38, height:38, borderRadius:9, background:t.bg4, border:`1px solid ${t.b1}`, display:"flex", alignItems:"center", justifyContent:"center" }}>
        <span style={{ color:t.t3, fontSize:16 }}>◻</span>
      </div>
      <div style={{ flex:1 }}>
        <div style={{ color:t.t1, fontSize:12, fontWeight:600 }}>{f.name}</div>
        <div style={{ color:t.t4, fontSize:10, marginTop:2 }}>{f.ext} · {f.size} · {f.date}</div>
      </div>
      <Tag label={f.ext} color={t.t2} bg={t.bg4}/>
      <div style={{ display:"flex", gap:6 }}>
        <button
          type="button"
          onClick={() => downloadArquivo(f)}
          disabled={!!downloading && downloading === buildFilename(f)}
          title={f.url ? "Baixar arquivo" : "Sem URL de download"}
          style={{
            padding: "5px 10px",
            borderRadius: 8,
            border: `1px solid ${t.b1}`,
            background: "transparent",
            color: f.url ? t.t2 : t.t4,
            fontSize: 11,
            textDecoration: "none",
            cursor: f.url ? "pointer" : "not-allowed",
            opacity: f.url ? 1 : 0.6,
          }}
        >
          {downloading === buildFilename(f) ? "..." : "↓"}
        </button>
      </div>
    </div>
  );

  if (loading) return <div style={{ padding: 24, color: t.t3, fontSize: 13 }}>Carregando materiais...</div>;

  return (
    <div>
      <PageHeader title="Materiais" subtitle="Drive privado com todos os seus arquivos organizados." action={<Btn onClick={() => setShowUpload(true)}>↑ Enviar Arquivo</Btn>}/>
      {showUpload && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:100 }} onClick={() => !uploadStatus.loading && setShowUpload(false)}>
          <Card style={{ padding:28, minWidth:360 }} onClick={e=>e.stopPropagation()}>
            <div style={{ color:t.t1, fontWeight:700, fontSize:14, marginBottom:20 }}>Enviar arquivo</div>
            <form onSubmit={handleUpload} style={{ display:"flex", flexDirection:"column", gap:14 }}>
              <div>
                <label style={{ color:t.t3, fontSize:9, fontWeight:800, letterSpacing:1.5, textTransform:"uppercase", display:"block", marginBottom:6 }}>Pasta (opcional)</label>
                <select value={uploadForm.pasta_uuid} onChange={e=>setUploadForm({...uploadForm,pasta_uuid:e.target.value})} style={{ width:"100%", padding:"9px 12px", background:t.bg3, border:`1px solid ${t.b1}`, borderRadius:8, color:t.t1, fontSize:12, outline:"none" }}>
                  <option value="">— Nenhuma —</option>
                  {folders.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
                </select>
              </div>
              <div>
                <label style={{ color:t.t3, fontSize:9, fontWeight:800, letterSpacing:1.5, textTransform:"uppercase", display:"block", marginBottom:6 }}>Nome do arquivo *</label>
                <input value={uploadForm.nome} onChange={e=>setUploadForm({...uploadForm,nome:e.target.value})} placeholder="ex: Relatório.pdf" required style={{ width:"100%", padding:"9px 12px", background:t.bg3, border:`1px solid ${t.b1}`, borderRadius:8, color:t.t1, fontSize:12, outline:"none" }}/>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                <div>
                  <label style={{ color:t.t3, fontSize:9, fontWeight:800, letterSpacing:1.5, textTransform:"uppercase", display:"block", marginBottom:6 }}>Extensão</label>
                  <input value={uploadForm.extensao} onChange={e=>setUploadForm({...uploadForm,extensao:e.target.value})} placeholder="pdf" style={{ width:"100%", padding:"9px 12px", background:t.bg3, border:`1px solid ${t.b1}`, borderRadius:8, color:t.t1, fontSize:12, outline:"none" }}/>
                </div>
                <div>
                  <label style={{ color:t.t3, fontSize:9, fontWeight:800, letterSpacing:1.5, textTransform:"uppercase", display:"block", marginBottom:6 }}>Tamanho (bytes)</label>
                  <input type="number" value={uploadForm.tamanho} onChange={e=>setUploadForm({...uploadForm,tamanho:e.target.value})} placeholder="0" min={0} style={{ width:"100%", padding:"9px 12px", background:t.bg3, border:`1px solid ${t.b1}`, borderRadius:8, color:t.t1, fontSize:12, outline:"none" }}/>
                </div>
              </div>
              <div>
                <label style={{ color:t.t3, fontSize:9, fontWeight:800, letterSpacing:1.5, textTransform:"uppercase", display:"block", marginBottom:6 }}>URL (opcional)</label>
                <input value={uploadForm.url} onChange={e=>setUploadForm({...uploadForm,url:e.target.value})} placeholder="https://..." style={{ width:"100%", padding:"9px 12px", background:t.bg3, border:`1px solid ${t.b1}`, borderRadius:8, color:t.t1, fontSize:12, outline:"none" }}/>
              </div>
              {uploadStatus.error && <div style={{ color:C.red, fontSize:12 }}>{uploadStatus.error}</div>}
              <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
                <Btn type="button" variant="ghost" onClick={() => setShowUpload(false)}>Cancelar</Btn>
                <button type="submit" disabled={uploadStatus.loading} style={{ padding:"8px 18px", borderRadius:8, border:"none", cursor: uploadStatus.loading?"default":"pointer", background:t.accent, color:t.accentText, fontWeight:700, fontSize:12 }}>{uploadStatus.loading ? "Enviando..." : "Enviar"}</button>
              </div>
            </form>
          </Card>
        </div>
      )}
      {!folder ? (
        <>
          <div style={{ position:"relative", marginBottom:22 }}>
            <span style={{ position:"absolute", left:13, top:"50%", transform:"translateY(-50%)", color:t.t3, fontSize:14 }}>🔍</span>
            <input placeholder="Buscar arquivos e pastas..." style={{ width:"100%", maxWidth:380, padding:"9px 14px 9px 40px", background:t.bg3, border:`1px solid ${t.b1}`, borderRadius:9, color:t.t1, fontSize:12, outline:"none" }}/>
          </div>
          {downloadError && <div style={{ marginBottom: 14, color: C.red, fontSize: 12 }}>{downloadError}</div>}
          <div style={{ color:t.t4, fontSize:9, fontWeight:800, letterSpacing:2, textTransform:"uppercase", marginBottom:14 }}>PASTAS</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginBottom:28 }}>
            {folders.map(f => (
              <Card key={f.id} lift style={{ padding:"20px 22px", cursor:"pointer" }}>
                <div onClick={() => setFolder(f.id)} style={{ display:"flex", alignItems:"center", gap:14 }}>
                  <div style={{ width:46, height:46, borderRadius:11, background:t.bg3, border:`1px solid ${t.b1}`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <span style={{ fontSize:20, color:t.t2 }}>{f.icon}</span>
                  </div>
                  <div>
                    <div style={{ color:t.t1, fontSize:13, fontWeight:700 }}>{f.label}</div>
                    <div style={{ color:t.t3, fontSize:11, marginTop:3 }}>{f.count} arquivos · {f.size}</div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
          <div style={{ color:t.t4, fontSize:9, fontWeight:800, letterSpacing:2, textTransform:"uppercase", marginBottom:14 }}>RECENTES</div>
          <div style={{ border:`1px solid ${t.b1}`, borderRadius:10, overflow:"hidden" }}>
            {files.length ? files.map((f,i) => <Row key={i} f={f} i={i} last={i===files.length-1}/>) : <div style={{ padding: 20, color: t.t3, fontSize: 12 }}>Nenhum arquivo.</div>}
          </div>
        </>
      ) : (
        <>
          <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:22 }}>
            <Btn variant="ghost" size="sm" onClick={() => { setFolder(null); setSearch(""); }}>← Voltar</Btn>
            <div style={{ width:36, height:36, borderRadius:9, background:t.bg3, border:`1px solid ${t.b1}`, display:"flex", alignItems:"center", justifyContent:"center" }}>
              <span style={{ color:t.t2 }}>{fdata?.icon}</span>
            </div>
            <div><div style={{ color:t.t1, fontSize:14, fontWeight:700 }}>{fdata?.label}</div><div style={{ color:t.t3, fontSize:11 }}>{fdata?.count} arquivos</div></div>
            <div style={{ flex:1 }}/>
            <div style={{ position:"relative" }}>
              <span style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", color:t.t3, fontSize:12 }}>🔍</span>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar..." style={{ padding:"7px 10px 7px 28px", background:t.bg3, border:`1px solid ${t.b1}`, borderRadius:8, color:t.t1, fontSize:12, outline:"none", width:180 }}/>
            </div>
          </div>
          <div style={{ border:`1px solid ${t.b1}`, borderRadius:10, overflow:"hidden" }}>
            {files.length ? files.map((f,i) => <Row key={i} f={f} i={i} last={i===files.length-1}/>) : <div style={{ padding: 20, color: t.t3, fontSize: 12 }}>Nenhum arquivo nesta pasta.</div>}
          </div>
        </>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   PÁGINA "EM BREVE" (seções com cadeado)
═══════════════════════════════════════════════ */
function EmBrevePage({ sectionName }) {
  const t = useT();
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", padding: 40, textAlign: "center" }}>
      <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.9 }}>🔒</div>
      <h2 style={{ color: t.t1, fontSize: 22, fontWeight: 700, marginBottom: 10 }}>{sectionName}</h2>
      <p style={{ color: t.t3, fontSize: 15, maxWidth: 360, lineHeight: 1.6 }}>Esta funcionalidade estará disponível em breve. Agradecemos a compreensão.</p>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   PAGE: REUNIÕES (API: proximas + historico)
═══════════════════════════════════════════════ */
function ReunioesPage() {
  const t = useT();
  const { token } = useAuth();
  const [tab, setTab] = useState("upcoming");
  const [exp, setExp] = useState(null);
  const [proximas, setProximas] = useState([]);
  const [historico, setHistorico] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!token || !API_URL) { setLoading(false); return; }
    let cancelled = false;
    Promise.all([
      apiGet(token, "/api/cliente/reunioes/proximas").then(r => r.ok ? r.json().catch(() => []) : []).catch(() => []),
      apiGet(token, "/api/cliente/reunioes/historico?limit=50&offset=0").then(r => r.ok ? r.json().catch(() => ({})) : {}).catch(() => ({})),
    ]).then(([p, h]) => {
      if (cancelled) return;
      setProximas(Array.isArray(p) ? p : (p?.items || []));
      setHistorico(Array.isArray(h) ? h : (h?.items || []));
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [token]);
  const meetUp = proximas.map(m => ({ id: m.uuid || m.id, title: m.titulo || m.title, date: m.data_hora?.split?.(" ")?.[0] || m.date, time: m.data_hora?.split?.(" ")?.[1] || m.time || "", via: m.via || "—", owner: m.owner || "—", agenda: m.pauta || m.agenda || [] }));
  const meetPast = historico.map(m => ({ id: m.uuid || m.id, title: m.titulo || m.title, date: m.data_hora?.split?.(" ")?.[0] || m.date, via: m.via || "—", dur: m.duracao_min ? `${m.duracao_min}min` : (m.dur || "—"), rec: m.tem_gravacao ?? m.rec, ata: m.tem_ata ?? m.ata }));
  if (loading) return <div style={{ padding: 24, color: t.t3, fontSize: 13 }}>Carregando reuniões...</div>;
  return (
    <div>
      <PageHeader title="Reuniões" subtitle="Agenda, histórico e gravações de reuniões." action={<Btn>+ Agendar</Btn>}/>
      <div style={{ display:"flex", gap:0, marginBottom:24, borderBottom:`1px solid ${t.b1}` }}>
        {[{ id:"upcoming",label:"Próximas" },{ id:"past",label:"Histórico" }].map(tb => (
          <button key={tb.id} onClick={() => setTab(tb.id)} style={{ padding:"8px 20px", background:"transparent", border:"none",
            borderBottom:tab===tb.id?`2px solid ${t.accent}`:"2px solid transparent",
            color:tab===tb.id?t.t1:t.t3, fontSize:13, fontWeight:700, cursor:"pointer", marginBottom:-1, transition:"all .18s" }}>
            {tb.label}
          </button>
        ))}
      </div>
      {tab==="upcoming" && (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {meetUp.length ? meetUp.map(m => (
            <Card key={m.id} style={{ overflow:"hidden" }}>
              <div onClick={() => setExp(exp===m.id?null:m.id)} style={{ padding:"20px 24px", display:"flex", alignItems:"center", gap:18, cursor:"pointer" }}>
                <div style={{ width:50, height:50, borderRadius:13, flexShrink:0, background:t.bg3, border:`1px solid ${t.b1}`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <span style={{ color:t.t2, fontSize:20 }}>◷</span>
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ color:t.t1, fontSize:14, fontWeight:700 }}>{m.title}</div>
                  <div style={{ color:t.t3, fontSize:11, marginTop:4, display:"flex", gap:14, flexWrap:"wrap" }}>
                    <span>📅 {m.date}</span><span>🕐 {m.time}</span><span>🎥 {m.via}</span><span>👤 {m.owner}</span>
                  </div>
                </div>
                <StatusBadge status="Confirmada"/>
                <Btn size="sm">Entrar</Btn>
                <span style={{ color:t.t3, fontSize:12 }}>{exp===m.id?"▲":"▼"}</span>
              </div>
              {exp===m.id && (
                <div style={{ borderTop:`1px solid ${t.b1}`, padding:"16px 24px", background:t.bg3 }}>
                  <div style={{ color:t.t4, fontSize:9, fontWeight:800, letterSpacing:2, textTransform:"uppercase", marginBottom:12 }}>PAUTA</div>
                  {(m.agenda || []).map((a,i) => (
                    <div key={i} style={{ display:"flex", gap:10, padding:"7px 0", borderBottom:i<(m.agenda||[]).length-1?`1px solid ${t.b2}`:"none" }}>
                      <span style={{ color:t.t3, fontSize:10 }}>◆</span>
                      <span style={{ color:t.t2, fontSize:12 }}>{typeof a==="string"?a:(a?.text||a)}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )) : <div style={{ padding: 24, color: t.t3, fontSize: 13 }}>Nenhuma reunião próxima.</div>}
        </div>
      )}
      {tab==="past" && (
        <div style={{ border:`1px solid ${t.b1}`, borderRadius:10, overflow:"hidden" }}>
          {meetPast.length ? meetPast.map((m,i) => (
            <div key={m.id} style={{ display:"flex", alignItems:"center", gap:16, padding:"14px 20px",
              background:t.bg2, borderTop:i>0?`1px solid ${t.b1}`:undefined, transition:"background .14s" }}
              onMouseEnter={e=>e.currentTarget.style.background=t.bg3}
              onMouseLeave={e=>e.currentTarget.style.background=t.bg2}>
              <div style={{ width:40, height:40, borderRadius:10, background:t.bg4, border:`1px solid ${t.b1}`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <span style={{ color:t.t3, fontSize:16 }}>◷</span>
              </div>
              <div style={{ flex:1 }}>
                <div style={{ color:t.t1, fontSize:13, fontWeight:600 }}>{m.title}</div>
                <div style={{ color:t.t3, fontSize:11, marginTop:2 }}>{m.date} · {m.via} · {m.dur}</div>
              </div>
              <div style={{ display:"flex", gap:6 }}>
                {m.rec && <Tag label="▶ Gravação" color={C.blue}  bg={C.blueBg}/>}
                {m.ata && <Tag label="📄 Ata"     color={C.green} bg={C.greenBg}/>}
              </div>
            </div>
          )) : <div style={{ padding: 24, color: t.t3, fontSize: 13 }}>Nenhum histórico.</div>}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   PAGE: FINANCEIRO (API: faturas + plano)
═══════════════════════════════════════════════ */
function FinanceiroPage() {
  const t = useT();
  const { token } = useAuth();
  const [faturas, setFaturas] = useState([]);
  const [plano, setPlano] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadFinanceiro = () => {
    if (!token || !API_URL) return Promise.resolve();
    setError(null);
    return Promise.all([
      apiGet(token, "/api/cliente/financeiro/faturas?limit=50&offset=0")
        .then(async (r) => {
          const data = await r.json().catch(() => ({}));
          if (!r.ok) throw new Error(data?.message || data?.error || `Erro ${r.status} ao carregar faturas`);
          return data;
        }),
      apiGet(token, "/api/cliente/financeiro/plano").then(r => r.ok ? r.json().catch(() => null) : null).catch(() => null),
    ]).then(([fat, pl]) => {
      const fatList = fat?.items ?? fat?.data ?? fat?.faturas ?? fat?.recebiveis ?? fat?.lancamentos ?? (Array.isArray(fat) ? fat : []);
      setFaturas(Array.isArray(fatList) ? fatList : []);
      setPlano(pl);
    }).catch((e) => setError(e?.message || "Não foi possível carregar as faturas. Verifique se o backend expõe GET /api/cliente/financeiro/faturas filtrado pelo cliente do token."));
  };

  useEffect(() => {
    if (!token || !API_URL) { setLoading(false); setError(null); return; }
    let cancelled = false;
    setLoading(true);
    setError(null);
    loadFinanceiro()
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [token]);

  const handleAtualizar = () => {
    setRefreshing(true);
    loadFinanceiro().finally(() => setRefreshing(false));
  };
  const normFatura = (f) => ({
    id: f.uuid ?? f.id ?? f._id ?? f.UUID ?? f.Id,
    periodo: f.periodo ?? f.period ?? f.Periodo ?? f.Period ?? f.descricao ?? f.Descricao ?? "—",
    valor_centavos: f.valor_centavos ?? f.valorCentavos ?? f.ValorCentavos,
    valor: f.valor ?? f.Valor,
    vencimento: f.vencimento ?? f.Vencimento ?? f.due ?? f.Due ?? "—",
    status: (f.status ?? f.Status ?? "Pendente").toString(),
    data_pagamento: f.data_pagamento ?? f.dataPagamento ?? f.DataPagamento ?? f.paid ?? f.Paid ?? null,
    file_url: f.file_url ?? f.fileUrl ?? f.FileURL ?? f.url ?? f.URL ?? null,
  });
  const invoices = faturas.map((f, i) => {
    const n = normFatura(f);
    const valorReais = n.valor_centavos != null ? Number(n.valor_centavos) / 100 : Number(n.valor);
    const valueStr = (valorReais != null && !Number.isNaN(valorReais) && valorReais > 0) ? formatCurrency(valorReais) : "—";
    const statusNorm = (n.status || "").toLowerCase();
    const statusDisplay = statusNorm === "pago" ? "Pago" : statusNorm === "vencido" ? "Vencido" : "Pendente";
    const dueStr = n.vencimento ? (typeof n.vencimento === "string" ? n.vencimento.slice(0, 10) : n.vencimento) : "—";
    return { id: n.id || `fat-${i}`, period: n.periodo, value: valueStr, due: dueStr, status: statusDisplay, paid: n.data_pagamento, file_url: n.file_url };
  });
  const planLabel = plano?.nome || plano?.plano || "—";
  const planValue = plano?.valor != null ? `${formatCurrency(Number(plano.valor))}/mês` : (plano?.valor_centavos != null ? `${formatCurrency(Number(plano.valor_centavos) / 100)}/mês` : "—");
  const handleExportFaturas = () => {
    const headers = ["ID", "Período", "Valor", "Vencimento", "Status", "Pago em"];
    const keys = ["id", "period", "value", "due", "status", "paid"];
    const rows = invoices.map((inv) => ({ ...inv, paid: inv.paid != null ? (typeof inv.paid === "string" ? inv.paid.slice(0, 10) : String(inv.paid)) : "—" }));
    const csv = buildCSV(rows, headers, keys);
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "minhas-faturas.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };
  if (loading && faturas.length === 0) return <div style={{ padding: 24, color: t.t3, fontSize: 13 }}>Carregando financeiro...</div>;
  return (
    <div>
      <PageHeader title="Financeiro" subtitle="Gestão de faturas e histórico de pagamentos."
        action={<div style={{ display: "flex", gap: 8 }}><Btn variant="ghost" size="sm" onClick={handleAtualizar} disabled={refreshing}>{refreshing ? "Atualizando…" : "Atualizar"}</Btn><Btn variant="ghost" size="sm" onClick={handleExportFaturas}>↓ Exportar</Btn></div>}/>
      {error && (
        <div style={{ padding: 12, marginBottom: 16, background: C.redBg, color: C.red, borderRadius: 10, fontSize: 12 }}>{error}</div>
      )}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:16 }}>
        {[
          { label:"Plano",            value: planLabel,   sub: planValue },
          { label:"Próx. Vencimento", value: invoices[0]?.due || "—",   sub: ""   },
          { label:"Em Aberto",        value: invoices.filter(i=>i.status!=="Pago").length ? "Ver faturas" : "—", sub: ""     },
          { label:"Status",           value:"Em dia",   sub:"Sem pendências"},
        ].map((s,i) => (
          <Card key={i} lift style={{ padding:"20px 22px" }}>
            <div style={{ color:t.t3, fontSize:11, marginBottom:12 }}>{s.label}</div>
            <div style={{ color:t.t1, fontSize:20, fontWeight:800 }}>{s.value}</div>
            <div style={{ color:t.t4, fontSize:10, marginTop:4 }}>{s.sub}</div>
          </Card>
        ))}
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:14 }}>
        <Card style={{ padding:"24px" }}>
          <div style={{ color:t.t3, fontSize:9, fontWeight:800, letterSpacing:2, textTransform:"uppercase", marginBottom:16 }}>PLANO CONTRATADO</div>
          <div style={{ color:t.t1, fontSize:16, fontWeight:800, marginBottom:4 }}>{planLabel}</div>
          <div style={{ color:t.t3, fontSize:11, marginBottom:18 }}>{plano?.periodo || "—"}</div>
          {(plano?.itens || plano?.beneficios || ["Dados do plano na API"]).map((item,i) => (
            <div key={i} style={{ display:"flex", gap:8, padding:"7px 0", borderBottom:i<4?`1px solid ${t.b2}`:"none" }}>
              <Tag label="✓" color={C.green} bg={C.greenBg}/>
              <span style={{ color:t.t2, fontSize:12 }}>{typeof item==="string"?item:(item?.nome||item?.label||"—")}</span>
            </div>
          ))}
        </Card>
        <Card style={{ padding:"24px" }}>
          <div style={{ color:t.t3, fontSize:9, fontWeight:800, letterSpacing:2, textTransform:"uppercase", marginBottom:16 }}>RESUMO</div>
          {[
            { label:"Pago em 2025",       value: invoices.filter(i=>i.status==="Pago").length ? "Ver faturas" : "—",  badge:{ l:"Pago",     c:C.green, bg:C.greenBg } },
            { label:"Em aberto",          value: invoices.filter(i=>i.status!=="Pago").length ? "Ver abaixo" : "—",  badge:{ l:"Pendente", c:C.amber, bg:C.amberBg } },
            { label:"Total do contrato",  value: planValue, badge:null },
          ].map((row,i) => (
            <div key={i} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"13px 16px", background:t.bg3, borderRadius:9, marginBottom:8, border:`1px solid ${t.b1}` }}>
              <span style={{ color:t.t2, fontSize:12 }}>{row.label}</span>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <span style={{ color:t.t1, fontSize:14, fontWeight:800 }}>{row.value}</span>
                {row.badge && <Tag label={row.badge.l} color={row.badge.c} bg={row.badge.bg}/>}
              </div>
            </div>
          ))}
        </Card>
      </div>
      <Card style={{ padding:0, overflow:"hidden" }}>
        <div style={{ padding:"16px 22px", borderBottom:`1px solid ${t.b1}` }}>
          <div style={{ color:t.t1, fontWeight:700, fontSize:13 }}>Histórico de Faturas</div>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 130px 110px 100px 110px 80px", gap:12, padding:"9px 22px", background:t.bg3, borderBottom:`1px solid ${t.b1}` }}>
          {["Período","Valor","Vencimento","Status","Pago em",""].map((h,i) => (
            <span key={i} style={{ color:t.t4, fontSize:9, fontWeight:800, letterSpacing:1.4, textTransform:"uppercase" }}>{h}</span>
          ))}
        </div>
        {invoices.length === 0 ? (
          <div style={{ padding: 28, textAlign: "center", color: t.t3, fontSize: 13 }}>Nenhuma fatura no momento. As faturas lançadas pelo administrador para sua conta aparecerão aqui.</div>
        ) : invoices.map((inv,i) => (
          <div key={inv.id || i} style={{ display:"grid", gridTemplateColumns:"1fr 130px 110px 100px 110px 80px", gap:12, padding:"13px 22px", alignItems:"center", borderBottom:i<invoices.length-1?`1px solid ${t.b2}`:"none", transition:"background .14s" }}
            onMouseEnter={e=>e.currentTarget.style.background=t.bg3}
            onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
            <div>
              <div style={{ color:t.t1, fontSize:12, fontWeight:600 }}>{inv.period}</div>
              <div style={{ color:t.t4, fontSize:10, marginTop:1 }}>{typeof inv.id === "string" ? inv.id.slice(0, 8) : inv.id}</div>
            </div>
            <span style={{ color:t.t1, fontSize:12, fontWeight:700 }}>{inv.value}</span>
            <span style={{ color:t.t2, fontSize:12 }}>{inv.due}</span>
            <StatusBadge status={inv.status}/>
            <span style={{ color:t.t3, fontSize:12 }}>{inv.paid != null ? (typeof inv.paid === "string" ? inv.paid.slice(0, 10) : inv.paid) : "—"}</span>
            {inv.file_url ? <a href={inv.file_url} target="_blank" rel="noopener noreferrer" style={{ padding:"5px 13px", borderRadius:8, border:`1px solid ${t.b1}`, background:"transparent", color:t.t2, fontSize:11, fontWeight:700, textDecoration:"none" }}>↓ PDF</a> : <Btn variant="ghost" size="sm">↓ PDF</Btn>}
          </div>
        ))}
      </Card>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   PAGE: ACADEMY (API: /api/cliente/academy/cursos)
═══════════════════════════════════════════════ */
function AcademyPage() {
  const t = useT();
  const { token } = useAuth();
  const [cat, setCat] = useState("Todos");
  const [lvl, setLvl] = useState("Todos");
  const [cursos, setCursos] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!token || !API_URL) { setLoading(false); return; }
    let cancelled = false;
    apiGet(token, "/api/cliente/academy/cursos").then(r => r.ok ? r.json().catch(() => []) : []).then(data => {
      if (cancelled) return;
      setCursos(Array.isArray(data) ? data : (data?.items || []));
    }).catch(() => setCursos([])).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [token]);
  const academy = cursos.map(c => ({ id: c.slug || c.uuid || c.id, title: c.titulo || c.title, cat: c.categoria || c.cat || "—", fmt: c.formato || c.fmt || "—", dur: c.duracao || c.dur || "—", lvl: c.nivel || c.lvl || "—", done: c.concluido ?? (c.progresso===100), prog: c.progresso ?? c.prog ?? 0 }));
  const items = academy.filter(c => (cat==="Todos"||c.cat===cat) && (lvl==="Todos"||c.lvl===lvl));
  const done = academy.filter(c=>c.prog===100).length;
  const total = academy.length || 1;
  if (loading) return <div style={{ padding: 24, color: t.t3, fontSize: 13 }}>Carregando Academy...</div>;
  return (
    <div>
      <PageHeader title="Academy" subtitle="Aprenda marketing, tráfego e estratégias de crescimento."/>
      <Card style={{ padding:"20px 24px", marginBottom:22, display:"flex", alignItems:"center", gap:20 }}>
        <div style={{ width:56, height:56, borderRadius:14, background:t.bg3, border:`1px solid ${t.b1}`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
          <span style={{ fontSize:24 }}>🎓</span>
        </div>
        <div style={{ flex:1 }}>
          <div style={{ color:t.t1, fontSize:13, fontWeight:700, marginBottom:8 }}>Seu progresso na Academy</div>
          <div style={{ background:t.bg4, borderRadius:6, height:5, overflow:"hidden" }}>
            <div style={{ height:"100%", width:`${(done/total)*100}%`, background:t.accent, borderRadius:6, transition:"width 1s ease" }}/>
          </div>
          <div style={{ color:t.t3, fontSize:11, marginTop:6 }}>{done} de {academy.length} concluídos</div>
        </div>
        <div style={{ textAlign:"right" }}>
          <div style={{ color:t.t1, fontSize:26, fontWeight:800 }}>{Math.round((done/total)*100)}%</div>
          <div style={{ color:t.t3, fontSize:10 }}>concluído</div>
        </div>
      </Card>
      <div style={{ display:"flex", gap:12, alignItems:"center", marginBottom:22, flexWrap:"wrap" }}>
        <FilterBar opts={["Todos","Funil","Tráfego","Marketing","Vendas","Estratégia"]} active={cat} onChange={setCat} label="ÁREA"/>
        <div style={{ width:1, height:16, background:t.b1 }}/>
        <FilterBar opts={["Todos","Iniciante","Intermediário","Avançado"]} active={lvl} onChange={setLvl} label="NÍVEL"/>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12 }}>
        {items.length ? items.map(item => {
          const fc = FMT_COLOR[item.fmt]||"#888";
          const lc = LVL_COLOR[item.lvl]||"#888";
          return (
            <Card key={item.id} lift style={{ overflow:"hidden", cursor:"pointer" }}>
              <div style={{ height:80, background:t.bg3, display:"flex", alignItems:"center", justifyContent:"center", position:"relative", borderBottom:`1px solid ${t.b1}` }}>
                <span style={{ color:t.t3, fontSize:32 }}>◆</span>
                {item.done && (
                  <div style={{ position:"absolute", top:10, right:10, background:C.green, borderRadius:"50%", width:22, height:22, display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <span style={{ color:"#fff", fontSize:10, fontWeight:700 }}>✓</span>
                  </div>
                )}
                {item.prog>0 && item.prog<100 && (
                  <div style={{ position:"absolute", bottom:0, left:0, right:0, height:2, background:t.bg4 }}>
                    <div style={{ height:"100%", width:`${item.prog}%`, background:t.accent }}/>
                  </div>
                )}
              </div>
              <div style={{ padding:"16px" }}>
                <div style={{ display:"flex", gap:5, marginBottom:10 }}>
                  <Tag label={item.fmt} color={fc} bg={`${fc}14`}/>
                  <Tag label={item.lvl} color={lc} bg={`${lc}14`}/>
                </div>
                <div style={{ color:t.t1, fontSize:13, fontWeight:700, lineHeight:1.45, marginBottom:8 }}>{item.title}</div>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:14 }}>
                  <span style={{ color:t.t3, fontSize:11 }}>⏱ {item.dur}</span>
                  <span style={{ color:t.t3, fontSize:11 }}>{item.cat}</span>
                </div>
                {item.prog===100 ? (
                  <div style={{ padding:"7px", borderRadius:7, background:C.greenBg, border:`1px solid ${C.green}25`, color:C.green, fontSize:11, fontWeight:700, textAlign:"center" }}>✓ Concluído</div>
                ) : item.prog>0 ? (
                  <div>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                      <span style={{ fontSize:10, color:t.t3 }}>Em andamento</span>
                      <span style={{ fontSize:10, color:t.t1, fontWeight:700 }}>{item.prog}%</span>
                    </div>
                    <div style={{ background:t.bg4, borderRadius:4, height:4 }}>
                      <div style={{ height:"100%", width:`${item.prog}%`, background:t.accent, borderRadius:4 }}/>
                    </div>
                  </div>
                ) : (
                  <div style={{ padding:"7px", borderRadius:7, background:t.bg4, border:`1px solid ${t.b1}`, color:t.t2, fontSize:11, fontWeight:700, textAlign:"center" }}>▶ Iniciar</div>
                )}
              </div>
            </Card>
          );
        }) : <div style={{ gridColumn:"1/-1", padding: 24, color: t.t3, fontSize: 13 }}>Nenhum curso disponível.</div>}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   PAGE: SUPORTE (API: chamados + faq)
═══════════════════════════════════════════════ */
function SuportePage() {
  const t = useT();
  const { token } = useAuth();
  const [tab, setTab] = useState("tickets");
  const [faqOpen, setFaqOpen] = useState(null);
  const [form, setForm] = useState({ tipo:"", titulo:"", desc:"", prio:"Média" });
  const [chamados, setChamados] = useState([]);
  const [faq, setFaq] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitChamado, setSubmitChamado] = useState({ loading: false, error: "" });
  const loadChamados = () => apiGet(token, "/api/cliente/suporte/chamados?limit=50&offset=0").then(r => r.ok ? r.json().catch(() => ({})) : {}).then(data => setChamados(Array.isArray(data) ? data : (data?.items || []))).catch(() => setChamados([]));
  useEffect(() => {
    if (!token || !API_URL) { setLoading(false); return; }
    let cancelled = false;
    Promise.all([
      apiGet(token, "/api/cliente/suporte/chamados?limit=50&offset=0").then(r => r.ok ? r.json().catch(() => ({})) : {}).catch(() => ({})),
      apiGet(token, "/api/cliente/suporte/faq").then(r => r.ok ? r.json().catch(() => []) : []).catch(() => []),
    ]).then(([ch, f]) => {
      if (cancelled) return;
      setChamados(Array.isArray(ch) ? ch : (ch?.items || []));
      setFaq(Array.isArray(f) ? f : (f?.items || []));
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [token]);
  const handleEnviarChamado = async (e) => {
    e.preventDefault();
    if (!form.tipo || !form.titulo?.trim() || !form.desc?.trim()) { setSubmitChamado({ loading: false, error: "Preencha categoria, título e descrição." }); return; }
    setSubmitChamado({ loading: true, error: "" });
    try {
      const res = await apiPost(token, "/api/cliente/suporte/chamados", { categoria: form.tipo, titulo: form.titulo.trim(), descricao: form.desc.trim() });
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err?.error || "Erro ao criar chamado"); }
      await loadChamados();
      setForm({ tipo:"", titulo:"", desc:"", prio:"Média" });
      setTab("tickets");
    } catch (err) { setSubmitChamado({ loading: false, error: err.message || "Erro ao enviar" }); return; }
    setSubmitChamado({ loading: false, error: "" });
  };
  const tickets = chamados.map(tc => ({ id: tc.uuid || tc.id || tc.numero, cat: tc.categoria || tc.cat, title: tc.titulo || tc.title, status: tc.status || "—", created: tc.criado_em || tc.created || "—", updated: tc.atualizado_em || tc.updated || "—" }));
  const faqList = faq.map(f => ({ q: f.pergunta || f.q || f.titulo, a: f.resposta || f.a || f.conteudo || "—" }));
  if (loading) return <div style={{ padding: 24, color: t.t3, fontSize: 13 }}>Carregando suporte...</div>;
  return (
    <div>
      <PageHeader title="Suporte" subtitle="Central de atendimento e ajuda da United."/>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginBottom:24 }}>
        {[
          { label:"Abrir Chamado",        icon:"📩", badge:{ l:"Novo",       c:C.blue,   bg:C.blueBg   }, action:()=>setTab("novo") },
          { label:"Falar no WhatsApp",     icon:"💬", badge:{ l:"Online",     c:C.green,  bg:C.greenBg  }, action:()=>{} },
          { label:"Base de Conhecimento", icon:"📚", badge:{ l: `${faqList.length} artigos`, c:C.purple, bg:C.purpleBg }, action:()=>setTab("faq") },
        ].map((a,i) => (
          <Card key={i} lift style={{ padding:"20px 22px", cursor:"pointer" }}>
            <div onClick={a.action}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 }}>
                <div style={{ width:42, height:42, borderRadius:11, background:t.bg3, border:`1px solid ${t.b1}`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <span style={{ fontSize:20 }}>{a.icon}</span>
                </div>
                <Tag label={a.badge.l} color={a.badge.c} bg={a.badge.bg}/>
              </div>
              <div style={{ color:t.t1, fontSize:13, fontWeight:700 }}>{a.label}</div>
            </div>
          </Card>
        ))}
      </div>
      <div style={{ display:"flex", gap:0, marginBottom:22, borderBottom:`1px solid ${t.b1}` }}>
        {[{ id:"tickets",label:"Chamados" },{ id:"faq",label:"FAQ" },{ id:"novo",label:"Novo Chamado" }].map(tb => (
          <button key={tb.id} onClick={() => setTab(tb.id)} style={{ padding:"8px 18px", background:"transparent", border:"none",
            borderBottom:tab===tb.id?`2px solid ${t.accent}`:"2px solid transparent",
            color:tab===tb.id?t.t1:t.t3, fontSize:13, fontWeight:700, cursor:"pointer", marginBottom:-1, transition:"all .18s" }}>
            {tb.label}
          </button>
        ))}
      </div>
      {tab==="tickets" && (
        <div style={{ border:`1px solid ${t.b1}`, borderRadius:10, overflow:"hidden" }}>
          {tickets.length ? tickets.map((tc,i) => (
            <div key={tc.id} style={{ display:"flex", alignItems:"center", gap:16, padding:"14px 20px",
              background:t.bg2, borderTop:i>0?`1px solid ${t.b1}`:undefined, transition:"background .14s" }}
              onMouseEnter={e=>e.currentTarget.style.background=t.bg3}
              onMouseLeave={e=>e.currentTarget.style.background=t.bg2}>
              <div style={{ width:40, height:40, borderRadius:10, background:t.bg4, border:`1px solid ${t.b1}`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <span style={{ color:t.t3, fontSize:16 }}>◉</span>
              </div>
              <div style={{ flex:1 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                  <span style={{ color:t.t4, fontSize:10, fontWeight:700 }}>{tc.id}</span>
                  <Tag label={tc.cat} color={C.blue} bg={C.blueBg}/>
                </div>
                <div style={{ color:t.t1, fontSize:12, fontWeight:600 }}>{tc.title}</div>
                <div style={{ color:t.t4, fontSize:10, marginTop:2 }}>Aberto {tc.created} · {tc.updated}</div>
              </div>
              <StatusBadge status={tc.status}/>
              <Btn variant="ghost" size="sm">Detalhes</Btn>
            </div>
          )) : <div style={{ padding: 24, color: t.t3, fontSize: 13 }}>Nenhum chamado.</div>}
        </div>
      )}
      {tab==="faq" && (
        <div style={{ border:`1px solid ${t.b1}`, borderRadius:10, overflow:"hidden" }}>
          {faqList.length ? faqList.map((item,i) => (
            <div key={i} style={{ background:t.bg2, borderTop:i>0?`1px solid ${t.b1}`:undefined, overflow:"hidden" }}>
              <div onClick={() => setFaqOpen(faqOpen===i?null:i)} style={{ padding:"15px 20px", display:"flex", justifyContent:"space-between", cursor:"pointer", transition:"background .14s" }}
                onMouseEnter={e=>e.currentTarget.style.background=t.bg3}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <span style={{ color:t.t1, fontSize:13, fontWeight:600 }}>{item.q}</span>
                <span style={{ color:t.t3, fontSize:12, marginLeft:16 }}>{faqOpen===i?"▲":"▼"}</span>
              </div>
              {faqOpen===i && (
                <div style={{ padding:"0 20px 16px", borderTop:`1px solid ${t.b1}`, paddingTop:14, background:t.bg3 }}>
                  <p style={{ color:t.t2, fontSize:12, lineHeight:1.7 }}>{item.a}</p>
                </div>
              )}
            </div>
          )) : <div style={{ padding: 24, color: t.t3, fontSize: 13 }}>Nenhum FAQ disponível.</div>}
        </div>
      )}
      {tab==="novo" && (
        <div style={{ maxWidth:580 }}>
          <Card style={{ padding:"28px" }}>
            <div style={{ color:t.t1, fontSize:14, fontWeight:700, marginBottom:22 }}>Novo Chamado de Suporte</div>
            <form onSubmit={handleEnviarChamado} style={{ display:"flex", flexDirection:"column", gap:16 }}>
              <div>
                <label style={{ color:t.t3, fontSize:9, fontWeight:800, letterSpacing:1.8, textTransform:"uppercase", display:"block", marginBottom:8 }}>Categoria</label>
                <select value={form.tipo} onChange={e=>setForm({...form,tipo:e.target.value})} required style={{ width:"100%", padding:"10px 14px", background:t.bg3, border:`1px solid ${t.b1}`, borderRadius:9, color:t.t1, fontSize:12, outline:"none" }}>
                  <option value="">Selecione uma categoria</option>
                  {["Produção","Performance","Materiais","Financeiro","Técnico","Outros"].map(o=><option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label style={{ color:t.t3, fontSize:9, fontWeight:800, letterSpacing:1.8, textTransform:"uppercase", display:"block", marginBottom:8 }}>Título</label>
                <input value={form.titulo} onChange={e=>setForm({...form,titulo:e.target.value})} placeholder="Resumo do problema" required style={{ width:"100%", padding:"10px 14px", background:t.bg3, border:`1px solid ${t.b1}`, borderRadius:9, color:t.t1, fontSize:12, outline:"none" }}/>
              </div>
              <div>
                <label style={{ color:t.t3, fontSize:9, fontWeight:800, letterSpacing:1.8, textTransform:"uppercase", display:"block", marginBottom:8 }}>Descrição</label>
                <textarea value={form.desc} onChange={e=>setForm({...form,desc:e.target.value})} rows={4} placeholder="Descreva o problema..." required style={{ width:"100%", padding:"10px 14px", background:t.bg3, border:`1px solid ${t.b1}`, borderRadius:9, color:t.t1, fontSize:12, outline:"none", resize:"vertical", lineHeight:1.6 }}/>
              </div>
              {submitChamado.error && <div style={{ color: C.red, fontSize: 12 }}>{submitChamado.error}</div>}
              <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
                <Btn type="button" variant="ghost" onClick={() => setTab("tickets")}>Cancelar</Btn>
                <button type="submit" disabled={submitChamado.loading} style={{ padding:"8px 18px", borderRadius:8, border:"none", cursor: submitChamado.loading ? "default" : "pointer", background: t.accent, color: t.accentText, fontWeight: 700, fontSize: 12 }}>{submitChamado.loading ? "Enviando..." : "Enviar Chamado"}</button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   PAGE: CONFIGURAÇÕES (API: perfil, usuarios, notificacoes, integracoes)
═══════════════════════════════════════════════ */
function ConfigPage() {
  const t = useT();
  const { token } = useAuth();
  const [sec, setSec] = useState("perfil");
  const [perfil, setPerfil] = useState(null);
  const [usuarios, setUsuarios] = useState([]);
  const [notif, setNotif] = useState(null);
  const [integracoes, setIntegracoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [perfilForm, setPerfilForm] = useState({ nome: "", email: "", cidade: "" });
  const [notifForm, setNotifForm] = useState({ canal_email: true, canal_plataforma: true, canal_whatsapp: false });
  const [savePerfil, setSavePerfil] = useState({ loading: false, error: "" });
  const [saveNotif, setSaveNotif] = useState({ loading: false, error: "" });
  const [conectarId, setConectarId] = useState(null);
  const secs = [{ id:"perfil",label:"Perfil & Empresa" },{ id:"usuarios",label:"Usuários" },{ id:"notif",label:"Notificações" },{ id:"integ",label:"Integrações" }];
  const loadConfig = () => {
    if (!token || !API_URL) return;
    Promise.all([
      apiGet(token, "/api/cliente/config/perfil").then(r => r.ok ? r.json().catch(() => null) : null).catch(() => null),
      apiGet(token, "/api/cliente/config/usuarios").then(r => r.ok ? r.json().catch(() => []) : []).catch(() => []),
      apiGet(token, "/api/cliente/config/notificacoes").then(r => r.ok ? r.json().catch(() => null) : null).catch(() => null),
      apiGet(token, "/api/cliente/config/integracoes").then(r => r.ok ? r.json().catch(() => []) : []).catch(() => []),
    ]).then(([p, u, n, i]) => {
      setPerfil(p);
      setUsuarios(Array.isArray(u) ? u : (u?.items || []));
      setNotif(n);
      setIntegracoes(Array.isArray(i) ? i : (i?.items || []));
      if (p) setPerfilForm({ nome: p.nome || p.name || "", email: p.email || "", cidade: p.cidade || "" });
      if (n) setNotifForm({ canal_email: n.canal_email !== false, canal_plataforma: n.canal_plataforma !== false, canal_whatsapp: n.canal_whatsapp === true });
    });
  };
  useEffect(() => {
    if (!token || !API_URL) { setLoading(false); return; }
    let cancelled = false;
    loadConfig().finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [token]);
  const handleSalvarPerfil = async (e) => {
    e.preventDefault();
    setSavePerfil({ loading: true, error: "" });
    try {
      const res = await apiPut(token, "/api/cliente/config/perfil", { nome: perfilForm.nome, email: perfilForm.email, cidade: perfilForm.cidade });
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err?.error || "Erro ao salvar"); }
      const data = await res.json().catch(() => ({}));
      if (data) setPerfil(data);
    } catch (err) { setSavePerfil({ loading: false, error: err.message || "Erro" }); return; }
    setSavePerfil({ loading: false, error: "" });
  };
  const handleSalvarNotif = async () => {
    setSaveNotif({ loading: true, error: "" });
    try {
      const res = await apiPut(token, "/api/cliente/config/notificacoes", notifForm);
      if (!res.ok) throw new Error("Erro ao salvar");
      setNotif(notifForm);
    } catch (err) { setSaveNotif({ loading: false, error: err.message || "Erro" }); return; }
    setSaveNotif({ loading: false, error: "" });
  };
  const handleConectarIntegracao = async (id) => {
    if (!id) return;
    setConectarId(id);
    try {
      const res = await apiPost(token, `/api/cliente/config/integracoes/${id}/conectar`, {});
      if (res.ok) loadConfig();
    } finally { setConectarId(null); }
  };
  const profile = perfil || {};
  const userList = usuarios.map(u => ({ name: u.name || u.nome || u.email, email: u.email, role: u.role || "Visualizador", av: (u.name || u.email || "?").slice(0,2).toUpperCase() }));
  const integList = integracoes.map(ig => ({ id: ig.uuid || ig.id, name: ig.nome || ig.name || ig.id, icon: ig.icon || "🔗", status: ig.status || "Desconectado" }));
  if (loading) return <div style={{ padding: 24, color: t.t3, fontSize: 13 }}>Carregando configurações...</div>;
  return (
    <div>
      <PageHeader title="Configurações" subtitle="Gerencie sua conta e preferências da plataforma."/>
      <div style={{ display:"grid", gridTemplateColumns:"190px 1fr", gap:14 }}>
        <Card style={{ padding:"8px" }}>
          {secs.map(s => (
            <div key={s.id} onClick={() => setSec(s.id)} style={{ padding:"9px 14px", borderRadius:8, cursor:"pointer",
              background: sec===s.id ? t.bg4 : "transparent",
              borderLeft: sec===s.id ? `2px solid ${t.accent}` : "2px solid transparent",
              color: sec===s.id ? t.t1 : t.t3,
              fontSize:12, fontWeight:sec===s.id?700:500, transition:"all .14s" }}
              onMouseEnter={e => { if(sec!==s.id) e.currentTarget.style.background=t.bg3; }}
              onMouseLeave={e => { if(sec!==s.id) e.currentTarget.style.background="transparent"; }}>
              {s.label}
            </div>
          ))}
        </Card>
        <div>
          {sec==="perfil" && (
            <Card style={{ padding:"28px" }}>
              <div style={{ color:t.t1, fontWeight:700, fontSize:13, marginBottom:22 }}>Perfil & Empresa</div>
              <form onSubmit={handleSalvarPerfil}>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:18 }}>
                  <div>
                    <label style={{ color:t.t3, fontSize:9, fontWeight:800, letterSpacing:1.8, textTransform:"uppercase", display:"block", marginBottom:7 }}>Nome</label>
                    <input value={perfilForm.nome} onChange={e=>setPerfilForm({...perfilForm,nome:e.target.value})} style={{ width:"100%", padding:"9px 13px", background:t.bg3, border:`1px solid ${t.b1}`, borderRadius:8, color:t.t1, fontSize:12, outline:"none" }}/>
                  </div>
                  <div>
                    <label style={{ color:t.t3, fontSize:9, fontWeight:800, letterSpacing:1.8, textTransform:"uppercase", display:"block", marginBottom:7 }}>Email</label>
                    <input type="email" value={perfilForm.email} onChange={e=>setPerfilForm({...perfilForm,email:e.target.value})} style={{ width:"100%", padding:"9px 13px", background:t.bg3, border:`1px solid ${t.b1}`, borderRadius:8, color:t.t1, fontSize:12, outline:"none" }}/>
                  </div>
                  <div style={{ gridColumn:"1/-1" }}>
                    <label style={{ color:t.t3, fontSize:9, fontWeight:800, letterSpacing:1.8, textTransform:"uppercase", display:"block", marginBottom:7 }}>Cidade</label>
                    <input value={perfilForm.cidade} onChange={e=>setPerfilForm({...perfilForm,cidade:e.target.value})} style={{ width:"100%", padding:"9px 13px", background:t.bg3, border:`1px solid ${t.b1}`, borderRadius:8, color:t.t1, fontSize:12, outline:"none" }}/>
                  </div>
                </div>
                {savePerfil.error && <div style={{ color:C.red, fontSize:12, marginBottom:10 }}>{savePerfil.error}</div>}
                <button type="submit" disabled={savePerfil.loading} style={{ padding:"8px 18px", borderRadius:8, border:"none", cursor: savePerfil.loading?"default":"pointer", background:t.accent, color:t.accentText, fontWeight:700, fontSize:12 }}>{savePerfil.loading ? "Salvando..." : "Salvar Alterações"}</button>
              </form>
            </Card>
          )}
          {sec==="usuarios" && (
            <Card style={{ padding:"28px" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:22 }}>
                <div style={{ color:t.t1, fontWeight:700, fontSize:13 }}>Usuários da Conta</div>
                <Btn size="sm">+ Convidar</Btn>
              </div>
              {userList.length ? userList.map((u,i) => (
                <div key={i} style={{ display:"flex", alignItems:"center", gap:14, padding:"13px 0", borderBottom:i<userList.length-1?`1px solid ${t.b1}`:"none" }}>
                  <div style={{ width:36, height:36, borderRadius:"50%", background:t.bg4, border:`1px solid ${t.b1}`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <span style={{ color:t.t2, fontSize:11, fontWeight:800 }}>{u.av}</span>
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ color:t.t1, fontSize:12, fontWeight:600 }}>{u.name}</div>
                    <div style={{ color:t.t3, fontSize:11 }}>{u.email}</div>
                  </div>
                  <Tag label={u.role} color={u.role==="admin"?C.amber:C.blue} bg={u.role==="admin"?C.amberBg:C.blueBg}/>
                  <button style={{ background:"transparent", border:"none", color:t.t4, fontSize:11, cursor:"pointer" }}>Remover</button>
                </div>
              )) : <div style={{ color: t.t3, fontSize: 12 }}>Nenhum usuário listado.</div>}
            </Card>
          )}
          {sec==="notif" && (
            <Card style={{ padding:"28px" }}>
              <div style={{ color:t.t1, fontWeight:700, fontSize:13, marginBottom:22 }}>Notificações</div>
              {["Email","Plataforma","WhatsApp"].map((canal, i) => {
                const key = canal==="Email"?"canal_email":canal==="Plataforma"?"canal_plataforma":"canal_whatsapp";
                const val = notifForm[key];
                return (
                  <div key={key} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 0", borderBottom:i<2?`1px solid ${t.b1}`:"none" }}>
                    <span style={{ color:t.t1, fontSize:12, fontWeight:600 }}>{canal}</span>
                    <button type="button" onClick={() => setNotifForm({ ...notifForm, [key]: !val })} style={{ width:40, height:22, borderRadius:11, background: val ? t.accent : t.bg4, border:`1px solid ${t.b1}`, cursor:"pointer", position:"relative" }}>
                      <span style={{ position:"absolute", left: val ? "auto" : 2, right: val ? 2 : "auto", top:2, width:18, height:18, borderRadius:"50%", background: t.accentText, transition:"left .2s, right .2s" }}/>
                    </button>
                  </div>
                );
              })}
              {saveNotif.error && <div style={{ color:C.red, fontSize:12, marginTop:10 }}>{saveNotif.error}</div>}
              <button type="button" onClick={handleSalvarNotif} disabled={saveNotif.loading} style={{ marginTop:16, padding:"8px 18px", borderRadius:8, border:"none", cursor: saveNotif.loading?"default":"pointer", background:t.accent, color:t.accentText, fontWeight:700, fontSize:12 }}>{saveNotif.loading ? "Salvando..." : "Salvar notificações"}</button>
            </Card>
          )}
          {sec==="integ" && (
            <Card style={{ padding:"28px" }}>
              <div style={{ color:t.t1, fontWeight:700, fontSize:13, marginBottom:22 }}>Integrações</div>
              {integList.length ? integList.map((ig,i) => (
                <div key={ig.id || i} style={{ display:"flex", alignItems:"center", gap:14, padding:"13px 0", borderBottom:i<integList.length-1?`1px solid ${t.b1}`:"none" }}>
                  <div style={{ width:40, height:40, borderRadius:10, background:t.bg3, border:`1px solid ${t.b1}`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <span style={{ fontSize:18 }}>{ig.icon}</span>
                  </div>
                  <span style={{ flex:1, color:t.t1, fontSize:12, fontWeight:600 }}>{ig.name}</span>
                  <StatusBadge status={ig.status}/>
                  <button type="button" disabled={conectarId===ig.id} onClick={() => ig.status==="Conectado" ? {} : handleConectarIntegracao(ig.id)} style={{ padding:"5px 13px", borderRadius:8, border:`1px solid ${t.b1}`, background:"transparent", color: t.t2, fontSize: 11, fontWeight: 700, cursor: conectarId===ig.id ? "default" : "pointer" }}>{conectarId===ig.id ? "..." : ig.status==="Conectado" ? "Gerenciar" : "Conectar"}</button>
                </div>
              )) : <div style={{ color: t.t3, fontSize: 12 }}>Nenhuma integração configurada.</div>}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   ROOT APP
═══════════════════════════════════════════════ */
export default function DashboardApp() {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();
  const canProducao = user?.can_producao !== false;
  const baseCanPerformance = user?.can_performance === true;
  const [planoNome, setPlanoNome] = useState("");
  const [planoLoading, setPlanoLoading] = useState(true);
  const [planoError, setPlanoError] = useState(false);
  const normPlan = (v) => String(v || "").trim().toLowerCase();
  const isStarterPlan = (v) => {
    const s = normPlan(v);
    return s === "starter" || s.includes("starter");
  };
  const planFromUser = user?.plano ?? user?.plan ?? user?.plano_nome ?? user?.plan_name ?? user?.planoName;
  const isStarter = isStarterPlan(planoNome) || isStarterPlan(planFromUser);
  // Regra de negócio: Starter bloqueia. Growth+ libera (desde que can_performance=true).
  // Não bloqueie Growth por atraso/erro ao carregar o plano; use o carregamento apenas para mensagem.
  const canPerformance = baseCanPerformance && !isStarter;
  const performanceDisabledReason = isStarter
    ? "Disponível apenas em planos Growth+"
    : (planoLoading ? "Carregando seu plano..." : (planoError ? "Não foi possível confirmar seu plano agora" : ""));

  const [isDark, setIsDark] = useState(true);
  const theme = isDark ? DARK : LIGHT;
  const [page,      setPage]      = useState("dashboard");
  const [mode,      setMode]      = useState("producao");
  const [collapsed, setCollapsed] = useState(false);
  const [fading,    setFading]    = useState(false);
  const [clienteDesativado, setClienteDesativado] = useState(false);
  const [clienteStatusLabel, setClienteStatusLabel] = useState("");

  const statusNorm = (s) => String(s || "").trim().toLowerCase();
  const isDesativado = (s) => {
    const v = statusNorm(s);
    return v.includes("desativ") || v === "inativo" || v.includes("inativ") || v.includes("bloquead");
  };

  useEffect(() => {
    if (!token || !API_URL) return;
    let cancelled = false;
    setPlanoLoading(true);
    setPlanoError(false);
    apiGet(token, "/api/cliente/financeiro/plano")
      .then(r => r.ok ? r.json().catch(() => null) : null)
      .then((pl) => {
        if (cancelled) return;
        const nome = pl?.nome ?? pl?.plano ?? pl?.name ?? pl?.plan ?? pl?.data?.nome ?? pl?.data?.plano ?? "";
        const nomeStr = String(nome || "").trim();
        if (!nomeStr) throw new Error("plano vazio");
        setPlanoNome(nomeStr);
      })
      .catch(() => { if (!cancelled) setPlanoError(true); })
      .finally(() => { if (!cancelled) setPlanoLoading(false); });
    return () => { cancelled = true; };
  }, [token]);

  // Bloqueio de acesso: cliente desativado não entra no dashboard.
  useEffect(() => {
    if (!token || !API_URL) return;
    let cancelled = false;
    // 1) tenta inferir do próprio user, se existir
    const possibleUserStatus = user?.status ?? user?.cliente_status ?? user?.client_status ?? user?.cliente?.status ?? user?.client?.status;
    if (possibleUserStatus && isDesativado(possibleUserStatus)) {
      setClienteDesativado(true);
      setClienteStatusLabel(String(possibleUserStatus));
      return () => { cancelled = true; };
    }
    // 2) fonte confiável: perfil do cliente
    apiGet(token, "/api/cliente/config/perfil")
      .then(r => r.ok ? r.json().catch(() => ({})) : {})
      .then((perfil) => {
        if (cancelled) return;
        const st = perfil?.status ?? perfil?.Status ?? perfil?.data?.status ?? "";
        if (st) setClienteStatusLabel(String(st));
        setClienteDesativado(isDesativado(st));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [token, user]);

  useEffect(() => {
    if (!user) return;
    // Inicializa modo de forma consistente com permissões e plano.
    setMode((cur) => {
      const preferred = canProducao ? "producao" : (canPerformance ? "performance" : "producao");
      if (cur === preferred) return cur;
      // se o modo atual está inválido, corrige; senão, mantém
      if (cur === "performance" && !canPerformance) return "producao";
      if (cur === "producao" && !canProducao) return canPerformance ? "performance" : "producao";
      return cur;
    });
    if (mode === "performance" && !canPerformance) setMode("producao");
    if (mode === "producao" && !canProducao) setMode("performance");
  }, [user, canProducao, canPerformance]);

  const switchMode = (m) => {
    if (m === mode) return;
    if (m === "performance" && !canPerformance) return;
    if (m === "producao" && !canProducao) return;
    setFading(true);
    setTimeout(() => { setMode(m); setFading(false); }, 130);
  };

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const isMain = page === "dashboard";
  const t = theme;
  const displayName = user?.name || user?.email || "Cliente";

  const pageLabel = {
    dashboard:"Dashboard", relatorios:"Relatórios", materiais:"Materiais",
    reunioes:"Reuniões", financeiro:"Financeiro", academy:"Academy",
    suporte:"Suporte", config:"Configurações",
  }[page] || "Dashboard";

  return (
    <ThemeCtx.Provider value={theme}>
      {clienteDesativado ? (
        <div style={{ minHeight: "100vh", background: theme.bg0, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <Card style={{ padding: 26, maxWidth: 520, width: "100%" }}>
            <div style={{ color: theme.t1, fontWeight: 900, fontSize: 16, marginBottom: 8 }}>Acesso bloqueado</div>
            <div style={{ color: theme.t3, fontSize: 12, lineHeight: 1.6, marginBottom: 12 }}>
              Este cliente está <strong>desativado</strong> e não pode acessar o dashboard.
            </div>
            {!!clienteStatusLabel && (
              <div style={{ color: theme.t4, fontSize: 11, marginBottom: 14 }}>
                Status: <strong style={{ color: theme.t2 }}>{clienteStatusLabel}</strong>
              </div>
            )}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <Btn variant="ghost" size="sm" onClick={handleLogout}>Sair</Btn>
            </div>
          </Card>
        </div>
      ) : (
      <div style={{ display:"flex", height:"100vh", background:t.bg0, overflow:"hidden", transition:"background .3s" }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
          *{box-sizing:border-box;margin:0;padding:0;font-family:'Plus Jakarta Sans',sans-serif;}
          ::-webkit-scrollbar{width:3px;height:3px;}
          ::-webkit-scrollbar-thumb{background:${t.isDark?"rgba(255,255,255,.1)":"rgba(0,0,0,.15)"};border-radius:2px;}
          ::-webkit-scrollbar-track{background:transparent;}
          input,select,textarea{font-family:'Plus Jakarta Sans',sans-serif;}
          input::placeholder,textarea::placeholder{color:${t.t4};}
          @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
          @keyframes fadeOut{to{opacity:0}}
          .enter{animation:fadeIn .22s cubic-bezier(.4,0,.2,1);}
          .leave{animation:fadeOut .13s ease forwards;}
        `}</style>

        {/* ─── SIDEBAR ─── */}
        <aside style={{ width:collapsed?52:200, background:t.bg1, borderRight:`1px solid ${t.b1}`, display:"flex", flexDirection:"column", transition:"width .26s cubic-bezier(.4,0,.2,1)", flexShrink:0, overflow:"hidden" }}>
          <div style={{ padding:collapsed?"20px 10px":"20px 16px", borderBottom:`1px solid ${t.b1}`, flexShrink:0 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <div style={{ width:30, height:30, flexShrink:0, borderRadius:8, background:t.accent, display:"flex", alignItems:"center", justifyContent:"center" }}>
                <span style={{ color:t.accentText, fontWeight:900, fontSize:14 }}>U</span>
              </div>
              {!collapsed && (
                <div>
                  <div style={{ color:t.t1, fontSize:12, fontWeight:800, letterSpacing:2 }}>UNITED</div>
                  <div style={{ color:t.t4, fontSize:7, letterSpacing:3, textTransform:"uppercase" }}>Growth Hub</div>
                </div>
              )}
            </div>
          </div>

          {!collapsed && (
            <div style={{ padding:"10px 12px", borderBottom:`1px solid ${t.b1}` }}>
              <div style={{ background:t.bg3, border:`1px solid ${t.b1}`, borderRadius:9, padding:"9px 12px" }}>
                <div style={{ color:t.t4, fontSize:7, letterSpacing:2.5, textTransform:"uppercase", marginBottom:4 }}>Cliente</div>
                <div style={{ color:t.t1, fontSize:11, fontWeight:700 }}>{displayName}</div>
                <div style={{ display:"flex", alignItems:"center", gap:5, marginTop:5 }}>
                  <div style={{ width:5, height:5, borderRadius:"50%", background:C.green }}/>
                  <span style={{ color:t.t3, fontSize:9 }}>Conta Ativa</span>
                </div>
              </div>
            </div>
          )}

          <nav style={{ flex:1, padding:"10px 6px", overflowY:"auto" }}>
            {NAV.map(item => {
              const active = page === item.id;
              return (
                <div key={item.id} onClick={() => setPage(item.id)}
                  style={{ display:"flex", alignItems:"center", gap:9, padding:collapsed?"9px 11px":"8px 11px", borderRadius:8, marginBottom:1, cursor:"pointer",
                    background: active ? t.bg4 : "transparent",
                    borderLeft: active ? `2px solid ${t.accent}` : "2px solid transparent",
                    transition:"all .13s" }}
                  onMouseEnter={e => { if(!active) e.currentTarget.style.background=t.bg3; }}
                  onMouseLeave={e => { if(!active) e.currentTarget.style.background="transparent"; }}>
                  <span style={{ fontSize:13, color:active?t.t1:t.t3, flexShrink:0 }}>{item.icon}</span>
                  {!collapsed && <>
                    <span style={{ fontSize:11, fontWeight:active?700:500, color:active?t.t1:t.t3, flex:1 }}>{item.label}</span>
                    {item.locked && <span style={{ fontSize:10, opacity:0.8 }} title="Recurso em breve">🔒</span>}
                    {item.b && <span style={{ fontSize:9, fontWeight:700, color:C.amber, background:C.amberBg, padding:"1px 6px", borderRadius:10 }}>{item.b}</span>}
                  </>}
                </div>
              );
            })}
          </nav>

          <div style={{ padding:"8px 6px", borderTop:`1px solid ${t.b1}` }}>
            <div onClick={() => setCollapsed(!collapsed)} style={{ display:"flex", alignItems:"center", gap:9, padding:"7px 11px", borderRadius:8, cursor:"pointer", transition:"background .13s" }}
              onMouseEnter={e=>e.currentTarget.style.background=t.bg3}
              onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              <span style={{ fontSize:11, color:t.t4 }}>{collapsed?"▶":"◀"}</span>
              {!collapsed && <span style={{ fontSize:11, color:t.t4 }}>Recolher</span>}
            </div>
            <div onClick={handleLogout} style={{ display:"flex", alignItems:"center", gap:9, padding:"7px 11px", borderRadius:8, cursor:"pointer", transition:"background .13s", marginTop:4 }}
              onMouseEnter={e=>e.currentTarget.style.background=t.bg3}
              onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              <span style={{ fontSize:11, color:t.t4 }}>⎋</span>
              {!collapsed && <span style={{ fontSize:11, color:t.t4 }}>Sair</span>}
            </div>
          </div>
        </aside>

        {/* ─── MAIN ─── */}
        <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", minWidth:0 }}>
          {/* TOPBAR */}
          <header style={{ height:56, flexShrink:0, background:t.bg1, borderBottom:`1px solid ${t.b1}`, display:"flex", alignItems:"center", padding:"0 24px", gap:14 }}>
            <div style={{ display:"flex", alignItems:"center", gap:5, flexShrink:0 }}>
              <span style={{ color:t.t4, fontSize:11 }}>United</span>
              <span style={{ color:t.t4 }}>·</span>
              <span style={{ color:t.t1, fontSize:11, fontWeight:700 }}>{pageLabel}</span>
            </div>

            {isMain && (
              <div style={{ flex:1, display:"flex", justifyContent:"center" }}>
                <ModeSwitch mode={mode} onChange={switchMode} canProducao={canProducao} canPerformance={canPerformance} performanceDisabledReason={performanceDisabledReason}/>
              </div>
            )}

            <div style={{ display:"flex", alignItems:"center", gap:10, marginLeft:isMain?0:"auto" }}>
              {isMain && canProducao && canPerformance && (
                <div style={{ padding:"3px 10px", borderRadius:5, background:t.bg3, border:`1px solid ${t.b1}`, color:t.t3, fontSize:9, fontWeight:700, letterSpacing:1.2, textTransform:"uppercase" }}>
                  {mode==="producao"?"● Execução":"● Resultado"}
                </div>
              )}

              {/* ── THEME TOGGLE ── */}
              <ThemeToggle isDark={isDark} onToggle={() => setIsDark(!isDark)}/>

              {/* Notification */}
              <div style={{ position:"relative", cursor:"pointer", width:32, height:32, borderRadius:8, background:t.bg3, border:`1px solid ${t.b1}`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                <span style={{ color:t.t2, fontSize:14 }}>◐</span>
                <div style={{ position:"absolute", top:7, right:7, width:6, height:6, borderRadius:"50%", background:C.amber }}/>
              </div>

              {/* Avatar */}
              <div style={{ display:"flex", alignItems:"center", gap:8, padding:"5px 10px", borderRadius:8, background:t.bg3, border:`1px solid ${t.b1}` }}>
                <div style={{ width:22, height:22, borderRadius:"50%", background:t.bg5, display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <span style={{ color:t.t2, fontSize:8, fontWeight:800 }}>{(displayName.slice(0,2)||"U").toUpperCase()}</span>
                </div>
                <span style={{ color:t.t2, fontSize:11, fontWeight:600 }}>{displayName}</span>
              </div>
            </div>
          </header>

          {/* CONTENT */}
          <main style={{ flex:1, overflowY:"auto", padding:"28px 30px", background:t.bg0, transition:"background .3s" }}>
            <div className={fading?"leave":"enter"} key={page+mode+isDark}>
              {isMain && mode==="producao"    && <ProducaoPage/>}
              {isMain && mode==="performance" && <PerformancePage/>}
              {page==="relatorios" && <RelatoriosPage/>}
              {page==="materiais"  && <MateriaisPage/>}
              {page==="reunioes"   && (NAV.find(n => n.id === "reunioes")?.locked ? <EmBrevePage sectionName="Reuniões"/> : <ReunioesPage/>)}
              {page==="financeiro" && <FinanceiroPage/>}
              {page==="academy"    && (NAV.find(n => n.id === "academy")?.locked ? <EmBrevePage sectionName="Academy"/> : <AcademyPage/>)}
              {page==="suporte"    && <SuportePage/>}
              {page==="config"     && <ConfigPage/>}
            </div>
          </main>
        </div>
      </div>
      )}
    </ThemeCtx.Provider>
  );
}
