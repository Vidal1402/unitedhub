import { useState, useEffect, createContext, useContext } from "react";
import { useAuth } from "../auth/AuthContext.jsx";
import { formatCurrency, formatPhone, buildCSV, formatCurrencyInput, parseCurrencyInput, formatDateInput, parseDateInput, formatPhoneInput, parsePhoneInput } from "../utils/format.js";

const API_URL = (import.meta.env.VITE_API_URL || "https://united-hub-3a6p.onrender.com").replace(/\/$/, "");
const FETCH_TIMEOUT_MS = 20000;

function fetchWithTimeout(url, options, ms = FETCH_TIMEOUT_MS) {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), ms);
  return fetch(url, { ...options, signal: ctrl.signal })
    .finally(() => clearTimeout(id));
}

function mensagemErroRede(err) {
  const msg = err?.message || String(err);
  if (msg === "Failed to fetch" || msg === "Load failed" || err?.name === "AbortError") return "Não foi possível conectar à API. Verifique: (1) backend está rodando, (2) VITE_API_URL no .env.local está correto, (3) CORS no backend permite sua origem.";
  if (String(msg).toLowerCase().includes("missing token") || String(msg).includes("405")) return "Servidor retornou 405 ou \"missing token\". Abra a aba Network (F12): veja se o OPTIONS está 204 (ok) e qual status tem o PATCH/POST. Se OPTIONS=204 mas PATCH/POST=405 → a rota pode não existir ou não aceitar esse método. Se PATCH/POST=401 → token ausente ou expirado (tente sair e entrar de novo). Ver BACKEND_CORS.md.";
  return msg;
}

// Evita "Unexpected end of JSON input" quando a resposta vem com corpo vazio
function safeResJson(res, fallback = {}) {
  return res.json().catch(() => fallback);
}

function apiGet(token, path) {
  if (!API_URL || !token) return Promise.reject(new Error("API não configurada. Verifique .env.local (VITE_API_URL) e faça login."));
  return fetchWithTimeout(`${API_URL}${path}`, { headers: { Authorization: `Bearer ${token}` } });
}
function apiPost(token, path, body) {
  if (!API_URL || !token) return Promise.reject(new Error("API não configurada. Verifique .env.local (VITE_API_URL) e faça login."));
  return fetchWithTimeout(`${API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body ?? {}),
  });
}
function apiPut(token, path, body) {
  if (!API_URL || !token) return Promise.reject(new Error("API não configurada. Verifique .env.local (VITE_API_URL) e faça login."));
  return fetchWithTimeout(`${API_URL}${path}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: body != null ? JSON.stringify(body) : undefined,
  });
}
function apiPatch(token, path, body) {
  if (!API_URL || !token) return Promise.reject(new Error("API não configurada. Verifique .env.local (VITE_API_URL) e faça login."));
  return fetchWithTimeout(`${API_URL}${path}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: body != null ? JSON.stringify(body) : undefined,
  });
}

// Normaliza cliente da API (aceita resposta em minúsculas ou PascalCase) para exibição consistente
function normalizeCliente(c) {
  if (!c || typeof c !== "object") return c;
  return {
    ...c,
    uuid: c.uuid ?? c.UUID,
    nome: c.nome ?? c.Nome,
    email: c.email ?? c.Email,
    segmento: c.segmento ?? c.Segmento,
    plano: c.plano ?? c.Plano,
    status: c.status ?? c.Status,
    cidade: c.cidade ?? c.Cidade,
    owner_uuid: c.owner_uuid ?? c.OwnerUUID,
    created_at: c.created_at ?? c.CreatedAt,
    updated_at: c.updated_at ?? c.UpdatedAt,
  };
}
function normalizeClientesList(arr) {
  return Array.isArray(arr) ? arr.map(normalizeCliente) : [];
}

/* ═══════════════════════════════════════════════════
   THEME SYSTEM
═══════════════════════════════════════════════════ */
const DARK = {
  bg0:"#070707", bg1:"#0D0D0D", bg2:"#131313", bg3:"#1A1A1A",
  bg4:"#222222", bg5:"#2C2C2C",
  t1:"#F0F0F0", t2:"#9A9A9A", t3:"#5A5A5A", t4:"#303030",
  b1:"rgba(255,255,255,0.07)", b2:"rgba(255,255,255,0.03)",
  bHi:"rgba(255,255,255,0.13)",
  accent:"#FFFFFF", accentTxt:"#070707",
  sh:"rgba(0,0,0,0.6)", isDark:true,
};
const LIGHT = {
  bg0:"#EFEFEF", bg1:"#F8F8F8", bg2:"#FFFFFF", bg3:"#F3F3F3",
  bg4:"#EAEAEA", bg5:"#DEDEDE",
  t1:"#0F0F0F", t2:"#555555", t3:"#9A9A9A", t4:"#CCCCCC",
  b1:"rgba(0,0,0,0.07)", b2:"rgba(0,0,0,0.03)",
  bHi:"rgba(0,0,0,0.14)",
  accent:"#0F0F0F", accentTxt:"#FFFFFF",
  sh:"rgba(0,0,0,0.12)", isDark:false,
};
const C = {
  green:"#22C55E", greenBg:"rgba(34,197,94,.12)",
  blue:"#3B82F6",  blueBg:"rgba(59,130,246,.12)",
  red:"#EF4444",   redBg:"rgba(239,68,68,.12)",
  amber:"#F59E0B", amberBg:"rgba(245,158,11,.12)",
  purple:"#A855F7",purpleBg:"rgba(168,85,247,.12)",
  cyan:"#06B6D4",  cyanBg:"rgba(6,182,212,.12)",
  pink:"#EC4899",  pinkBg:"rgba(236,72,153,.12)",
  orange:"#F97316",orangeBg:"rgba(249,115,22,.12)",
};
const Ctx = createContext(DARK);
const useT = () => useContext(Ctx);

/* ═══════════════════════════════════════════════════
   Dados vêm da API /api/admin/* — fallbacks vazios
═══════════════════════════════════════════════════ */
const PLANS = [
  { id:1, name:"Starter",  price:2400,  color:C.cyan,   features:[], clients:0 },
  { id:2, name:"Growth",   price:4800,  color:C.blue,   features:[], clients:0 },
  { id:3, name:"Pro",      price:7200,  color:C.purple, features:[], clients:0 },
  { id:4, name:"Scale",    price:9600,  color:C.amber,  features:[], clients:0 },
];
/** @deprecated Use dados da API em cada página. Fallback vazio para evitar ReferenceError. */
const CLIENTS = [];

const ADM_NAV = [
  { id:"overview",      icon:"⬡",  label:"Visão Geral"       },
  { id:"clientes",      icon:"◎",  label:"Clientes",    b:8  },
  { id:"colaboradores", icon:"◈",  label:"Colaboradores"     },
  { id:"financeiro",    icon:"◇",  label:"Financeiro"        },
  { id:"produtos",       icon:"◆",  label:"Produtos"           },
  { id:"alertas",       icon:"◉",  label:"Alertas",     b:3  },
  { id:"notificacoes",  icon:"◷",  label:"Notificações"      },
  { id:"relatorios",    icon:"◻",  label:"Relatórios"        },
  { id:"disponibilizar", icon:"▣",  label:"Disponibilizar"    },
  { id:"producao",      icon:"⬚",  label:"Produção"          },
  { id:"comercial",     icon:"◑",  label:"Comercial"         },
];

/* ═══════════════════════════════════════════════════
   PRIMITIVES
═══════════════════════════════════════════════════ */
function Card({ children, style={}, lift=false }) {
  const t = useT();
  const [h, setH] = useState(false);
  return (
    <div onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ background:t.bg2, border:`1px solid ${h&&lift?t.bHi:t.b1}`, borderRadius:12,
        transition:"border-color .18s, box-shadow .18s, transform .18s",
        boxShadow: h&&lift?`0 8px 32px ${t.sh}`:`0 1px 4px ${t.sh}`,
        transform: h&&lift?"translateY(-2px)":"none", ...style }}>
      {children}
    </div>
  );
}

function Btn({ children, onClick, v="primary", sz="md", style={}, type="button", ...rest }) {
  const t = useT();
  const [h, setH] = useState(false);
  const vs = {
    primary:{ bg:h?(t.isDark?"#E0E0E0":"#2A2A2A"):t.accent, c:t.accentTxt, border:`1px solid ${t.accent}` },
    ghost:  { bg:h?t.bg3:"transparent", c:t.t2, border:`1px solid ${t.b1}` },
    danger: { bg:h?"rgba(239,68,68,.2)":C.redBg, c:C.red, border:`1px solid ${C.red}22` },
    success:{ bg:h?"rgba(34,197,94,.2)":C.greenBg, c:C.green, border:`1px solid ${C.green}22` },
  }[v]||{};
  const pad = sz==="sm"?"4px 12px":sz==="lg"?"11px 28px":"8px 18px";
  return (
    <button type={type} onClick={onClick} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
      style={{ padding:pad, borderRadius:8, cursor:"pointer", fontSize:sz==="sm"?11:12, fontWeight:700,
        background:vs.bg, color:vs.c, border:vs.border, transition:"all .15s", ...style }} {...rest}>
      {children}
    </button>
  );
}

const Tag = ({ label, color, bg }) => (
  <span style={{ display:"inline-flex", alignItems:"center", fontSize:10, fontWeight:700, padding:"3px 9px",
    borderRadius:5, letterSpacing:.5, textTransform:"uppercase", color, background:bg||`${color}15`, border:`1px solid ${color}22` }}>
    {label}
  </span>
);

const StatusDot = ({ status }) => {
  const map = { "Online":C.green,"Ausente":C.amber,"Offline":"#555" };
  return <div style={{ width:7, height:7, borderRadius:"50%", background:map[status]||"#555", flexShrink:0 }}/>;
};

const StatusBadge = ({ s }) => {
  const map = {
    "Ativo":      { c:C.green,  bg:C.greenBg  },
    "Pausado":    { c:C.amber,  bg:C.amberBg  },
    "Inadimpl.":  { c:C.red,    bg:C.redBg    },
    "Pago":       { c:C.green,  bg:C.greenBg  },
    "Pendente":   { c:C.amber,  bg:C.amberBg  },
    "Vencido":    { c:C.red,    bg:C.redBg    },
    "Resolvido":  { c:"#888",   bg:"rgba(128,128,128,.1)" },
    "Online":     { c:C.green,  bg:C.greenBg  },
    "Ausente":    { c:C.amber,  bg:C.amberBg  },
    "Offline":    { c:"#888",   bg:"rgba(128,128,128,.1)" },
  };
  const st = map[s]||{ c:"#888", bg:"rgba(128,128,128,.1)" };
  return <span style={{ fontSize:11, fontWeight:600, padding:"3px 10px", borderRadius:20, color:st.c, background:st.bg }}>{s}</span>;
};

function FilterPill({ label, active, onClick }) {
  const t = useT();
  const [h, setH] = useState(false);
  return (
    <button onClick={onClick} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
      style={{ padding:"5px 13px", borderRadius:6, cursor:"pointer", fontSize:11, fontWeight:600,
        border:active?`1px solid ${t.bHi}`:`1px solid ${t.b1}`,
        background:active?t.bg3:(h?t.bg3:"transparent"),
        color:active?t.t1:t.t3, transition:"all .14s" }}>
      {label}
    </button>
  );
}
const FilterBar = ({ opts, active, onChange, label }) => {
  const t = useT();
  return (
    <div style={{ display:"flex", alignItems:"center", gap:4, flexWrap:"wrap" }}>
      {label && <span style={{ color:t.t4, fontSize:9, fontWeight:700, letterSpacing:1.8, textTransform:"uppercase", marginRight:4 }}>{label}</span>}
      {opts.map(o => <FilterPill key={o} label={o} active={active===o} onClick={()=>onChange(o)}/>)}
    </div>
  );
};

function PageHeader({ title, sub, action }) {
  const t = useT();
  return (
    <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:28, paddingBottom:20, borderBottom:`1px solid ${t.b1}` }}>
      <div>
        <h1 style={{ color:t.t1, fontSize:22, fontWeight:800, letterSpacing:-0.5 }}>{title}</h1>
        {sub && <p style={{ color:t.t3, fontSize:12, marginTop:5, lineHeight:1.6 }}>{sub}</p>}
      </div>
      {action && <div style={{ marginTop:2 }}>{action}</div>}
    </div>
  );
}

function KPICard({ label, value, delta, deltaPos=true, sub, accent }) {
  const t = useT();
  return (
    <Card lift style={{ padding:"20px 22px" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 }}>
        <span style={{ color:t.t3, fontSize:11 }}>{label}</span>
        {delta && (
          <span style={{ fontSize:10, fontWeight:700, padding:"3px 9px", borderRadius:5,
            color:deltaPos?C.green:C.red, background:deltaPos?C.greenBg:C.redBg }}>
            {delta}
          </span>
        )}
      </div>
      <div style={{ color:accent||t.t1, fontSize:24, fontWeight:800, letterSpacing:-0.5, marginBottom:4 }}>{value}</div>
      {sub && <div style={{ color:t.t4, fontSize:10 }}>{sub}</div>}
    </Card>
  );
}

function MiniBar({ data, dataKey, accent }) {
  const t = useT();
  const values = data.map((d) => Number(d[dataKey]));
  const max = values.length && Math.max(...values) > 0 ? Math.max(...values) : 1;
  return (
    <div style={{ display:"flex", alignItems:"flex-end", gap:5, height:56 }}>
      {data.map((d,i) => {
        const isLast = i===data.length-1;
        const h = Math.max(4, (Number(d[dataKey]) / max) * 48);
        return (
          <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:3 }}>
            <div style={{ width:"100%", borderRadius:"2px 2px 0 0", height:`${h}px`,
              background:isLast?(accent||t.accent):t.bg4, transition:"height .6s ease" }}/>
            <span style={{ fontSize:8, color:t.t4 }}>{d.m}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   MODAL
═══════════════════════════════════════════════════ */
function Modal({ open, onClose, title, children, width=520 }) {
  const t = useT();
  if (!open) return null;
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.65)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", backdropFilter:"blur(4px)" }}
      onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{ width, maxHeight:"90vh", overflowY:"auto",
        background:t.bg2, border:`1px solid ${t.bHi}`, borderRadius:16,
        boxShadow:`0 24px 64px rgba(0,0,0,.7)`, animation:"modalIn .22s cubic-bezier(.4,0,.2,1)" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"20px 24px", borderBottom:`1px solid ${t.b1}` }}>
          <span style={{ color:t.t1, fontSize:15, fontWeight:700 }}>{title}</span>
          <button onClick={onClose} style={{ background:"transparent", border:"none", color:t.t3, fontSize:18, cursor:"pointer", lineHeight:1 }}>×</button>
        </div>
        <div style={{ padding:"24px" }}>{children}</div>
      </div>
    </div>
  );
}

function FormField({ label, children }) {
  const t = useT();
  return (
    <div style={{ marginBottom:16 }}>
      <label style={{ color:t.t3, fontSize:9, fontWeight:800, letterSpacing:1.8, textTransform:"uppercase", display:"block", marginBottom:7 }}>{label}</label>
      {children}
    </div>
  );
}
function Input({ value, onChange, placeholder, type="text" }) {
  const t = useT();
  return (
    <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
      style={{ width:"100%", padding:"9px 13px", background:t.bg3, border:`1px solid ${t.b1}`, borderRadius:8, color:t.t1, fontSize:12, outline:"none" }}/>
  );
}
function Select({ value, onChange, opts }) {
  const t = useT();
  const items = opts.map(o => typeof o === "object" && o && "value" in o ? o : { value: o, label: String(o) });
  return (
    <select value={value} onChange={e=>onChange(e.target.value)}
      style={{ width:"100%", padding:"9px 13px", background:t.bg3, border:`1px solid ${t.b1}`, borderRadius:8, color:t.t1, fontSize:12, outline:"none" }}>
      {items.map(({ value: v, label: l }) => <option key={v} value={v}>{l}</option>)}
    </select>
  );
}

/* ═══════════════════════════════════════════════════
   PAGE: VISÃO GERAL
═══════════════════════════════════════════════════ */
function OverviewPage({ onNavigate }) {
  const t = useT();
  const { token } = useAuth();
  const [overview, setOverview] = useState(null);
  const [mrrMonthly, setMrrMonthly] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [recebiveis, setRecebiveis] = useState([]);
  const [colaboradores, setColaboradores] = useState([]);
  const [alertas, setAlertas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    if (!token) return;
    setErr(null);
    setLoading(true);
    const limit = (v) => `limit=${v || 100}`;
    const off = (v) => `offset=${v || 0}`;
    Promise.all([
      apiGet(token, "/api/admin/overview").then((r) => r.ok ? safeResJson(r, null) : null),
      apiGet(token, "/api/admin/overview/mrr-mensal").then((r) => r.ok ? safeResJson(r, null) : null),
      apiGet(token, `/api/admin/clientes?${limit(100)}&${off(0)}`).then((r) => r.ok ? safeResJson(r, { items: [] }) : { items: [] }),
      apiGet(token, `/api/admin/financeiro/receber?${limit(100)}&${off(0)}`).then((r) => r.ok ? safeResJson(r, { items: [] }) : { items: [] }),
      apiGet(token, `/api/admin/colaboradores?${limit(100)}&${off(0)}`).then((r) => r.ok ? safeResJson(r, { items: [] }) : { items: [] }),
      apiGet(token, `/api/admin/alertas?${limit(20)}&${off(0)}`).then((r) => r.ok ? safeResJson(r, { items: [] }) : { items: [] }),
    ])
      .then(([ov, mrr, clPage, recPage, colPage, altPage]) => {
        setOverview(ov || null);
        const mrrArr = Array.isArray(mrr) ? mrr : (mrr && mrr.meses) ? mrr.meses : (mrr && mrr.data) ? mrr.data : [];
        setMrrMonthly(mrrArr.map((x) => ({ m: x.mes ?? x.m ?? x.Mes ?? x.label ?? x.Label ?? "—", mrr: x.mrr ?? x.valor ?? x.Valor ?? 0 })));
        setClientes(normalizeClientesList(clPage?.items ?? clPage?.data ?? clPage?.clientes ?? (Array.isArray(clPage) ? clPage : [])));
        const recList = recPage?.items ?? recPage?.data ?? recPage?.recebiveis ?? (Array.isArray(recPage) ? recPage : []);
        setRecebiveis(Array.isArray(recList) ? recList : []);
        const colList = colPage?.items ?? colPage?.data ?? colPage?.colaboradores ?? (Array.isArray(colPage) ? colPage : []);
        setColaboradores(Array.isArray(colList) ? colList : []);
        const altList = altPage?.items ?? altPage?.data ?? altPage?.alertas ?? (Array.isArray(altPage) ? altPage : []);
        setAlertas(Array.isArray(altList) ? altList : []);
      })
      .catch((e) => setErr(e?.message || "Erro ao carregar"))
      .finally(() => setLoading(false));
  }, [token]);

  const normOverview = (o) => !o ? {} : {
    total_mrr: o.total_mrr ?? o.TotalMRR ?? o.mrr ?? o.MRR,
    clientes_ativos: o.clientes_ativos ?? o.ClientesAtivos ?? o.clientes_ativos,
    churn_rate: o.churn_rate ?? o.ChurnRate,
    mrr_delta: o.mrr_delta ?? o.MrrDelta,
  };
  const ov = normOverview(overview);
  const normRecOverview = (r, idx) => {
    const clienteUuid = r.cliente_uuid ?? r.clienteUuid ?? r.ClienteUUID;
    const cliente = clientes.find((c) => (c.uuid || c.id) === clienteUuid);
    const clientName = (cliente?.nome || cliente?.name) || (r.cliente_nome ?? r.clienteNome ?? r.ClienteNome ?? r.descricao ?? r.Descricao ?? "—");
    const rawVal = r.valor_centavos ?? r.valorCentavos ?? r.ValorCentavos ?? r.valor ?? r.Valor;
    const valueReais = rawVal != null ? (r.valor_centavos != null || r.valorCentavos != null || r.ValorCentavos != null ? Number(rawVal) / 100 : Number(rawVal)) : 0;
    const venc = r.vencimento ?? r.Vencimento;
    const dueStr = venc ? (typeof venc === "string" ? venc.slice(0, 10) : venc) : "—";
    const st = (r.status ?? r.Status ?? "").toString().toLowerCase();
    return { id: r.uuid ?? r.id ?? r._id ?? r.UUID ?? r.Id ?? `rec-${idx}`, client: clientName, value: valueReais, due: dueStr, status: st === "pago" ? "Pago" : st === "vencido" ? "Vencido" : "Pendente", plan: r.plano ?? r.Plano ?? "—" };
  };
  const recNorm = recebiveis.map(normRecOverview);
  const pendingRec = recNorm.filter((r) => r.status === "Pendente").reduce((s, r) => s + r.value, 0);
  const overdueRec = recNorm.filter((r) => r.status === "Vencido").reduce((s, r) => s + r.value, 0);
  const totalMRR = ov.total_mrr != null ? Number(ov.total_mrr) : clientes.filter((c) => (c.status || "").toLowerCase() === "ativo").reduce((s, c) => s + (c.mrr ?? (c.mrr_centavos != null ? c.mrr_centavos / 100 : 0)), 0);
  const activeClients = ov.clientes_ativos != null ? Number(ov.clientes_ativos) : clientes.filter((c) => (c.status || "").toLowerCase() === "ativo").length;
  const totalClients = clientes.length;
  const avgTicket = activeClients ? Math.round(totalMRR / activeClients) : 0;
  const colOnline = colaboradores.filter((c) => ((c.status ?? c.Status) || "").toLowerCase() === "online").length;
  const alertasAtivos = alertas.filter((a) => (a.status || "").toLowerCase() !== "resolvido");

  if (loading && totalClients === 0) {
    return (
      <div style={{ padding: 40, color: t.t3, textAlign: "center" }}>Carregando visão geral...</div>
    );
  }
  if (err) {
    return (
      <div style={{ padding: 40, color: C.red, textAlign: "center" }}>{err}</div>
    );
  }

  return (
    <div>
      <PageHeader title="Visão Geral" sub="Resumo executivo da United"
        action={
          <div style={{ display:"flex", gap:8 }}>
            <Btn v="ghost" sz="sm">↓ Exportar Relatório</Btn>
            {typeof onNavigate === "function" && <Btn sz="sm" onClick={() => onNavigate("clientes", true)}>+ Novo Cliente</Btn>}
          </div>
        }/>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:12 }}>
        <KPICard label="MRR"            value={totalMRR ? `R$${(totalMRR/1000).toFixed(1)}k` : "—"} delta={ov.mrr_delta ?? overview?.mrr_delta ?? null} sub="Receita mensal recorrente"/>
        <KPICard label="Clientes Ativos" value={activeClients} delta={null} sub={`${totalClients} total`}/>
        <KPICard label="Ticket Médio"    value={avgTicket ? formatCurrency(avgTicket) : "—"} delta={null} sub="por cliente/mês"/>
        <KPICard label="Churn Rate"      value={ov.churn_rate != null ? `${ov.churn_rate}%` : "0%"} delta={overview?.mrr_delta ?? ov.mrr_delta ?? null} deltaPos={true} sub="Últimos 30 dias"/>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:16 }}>
        <KPICard label="A Receber (Mês)"  value={pendingRec ? formatCurrency(pendingRec, true) : "R$ 0"} delta={null} sub={`${recNorm.filter(r=>r.status==="Pendente").length} faturas pendentes`} accent={C.amber}/>
        <KPICard label="Vencido"           value={overdueRec>0 ? formatCurrency(overdueRec, true) : "R$ 0"} delta={null} sub={`${recNorm.filter(r=>r.status==="Vencido").length} fatura(s) em atraso`} accent={overdueRec>0?C.red:C.green}/>
        <KPICard label="Colaboradores"     value={colaboradores.length} delta={null} sub={`${colOnline} online agora`}/>
        <KPICard label="ARR Projetado"     value={totalMRR ? `R$${((totalMRR*12)/1000).toFixed(0)}k` : "—"} delta={null} sub="Receita anual recorrente"/>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12, marginBottom:12 }}>
        <Card style={{ padding:"22px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
            <div>
              <div style={{ color:t.t1, fontWeight:700, fontSize:13 }}>MRR por Mês</div>
              <div style={{ color:t.t3, fontSize:11, marginTop:2 }}>Crescimento recorrente</div>
            </div>
          </div>
          <MiniBar data={mrrMonthly.length ? mrrMonthly : [{ m:"—", mrr:1 }]} dataKey="mrr"/>
        </Card>
        <Card style={{ padding:"22px" }}>
          <div style={{ color:t.t1, fontWeight:700, fontSize:13, marginBottom:16 }}>Distribuição de Planos</div>
          {PLANS.map(p => {
            const count = clientes.filter(c => (c.plano || c.plan || "").toLowerCase() === p.name.toLowerCase()).length;
            const pct = totalClients ? Math.round((count/totalClients)*100) : 0;
            return (
              <div key={p.id} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
                <div style={{ width:8, height:8, borderRadius:"50%", background:p.color, flexShrink:0 }}/>
                <span style={{ color:t.t2, fontSize:11, flex:1 }}>{p.name}</span>
                <div style={{ width:80, height:5, background:t.bg4, borderRadius:3, overflow:"hidden" }}>
                  <div style={{ height:"100%", width:`${pct}%`, background:p.color, borderRadius:3 }}/>
                </div>
                <span style={{ color:t.t3, fontSize:11, width:28, textAlign:"right" }}>{count}×</span>
              </div>
            );
          })}
        </Card>
        <Card style={{ padding:"22px" }}>
          <div style={{ color:t.t1, fontWeight:700, fontSize:13, marginBottom:16 }}>Status dos Clientes</div>
          {[
            { label:"Ativos",       val: clientes.filter(c=>(c.status||"").toLowerCase()==="ativo").length,     c:C.green,  bg:C.greenBg },
            { label:"Pausados",     val: clientes.filter(c=>(c.status||"").toLowerCase()==="pausado").length,   c:C.amber,  bg:C.amberBg },
            { label:"Inadimplentes", val: clientes.filter(c=>(c.status||"").toLowerCase()==="inadimpl."||(c.status||"").toLowerCase()==="inadimplente").length, c:C.red, bg:C.redBg },
          ].map((s,i) => (
            <div key={i} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"11px 14px", background:t.bg3, borderRadius:9, marginBottom:8, border:`1px solid ${t.b1}` }}>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <div style={{ width:7, height:7, borderRadius:"50%", background:s.c }}/>
                <span style={{ color:t.t2, fontSize:12 }}>{s.label}</span>
              </div>
              <span style={{ color:s.c, fontSize:18, fontWeight:800 }}>{s.val}</span>
            </div>
          ))}
        </Card>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
        <Card style={{ padding:"22px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
            <div style={{ color:t.t1, fontWeight:700, fontSize:13 }}>Alertas Ativos</div>
            <Tag label={`${alertasAtivos.length} ativos`} color={C.red} bg={C.redBg}/>
          </div>
          {alertasAtivos.slice(0,4).map((a,i) => {
            const prio = { "alta":{ c:C.red,bg:C.redBg },"média":{ c:C.amber,bg:C.amberBg },"baixa":{ c:"#888",bg:"rgba(128,128,128,.1)" } }[(a.prioridade||a.priority||"").toLowerCase()] || { c:C.amber,bg:C.amberBg };
            return (
              <div key={a.uuid||a.id||i} style={{ display:"flex", alignItems:"flex-start", gap:12, padding:"10px 0", borderBottom:i<3?`1px solid ${t.b2}`:"none" }}>
                <Tag label={a.prioridade||a.priority||"—"} color={prio.c} bg={prio.bg}/>
                <span style={{ color:t.t2, fontSize:12, lineHeight:1.5, flex:1 }}>{a.titulo||a.title||"—"}</span>
              </div>
            );
          })}
        </Card>
        <Card style={{ padding:"22px" }}>
          <div style={{ color:t.t1, fontWeight:700, fontSize:13, marginBottom:16 }}>Próximos Vencimentos</div>
          {recNorm.filter(r=>r.status==="Pendente").slice(0,4).map((r,i) => (
            <div key={r.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 0", borderBottom:i<3?`1px solid ${t.b2}`:"none" }}>
              <div style={{ flex:1 }}>
                <div style={{ color:t.t1, fontSize:12, fontWeight:600 }}>{r.client}</div>
                <div style={{ color:t.t3, fontSize:11, marginTop:1 }}>{r.plan}</div>
              </div>
              <span style={{ color:t.t1, fontSize:13, fontWeight:800 }}>{formatCurrency(r.value, true)}</span>
              <Tag label={r.due} color={C.amber} bg={C.amberBg}/>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   PAGE: CLIENTES
═══════════════════════════════════════════════════ */
function ClientesPage({ openAddModal, onAddModalConsumed, perms }) {
  const t = useT();
  const { token } = useAuth();
  const canWrite = perms?.canWriteAny !== false; // admin escreve; gestor/colab não
  const [clientes, setClientes] = useState([]);
  const [colaboradores, setColaboradores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [filter, setFilter] = useState("Todos");
  const [selected, setSelected] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState({ nome:"", email:"", segmento:"", plano:"Growth", status:"Ativo", cidade:"", owner_uuid:"" });
  const [search, setSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [accessOpen, setAccessOpen] = useState(false);
  const [accessPassword, setAccessPassword] = useState("");
  const [accessSuccess, setAccessSuccess] = useState(null);
  const [accessError, setAccessError] = useState(null);
  const [accessSubmitting, setAccessSubmitting] = useState(false);

  useEffect(() => {
    if (openAddModal) {
      setAddOpen(true);
      setFormError(null);
      onAddModalConsumed?.();
    }
  }, [openAddModal, onAddModalConsumed]);

  const load = () => {
    if (!token) return;
    setErr(null);
    setLoading(true);
    Promise.all([
      apiGet(token, "/api/admin/clientes?limit=100&offset=0").then(async (r) => {
        const data = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(data?.message || data?.error || `Erro ${r.status} ao carregar clientes`);
        return data;
      }),
      apiGet(token, "/api/admin/colaboradores?limit=100&offset=0").then(async (r) => {
        const data = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(data?.message || data?.error || `Erro ${r.status} ao carregar colaboradores`);
        return data;
      }),
    ])
      .then(([clPage, colPage]) => {
        const list = clPage?.items ?? clPage?.data ?? clPage?.clientes ?? (Array.isArray(clPage) ? clPage : []);
        const listArr = normalizeClientesList(list);
        const colList = colPage?.items ?? colPage?.data ?? colPage?.colaboradores ?? (Array.isArray(colPage) ? colPage : []);
        setColaboradores(Array.isArray(colList) ? colList : []);
        setClientes((prev) => {
          const fromApi = listArr;
          const apiIds = new Set(fromApi.map((c) => c.uuid || c.id).filter(Boolean));
          const notInApi = prev.filter((c) => {
            const id = c.uuid || c.id;
            return id && !apiIds.has(id);
          });
          return fromApi.length ? [...fromApi, ...notInApi] : prev.length ? prev : [];
        });
      })
      .catch((e) => setErr(e?.message || "Erro ao carregar"))
      .finally(() => setLoading(false));
  };
  useEffect(load, [token]);

  const openAddForm = () => { setFormError(null); setAddOpen(true); };
  const openAddFormSafe = () => { if (!canWrite) { setErr("Você não tem permissão para criar clientes."); return; } openAddForm(); };

  const STATUS_OPTS = ["Todos","Ativo","Pausado","Inadimplente"];
  const statusNorm = (s) => (s || "").toLowerCase();
  const filtered = clientes.filter(c =>
    (filter==="Todos" || (filter==="Inadimplente" && (statusNorm(c.status)==="inadimpl."||statusNorm(c.status)==="inadimplente")) || statusNorm(c.status)===statusNorm(filter)) &&
    (search==="" || (c.nome||"").toLowerCase().includes(search.toLowerCase()) || (c.email||"").toLowerCase().includes(search.toLowerCase()))
  );
  const cl = selected ? (clientes.find(c => (c.uuid||c.id)===selected) ?? filtered.find((c, i) => `client-${i}`===selected)) : null;
  const openEdit = () => { if (cl) setForm({ nome: cl.nome||"", email: cl.email||"", segmento: cl.segmento||"", plano: cl.plano||"Growth", status: cl.status||"Ativo", cidade: cl.cidade||"", owner_uuid: cl.owner_uuid||"" }); setEditOpen(true); };
  const closeEdit = () => setEditOpen(false);

  const handleAdd = (e) => {
    e?.preventDefault?.();
    if (!canWrite) { setFormError("Você não tem permissão para criar/editar clientes."); return; }
    setFormError(null);
    setSubmitting(true);
    const body = { nome: form.nome, email: form.email, segmento: form.segmento, plano: form.plano, status: form.status, cidade: form.cidade, owner_uuid: form.owner_uuid || undefined };
    apiPost(token, "/api/admin/clientes", body)
      .then(async (r) => {
        const data = await r.json().catch(() => ({}));
        if (r.ok) {
          setAddOpen(false);
          setForm({ nome:"", email:"", segmento:"", plano:"Growth", status:"Ativo", cidade:"", owner_uuid:"" });
          if (data && (data.uuid || data.id)) setClientes((prev) => [...prev, data]);
          load();
          return;
        }
        throw new Error(data?.message || data?.error || `Erro ${r.status}`);
      })
      .catch((e) => {
        const msg = e?.message || String(e || "Erro ao criar");
        const isAbort = e?.name === "AbortError";
        setFormError(isAbort ? "Timeout. A API não respondeu em 15s. Verifique a URL e se o backend está no ar." : msg);
      })
      .finally(() => setSubmitting(false));
  };
  const handleEdit = () => {
    if (!cl?.uuid && !cl?.id) return;
    if (!canWrite) { setErr("Você não tem permissão para editar clientes."); return; }
    setSubmitting(true);
    const id = cl.uuid || cl.id;
    apiPut(token, `/api/admin/clientes/${id}`, { nome: form.nome, email: form.email, segmento: form.segmento, plano: form.plano, status: form.status, cidade: form.cidade, owner_uuid: form.owner_uuid || undefined })
      .then((r) => { if (r.ok) { closeEdit(); setSelected(null); load(); } else return safeResJson(r, {}).then((e) => Promise.reject(e)); })
      .catch((e) => setErr(e?.message || "Erro ao atualizar"))
      .finally(() => setSubmitting(false));
  };
  const handleDesativar = () => {
    if (!cl?.uuid && !cl?.id) return;
    if (!canWrite) { setErr("Você não tem permissão para desativar clientes."); return; }
    if (!confirm("Desativar este cliente?")) return;
    const id = cl.uuid || cl.id;
    apiPut(token, `/api/admin/clientes/${id}/desativar`, null)
      .then((r) => { if (r.ok) { setSelected(null); load(); } else return safeResJson(r, {}).then((e) => Promise.reject(e)); })
      .catch((e) => setErr(e?.message || "Erro ao desativar"));
  };

  const openAccessForm = () => {
    setAccessPassword("");
    setAccessSuccess(null);
    setAccessError(null);
    setAccessOpen(true);
  };
  const handleCriarAcesso = (e) => {
    e?.preventDefault?.();
    if (!cl?.email || (!cl?.uuid && !cl?.id)) return;
    if (!canWrite) { setAccessError("Você não tem permissão para liberar acesso."); return; }
    if (!accessPassword || accessPassword.length < 6) {
      setAccessError("Defina uma senha com no mínimo 6 caracteres.");
      return;
    }
    setAccessSubmitting(true);
    setAccessError(null);
    setAccessSuccess(null);
    const clienteUuid = cl.uuid || cl.id;
    apiPost(token, "/api/admin/usuarios", {
      email: cl.email,
      password: accessPassword,
      role: "client",
      cliente_uuid: clienteUuid,
      can_producao: true,
      can_performance: true,
    })
      .then(async (r) => {
        const data = await r.json().catch(() => ({}));
        if (r.ok) {
          const loginUrl = typeof window !== "undefined" ? `${window.location.origin}/login` : "/login";
          setAccessSuccess(`Acesso criado. O cliente pode entrar em ${loginUrl} com o e-mail "${cl.email}" e a senha definida.`);
          setAccessPassword("");
        } else {
          throw new Error(data?.message || data?.error || `Erro ${r.status}`);
        }
      })
      .catch((e) => setAccessError(e?.message || "Erro ao criar acesso"))
      .finally(() => setAccessSubmitting(false));
  };
  const gerarSenha = () => {
    const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
    let s = "";
    for (let i = 0; i < 10; i++) s += chars[Math.floor(Math.random() * chars.length)];
    setAccessPassword(s);
    setAccessError(null);
  };

  const createdLabel = (c) => {
    const d = c.created_at || c.createdAt;
    if (!d) return "";
    const s = typeof d === "string" ? d.slice(0,10) : "";
    return s ? `desde ${s}` : "";
  };

  if (loading && clientes.length === 0) return <div style={{ padding:40, color:t.t3, textAlign:"center" }}>Carregando clientes...</div>;
  if (err && clientes.length === 0) return <div style={{ padding:40, color:C.red, textAlign:"center" }}>{err}</div>;

  return (
    <div>
      <PageHeader title="Clientes" sub={`${clientes.length} clientes cadastrados`}
        action={canWrite ? <Btn onClick={openAddFormSafe} type="button">+ Novo Cliente</Btn> : null}/>

      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:18, flexWrap:"wrap" }}>
        <FilterBar opts={STATUS_OPTS} active={filter} onChange={setFilter} label="STATUS"/>
        <div style={{ flex:1 }}/>
        <div style={{ position:"relative" }}>
          <span style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", color:t.t3, fontSize:12 }}>🔍</span>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar cliente..." style={{ padding:"7px 10px 7px 30px", background:t.bg3, border:`1px solid ${t.b1}`, borderRadius:8, color:t.t1, fontSize:12, outline:"none", width:200 }}/>
        </div>
      </div>

      <Card style={{ overflow:"hidden", marginBottom: selected?14:0 }}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 110px 90px 80px 50px", gap:12, padding:"9px 20px", background:t.bg3, borderBottom:`1px solid ${t.b1}` }}>
          {["Cliente","Segmento","Plano","Status",""].map((h,i)=>(
            <span key={i} style={{ color:t.t4, fontSize:9, fontWeight:800, letterSpacing:1.4, textTransform:"uppercase" }}>{h}</span>
          ))}
        </div>
        {filtered.map((c, idx) => {
          const id = c.uuid || c.id || `client-${idx}`;
          const pcolor = PLANS.find(p=>p.name===(c.plano||c.plan))?.color||"#888";
          const status = (c.status||"Ativo").replace(/^inadimpl\.?$/i,"Inadimpl.");
          return (
            <div key={id} onClick={()=>setSelected(selected===id?null:id)}
              style={{ display:"grid", gridTemplateColumns:"1fr 110px 90px 80px 50px", gap:12, padding:"13px 20px", alignItems:"center",
                background:selected===id?t.bg3:t.bg2, borderTop:`1px solid ${t.b1}`, cursor:"pointer", transition:"background .14s" }}
              onMouseEnter={e=>{if(selected!==id)e.currentTarget.style.background=t.bg3}}
              onMouseLeave={e=>{if(selected!==id)e.currentTarget.style.background=t.bg2}}>
              <div>
                <div style={{ color:t.t1, fontSize:12, fontWeight:600 }}>{c.nome||c.name}</div>
                <div style={{ color:t.t3, fontSize:10, marginTop:2 }}>{createdLabel(c)}</div>
              </div>
              <Tag label={c.segmento||c.seg||"—"} color={t.t2} bg={t.bg4}/>
              <Tag label={c.plano||c.plan||"—"} color={pcolor} bg={`${pcolor}14`}/>
              <StatusBadge s={status}/>
              <span style={{ color:t.t3, fontSize:12 }}>{selected===id?"▲":"▼"}</span>
            </div>
          );
        })}
      </Card>

      {cl && (
        <Card style={{ padding:"24px", animation:"fadeIn .2s ease" }}>
          <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:20 }}>
            <div>
              <div style={{ color:t.t1, fontSize:18, fontWeight:800 }}>{cl.nome||cl.name}</div>
              <div style={{ color:t.t3, fontSize:12, marginTop:4 }}>{(cl.segmento||cl.seg)||""} · {(cl.cidade||cl.city)||""} · {createdLabel(cl)}</div>
            </div>
            {canWrite && (
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                <Btn v="primary" sz="sm" onClick={openAccessForm} disabled={!cl.email}>🔑 Liberar acesso ao dashboard</Btn>
                <Btn v="ghost" sz="sm" onClick={openEdit}>✏ Editar</Btn>
                <Btn v="danger" sz="sm" onClick={handleDesativar}>⊘ Desativar</Btn>
              </div>
            )}
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:12, marginBottom:20 }}>
            {[
              { label:"Plano", val: cl.plano||cl.plan||"—" },
              { label:"Status", val: cl.status||"Ativo" },
              { label:"Email",  val: cl.email||"—" },
              { label:"Cidade", val: cl.cidade||cl.city||"—" },
            ].map((k,i) => (
              <div key={i} style={{ padding:"14px 16px", background:t.bg3, borderRadius:10, border:`1px solid ${t.b1}` }}>
                <div style={{ color:t.t3, fontSize:10, marginBottom:8 }}>{k.label}</div>
                <div style={{ color:t.t1, fontSize:14, fontWeight:700 }}>{k.val}</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Modal open={addOpen} onClose={()=>{ setAddOpen(false); setFormError(null); }} title="Adicionar Novo Cliente">
        {formError && (
          <div style={{ marginBottom:16, padding:12, background:C.redBg, border:`1px solid ${C.red}40`, borderRadius:8, color:C.red, fontSize:12 }}>
            {formError}
          </div>
        )}
        <div style={{ marginBottom:12, padding:8, background:t.bg3, borderRadius:8, fontSize:10, color:t.t3, wordBreak:"break-all" }}>
          API: {API_URL || "(não configurada — defina VITE_API_URL no .env.local e reinicie npm run dev)"}
          {token && " · Token: ok"}
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          <FormField label="Nome"><Input value={form.nome} onChange={v=>setForm({...form,nome:v})} placeholder="Nome da empresa"/></FormField>
          <FormField label="Email"><Input type="email" value={form.email} onChange={v=>setForm({...form,email:v})} placeholder="email@empresa.com"/></FormField>
          <FormField label="Segmento"><Input value={form.segmento} onChange={v=>setForm({...form,segmento:v})} placeholder="Tecnologia"/></FormField>
          <FormField label="Cidade"><Input value={form.cidade} onChange={v=>setForm({...form,cidade:v})} placeholder="São Paulo"/></FormField>
          <FormField label="Plano"><Select value={form.plano} onChange={v=>setForm({...form,plano:v})} opts={["Starter","Growth","Pro","Scale"]}/></FormField>
          <FormField label="Status"><Select value={form.status} onChange={v=>setForm({...form,status:v})} opts={["Ativo","Pausado","Inadimplente"]}/></FormField>
          <FormField label="Account Manager" style={{ gridColumn:"1/-1" }}>
            <Select value={form.owner_uuid} onChange={v=>setForm({...form,owner_uuid:v})} opts={[{value:"", label:"— Nenhum"}, ...colaboradores.map(c=>({value:c.uuid||c.id||"", label:(c.nome||c.name||c.email||"Colaborador")}))]}/>
          </FormField>
        </div>
        <div style={{ display:"flex", gap:8, justifyContent:"flex-end", marginTop:20 }}>
          <Btn v="ghost" type="button" onClick={()=>setAddOpen(false)}>Cancelar</Btn>
          <Btn type="button" onClick={handleAdd} disabled={submitting || !form.nome || !form.email}>{submitting ? "Salvando…" : "Adicionar Cliente"}</Btn>
        </div>
      </Modal>

      <Modal open={editOpen} onClose={closeEdit} title="Editar Cliente">
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          <FormField label="Nome"><Input value={form.nome} onChange={v=>setForm({...form,nome:v})} placeholder="Nome"/></FormField>
          <FormField label="Email"><Input type="email" value={form.email} onChange={v=>setForm({...form,email:v})} placeholder="Email"/></FormField>
          <FormField label="Segmento"><Input value={form.segmento} onChange={v=>setForm({...form,segmento:v})} placeholder="Segmento"/></FormField>
          <FormField label="Cidade"><Input value={form.cidade} onChange={v=>setForm({...form,cidade:v})} placeholder="Cidade"/></FormField>
          <FormField label="Plano"><Select value={form.plano} onChange={v=>setForm({...form,plano:v})} opts={["Starter","Growth","Pro","Scale"]}/></FormField>
          <FormField label="Status"><Select value={form.status} onChange={v=>setForm({...form,status:v})} opts={["Ativo","Pausado","Inadimplente"]}/></FormField>
          <FormField label="Owner UUID" style={{ gridColumn:"1/-1" }}><Input value={form.owner_uuid} onChange={v=>setForm({...form,owner_uuid:v})} placeholder="Opcional"/></FormField>
        </div>
        <div style={{ display:"flex", gap:8, justifyContent:"flex-end", marginTop:20 }}>
          <Btn v="ghost" onClick={closeEdit}>Cancelar</Btn>
          <Btn onClick={handleEdit} disabled={submitting}>{submitting ? "Salvando…" : "Salvar"}</Btn>
        </div>
      </Modal>

      <Modal open={accessOpen} onClose={()=>{ setAccessOpen(false); setAccessSuccess(null); setAccessError(null); }} title="Liberar acesso ao dashboard">
        <p style={{ color:t.t3, fontSize:12, marginBottom:16 }}>
          Crie um usuário de login para <strong style={{ color:t.t1 }}>{cl?.nome || cl?.name}</strong> ({cl?.email}). Ele poderá acessar o dashboard em /login com este e-mail e a senha que você definir.
        </p>
        {accessSuccess && (
          <div style={{ marginBottom:16, padding:12, background:"rgba(34,197,94,0.15)", border:"1px solid rgba(34,197,94,0.4)", borderRadius:8, color:"#22c55e", fontSize:12 }}>
            {accessSuccess}
          </div>
        )}
        {accessError && (
          <div style={{ marginBottom:16, padding:12, background:C.redBg, border:`1px solid ${C.red}40`, borderRadius:8, color:C.red, fontSize:12 }}>
            {accessError}
          </div>
        )}
        {!accessSuccess && (
          <>
            <FormField label="Senha de acesso (mín. 6 caracteres)">
              <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                <Input type="password" value={accessPassword} onChange={v=>setAccessPassword(v)} placeholder="Senha para o cliente" style={{ flex:1 }}/>
                <Btn v="ghost" sz="sm" type="button" onClick={gerarSenha}>Gerar senha</Btn>
              </div>
            </FormField>
            <div style={{ display:"flex", gap:8, justifyContent:"flex-end", marginTop:20 }}>
              <Btn v="ghost" type="button" onClick={()=>setAccessOpen(false)}>Cancelar</Btn>
              <Btn type="button" onClick={handleCriarAcesso} disabled={accessSubmitting || accessPassword.length < 6}>
                {accessSubmitting ? "Criando…" : "Criar acesso"}
              </Btn>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   PAGE: COLABORADORES
═══════════════════════════════════════════════════ */
function ColabsPage({ perms }) {
  const t = useT();
  const { token } = useAuth();
  const canWrite = perms?.canWriteAny !== false; // só admin
  const [colaboradores, setColaboradores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [detailId, setDetailId] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState({ nome:"", email:"", cargo:"", role:"Colaborador", status:"Ativo" });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [accessOpen, setAccessOpen] = useState(false);
  const [accessPassword, setAccessPassword] = useState("");
  const [accessSuccess, setAccessSuccess] = useState(null);
  const [accessError, setAccessError] = useState(null);
  const [accessSubmitting, setAccessSubmitting] = useState(false);

  const load = () => {
    if (!token) return;
    setErr(null);
    setLoading(true);
    apiGet(token, "/api/admin/colaboradores?limit=100&offset=0")
      .then(async (r) => {
        const data = await r.json().catch(() => ({}));
        return r.ok ? data : { items: [] };
      })
      .then((data) => {
        const list = Array.isArray(data?.items) ? data.items : [];
        setColaboradores((prev) => {
          if (list.length > 0) return list;
          return prev.length > 0 ? prev : [];
        });
      })
      .catch((e) => setErr(e?.message || "Erro ao carregar"))
      .finally(() => setLoading(false));
  };
  useEffect(load, [token]);

  const openAddForm = () => { setFormError(null); setAddOpen(true); };

  const cl = detailId ? colaboradores.find(c => (c.uuid||c.id)===detailId) : null;
  const initials = (nome) => (nome||"").split(/\s+/).map(s=>s[0]).join("").slice(0,2).toUpperCase() || "—";

  const handleAdd = (e) => {
    e?.preventDefault?.();
    if (!canWrite) { setFormError("Você não tem permissão para criar/editar colaboradores."); return; }
    setFormError(null);
    setSubmitting(true);
    apiPost(token, "/api/admin/colaboradores", { nome: form.nome, email: form.email, cargo: form.cargo, role: form.role, status: form.status })
      .then(async (r) => {
        const data = await r.json().catch(() => ({}));
        if (r.ok) {
          setAddOpen(false);
          setForm({ nome:"", email:"", cargo:"", role:"Colaborador", status:"Ativo" });
          load();
          return;
        }
        throw new Error(data?.message || data?.error || `Erro ${r.status}`);
      })
      .catch((e) => {
        const msg = e?.message || String(e || "Erro ao criar");
        setFormError(e?.name === "AbortError" ? "Timeout. A API não respondeu. Verifique a URL e se o backend está no ar." : msg);
      })
      .finally(() => setSubmitting(false));
  };
  const openEdit = () => { if (cl) setForm({ nome: cl.nome||"", email: cl.email||"", cargo: cl.cargo||"", role: cl.role||"Colaborador", status: cl.status||"Ativo" }); setEditOpen(true); };

  const openAccessForm = () => { setAccessPassword(""); setAccessSuccess(null); setAccessError(null); setAccessOpen(true); };
  const handleCriarAcessoColab = (e) => {
    e?.preventDefault?.();
    if (!cl?.email) return;
    if (!canWrite) { setAccessError("Você não tem permissão para liberar acesso."); return; }
    if (!accessPassword || accessPassword.length < 6) { setAccessError("Defina uma senha com no mínimo 6 caracteres."); return; }
    setAccessSubmitting(true); setAccessError(null); setAccessSuccess(null);
    apiPost(token, "/api/admin/usuarios", { email: cl.email, password: accessPassword, role: "admin", can_producao: true, can_performance: true })
      .then(async (r) => {
        const data = await r.json().catch(() => ({}));
        if (r.ok) {
          const loginUrl = typeof window !== "undefined" ? `${window.location.origin}/login` : "/login";
          setAccessSuccess(`Acesso criado. O colaborador pode entrar em ${loginUrl} com o e-mail "${cl.email}" e a senha definida.`);
          setAccessPassword("");
        } else throw new Error(data?.message || data?.error || `Erro ${r.status}`);
      })
      .catch((e) => setAccessError(e?.message || "Erro ao criar acesso"))
      .finally(() => setAccessSubmitting(false));
  };
  const gerarSenhaColab = () => {
    const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
    let s = ""; for (let i = 0; i < 10; i++) s += chars[Math.floor(Math.random() * chars.length)];
    setAccessPassword(s); setAccessError(null);
  };

  const handleEdit = () => {
    if (!cl?.uuid && !cl?.id) return;
    if (!canWrite) { setErr("Você não tem permissão para editar colaboradores."); return; }
    setSubmitting(true);
    const id = cl.uuid || cl.id;
    apiPut(token, `/api/admin/colaboradores/${id}`, { nome: form.nome, email: form.email, cargo: form.cargo, role: form.role, status: form.status })
      .then((r) => { if (r.ok) { setEditOpen(false); setDetailId(null); load(); } else return safeResJson(r, {}).then((e) => Promise.reject(e)); })
      .catch((e) => setErr(e?.message || "Erro ao atualizar"))
      .finally(() => setSubmitting(false));
  };

  const onlineCount = colaboradores.filter(c => (c.status||"").toLowerCase() === "online").length;
  const createdLabel = (c) => { const d = c.created_at||c.createdAt; return d ? (typeof d==="string" ? d.slice(0,10) : "") : ""; };

  if (loading && colaboradores.length === 0) return <div style={{ padding:40, color:t.t3, textAlign:"center" }}>Carregando colaboradores...</div>;
  if (err && colaboradores.length === 0) return <div style={{ padding:40, color:C.red, textAlign:"center" }}>{err}</div>;

  return (
    <div>
      <PageHeader title="Colaboradores" sub={`${colaboradores.length} membros · ${onlineCount} online`}
        action={canWrite ? <Btn onClick={openAddForm} type="button">+ Novo Colaborador</Btn> : null}/>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12 }}>
        {colaboradores.map(c => {
          const id = c.uuid||c.id;
          const status = c.status||"Offline";
          return (
            <Card key={id} lift style={{ padding:"22px", cursor:"pointer" }}>
              <div onClick={()=>setDetailId(detailId===id?null:id)}>
                <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:16 }}>
                  <div style={{ position:"relative" }}>
                    <div style={{ width:48, height:48, borderRadius:"50%", background:t.bg4, border:`1px solid ${t.b1}`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                      <span style={{ color:t.t1, fontSize:14, fontWeight:800 }}>{initials(c.nome||c.name)}</span>
                    </div>
                    <div style={{ position:"absolute", bottom:1, right:1, width:10, height:10, borderRadius:"50%",
                      background:(status||"").toLowerCase()==="online"?C.green:(status||"").toLowerCase()==="ausente"?C.amber:"#555",
                      border:`2px solid ${t.bg2}` }}/>
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ color:t.t1, fontSize:13, fontWeight:700 }}>{c.nome||c.name}</div>
                    <div style={{ color:t.t3, fontSize:11, marginTop:2 }}>{c.cargo||c.role||"—"}</div>
                  </div>
                  <StatusBadge s={status}/>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:12 }}>
                  <div style={{ textAlign:"center", padding:"10px 8px", background:t.bg3, borderRadius:8, border:`1px solid ${t.b1}` }}>
                    <div style={{ color:t.t1, fontSize:14, fontWeight:800 }}>{c.role||"—"}</div>
                    <div style={{ color:t.t3, fontSize:9, marginTop:2 }}>Acesso</div>
                  </div>
                  <div style={{ textAlign:"center", padding:"10px 8px", background:t.bg3, borderRadius:8, border:`1px solid ${t.b1}` }}>
                    <div style={{ color:t.t1, fontSize:14, fontWeight:800 }}>{status}</div>
                    <div style={{ color:t.t3, fontSize:9, marginTop:2 }}>Status</div>
                  </div>
                </div>
              </div>
              {detailId===id && (
                <div style={{ marginTop:16, paddingTop:16, borderTop:`1px solid ${t.b1}` }}>
                  <div style={{ color:t.t3, fontSize:10, marginBottom:6 }}>{c.email}</div>
                  <div style={{ color:t.t3, fontSize:10, marginBottom:12 }}>{createdLabel(c) ? `Desde ${createdLabel(c)}` : ""}</div>
                  {canWrite && (
                    <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                      <Btn sz="sm" v="primary" onClick={openAccessForm}>🔑 Liberar acesso (login)</Btn>
                      <Btn sz="sm" v="ghost" onClick={openEdit}>✏ Editar</Btn>
                    </div>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      <Modal open={addOpen} onClose={()=>{ setAddOpen(false); setFormError(null); }} title="Novo Colaborador">
        {formError && (
          <div style={{ marginBottom:16, padding:12, background:C.redBg, border:`1px solid ${C.red}40`, borderRadius:8, color:C.red, fontSize:12 }}>
            {formError}
          </div>
        )}
        <div style={{ marginBottom:12, padding:8, background:t.bg3, borderRadius:8, fontSize:10, color:t.t3, wordBreak:"break-all" }}>
          API: {API_URL || "(não configurada)"} {token && "· Token: ok"}
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          <FormField label="Nome"><Input value={form.nome} onChange={v=>setForm({...form,nome:v})} placeholder="Nome completo"/></FormField>
          <FormField label="Cargo"><Input value={form.cargo} onChange={v=>setForm({...form,cargo:v})} placeholder="Cargo"/></FormField>
          <FormField label="Email"><Input type="email" value={form.email} onChange={v=>setForm({...form,email:v})} placeholder="email@united.com.br"/></FormField>
          <FormField label="Acesso"><Select value={form.role} onChange={v=>setForm({...form,role:v})} opts={["Colaborador","Gestor","Admin"]}/></FormField>
          <FormField label="Status"><Select value={form.status} onChange={v=>setForm({...form,status:v})} opts={["Ativo","Online","Ausente","Offline"]}/></FormField>
        </div>
        <div style={{ display:"flex", gap:8, justifyContent:"flex-end", marginTop:20 }}>
          <Btn v="ghost" type="button" onClick={()=>setAddOpen(false)}>Cancelar</Btn>
          <Btn type="button" onClick={handleAdd} disabled={submitting || !form.nome || !form.email}>{submitting ? "Salvando…" : "Adicionar"}</Btn>
        </div>
      </Modal>

      <Modal open={editOpen} onClose={()=>setEditOpen(false)} title="Editar Colaborador">
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          <FormField label="Nome"><Input value={form.nome} onChange={v=>setForm({...form,nome:v})} placeholder="Nome"/></FormField>
          <FormField label="Cargo"><Input value={form.cargo} onChange={v=>setForm({...form,cargo:v})} placeholder="Cargo"/></FormField>
          <FormField label="Email"><Input type="email" value={form.email} onChange={v=>setForm({...form,email:v})} placeholder="Email"/></FormField>
          <FormField label="Acesso"><Select value={form.role} onChange={v=>setForm({...form,role:v})} opts={["Colaborador","Gestor","Admin"]}/></FormField>
          <FormField label="Status"><Select value={form.status} onChange={v=>setForm({...form,status:v})} opts={["Ativo","Online","Ausente","Offline"]}/></FormField>
        </div>
        <div style={{ display:"flex", gap:8, justifyContent:"flex-end", marginTop:20 }}>
          <Btn v="ghost" onClick={()=>setEditOpen(false)}>Cancelar</Btn>
          <Btn onClick={handleEdit} disabled={submitting}>{submitting ? "Salvando…" : "Salvar"}</Btn>
        </div>
      </Modal>

      <Modal open={accessOpen} onClose={()=>{ setAccessOpen(false); setAccessSuccess(null); setAccessError(null); }} title="Liberar acesso (login) para colaborador">
        <p style={{ color:t.t3, fontSize:12, marginBottom:16 }}>Crie um usuário de login para <strong style={{ color:t.t1 }}>{cl?.nome || cl?.name}</strong> ({cl?.email}). Ele poderá acessar o painel admin em /login com este e-mail e a senha que você definir.</p>
        {accessSuccess && <div style={{ marginBottom:16, padding:12, background:"rgba(34,197,94,0.15)", border:"1px solid rgba(34,197,94,0.4)", borderRadius:8, color:"#22c55e", fontSize:12 }}>{accessSuccess}</div>}
        {accessError && <div style={{ marginBottom:16, padding:12, background:C.redBg, border:`1px solid ${C.red}40`, borderRadius:8, color:C.red, fontSize:12 }}>{accessError}</div>}
        {!accessSuccess && (
          <>
            <FormField label="Senha (mín. 6 caracteres)">
              <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                <Input type="password" value={accessPassword} onChange={v=>setAccessPassword(v)} placeholder="Senha" style={{ flex:1 }}/>
                <Btn v="ghost" sz="sm" type="button" onClick={gerarSenhaColab}>Gerar senha</Btn>
              </div>
            </FormField>
            <div style={{ display:"flex", gap:8, justifyContent:"flex-end", marginTop:20 }}>
              <Btn v="ghost" type="button" onClick={()=>setAccessOpen(false)}>Cancelar</Btn>
              <Btn type="button" onClick={handleCriarAcessoColab} disabled={accessSubmitting || accessPassword.length < 6}>{accessSubmitting ? "Criando…" : "Criar acesso"}</Btn>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   PAGE: FINANCEIRO
═══════════════════════════════════════════════════ */
function FinanceiroPage() {
  const t = useT();
  const { token } = useAuth();
  const [tab, setTab] = useState("receber");
  const [recebiveis, setRecebiveis] = useState([]);
  const [pagamentos, setPagamentos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [mrrMonthly, setMrrMonthly] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lancamentoOpen, setLancamentoOpen] = useState(false);
  const [lancamentoForm, setLancamentoForm] = useState({ cliente_uuid: "", descricao: "", valor: "", vencimento: "", plano: "Growth" });
  const [lancamentoError, setLancamentoError] = useState(null);
  const [lancamentoSubmitting, setLancamentoSubmitting] = useState(false);
  const [pagarOpen, setPagarOpen] = useState(false);
  const [pagarForm, setPagarForm] = useState({ descricao: "", valor: "", vencimento: "", categoria: "Fornecedor" });
  const [pagarError, setPagarError] = useState(null);
  const [pagarSubmitting, setPagarSubmitting] = useState(false);
  const [marcarPagoPagarLoading, setMarcarPagoPagarLoading] = useState(null);
  const [marcarPagoPagarError, setMarcarPagoPagarError] = useState(null);

  const loadFinanceiro = () => {
    if (!token) return;
    setLoading(true);
    Promise.all([
      apiGet(token, "/api/admin/financeiro/receber?limit=100&offset=0").then((r) => r.ok ? safeResJson(r, {}) : {}),
      apiGet(token, "/api/admin/financeiro/pagar?limit=100&offset=0").then((r) => r.ok ? safeResJson(r, {}) : {}),
      apiGet(token, "/api/admin/clientes?limit=200&offset=0").then((r) => r.ok ? safeResJson(r, { items: [] }) : { items: [] }),
      apiGet(token, "/api/admin/overview/mrr-mensal").then((r) => r.ok ? safeResJson(r, null) : null),
    ])
      .then(([recPage, pagPage, clPage, mrr]) => {
        const recList = recPage?.items ?? recPage?.data ?? recPage?.recebiveis ?? (Array.isArray(recPage) ? recPage : []);
        const recArray = Array.isArray(recList) ? recList : [];
        setRecebiveis((prev) => {
          const prevList = Array.isArray(prev) ? prev : [];
          const fromIds = new Set(recArray.map((x) => x.uuid ?? x.id ?? x._id ?? x.UUID ?? x.Id).filter(Boolean));
          const merged = [...recArray];
          prevList.forEach((p) => {
            const id = p.uuid ?? p.id ?? p._id ?? p.UUID ?? p.Id;
            if (id && !fromIds.has(id)) { merged.push(p); fromIds.add(id); }
          });
          return merged;
        });
        const pagList = pagPage?.items ?? pagPage?.data ?? pagPage?.pagamentos ?? (Array.isArray(pagPage) ? pagPage : []);
        setPagamentos(Array.isArray(pagList) ? pagList : []);
        const list = clPage?.items ?? clPage?.data ?? clPage?.clientes ?? (Array.isArray(clPage) ? clPage : []);
        setClientes(Array.isArray(list) ? list : []);
        const arr = Array.isArray(mrr) ? mrr : (mrr?.meses) ? mrr.meses : (mrr?.data) ? mrr.data : [];
        setMrrMonthly(arr.map((x) => ({ m: x.mes || x.m || "—", mrr: x.mrr ?? x.valor ?? 0 })));
      })
      .finally(() => setLoading(false));
  };
  useEffect(loadFinanceiro, [token]);

  const handleNovoLancamento = (e) => {
    e?.preventDefault?.();
    if (!lancamentoForm.cliente_uuid || !lancamentoForm.descricao?.trim()) {
      setLancamentoError("Selecione o cliente e informe a descrição.");
      return;
    }
    const valorNum = Number(lancamentoForm.valor) || 0;
    if (valorNum <= 0) {
      setLancamentoError("Informe o valor em R$.");
      return;
    }
    setLancamentoError(null);
    setLancamentoSubmitting(true);
    const rawVenc = lancamentoForm.vencimento || "";
    const vencimento = (rawVenc.length === 10 && rawVenc.includes("-")) ? rawVenc.slice(0, 10) : new Date().toISOString().slice(0, 10);
    const body = {
      cliente_uuid: lancamentoForm.cliente_uuid,
      descricao: lancamentoForm.descricao.trim(),
      valor_centavos: Math.round(valorNum * 100),
      vencimento: vencimento.slice(0, 10),
      plano: lancamentoForm.plano || "Growth",
    };
    apiPost(token, "/api/admin/financeiro/lancamento", body)
      .then(async (r) => {
        const data = await r.json().catch(() => ({}));
        if (r.ok) {
          setLancamentoOpen(false);
          setLancamentoForm({ cliente_uuid: "", descricao: "", valor: "", vencimento: "", plano: "Growth" });
          if (data && (data.uuid || data.id || data.UUID || data.Id)) {
            const merged = {
              ...data,
              cliente_uuid: data.cliente_uuid ?? data.clienteUuid ?? data.ClienteUUID ?? body.cliente_uuid,
              descricao: data.descricao ?? data.Descricao ?? body.descricao,
              valor_centavos: data.valor_centavos ?? data.valorCentavos ?? data.ValorCentavos ?? body.valor_centavos,
              vencimento: data.vencimento ?? data.Vencimento ?? body.vencimento,
              plano: data.plano ?? data.Plano ?? body.plano,
              status: data.status ?? data.Status ?? "Pendente",
            };
            setRecebiveis((prev) => [...(Array.isArray(prev) ? prev : []), merged]);
          }
          loadFinanceiro();
        } else {
          throw new Error(data?.message || data?.error || `Erro ${r.status}`);
        }
      })
      .catch((e) => setLancamentoError(e?.message || "Erro ao criar lançamento"))
      .finally(() => setLancamentoSubmitting(false));
  };

  const normRec = (r) => ({
    id: r.uuid ?? r.id ?? r._id ?? r.UUID ?? r.Id,
    cliente_uuid: r.cliente_uuid ?? r.clienteUuid ?? r.ClienteUUID,
    cliente_nome: r.cliente_nome ?? r.clienteNome ?? r.ClienteNome ?? r.NomeCliente,
    descricao: r.descricao ?? r.Descricao ?? "",
    valor_centavos: r.valor_centavos ?? r.valorCentavos ?? r.ValorCentavos,
    valor: r.valor ?? r.Valor,
    vencimento: r.vencimento ?? r.Vencimento,
    status: (r.status ?? r.Status ?? "").toString().toLowerCase(),
    plano: r.plano ?? r.Plano ?? "",
  });
  const recNorm = recebiveis.map((r, idx) => {
    const n = normRec(r);
    const clienteUuid = n.cliente_uuid;
    const cliente = clientes.find((c) => (c.uuid || c.id || c.UUID || c.Id) === clienteUuid);
    const clientName = (cliente?.nome || cliente?.name || cliente?.Nome || cliente?.email) || n.cliente_nome || "—";
    const rawVal = n.valor_centavos != null ? Number(n.valor_centavos) / 100 : Number(n.valor);
    const valueReais = !Number.isNaN(rawVal) && rawVal > 0 ? rawVal : (n.valor_centavos != null ? Number(n.valor_centavos) / 100 : 0);
    const dueStr = n.vencimento ? (typeof n.vencimento === "string" ? n.vencimento.slice(0, 10) : n.vencimento) : null;
    const statusNorm = n.status === "pago" ? "Pago" : n.status === "vencido" ? "Vencido" : "Pendente";
    return {
      id: n.id || `rec-${idx}`,
      client: clientName,
      descricao: n.descricao || "",
      value: valueReais,
      due: dueStr || "—",
      status: statusNorm,
      plan: n.plano || "—",
    };
  });
  const pagNorm = pagamentos.map((p, idx) => {
    const rawId = p.uuid ?? p.id ?? p._id ?? p.UUID ?? p.Id ?? p.ID;
    return {
      id: rawId != null && String(rawId).length > 0 ? String(rawId) : `pag-${idx}`,
      desc: p.descricao ?? p.Descricao ?? "—",
      value: (p.valor_centavos != null ? p.valor_centavos : p.valor ?? p.Valor) != null ? Number(p.valor_centavos ?? p.valor ?? p.Valor) / 100 : 0,
      due: (p.vencimento ?? p.Vencimento) ? (typeof (p.vencimento ?? p.Vencimento) === "string" ? (p.vencimento ?? p.Vencimento).slice(0, 10) : (p.vencimento ?? p.Vencimento)) : "—",
      status: ((p.status ?? p.Status) || "Pendente") === "pago" ? "Pago" : "Pendente",
      cat: p.categoria ?? p.Categoria ?? "—",
    };
  });

  const totalA = recNorm.filter(r=>r.status==="Pendente").reduce((s,r)=>s+r.value,0);
  const totalR = recNorm.filter(r=>r.status==="Pago").reduce((s,r)=>s+r.value,0);
  const totalV = recNorm.filter(r=>r.status==="Vencido").reduce((s,r)=>s+r.value,0);
  const totalP = pagNorm.filter(p=>p.status==="Pendente").reduce((s,p)=>s+p.value,0);
  const pendCount = recNorm.filter(r=>r.status==="Pendente").length;
  const vencCount = recNorm.filter(r=>r.status==="Vencido").length;

  const marcarPago = (id) => {
    if (!token || !id) return;
    apiPut(token, `/api/admin/financeiro/receber/${id}/marcar-pago`).then((r) => r.ok && loadFinanceiro());
  };

  const handleNovoPagar = (e) => {
    e?.preventDefault?.();
    if (!token) {
      setPagarError("Sessão expirada ou token ausente. Faça login novamente.");
      return;
    }
    if (!pagarForm.descricao?.trim()) {
      setPagarError("Informe a descrição.");
      return;
    }
    const valorNum = Number(pagarForm.valor) || 0;
    if (valorNum <= 0) {
      setPagarError("Informe o valor em R$.");
      return;
    }
    setPagarError(null);
    setPagarSubmitting(true);
    const rawVencP = pagarForm.vencimento || "";
    const vencimento = (rawVencP.length === 10 && rawVencP.includes("-")) ? rawVencP.slice(0, 10) : new Date().toISOString().slice(0, 10);
    const body = {
      descricao: pagarForm.descricao.trim(),
      valor_centavos: Math.round(valorNum * 100),
      vencimento,
      categoria: pagarForm.categoria || "Fornecedor",
    };
    apiPost(token, "/api/admin/financeiro/pagar", body)
      .then(async (r) => {
        const data = await r.json().catch(() => ({}));
        if (r.ok) {
          setPagarOpen(false);
          setPagarForm({ descricao: "", valor: "", vencimento: new Date().toISOString().slice(0, 10), categoria: "Fornecedor" });
          loadFinanceiro();
        } else {
          const msg = data?.message || data?.error || (r.status === 405 ? "Backend não aceita POST neste endpoint. O servidor precisa implementar POST /api/admin/financeiro/pagar e responder ao preflight OPTIONS com CORS." : `Erro ${r.status}`);
          throw new Error(msg);
        }
      })
      .catch((e) => setPagarError(e?.message || "Erro ao criar conta a pagar"))
      .finally(() => setPagarSubmitting(false));
  };

  const chartData = mrrMonthly.length ? mrrMonthly : [{ m: "—", mrr: 1 }];
  const mrrValues = chartData.map((x) => Number(x.mrr));
  const maxMrr = mrrValues.length && Math.max(...mrrValues) > 0 ? Math.max(...mrrValues) : 1;

  const handleExportFinanceiro = () => {
    const headers = tab === "receber" ? ["ID", "Cliente", "Valor", "Vencimento", "Status", "Plano"] : ["ID", "Descrição", "Valor", "Vencimento", "Status", "Categoria"];
    const keys = tab === "receber" ? ["id", "client", "value", "due", "status", "plan"] : ["id", "desc", "value", "due", "status", "cat"];
    const rows = tab === "receber" ? recNorm.map((r) => ({ ...r, value: r.value >= 1000 ? `R$ ${(r.value / 1000).toFixed(1)}k` : formatCurrency(r.value), plan: r.plan })) : pagNorm.map((p) => ({ ...p, value: formatCurrency(p.value) }));
    const csv = buildCSV(rows, headers, keys);
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = tab === "receber" ? "contas-a-receber.csv" : "contas-a-pagar.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const marcarPagoPagar = (id) => {
    if (!token || !id || String(id).startsWith("pag-")) return;
    setMarcarPagoPagarError(null);
    setMarcarPagoPagarLoading(id);
    apiPut(token, `/api/admin/financeiro/pagar/${encodeURIComponent(id)}/marcar-pago`, {})
      .then(async (r) => {
        const data = await r.json().catch(() => ({}));
        if (r.ok) {
          loadFinanceiro();
        } else {
          setMarcarPagoPagarError(data?.message || data?.error || `Erro ${r.status} ao marcar como pago.`);
        }
      })
      .catch((e) => setMarcarPagoPagarError(e?.message || "Falha ao marcar como pago. Verifique a conexão e o backend."))
      .finally(() => setMarcarPagoPagarLoading(null));
  };

  return (
    <div>
      <PageHeader title="Financeiro" sub="Recebimentos e pagamentos."
        action={
          <div style={{ display:"flex", gap:8 }}>
            {tab === "receber" && (
              <Btn v="primary" sz="sm" type="button" onClick={()=>{ setLancamentoOpen(true); setLancamentoError(null); setLancamentoForm({ cliente_uuid: "", descricao: "", valor: "", vencimento: new Date().toISOString().slice(0,10), plano: "Growth" }); }}>+ Novo lançamento (a receber)</Btn>
            )}
            {tab === "pagar" && (
              <Btn v="primary" sz="sm" type="button" onClick={()=>{ setPagarOpen(true); setPagarError(null); setPagarForm({ descricao: "", valor: "", vencimento: new Date().toISOString().slice(0,10), categoria: "Fornecedor" }); }}>+ Adicionar conta a pagar</Btn>
            )}
            <Btn v="ghost" sz="sm" onClick={handleExportFinanceiro}>↓ Exportar</Btn>
          </div>
        }/>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:16 }}>
        <KPICard label="A Receber"   value={totalA ? formatCurrency(totalA, true) : "R$ 0"} delta={null} sub={`${pendCount} faturas`} accent={C.amber}/>
        <KPICard label="Recebido"    value={totalR ? formatCurrency(totalR, true) : "R$ 0"} delta={null} sub="pago" accent={C.green}/>
        <KPICard label="Inadimplência" value={totalV ? formatCurrency(totalV) : "R$ 0"} delta={null} sub={`${vencCount} vencida(s)`} accent={totalV>0?C.red:C.green}/>
        <KPICard label="A Pagar"     value={totalP ? formatCurrency(totalP) : "R$ 0"} delta={null} sub="pendentes" accent={C.amber}/>
      </div>

      {chartData.length > 0 && (
        <Card style={{ padding:"22px", marginBottom:14 }}>
          <div style={{ color:t.t1, fontWeight:700, fontSize:13, marginBottom:18 }}>Evolução de MRR</div>
          <div style={{ display:"flex", alignItems:"flex-end", gap:8, height:80 }}>
            {chartData.map((d,i) => {
              const isLast = i===chartData.length-1;
              const val = Number(d.mrr);
              const h = Math.max(6, maxMrr ? (val / maxMrr) * 68 : 6);
              return (
                <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:5 }}>
                  <div style={{ position:"relative", width:"100%", display:"flex", justifyContent:"center" }}>
                    {isLast && val > 0 && <div style={{ position:"absolute", bottom:"100%", marginBottom:4, background:t.bg4, border:`1px solid ${t.b1}`, borderRadius:4, padding:"2px 7px", color:t.t1, fontSize:9, fontWeight:700, whiteSpace:"nowrap" }}>{formatCurrency(val, true)}</div>}
                    <div style={{ width:"100%", borderRadius:"3px 3px 0 0", height:`${h}px`, background:isLast?t.accent:t.bg4, transition:"height .7s ease" }}/>
                  </div>
                  <span style={{ fontSize:9, color:t.t4 }}>{d.m}</span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <div style={{ display:"flex", gap:0, marginBottom:16, borderBottom:`1px solid ${t.b1}` }}>
        {[{ id:"receber",label:"A Receber" },{ id:"pagar",label:"A Pagar" }].map(tb => (
          <button key={tb.id} onClick={()=>setTab(tb.id)} style={{ padding:"8px 20px", background:"transparent", border:"none",
            borderBottom:tab===tb.id?`2px solid ${t.accent}`:"2px solid transparent",
            color:tab===tb.id?t.t1:t.t3, fontSize:13, fontWeight:700, cursor:"pointer", marginBottom:-1, transition:"all .18s" }}>
            {tb.label}
          </button>
        ))}
      </div>

      {loading && recebiveis.length === 0 && pagamentos.length === 0 ? (
        <div style={{ padding:40, color:t.t3, textAlign:"center" }}>Carregando...</div>
      ) : tab==="receber" ? (
        <Card style={{ overflow:"hidden" }}>
          <div style={{ display:"grid", gridTemplateColumns:"100px 1fr 90px 110px 100px 80px 80px", gap:12, padding:"9px 20px", background:t.bg3, borderBottom:`1px solid ${t.b1}` }}>
            {["ID","Cliente","Valor","Vencimento","Status","Plano",""].map((h,i)=>(
              <span key={i} style={{ color:t.t4, fontSize:9, fontWeight:800, letterSpacing:1.4, textTransform:"uppercase" }}>{h}</span>
            ))}
          </div>
          {recNorm.map((r) => (
            <div key={r.id} style={{ display:"grid", gridTemplateColumns:"100px 1fr 90px 110px 100px 80px 80px", gap:12, padding:"13px 20px", alignItems:"center", borderTop:`1px solid ${t.b1}` }}
              onMouseEnter={e=>e.currentTarget.style.background=t.bg3}
              onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              <span style={{ color:t.t4, fontSize:10, fontWeight:700 }}>{typeof r.id === "string" && r.id.length > 0 ? r.id.slice(0, 8) : (r.id ? String(r.id).slice(-6) : "—")}</span>
              <div>
                <div style={{ color:t.t1, fontSize:12, fontWeight:600 }}>{r.client}</div>
                {r.descricao && <div style={{ color:t.t3, fontSize:11, marginTop:2 }}>{r.descricao}</div>}
              </div>
              <span style={{ color:t.t1, fontSize:12, fontWeight:700 }}>{formatCurrency(r.value, true)}</span>
              <span style={{ color:t.t2, fontSize:12 }}>{r.due}</span>
              <StatusBadge s={r.status}/>
              <Tag label={r.plan} color={PLANS.find(p=>p.name===r.plan)?.color||"#888"} bg={`${PLANS.find(p=>p.name===r.plan)?.color||"#888"}14`}/>
              <div style={{ display:"flex", gap:5 }}>
                {r.status==="Pendente" && <Btn v="success" sz="sm" onClick={()=>marcarPago(r.id)}>✓</Btn>}
              </div>
            </div>
          ))}
        </Card>
      ) : (
        <Card style={{ overflow:"hidden" }}>
          {marcarPagoPagarError && (
            <div style={{ margin:12, padding:12, background:C.redBg, border:`1px solid ${C.red}40`, borderRadius:8, color:C.red, fontSize:12 }}>
              {marcarPagoPagarError}
              <button type="button" onClick={() => setMarcarPagoPagarError(null)} style={{ marginLeft:8, background:"none", border:"none", color:C.red, cursor:"pointer", textDecoration:"underline" }}>Fechar</button>
            </div>
          )}
          <div style={{ display:"grid", gridTemplateColumns:"120px 1fr 100px 110px 100px 100px 80px", gap:12, padding:"9px 20px", background:t.bg3, borderBottom:`1px solid ${t.b1}` }}>
            {["ID","Descrição","Valor","Vencimento","Status","Categoria",""].map((h,i)=>(
              <span key={i} style={{ color:t.t4, fontSize:9, fontWeight:800, letterSpacing:1.4, textTransform:"uppercase" }}>{h}</span>
            ))}
          </div>
          {pagNorm.map((p) => (
            <div key={p.id} style={{ display:"grid", gridTemplateColumns:"120px 1fr 100px 110px 100px 100px 80px", gap:12, padding:"13px 20px", alignItems:"center", borderTop:`1px solid ${t.b1}` }}
              onMouseEnter={e=>e.currentTarget.style.background=t.bg3}
              onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              <span style={{ color:t.t4, fontSize:10 }}>{typeof p.id === "string" && p.id.length > 0 ? p.id.slice(0, 8) : (p.id ? String(p.id).slice(-6) : "—")}</span>
              <span style={{ color:t.t1, fontSize:12, fontWeight:600 }}>{p.desc}</span>
              <span style={{ color:t.t1, fontSize:12, fontWeight:700 }}>{formatCurrency(p.value)}</span>
              <span style={{ color:t.t2, fontSize:12 }}>{p.due}</span>
              <StatusBadge s={p.status}/>
              <Tag label={p.cat} color={C.blue} bg={C.blueBg}/>
              <div style={{ display:"flex", gap:5 }}>
                {p.status === "Pendente" && !String(p.id).startsWith("pag-") && (
                  <Btn v="success" sz="sm" disabled={marcarPagoPagarLoading === p.id} onClick={() => marcarPagoPagar(p.id)}>
                    {marcarPagoPagarLoading === p.id ? "…" : "✓"}
                  </Btn>
                )}
              </div>
            </div>
          ))}
          <div style={{ padding:"14px 20px", borderTop:`1px solid ${t.b1}`, background:t.bg3, display:"flex", justifyContent:"flex-end", gap:20 }}>
            <span style={{ color:t.t3, fontSize:11 }}>Total a pagar: <strong style={{ color:t.t1 }}>{formatCurrency(totalP)}</strong></span>
          </div>
        </Card>
      )}

      <Modal open={lancamentoOpen} onClose={()=>{ setLancamentoOpen(false); setLancamentoError(null); }} title="Novo lançamento (a receber) — disponibilizar para o cliente">
        <p style={{ color:t.t3, fontSize:12, marginBottom:16 }}>O valor será vinculado ao cliente escolhido e aparecerá no dashboard dele em Financeiro / Faturas.</p>
        {lancamentoError && (
          <div style={{ marginBottom:16, padding:12, background:C.redBg, border:`1px solid ${C.red}40`, borderRadius:8, color:C.red, fontSize:12 }}>{lancamentoError}</div>
        )}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          <FormField label="Cliente" style={{ gridColumn:"1/-1" }}>
            <Select
              value={lancamentoForm.cliente_uuid}
              onChange={(v)=>setLancamentoForm((f)=>({ ...f, cliente_uuid: v }))}
              opts={[{ value: "", label: "— Selecione o cliente" }, ...clientes.map((c) => ({ value: c.uuid || c.id, label: (c.nome || c.name || c.email) || "—" }))]}
            />
          </FormField>
          <FormField label="Descrição"><Input value={lancamentoForm.descricao} onChange={(v)=>setLancamentoForm((f)=>({ ...f, descricao: v }))} placeholder="Ex: Fatura mensal Growth"/></FormField>
          <FormField label="Valor (R$)"><input type="text" inputMode="decimal" value={formatCurrencyInput(lancamentoForm.valor)} onChange={(e)=>setLancamentoForm((f)=>({ ...f, valor: parseCurrencyInput(e.target.value) }))} placeholder="R$ 0,00" style={{ width:"100%", padding:"9px 13px", background:t.bg3, border:`1px solid ${t.b1}`, borderRadius:8, color:t.t1, fontSize:12, outline:"none" }}/></FormField>
          <FormField label="Vencimento"><input type="text" value={formatDateInput(lancamentoForm.vencimento)} onChange={(e)=>{ const v = e.target.value; const iso = v.replace(/\D/g,"").length >= 8 ? parseDateInput(v) : v; setLancamentoForm((f)=>({ ...f, vencimento: iso || "" })); }} placeholder="DD/MM/AAAA" maxLength={10} style={{ width:"100%", padding:"9px 13px", background:t.bg3, border:`1px solid ${t.b1}`, borderRadius:8, color:t.t1, fontSize:12, outline:"none" }}/></FormField>
          <FormField label="Plano"><Select value={lancamentoForm.plano} onChange={(v)=>setLancamentoForm((f)=>({ ...f, plano: v }))} opts={["Starter","Growth","Pro","Scale"]}/></FormField>
        </div>
        <div style={{ display:"flex", gap:8, justifyContent:"flex-end", marginTop:20 }}>
          <Btn v="ghost" type="button" onClick={()=>setLancamentoOpen(false)}>Cancelar</Btn>
          <Btn type="button" onClick={handleNovoLancamento} disabled={lancamentoSubmitting}>{lancamentoSubmitting ? "Salvando…" : "Criar lançamento"}</Btn>
        </div>
      </Modal>

      <Modal open={pagarOpen} onClose={()=>{ setPagarOpen(false); setPagarError(null); }} title="Adicionar conta a pagar">
        <p style={{ color:t.t3, fontSize:12, marginBottom:16 }}>Registre uma despesa a pagar (fornecedor, serviço, etc.).</p>
        {pagarError && (
          <div style={{ marginBottom:16, padding:12, background:C.redBg, border:`1px solid ${C.red}40`, borderRadius:8, color:C.red, fontSize:12 }}>{pagarError}</div>
        )}
        <form onSubmit={handleNovoPagar}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <FormField label="Descrição" style={{ gridColumn:"1/-1" }}><Input value={pagarForm.descricao} onChange={(v)=>setPagarForm((f)=>({ ...f, descricao: v }))} placeholder="Ex: Serviço de marketing"/></FormField>
            <FormField label="Valor (R$)"><input type="text" inputMode="decimal" value={formatCurrencyInput(pagarForm.valor)} onChange={(e)=>setPagarForm((f)=>({ ...f, valor: parseCurrencyInput(e.target.value) }))} placeholder="R$ 0,00" style={{ width:"100%", padding:"9px 13px", background:t.bg3, border:`1px solid ${t.b1}`, borderRadius:8, color:t.t1, fontSize:12, outline:"none" }}/></FormField>
            <FormField label="Vencimento"><input type="text" value={formatDateInput(pagarForm.vencimento)} onChange={(e)=>{ const v = e.target.value; const iso = v.replace(/\D/g,"").length >= 8 ? parseDateInput(v) : v; setPagarForm((f)=>({ ...f, vencimento: iso || "" })); }} placeholder="DD/MM/AAAA" maxLength={10} style={{ width:"100%", padding:"9px 13px", background:t.bg3, border:`1px solid ${t.b1}`, borderRadius:8, color:t.t1, fontSize:12, outline:"none" }}/></FormField>
            <FormField label="Categoria">
              <Select value={pagarForm.categoria} onChange={(v)=>setPagarForm((f)=>({ ...f, categoria: v }))} opts={["Fornecedor","Serviço","Imposto","Outros"]}/>
            </FormField>
          </div>
          <div style={{ display:"flex", gap:8, justifyContent:"flex-end", marginTop:20 }}>
            <Btn v="ghost" type="button" onClick={()=>setPagarOpen(false)}>Cancelar</Btn>
            <Btn type="submit" disabled={pagarSubmitting}>{pagarSubmitting ? "Salvando…" : "Adicionar"}</Btn>
          </div>
        </form>
      </Modal>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   PAGE: PRODUTOS
═══════════════════════════════════════════════════ */
const PRODUTO_COLORS = [C.cyan, C.blue, C.purple, C.amber, C.orange, C.pink, C.red];
const CATEGORIA_OPTS = [
  { value: "marketing", label: "Planos de Marketing" },
  { value: "food",      label: "United Food" },
  { value: "ia",        label: "United IA" },
  { value: "crm",       label: "CRM United" },
];
function ProdutosPage({ perms }) {
  const t = useT();
  const { token } = useAuth();
  const canWrite = perms?.canWriteAny !== false; // só admin
  const [section, setSection] = useState("marketing");
  const [addOpen, setAddOpen]   = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [produtosBySection, setProdutosBySection] = useState({});
  const [productForm, setProductForm] = useState({ sectionId: "marketing", name: "", price: "", badge: "", features: "" });
  const [productSubmitting, setProductSubmitting] = useState(false);
  const [productError, setProductError] = useState(null);

  const loadSection = (sec) => {
    if (!token) return;
    apiGet(token, `/api/admin/produtos/${sec}?limit=50&offset=0`)
      .then((r) => r.ok ? safeResJson(r, { items: [] }) : { items: [] })
      .then((data) => setProdutosBySection((prev) => ({ ...prev, [sec]: Array.isArray(data?.items) ? data.items : [] })));
  };

  useEffect(() => {
    if (addOpen) {
      if (editItem) {
        setProductForm({
          sectionId: section,
          name: editItem.name ?? "",
          price: editItem.price != null ? Number(editItem.price) : "",
          badge: editItem.badge ?? "",
          features: Array.isArray(editItem.features) ? editItem.features.join("\n") : (editItem.features ?? ""),
        });
      } else {
        setProductForm({ sectionId: section, name: "", price: "", badge: "", features: "" });
      }
    }
  }, [addOpen, editItem, section]);

  useEffect(() => {
    loadSection(section);
  }, [token, section]);

  const handleCreateProduto = () => {
    if (!canWrite) { setProductError("Você não tem permissão para criar/editar produtos."); return; }
    if (!productForm.name?.trim()) { setProductError("Informe o nome do produto."); return; }
    setProductError(null);
    setProductSubmitting(true);
    const familia = productForm.sectionId;
    const body = {
      name: productForm.name.trim(),
      price: productForm.price ? Number(productForm.price) : 0,
      badge: productForm.badge.trim() || undefined,
      features: productForm.features.trim() || undefined,
    };
    apiPost(token, `/api/admin/produtos/${familia}`, body)
      .then(async (r) => {
        const data = await r.json().catch(() => ({}));
        if (r.ok) {
          setAddOpen(false);
          setEditItem(null);
          setProductForm({ sectionId: section, name: "", price: "", badge: "", features: "" });
          loadSection(familia);
        } else {
          throw new Error(data?.message || data?.error || `Erro ${r.status}`);
        }
      })
      .catch((e) => setProductError(e?.message || "Erro ao criar produto"))
      .finally(() => setProductSubmitting(false));
  };

  const normPlan = (p, i) => ({ id: p.uuid||p.slug||i, name: p.nome||p.name||"", price: (p.preco_centavos!=null ? p.preco_centavos/100 : p.price)||0, color: PRODUTO_COLORS[i%PRODUTO_COLORS.length], badge: p.badge||null, features: p.features||[] });
  const normIa = (p, i) => ({ id: p.uuid||p.slug||i, name: p.nome||p.name||"", icon: p.icon||"◆", color: PRODUTO_COLORS[i%PRODUTO_COLORS.length], type: p.tipo||p.type||"Software", desc: p.descricao||p.desc||"", price: p.preco_centavos!=null ? `R$${(p.preco_centavos/100).toLocaleString("pt-BR")}/mês` : (p.price||""), features: p.features||[] });
  const MKTG_PLANS = (produtosBySection.marketing||[]).map(normPlan);
  const FOOD_PLANS = (produtosBySection.food||[]).map(normPlan);
  const IA_PRODUCTS = (produtosBySection.ia||[]).map(normIa);
  const CRM_PLANS = (produtosBySection.crm||[]).map((p,i) => ({ ...normPlan(p,i), users: p.users ?? 0 }));

  const handleExportProdutos = () => {
    const headers = ["Seção", "Nome", "Preço", "Badge/Tipo", "Observações", "Destaques"];
    const keys = ["secao", "nome", "preco", "badge_tipo", "observacoes", "destaques"];
    const rows = [
      ...MKTG_PLANS.map((p) => ({ secao: "Planos de Marketing", nome: p.name, preco: typeof p.price === "number" ? formatCurrency(p.price) : p.price, badge_tipo: p.badge || "—", observacoes: "", destaques: (p.features || []).join("; ") })),
      ...FOOD_PLANS.map((p) => ({ secao: "United Food", nome: p.name, preco: typeof p.price === "number" ? formatCurrency(p.price) : p.price, badge_tipo: p.badge || "—", observacoes: "", destaques: (p.features || []).join("; ") })),
      ...IA_PRODUCTS.map((p) => ({ secao: "United IA", nome: p.name, preco: p.price, badge_tipo: p.type || "—", observacoes: (p.desc || "").replace(/\n/g, " "), destaques: (p.features || []).join("; ") })),
      ...CRM_PLANS.map((p) => ({ secao: "CRM United", nome: p.name, preco: typeof p.price === "number" ? formatCurrency(p.price) : p.price, badge_tipo: p.badge || (p.users === 999 ? "Ilimitado" : `${p.users} usuários`) || "—", observacoes: "", destaques: (p.features || []).join("; ") })),
    ];
    const csv = buildCSV(rows, headers, keys);
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "produtos.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const SECTIONS = [
    { id:"marketing", label:"Planos de Marketing", icon:"◈", color:C.blue    },
    { id:"food",      label:"United Food",          icon:"◉", color:C.orange  },
    { id:"ia",        label:"United IA",             icon:"◆", color:C.purple  },
    { id:"crm",       label:"CRM United",            icon:"◇", color:C.cyan    },
  ];

  /* --- reusable plan card for marketing & food --- */
  function PlanCard({ p }) {
    const [h, setH] = useState(false);
    const sideBorder = `1px solid ${h ? p.color + "55" : t.b1}`;
    return (
      <div onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
        style={{ background:t.bg2, borderLeft:sideBorder, borderRight:sideBorder, borderBottom:sideBorder,
          borderTop:`3px solid ${p.color}`, borderRadius:12, padding:"26px 24px",
          transition:"all .2s", boxShadow:h?`0 8px 28px ${t.sh}`:"none",
          transform:h?"translateY(-2px)":"none", display:"flex", flexDirection:"column" }}>
        {/* header */}
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:6 }}>
          <div style={{ color:t.t1, fontSize:17, fontWeight:800 }}>{p.name}</div>
          {p.badge && (
            <span style={{ fontSize:9, fontWeight:700, padding:"3px 9px", borderRadius:5,
              color:p.color, background:`${p.color}14`, border:`1px solid ${p.color}22`,
              letterSpacing:.5, textTransform:"uppercase" }}>
              {p.badge}
            </span>
          )}
        </div>
        <div style={{ color:p.color, fontSize:22, fontWeight:800, marginBottom:18 }}>
          R${p.price.toLocaleString("pt-BR")}
          <span style={{ color:t.t3, fontSize:12, fontWeight:400 }}>/mês</span>
        </div>
        {/* features */}
        <div style={{ flex:1, marginBottom:20 }}>
          {p.features.map((f,i) => (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:9, padding:"6px 0",
              borderBottom:i<p.features.length-1?`1px solid ${t.b2}`:"none" }}>
              <span style={{ color:p.color, fontSize:10, fontWeight:800, flexShrink:0 }}>✓</span>
              <span style={{ color:t.t2, fontSize:12 }}>{f}</span>
            </div>
          ))}
        </div>
        {/* actions */}
        <div style={{ display:"flex", gap:8, paddingTop:16, borderTop:`1px solid ${t.b1}` }}>
          <Btn sz="sm" onClick={()=>setEditItem(p)}>✏ Editar</Btn>
          <Btn v="ghost" sz="sm">👁 Clientes</Btn>
          <Btn v="danger" sz="sm">⊘</Btn>
        </div>
      </div>
    );
  }

  /* --- IA product card --- */
  function IaCard({ p }) {
    const [h, setH] = useState(false);
    return (
      <div onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
        style={{ background:t.bg2, border:`1px solid ${h?p.color+"55":t.b1}`,
          borderRadius:12, padding:"24px", transition:"all .2s",
          boxShadow:h?`0 8px 28px ${t.sh}`:"none", transform:h?"translateY(-2px)":"none" }}>
        <div style={{ display:"flex", alignItems:"flex-start", gap:14, marginBottom:16 }}>
          <div style={{ width:48, height:48, borderRadius:13, background:`${p.color}14`,
            border:`1px solid ${p.color}22`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
            <span style={{ fontSize:22 }}>{p.icon}</span>
          </div>
          <div style={{ flex:1 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
              <span style={{ color:t.t1, fontSize:14, fontWeight:800 }}>{p.name}</span>
              <Tag label={p.type} color={p.color} bg={`${p.color}14`}/>
            </div>
            <div style={{ color:t.t3, fontSize:11, lineHeight:1.6 }}>{p.desc}</div>
          </div>
        </div>
        <div style={{ padding:"10px 14px", background:t.bg3, borderRadius:8, border:`1px solid ${t.b1}`,
          marginBottom:16, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <span style={{ color:t.t2, fontSize:11 }}>Investimento</span>
          <span style={{ color:p.color, fontSize:13, fontWeight:800 }}>{p.price}</span>
        </div>
        <div style={{ display:"flex", flexWrap:"wrap", gap:5, marginBottom:16 }}>
          {p.features.map((f,i) => (
            <span key={i} style={{ fontSize:10, fontWeight:600, padding:"3px 10px", borderRadius:5,
              background:t.bg3, color:t.t2, border:`1px solid ${t.b1}` }}>{f}</span>
          ))}
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <Btn sz="sm">Ver Detalhes</Btn>
          <Btn v="ghost" sz="sm">✏ Editar</Btn>
        </div>
      </div>
    );
  }

  /* --- CRM card --- */
  function CrmCard({ p }) {
    const [h, setH] = useState(false);
    const sideBorder = `1px solid ${h ? p.color + "55" : t.b1}`;
    return (
      <div onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
        style={{ background:t.bg2, borderLeft:sideBorder, borderRight:sideBorder, borderBottom:sideBorder,
          borderTop:`3px solid ${p.color}`, borderRadius:12, padding:"26px 24px",
          transition:"all .2s", boxShadow:h?`0 8px 28px ${t.sh}`:"none",
          transform:h?"translateY(-2px)":"none", display:"flex", flexDirection:"column" }}>
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:6 }}>
          <div style={{ color:t.t1, fontSize:17, fontWeight:800 }}>{p.name}</div>
          <Tag label={p.users===999?"Ilimitado":`${p.users} usuários`} color={p.color} bg={`${p.color}14`}/>
        </div>
        <div style={{ color:p.color, fontSize:22, fontWeight:800, marginBottom:18 }}>
          R${p.price.toLocaleString("pt-BR")}
          <span style={{ color:t.t3, fontSize:12, fontWeight:400 }}>/mês</span>
        </div>
        <div style={{ flex:1, marginBottom:20 }}>
          {p.features.map((f,i) => (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:9, padding:"6px 0",
              borderBottom:i<p.features.length-1?`1px solid ${t.b2}`:"none" }}>
              <span style={{ color:p.color, fontSize:10, fontWeight:800, flexShrink:0 }}>✓</span>
              <span style={{ color:t.t2, fontSize:12 }}>{f}</span>
            </div>
          ))}
        </div>
        <div style={{ display:"flex", gap:8, paddingTop:16, borderTop:`1px solid ${t.b1}` }}>
          <Btn sz="sm">✏ Editar</Btn>
          <Btn v="ghost" sz="sm">👁 Clientes</Btn>
        </div>
      </div>
    );
  }

  const active = SECTIONS.find(s=>s.id===section);

  return (
    <div>
      <PageHeader title="Produtos" sub="Gerencie todos os produtos e planos oferecidos pela United."
        action={<Btn onClick={()=>setAddOpen(true)}>+ Novo Produto</Btn>}/>

      {/* Section switcher */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10, marginBottom:28 }}>
        {SECTIONS.map(s => {
          const isActive = section===s.id;
          return (
            <div key={s.id} onClick={()=>setSection(s.id)} style={{
              padding:"18px 20px", borderRadius:12, cursor:"pointer",
              background:isActive?`${s.color}0e`:t.bg2,
              border:isActive?`1px solid ${s.color}40`:`1px solid ${t.b1}`,
              transition:"all .18s", display:"flex", alignItems:"center", gap:12 }}
              onMouseEnter={e=>{ if(!isActive){ e.currentTarget.style.background=t.bg3; e.currentTarget.style.borderColor=t.bHi; }}}
              onMouseLeave={e=>{ if(!isActive){ e.currentTarget.style.background=t.bg2; e.currentTarget.style.borderColor=t.b1; }}}>
              <div style={{ width:36, height:36, borderRadius:10, background:isActive?`${s.color}1a`:t.bg4,
                border:`1px solid ${isActive?s.color+"30":t.b1}`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <span style={{ color:isActive?s.color:t.t3, fontSize:15 }}>{s.icon}</span>
              </div>
              <div>
                <div style={{ color:isActive?t.t1:t.t2, fontSize:12, fontWeight:700 }}>{s.label}</div>
                <div style={{ color:isActive?s.color:t.t4, fontSize:10, marginTop:2, fontWeight:600 }}>
                  {s.id==="marketing"?`${MKTG_PLANS.length} planos`:
                   s.id==="food"?`${FOOD_PLANS.length} planos`:
                   s.id==="ia"?`${IA_PRODUCTS.length} produtos`:
                   `${CRM_PLANS.length} planos`}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Section header strip */}
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:22,
        padding:"14px 20px", background:`${active.color}08`, border:`1px solid ${active.color}22`,
        borderRadius:10 }}>
        <span style={{ color:active.color, fontSize:20 }}>{active.icon}</span>
        <div>
          <div style={{ color:t.t1, fontSize:14, fontWeight:800 }}>{active.label}</div>
          <div style={{ color:t.t3, fontSize:11 }}>
            {section==="marketing" && "Planos de tráfego pago e marketing digital para empresas de todos os tamanhos."}
            {section==="food"      && "Marketing especializado para restaurantes, bares, deliveries e franquias alimentícias."}
            {section==="ia"        && "Soluções de software com inteligência artificial para automatizar e escalar o seu negócio."}
            {section==="crm"       && "CRM próprio da United para gestão de relacionamento, pipeline e automação de vendas."}
          </div>
        </div>
        <div style={{ flex:1 }}/>
        <Btn v="ghost" sz="sm" onClick={handleExportProdutos}>↓ Exportar Tabela</Btn>
        {canWrite && <Btn sz="sm" onClick={()=>setAddOpen(true)}>+ Adicionar</Btn>}
      </div>

      {/* MARKETING PLANS */}
      {section==="marketing" && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12 }}>
          {MKTG_PLANS.map(p => <PlanCard key={p.id} p={p}/>)}
        </div>
      )}

      {/* UNITED FOOD */}
      {section==="food" && (
        <>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:24 }}>
            {FOOD_PLANS.map(p => <PlanCard key={p.id} p={p}/>)}
          </div>
          {/* Diferenciais */}
          <Card style={{ padding:"24px" }}>
            <div style={{ color:t.t3, fontSize:9, fontWeight:800, letterSpacing:2, textTransform:"uppercase", marginBottom:16 }}>
              DIFERENCIAIS UNITED FOOD
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12 }}>
              {[
                { icon:"📸", title:"Fotografia de produto",    desc:"Sessão fotográfica mensal de pratos e ambiente incluída nos planos Premium e Franquia." },
                { icon:"📍", title:"Google Maps otimizado",    desc:"Gestão e otimização de ficha do Google Meu Negócio para atrair clientes próximos." },
                { icon:"🍕", title:"Calendário sazonal",       desc:"Campanhas temáticas prontas para datas como Dia dos Namorados, Natal e Copa." },
                { icon:"⭐", title:"Gestão de reputação",      desc:"Monitoramento e resposta a avaliações no Google, iFood e Reclame Aqui." },
              ].map((d,i) => (
                <div key={i} style={{ padding:"18px", background:t.bg3, borderRadius:10, border:`1px solid ${t.b1}` }}>
                  <span style={{ fontSize:24 }}>{d.icon}</span>
                  <div style={{ color:t.t1, fontSize:12, fontWeight:700, margin:"10px 0 5px" }}>{d.title}</div>
                  <div style={{ color:t.t3, fontSize:11, lineHeight:1.6 }}>{d.desc}</div>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}

      {/* UNITED IA */}
      {section==="ia" && (
        <>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:12, marginBottom:24 }}>
            {IA_PRODUCTS.map(p => <IaCard key={p.id} p={p}/>)}
          </div>
          {/* Como funciona */}
          <Card style={{ padding:"24px" }}>
            <div style={{ color:t.t3, fontSize:9, fontWeight:800, letterSpacing:2, textTransform:"uppercase", marginBottom:18 }}>
              COMO FUNCIONA A IMPLEMENTAÇÃO
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:0 }}>
              {[
                { n:"01", label:"Briefing",     desc:"Levantamento de processos e objetivos do cliente" },
                { n:"02", label:"Configuração", desc:"Setup e treinamento do sistema com dados reais"    },
                { n:"03", label:"Integração",   desc:"Conexão com ferramentas já usadas pelo cliente"    },
                { n:"04", label:"Teste",        desc:"Período piloto de 15 dias com acompanhamento"      },
                { n:"05", label:"Go live",      desc:"Ativação completa e suporte contínuo"              },
              ].map((s,i) => (
                <div key={i} style={{ textAlign:"center", padding:"18px 12px", position:"relative" }}>
                  {i<4 && <div style={{ position:"absolute", right:0, top:"50%", transform:"translateY(-50%)", color:t.t4, fontSize:16 }}>→</div>}
                  <div style={{ width:36, height:36, borderRadius:"50%", background:C.purpleBg, border:`1px solid ${C.purple}30`,
                    display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 10px" }}>
                    <span style={{ color:C.purple, fontSize:11, fontWeight:800 }}>{s.n}</span>
                  </div>
                  <div style={{ color:t.t1, fontSize:12, fontWeight:700, marginBottom:5 }}>{s.label}</div>
                  <div style={{ color:t.t3, fontSize:10, lineHeight:1.5 }}>{s.desc}</div>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}

      {/* CRM UNITED */}
      {section==="crm" && (
        <>
          {/* Highlight bar */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:24 }}>
            {[
              { label:"Clientes usando CRM",  val:"3",      c:C.cyan   },
              { label:"MRR do CRM",           val:"R$3,9k", c:C.green  },
              { label:"Usuários ativos",       val:"12",     c:C.blue   },
              { label:"NPS médio",             val:"9.2",    c:C.amber  },
            ].map((k,i) => (
              <div key={i} style={{ padding:"18px 20px", background:t.bg2, borderRadius:12, border:`1px solid ${t.b1}`, display:"flex", alignItems:"center", gap:14 }}>
                <span style={{ color:k.c, fontSize:22, fontWeight:800 }}>{k.val}</span>
                <span style={{ color:t.t2, fontSize:11 }}>{k.label}</span>
              </div>
            ))}
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14, marginBottom:24 }}>
            {CRM_PLANS.map(p => <CrmCard key={p.id} p={p}/>)}
          </div>

          {/* Features overview */}
          <Card style={{ padding:"26px" }}>
            <div style={{ color:t.t3, fontSize:9, fontWeight:800, letterSpacing:2, textTransform:"uppercase", marginBottom:20 }}>
              FUNCIONALIDADES DO CRM UNITED
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14 }}>
              {[
                { icon:"📋", title:"Pipeline Visual",         desc:"Visualize e gerencie cada etapa do funil de vendas em tempo real." },
                { icon:"🤖", title:"Automações Inteligentes", desc:"Crie fluxos automáticos de follow-up, tarefas e notificações." },
                { icon:"📊", title:"Relatórios de Vendas",    desc:"Dashboards com métricas de conversão, ticket médio e ciclo de venda." },
                { icon:"💬", title:"WhatsApp Integrado",      desc:"Envie e receba mensagens de dentro do CRM sem trocar de tela." },
                { icon:"🎯", title:"Lead Scoring",            desc:"IA que pontua e prioriza automaticamente os leads mais quentes." },
                { icon:"🔗", title:"Integrações Nativas",     desc:"Conecta com Meta Ads, Google, email, planilhas e muito mais." },
              ].map((f,i) => (
                <div key={i} style={{ display:"flex", gap:14, padding:"16px", background:t.bg3, borderRadius:10, border:`1px solid ${t.b1}` }}>
                  <div style={{ width:38, height:38, borderRadius:10, background:C.cyanBg, border:`1px solid ${C.cyan}22`,
                    display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    <span style={{ fontSize:18 }}>{f.icon}</span>
                  </div>
                  <div>
                    <div style={{ color:t.t1, fontSize:12, fontWeight:700, marginBottom:4 }}>{f.title}</div>
                    <div style={{ color:t.t3, fontSize:11, lineHeight:1.6 }}>{f.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}

      {/* Add/Edit Modal */}
      <Modal open={addOpen} onClose={()=>{ setAddOpen(false); setEditItem(null); setProductError(null); }}
        title={editItem?`Editar — ${editItem.name}`:"Novo Produto / Plano"}>
        {productError && (
          <div style={{ marginBottom:16, padding:12, background:C.redBg, border:`1px solid ${C.red}40`, borderRadius:8, color:C.red, fontSize:12 }}>
            {productError}
          </div>
        )}
        <FormField label="Categoria">
          <Select
            value={productForm.sectionId}
            onChange={(v)=>setProductForm((f)=>({ ...f, sectionId: v }))}
            opts={CATEGORIA_OPTS}
          />
        </FormField>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          <FormField label="Nome">
            <Input value={productForm.name} onChange={(v)=>setProductForm((f)=>({ ...f, name: v }))} placeholder="Ex: Growth Plus"/>
          </FormField>
          <FormField label="Preço (R$)">
            <input type="text" inputMode="decimal" value={formatCurrencyInput(productForm.price)} onChange={(e)=>setProductForm((f)=>({ ...f, price: parseCurrencyInput(e.target.value) }))} placeholder="R$ 4.990,00" style={{ width:"100%", padding:"9px 13px", background:t.bg3, border:`1px solid ${t.b1}`, borderRadius:8, color:t.t1, fontSize:12, outline:"none" }}/>
          </FormField>
        </div>
        <FormField label="Destaque / Badge">
          <Input value={productForm.badge} onChange={(v)=>setProductForm((f)=>({ ...f, badge: v }))} placeholder="Ex: Mais popular"/>
        </FormField>
        <FormField label="Recursos (um por linha)">
          <textarea rows={5} value={productForm.features} onChange={(e)=>setProductForm((f)=>({ ...f, features: e.target.value }))} placeholder={"Feature 1\nFeature 2\nFeature 3"}
            style={{ width:"100%", padding:"10px 14px", background:t.bg3, border:`1px solid ${t.b1}`, borderRadius:9, color:t.t1, fontSize:12, outline:"none", resize:"vertical", lineHeight:1.6 }}/>
        </FormField>
        <div style={{ display:"flex", gap:8, justifyContent:"flex-end", marginTop:4 }}>
          <Btn v="ghost" onClick={()=>{ setAddOpen(false); setEditItem(null); setProductError(null); }}>Cancelar</Btn>
          <Btn onClick={handleCreateProduto} disabled={productSubmitting}>{editItem ? "Salvar Alterações" : productSubmitting ? "Criando…" : "Criar Produto"}</Btn>
        </div>
      </Modal>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   PAGE: ALERTAS
═══════════════════════════════════════════════════ */
function AlertasPage({ perms }) {
  const t = useT();
  const { token } = useAuth();
  const canWrite = perms?.canWriteAny !== false; // só admin pode resolver
  const [alertas, setAlertas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("Todos");
  const [resolvingId, setResolvingId] = useState(null);
  const [alertasError, setAlertasError] = useState(null);

  // Backend retorna items com snake_case: uuid, titulo, tipo, prioridade, target, status, created_at, resolved_at
  const getAlertaId = (a) => a?.uuid ?? a?.id ?? a?._id ?? a?.Id ?? a?.UUID;

  const loadAlertas = () => {
    if (!token) return Promise.resolve();
    return apiGet(token, "/api/admin/alertas?limit=100&offset=0")
      .then((r) => r.ok ? safeResJson(r, { items: [] }) : { items: [] })
      .then((data) => {
        const list = data?.items ?? data?.data ?? data?.alertas ?? (Array.isArray(data) ? data : []);
        setAlertas(Array.isArray(list) ? list : []);
      });
  };

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setAlertasError(null);
    loadAlertas()
      .catch((e) => setAlertasError(e?.message || "Erro ao carregar alertas."))
      .finally(() => setLoading(false));
  }, [token]);

  const ativos = alertas.filter(a => (a.status || a.Status || "").toLowerCase() !== "resolvido");
  const altaAtivos = alertas.filter(a => ((a.prioridade||a.priority||"").toLowerCase()==="alta") && (a.status||a.Status||"").toLowerCase()!=="resolvido");
  const resolvidos = alertas.filter(a => (a.status || a.Status || "").toLowerCase() === "resolvido");
  const items = filter === "Resolvido" ? resolvidos : filter === "Ativo" ? ativos : alertas;

  const PRIO_C = { "alta":{ c:C.red,bg:C.redBg },"média":{ c:C.amber,bg:C.amberBg },"baixa":{ c:"#888",bg:"rgba(128,128,128,.1)" } };
  const TYPE_C = { "financeiro":C.red,"risco":C.orange,"performance":C.blue,"contrato":C.purple,"comercial":C.green };

  const resolver = (id) => {
    if (!token || !id) return;
    if (!canWrite) { setAlertasError("Você não tem permissão para resolver alertas."); return; }
    setAlertasError(null);
    setResolvingId(id);
    apiPut(token, `/api/admin/alertas/${encodeURIComponent(id)}/resolver`)
      .then((r) => {
        if (r.ok) return loadAlertas();
        return safeResJson(r, {}).then((d) => Promise.reject(new Error(d?.message || d?.error || `Erro ${r.status}`)));
      })
      .then(() => setResolvingId(null))
      .catch((e) => {
        setAlertasError(e?.message || "Erro ao marcar como resolvido.");
        setResolvingId(null);
      });
  };

  const createdLabel = (a) => a.created_at ? (typeof a.created_at==="string" ? a.created_at.slice(0,10) : "") : (a.created||"—");

  if (loading && alertas.length === 0) return <div style={{ padding:40, color:t.t3, textAlign:"center" }}>Carregando alertas...</div>;

  return (
    <div>
      <PageHeader title="Alertas" sub="Monitore riscos e pendências."/>
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:16 }}>
        <button type="button" onClick={() => { setLoading(true); setAlertasError(null); loadAlertas().catch((e) => setAlertasError(e?.message || "Erro ao carregar.")).finally(() => setLoading(false)); }} style={{ padding:"8px 14px", background:t.bg3, border:`1px solid ${t.b1}`, borderRadius:8, color:t.t2, fontSize:12, fontWeight:600, cursor:"pointer" }}>Atualizar lista</button>
        {alertasError && <span style={{ color:C.red, fontSize:12 }}>{alertasError}</span>}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginBottom:22 }}>
        {[
          { label:"Ativos", val: ativos.length, c:C.red, bg:C.redBg },
          { label:"Alta Prioridade", val: altaAtivos.length, c:C.orange, bg:C.orangeBg },
          { label:"Resolvidos", val: resolvidos.length, c:C.green, bg:C.greenBg },
        ].map((s,i) => (
          <Card key={i} style={{ padding:"18px 22px", display:"flex", alignItems:"center", gap:16 }}>
            <div style={{ width:44, height:44, borderRadius:12, background:s.bg, display:"flex", alignItems:"center", justifyContent:"center" }}>
              <span style={{ color:s.c, fontSize:20, fontWeight:800 }}>{s.val}</span>
            </div>
            <span style={{ color:t.t2, fontSize:13, fontWeight:600 }}>{s.label}</span>
          </Card>
        ))}
      </div>

      <div style={{ marginBottom:18 }}>
        <FilterBar opts={["Todos","Ativo","Resolvido"]} active={filter} onChange={setFilter} label="STATUS"/>
      </div>

      {alertasError && <div style={{ marginBottom:12, padding:10, background:C.redBg, borderRadius:8, color:C.red, fontSize:12 }}>{alertasError}</div>}

      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {items.length === 0 ? (
          <Card style={{ padding:32, textAlign:"center", color:t.t3, fontSize:13 }}>Nenhum alerta {filter !== "Todos" ? (filter === "Ativo" ? "ativo" : "resolvido") : ""} encontrado.</Card>
        ) : items.map(a => {
          const prioKey = (a.prioridade||a.priority||"média").toLowerCase();
          const prio = PRIO_C[prioKey] || PRIO_C["média"];
          const typeKey = (a.tipo||a.type||"").toLowerCase();
          const tc = TYPE_C[typeKey]||"#888";
          const id = getAlertaId(a);
          const status = (a.status || a.Status || "").toLowerCase() === "resolvido" ? "Resolvido" : "Ativo";
          const resolving = resolvingId === id;
          return (
            <Card key={id || JSON.stringify(a)} style={{ padding:"18px 22px", display:"flex", alignItems:"center", gap:16 }}>
              <div style={{ width:4, alignSelf:"stretch", borderRadius:2, background:prio.c, flexShrink:0 }}/>
              <div style={{ flex:1 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:5 }}>
                  <Tag label={a.tipo||a.type||"—"} color={tc} bg={`${tc}14`}/>
                  <Tag label={a.prioridade||a.priority||"—"} color={prio.c} bg={prio.bg}/>
                  <Tag label={a.target||a.Target||"Interno"} color={t.t2} bg={t.bg4}/>
                </div>
                <div style={{ color:t.t1, fontSize:13, fontWeight:600 }}>{a.titulo||a.title||a.Titulo||a.Title||"—"}</div>
                <div style={{ color:t.t4, fontSize:10, marginTop:3 }}>Criado em {createdLabel(a)}</div>
              </div>
              <StatusBadge s={status}/>
              <div style={{ display:"flex", gap:6 }}>
                {canWrite && status==="Ativo" && id && (
                  <Btn v="success" sz="sm" onClick={()=>resolver(id)} disabled={resolving}>{resolving ? "..." : "✓ Resolver"}</Btn>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   PAGE: NOTIFICAÇÕES
═══════════════════════════════════════════════════ */
function NotificacoesPage({ perms }) {
  const t = useT();
  const { token } = useAuth();
  const canWrite = perms?.canWriteAny !== false; // só admin envia
  const [tab, setTab] = useState("nova");
  const [form, setForm] = useState({ titulo:"", conteudo:"", target:"Todos os clientes", canal:"Email" });
  const [enviadas, setEnviadas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  useEffect(() => {
    if (!token || tab !== "historico") return;
    setLoading(true);
    apiGet(token, "/api/admin/notificacoes/enviadas?limit=50&offset=0")
      .then((r) => r.ok ? safeResJson(r, { items: [] }) : { items: [] })
      .then((data) => setEnviadas(Array.isArray(data?.items) ? data.items : []))
      .finally(() => setLoading(false));
  }, [token, tab]);

  const CH_COLOR = { "Email":C.blue,"email":C.blue,"Plataforma":C.purple,"plataforma":C.purple,"WhatsApp":C.green,"whatsapp":C.green };

  const handleEnviar = (e) => {
    e?.preventDefault?.();
    if (!token || !form.titulo) return;
    if (!canWrite) { setFormError("Você não tem permissão para enviar notificações."); return; }
    setFormError(null);
    setSubmitting(true);
    apiPost(token, "/api/admin/notificacoes/enviar", { titulo: form.titulo, conteudo: form.conteudo, target: form.target, canal: form.canal })
      .then(async (r) => {
        if (r.ok) {
          setForm({ titulo:"", conteudo:"", target:"Todos os clientes", canal:"Email" });
          setTab("historico");
          apiGet(token, "/api/admin/notificacoes/enviadas?limit=50&offset=0")
            .then((res) => res.ok ? safeResJson(res, { items: [] }) : { items: [] })
            .then((d) => setEnviadas(Array.isArray(d?.items) ? d.items : []));
          return;
        }
        const data = await r.json().catch(() => ({}));
        throw new Error(data?.message || data?.error || `Erro ${r.status}`);
      })
      .catch((e) => setFormError(e?.message || "Erro ao enviar"))
      .finally(() => setSubmitting(false));
  };

  return (
    <div>
      <PageHeader title="Notificações" sub="Envie comunicados aos clientes."/>

      <div style={{ display:"flex", gap:0, marginBottom:24, borderBottom:`1px solid ${t.b1}` }}>
        {[{ id:"nova",label:"Nova Notificação" },{ id:"historico",label:"Histórico" }].map(tb => (
          <button key={tb.id} onClick={()=>setTab(tb.id)} style={{ padding:"8px 20px", background:"transparent", border:"none",
            borderBottom:tab===tb.id?`2px solid ${t.accent}`:"2px solid transparent",
            color:tab===tb.id?t.t1:t.t3, fontSize:13, fontWeight:700, cursor:"pointer", marginBottom:-1, transition:"all .18s" }}>
            {tb.label}
          </button>
        ))}
      </div>

      {tab==="nova" && (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 360px", gap:14 }}>
          <Card style={{ padding:"28px" }}>
            <div style={{ color:t.t1, fontSize:14, fontWeight:700, marginBottom:22 }}>Compor Notificação</div>
            {formError && (
              <div style={{ marginBottom:16, padding:12, background:C.redBg, border:`1px solid ${C.red}40`, borderRadius:8, color:C.red, fontSize:12 }}>
                {formError}
              </div>
            )}
            <FormField label="Título">
              <Input value={form.titulo} onChange={v=>setForm({...form,titulo:v})} placeholder="Ex: Relatório de Março disponível"/>
            </FormField>
            <FormField label="Mensagem">
              <textarea value={form.conteudo} onChange={e=>setForm({...form,conteudo:e.target.value})} rows={5}
                placeholder="Mensagem que será enviada..."
                style={{ width:"100%", padding:"10px 14px", background:t.bg3, border:`1px solid ${t.b1}`, borderRadius:9, color:t.t1, fontSize:12, outline:"none", resize:"vertical", lineHeight:1.6 }}/>
            </FormField>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <FormField label="Destinatário">
                <Select value={form.target} onChange={v=>setForm({...form,target:v})} opts={["Todos os clientes","Planos Growth+","Planos Pro+","Cliente específico"]}/>
              </FormField>
              <FormField label="Canal">
                <Select value={form.canal} onChange={v=>setForm({...form,canal:v})} opts={["Email","Plataforma","WhatsApp"]}/>
              </FormField>
            </div>
            <div style={{ display:"flex", gap:8, justifyContent:"flex-end", marginTop:8 }}>
              {canWrite ? (
                <Btn type="button" onClick={handleEnviar} disabled={submitting || !form.titulo}>{submitting ? "Enviando…" : "📨 Enviar Notificação"}</Btn>
              ) : (
                <Tag label="Somente visualização" color={t.t2} bg={t.bg4}/>
              )}
            </div>
          </Card>
          <div>
            <Card style={{ padding:"22px", marginBottom:12 }}>
              <div style={{ color:t.t3, fontSize:9, fontWeight:800, letterSpacing:2, textTransform:"uppercase", marginBottom:14 }}>PRÉ-VISUALIZAÇÃO</div>
              <div style={{ background:t.bg3, borderRadius:10, border:`1px solid ${t.b1}`, padding:"18px" }}>
                <div style={{ color:t.t1, fontSize:13, fontWeight:700, marginBottom:8 }}>{form.titulo||"Título"}</div>
                <div style={{ color:t.t2, fontSize:12, lineHeight:1.6 }}>{form.conteudo||"Mensagem..."}</div>
                <div style={{ marginTop:12, paddingTop:12, borderTop:`1px solid ${t.b1}` }}>
                  <div style={{ color:t.t3, fontSize:10 }}>Para: <strong style={{ color:t.t2 }}>{form.target}</strong> · via {form.canal}</div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {tab==="historico" && (
        <div>
          {loading ? (
            <div style={{ padding:40, color:t.t3, textAlign:"center" }}>Carregando...</div>
          ) : (
            <Card style={{ overflow:"hidden" }}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 160px 110px 100px 80px", gap:12, padding:"9px 20px", background:t.bg3, borderBottom:`1px solid ${t.b1}` }}>
                {["Notificação","Destinatário","Canal","Data","Leituras"].map((h,i)=>(
                  <span key={i} style={{ color:t.t4, fontSize:9, fontWeight:800, letterSpacing:1.4, textTransform:"uppercase" }}>{h}</span>
                ))}
              </div>
              {enviadas.length === 0 ? (
                <div style={{ padding:24, color:t.t3, textAlign:"center" }}>Nenhuma notificação enviada ainda.</div>
              ) : (
                enviadas.map((n) => {
                  const ch = (n.canal||n.channel||"").toLowerCase();
                  const cc = CH_COLOR[n.canal||n.channel] || CH_COLOR[ch] || "#888";
                  return (
                    <div key={n.uuid||n.id} style={{ display:"grid", gridTemplateColumns:"1fr 160px 110px 100px 80px", gap:12, padding:"13px 20px", alignItems:"center", borderTop:`1px solid ${t.b1}` }}
                      onMouseEnter={e=>e.currentTarget.style.background=t.bg3}
                      onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                      <div style={{ color:t.t1, fontSize:12, fontWeight:600 }}>{n.titulo||n.title||"—"}</div>
                      <span style={{ color:t.t2, fontSize:12 }}>{n.target||"—"}</span>
                      <Tag label={n.canal||n.channel||"—"} color={cc} bg={`${cc}14`}/>
                      <span style={{ color:t.t3, fontSize:12 }}>{n.criado_em ? (typeof n.criado_em==="string" ? n.criado_em.slice(0,10) : "") : "—"}</span>
                      <span style={{ color:t.t1, fontSize:12, fontWeight:700 }}>{n.lidas ?? n.reads ?? "—"}</span>
                    </div>
                  );
                })
              )}
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   PAGE: RELATÓRIOS ADM
═══════════════════════════════════════════════════ */
function RelatoriosAdmPage() {
  const t = useT();
  const { token } = useAuth();
  const [relatorios, setRelatorios] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    apiGet(token, "/api/admin/relatorios?limit=50&offset=0")
      .then((r) => r.ok ? safeResJson(r, { items: [] }) : { items: [] })
      .then((data) => setRelatorios(Array.isArray(data?.items) ? data.items : []))
      .finally(() => setLoading(false));
  }, [token]);

  const typeColor = (tipo) => ({ "Receita":C.green,"Clientes":C.blue,"Comercial":C.amber,"Churn":C.red,"Equipe":C.purple,"Operacional":C.cyan }[tipo||""]||"#888");
  const dataLabel = (r) => r.data ? (typeof r.data==="string" ? r.data.slice(0,10) : "") : (r.created_at ? (typeof r.created_at==="string" ? r.created_at.slice(0,10) : "") : "—");

  return (
    <div>
      <PageHeader title="Relatórios" sub="Relatórios consolidados da United."/>

      {loading && relatorios.length === 0 ? (
        <div style={{ padding:40, color:t.t3, textAlign:"center" }}>Carregando relatórios...</div>
      ) : (
        <>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginBottom:22 }}>
            <KPICard label="Total" value={String(relatorios.length)} delta={null} sub="relatórios"/>
          </div>

          <Card style={{ padding:"22px" }}>
            <div style={{ color:t.t1, fontWeight:700, fontSize:13, marginBottom:18 }}>Relatórios</div>
            {relatorios.length === 0 ? (
              <div style={{ padding:24, color:t.t3, textAlign:"center" }}>Nenhum relatório disponível.</div>
            ) : (
              relatorios.map((r,i) => {
                const tc = typeColor(r.tipo||r.type);
                const url = r.file_url || r.url;
                return (
                  <div key={r.uuid||r.id||i} style={{ display:"flex", alignItems:"center", gap:14, padding:"11px 0", borderBottom:i<relatorios.length-1?`1px solid ${t.b2}`:"none" }}>
                    <Tag label={r.tipo||r.type||"Relatório"} color={tc} bg={`${tc}14`}/>
                    <div style={{ flex:1 }}>
                      <div style={{ color:t.t1, fontSize:12, fontWeight:600 }}>{r.titulo||r.title||"Sem título"}</div>
                      <div style={{ color:t.t3, fontSize:10, marginTop:2 }}>{r.periodo||r.period||dataLabel(r)}</div>
                    </div>
                    {url && <a href={url} target="_blank" rel="noopener noreferrer" style={{ color:t.accent, fontSize:12 }}>↓ PDF</a>}
                  </div>
                );
              })
            )}
          </Card>
        </>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   PAGE: DISPONIBILIZAR (conteúdo por cliente)
   Frontend pronto para os endpoints do BACKEND_PROMPT_DISPONIBILIZAR.md
═══════════════════════════════════════════════════ */
function DisponibilizarPage({ perms }) {
  const t = useT();
  const { token } = useAuth();
  const canWrite = perms?.canWriteDisponibilizar !== false; // gestor e admin podem editar aqui
  const [tab, setTab] = useState("relatorios");
  const [clientes, setClientes] = useState([]);
  const [relatorios, setRelatorios] = useState([]);
  const [reunioes, setReunioes] = useState([]);
  const [chamados, setChamados] = useState([]);
  const [pastas, setPastas] = useState([]);
  const [arquivos, setArquivos] = useState([]);
  const [selectedClienteMateriais, setSelectedClienteMateriais] = useState(null);
  const [pastaAtual, setPastaAtual] = useState(null);
  const [loadingMateriais, setLoadingMateriais] = useState(false);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  const [modalRelatorio, setModalRelatorio] = useState(false);
  const [formRelatorio, setFormRelatorio] = useState({ cliente_uuid: "", titulo: "", tipo: "Mensal", periodo: "", file_url: "" });
  const [modalReuniao, setModalReuniao] = useState(false);
  const [formReuniao, setFormReuniao] = useState({ cliente_uuid: "", titulo: "", data_hora: "", via: "Google Meet", duracao_min: "60" });
  const [modalChamado, setModalChamado] = useState(false);
  const [formChamado, setFormChamado] = useState({ cliente_uuid: "", titulo: "", descricao: "", categoria: "Suporte" });
  const [modalPasta, setModalPasta] = useState(false);
  const [formPasta, setFormPasta] = useState({ cliente_uuid: "", parent_uuid: "", nome: "", icone: "📁" });
  const [modalArquivo, setModalArquivo] = useState(false);
  const [formArquivo, setFormArquivo] = useState({ cliente_uuid: "", pasta_uuid: "", nome: "", url: "" });
  const [arquivosSelecionados, setArquivosSelecionados] = useState([]); // [{ nome, base64 }, ...]
  const MAX_FILE_SIZE_MB = 10;
  const MAX_FILE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
  const [submitError, setSubmitError] = useState(null);
  const [archiveError, setArchiveError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const loadAll = () => {
    if (!token) return;
    setErr(null);
    setLoading(true);
    Promise.all([
      apiGet(token, "/api/admin/clientes?limit=200&offset=0").then((r) => r.ok ? safeResJson(r, {}) : {}),
      apiGet(token, "/api/admin/relatorios?limit=100&offset=0").then((r) => r.ok ? safeResJson(r, {}) : {}),
      apiGet(token, "/api/admin/reunioes?limit=100&offset=0").then((r) => r.ok ? safeResJson(r, {}) : {}),
      apiGet(token, "/api/admin/chamados?limit=100&offset=0").then((r) => r.ok ? safeResJson(r, {}) : {}),
    ])
      .then(([clPage, relPage, reunPage, chamPage]) => {
        const clList = clPage?.items ?? clPage?.data ?? clPage?.clientes ?? [];
        setClientes(Array.isArray(clList) ? clList : []);
        setCanalByCliente((prev) => {
          const next = { ...prev };
          (Array.isArray(clList) ? clList : []).forEach((c) => {
            const id = c.uuid ?? c.id;
            if (id && (c.canal != null || c.Canal != null)) next[id] = c.canal ?? c.Canal ?? "Todos";
          });
          return next;
        });
        setChannelInfo((prev) => {
          const next = { ...prev };
          (Array.isArray(clList) ? clList : []).forEach((c) => {
            const id = c.uuid ?? c.id;
            if (!id) return;
            const pc = c.performance_channels ?? c.performanceChannels ?? {};
            if (pc && typeof pc === "object") next[id] = { meta_ads: pc.meta_ads ?? pc.metaAds ?? {}, google_ads: pc.google_ads ?? pc.googleAds ?? {}, organico: pc.organico ?? {}, outros: pc.outros ?? {} };
          });
          return next;
        });
        setRelatorios(Array.isArray(relPage?.items) ? relPage.items : []);
        setReunioes(Array.isArray(reunPage?.items) ? reunPage.items : []);
        setChamados(Array.isArray(chamPage?.items) ? chamPage.items : []);
      })
      .catch((e) => setErr(e?.message || "Erro ao carregar"))
      .finally(() => setLoading(false));
  };
  useEffect(loadAll, [token]);

  const loadMateriaisCliente = (clienteUuid) => {
    if (!token || !clienteUuid) return;
    setLoadingMateriais(true);
    Promise.all([
      apiGet(token, `/api/admin/materiais/pastas?cliente_uuid=${encodeURIComponent(clienteUuid)}&limit=100&offset=0`).then((r) => r.ok ? safeResJson(r, {}) : {}),
      apiGet(token, `/api/admin/materiais/arquivos?cliente_uuid=${encodeURIComponent(clienteUuid)}&limit=100&offset=0`).then((r) => r.ok ? safeResJson(r, {}) : {}),
    ])
      .then(([pRes, aRes]) => {
        setPastas(Array.isArray(pRes?.items) ? pRes.items : []);
        setArquivos(Array.isArray(aRes?.items) ? aRes.items : []);
      })
      .catch(() => { setPastas([]); setArquivos([]); })
      .finally(() => setLoadingMateriais(false));
  };
  useEffect(() => {
    if (tab === "materiais" && selectedClienteMateriais) loadMateriaisCliente(selectedClienteMateriais);
  }, [tab, selectedClienteMateriais, token]);

  const isArchived = (item) => item?.archived === true || item?.Archived === true;
  const itemId = (p) => p.uuid ?? p.id ?? p.UUID ?? p.Id ?? p._id;

  // PATCH com Authorization: Bearer <token>; URL sem trailing slash. Remove o item da lista na hora (otimista) e refaz GET em caso de erro.
  const doArquivar = (path, tipo, removeFromList) => {
    if (!token) return;
    setArchiveError(null);
    if (typeof removeFromList === "function") removeFromList();
    const url = `${API_URL}${path}`.replace(/\/+$/, "");
    return fetchWithTimeout(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ archived: true }),
    }).then(async (r) => {
      const body = await r.json().catch(() => ({}));
      if (r.ok) {
        loadMateriaisCliente(selectedClienteMateriais);
        return;
      }
      const msg = body?.error || body?.message || body?.error_message;
      if (typeof removeFromList === "function") loadMateriaisCliente(selectedClienteMateriais);
      if (r.status === 404 || (msg && String(msg).toLowerCase().includes("missing token"))) {
        setArchiveError("Servidor retornou 404 ou \"missing token\". Confirme no backend: (1) rotas PATCH /api/admin/materiais/pastas/:id e /arquivos/:id existem, (2) preflight OPTIONS não exige token (veja BACKEND_CORS.md).");
      } else {
        setArchiveError(msg || `Erro ${r.status} ao arquivar ${tipo}.`);
      }
    }).catch((e) => {
      if (typeof removeFromList === "function") loadMateriaisCliente(selectedClienteMateriais);
      setArchiveError(mensagemErroRede(e));
    });
  };
  const arquivarPasta = (uuid) => {
    if (!token || !uuid) return;
    doArquivar(`/api/admin/materiais/pastas/${String(uuid).trim()}`, "pasta", () => setPastas((prev) => prev.filter((p) => itemId(p) !== uuid)));
  };
  const arquivarArquivo = (uuid) => {
    if (!token || !uuid) return;
    doArquivar(`/api/admin/materiais/arquivos/${String(uuid).trim()}`, "arquivo", () => setArquivos((prev) => prev.filter((a) => itemId(a) !== uuid)));
  };
  const parentKey = (p) => p.parent_uuid ?? p.pasta_pai ?? p.parentUuid ?? "";
  const pastasNaTela = (pastaAtual === null
    ? pastas.filter((p) => !parentKey(p))
    : pastas.filter((p) => parentKey(p) === pastaAtual.uuid)
  ).filter((p) => !isArchived(p));
  const arquivosNaTela = (pastaAtual === null
    ? arquivos.filter((a) => !(a.pasta_uuid || a.pastaUuid))
    : arquivos.filter((a) => (a.pasta_uuid || a.pastaUuid) === pastaAtual.uuid)
  ).filter((a) => !isArchived(a));
  const clientOpts = [{ value: "", label: "— Selecione o cliente" }, ...clientes.map((c) => ({ value: c.uuid || c.id, label: (c.nome || c.name || c.email) || "—" }))];

  const submitRelatorio = (e) => {
    e?.preventDefault?.();
    if (!canWrite) { setSubmitError("Você não tem permissão para alterar Disponibilizar."); return; }
    if (!formRelatorio.cliente_uuid || !formRelatorio.titulo?.trim()) { setSubmitError("Selecione o cliente e informe o título."); return; }
    setSubmitError(null); setSubmitting(true);
    apiPost(token, "/api/admin/relatorios", { cliente_uuid: formRelatorio.cliente_uuid, titulo: formRelatorio.titulo.trim(), tipo: formRelatorio.tipo, periodo: formRelatorio.periodo || undefined, file_url: formRelatorio.file_url || undefined })
      .then((r) => { if (r.ok) { setModalRelatorio(false); setFormRelatorio({ cliente_uuid: "", titulo: "", tipo: "Mensal", periodo: "", file_url: "" }); loadAll(); } else return safeResJson(r, {}).then((d) => Promise.reject(new Error(d?.message || d?.error))); })
      .catch((e) => setSubmitError(e?.message))
      .finally(() => setSubmitting(false));
  };
  const submitReuniao = (e) => {
    e?.preventDefault?.();
    if (!canWrite) { setSubmitError("Você não tem permissão para alterar Disponibilizar."); return; }
    if (!formReuniao.cliente_uuid || !formReuniao.titulo?.trim()) { setSubmitError("Selecione o cliente e informe o título."); return; }
    setSubmitError(null); setSubmitting(true);
    apiPost(token, "/api/admin/reunioes", { cliente_uuid: formReuniao.cliente_uuid, titulo: formReuniao.titulo.trim(), data_hora: formReuniao.data_hora || undefined, via: formReuniao.via, duracao_min: parseInt(formReuniao.duracao_min, 10) || 60 })
      .then((r) => { if (r.ok) { setModalReuniao(false); setFormReuniao({ cliente_uuid: "", titulo: "", data_hora: "", via: "Google Meet", duracao_min: "60" }); loadAll(); } else return safeResJson(r, {}).then((d) => Promise.reject(new Error(d?.message || d?.error))); })
      .catch((e) => setSubmitError(e?.message))
      .finally(() => setSubmitting(false));
  };
  const submitChamado = (e) => {
    e?.preventDefault?.();
    if (!canWrite) { setSubmitError("Você não tem permissão para alterar Disponibilizar."); return; }
    if (!formChamado.cliente_uuid || !formChamado.titulo?.trim()) { setSubmitError("Selecione o cliente e informe o título."); return; }
    setSubmitError(null); setSubmitting(true);
    apiPost(token, "/api/admin/chamados", { cliente_uuid: formChamado.cliente_uuid, titulo: formChamado.titulo.trim(), descricao: formChamado.descricao || undefined, categoria: formChamado.categoria })
      .then((r) => { if (r.ok) { setModalChamado(false); setFormChamado({ cliente_uuid: "", titulo: "", descricao: "", categoria: "Suporte" }); loadAll(); } else return safeResJson(r, {}).then((d) => Promise.reject(new Error(d?.message || d?.error))); })
      .catch((e) => setSubmitError(e?.message))
      .finally(() => setSubmitting(false));
  };
  const submitPasta = (e) => {
    e?.preventDefault?.();
    if (!canWrite) { setSubmitError("Você não tem permissão para alterar Disponibilizar."); return; }
    if (!formPasta.cliente_uuid || !formPasta.nome?.trim()) { setSubmitError("Selecione o cliente e informe o nome da pasta."); return; }
    setSubmitError(null); setSubmitting(true);
    const cuid = formPasta.cliente_uuid;
    const parentUuid = formPasta.parent_uuid || undefined;
    apiPost(token, "/api/admin/materiais/pastas", { cliente_uuid: cuid, parent_uuid: parentUuid, nome: formPasta.nome.trim(), icone: formPasta.icone || "📁" })
      .then((r) => { if (r.ok) { setModalPasta(false); setFormPasta({ cliente_uuid: selectedClienteMateriais || "", parent_uuid: pastaAtual?.uuid || "", nome: "", icone: "📁" }); loadAll(); if (selectedClienteMateriais === cuid) loadMateriaisCliente(cuid); } else return safeResJson(r, {}).then((d) => Promise.reject(new Error(d?.message || d?.error))); })
      .catch((e) => setSubmitError(e?.message))
      .finally(() => setSubmitting(false));
  };
  const readFileAsBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      const base64 = typeof dataUrl === "string" && dataUrl.startsWith("data:") ? dataUrl.replace(/^data:[^;]+;base64,/, "") : dataUrl;
      resolve({ nome: file.name, base64 });
    };
    reader.onerror = () => reject(new Error("Erro ao ler o arquivo."));
    reader.readAsDataURL(file);
  });

  const handleFileSelect = async (e) => {
    const files = e.target.files;
    if (!files?.length) return;
    const list = Array.from(files);
    const oversized = list.filter((f) => f.size > MAX_FILE_BYTES);
    if (oversized.length > 0) {
      setSubmitError(`Arquivo(s) muito grande(s). Máximo ${MAX_FILE_SIZE_MB} MB por arquivo.`);
      e.target.value = "";
      return;
    }
    setSubmitError(null);
    try {
      const novos = await Promise.all(list.map(readFileAsBase64));
      setArquivosSelecionados((prev) => [...prev, ...novos]);
      if (!formArquivo.nome?.trim() && novos.length === 1) setFormArquivo((f) => ({ ...f, nome: novos[0].nome }));
    } catch (err) {
      setSubmitError(err?.message || "Erro ao ler os arquivos.");
    }
    e.target.value = "";
  };

  const submitArquivo = async (e) => {
    e?.preventDefault?.();
    if (!formArquivo.cliente_uuid) { setSubmitError("Selecione o cliente."); return; }
    const temArquivos = arquivosSelecionados.length > 0;
    const temUrl = !!formArquivo.url?.trim();
    if (!temArquivos && !temUrl) { setSubmitError("Selecione um ou mais arquivos ou informe a URL."); return; }
    setSubmitError(null);
    setSubmitting(true);
    const cuid = formArquivo.cliente_uuid;
    const pastaUuid = formArquivo.pasta_uuid || undefined;
    try {
      if (temArquivos) {
        const resultados = await Promise.all(arquivosSelecionados.map((item) => {
          const extensao = (item.nome.split(".").pop() || "").toLowerCase().slice(0, 20) || undefined;
          return apiPost(token, "/api/admin/materiais/arquivos", {
            cliente_uuid: cuid,
            pasta_uuid: pastaUuid,
            nome: item.nome,
            extensao,
            base64: item.base64,
          }).then((r) => (r.ok ? Promise.resolve() : safeResJson(r, {}).then((d) => Promise.reject(new Error(d?.message || d?.error)))));
        }));
      } else {
        const nome = formArquivo.nome?.trim() || "arquivo";
        const extensao = (nome.split(".").pop() || "").toLowerCase().slice(0, 20) || undefined;
        const r = await apiPost(token, "/api/admin/materiais/arquivos", {
          cliente_uuid: cuid,
          pasta_uuid: pastaUuid,
          nome,
          extensao,
          url: formArquivo.url.trim(),
        });
        const data = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(data?.message || data?.error || `Erro ${r.status}`);
      }
      setModalArquivo(false);
      setFormArquivo({ cliente_uuid: selectedClienteMateriais || "", pasta_uuid: "", nome: "", url: "" });
      setArquivosSelecionados([]);
      loadAll();
      if (selectedClienteMateriais === cuid) loadMateriaisCliente(cuid);
    } catch (err) {
      setSubmitError(err?.message || "Erro ao enviar.");
    } finally {
      setSubmitting(false);
    }
  };

  const CANAL_OPTS = ["Todos", "Meta Ads", "Google Ads", "Orgânico", "Outros"];
  const CANAL_KEYS = ["meta_ads", "google_ads", "organico", "outros"];
  const CANAL_LABELS = { meta_ads: "Meta Ads", google_ads: "Google Ads", organico: "Orgânico", outros: "Outros" };
  const [canalByCliente, setCanalByCliente] = useState({}); // uuid -> canal
  const [savingCanalId, setSavingCanalId] = useState(null);
  const [canalError, setCanalError] = useState(null);
  const [selectedClienteCanais, setSelectedClienteCanais] = useState(""); // uuid do cliente para preencher infos
  const [channelInfo, setChannelInfo] = useState({}); // { [clienteId]: { meta_ads: { account_id, account_name, gasto, leads, conversoes }, ... } }
  const [savingChannelInfo, setSavingChannelInfo] = useState(false);
  const [channelInfoError, setChannelInfoError] = useState(null);
  const [channelInfoSuccess, setChannelInfoSuccess] = useState(false);

  const getChannelInfoFor = (clienteId) => channelInfo[clienteId] || { meta_ads: {}, google_ads: {}, organico: {}, outros: {} };
  const setChannelInfoFor = (clienteId, key, field, value) => {
    setChannelInfo((prev) => {
      const cur = prev[clienteId] || { meta_ads: {}, google_ads: {}, organico: {}, outros: {} };
      const ch = { ...(cur[key] || {}) };
      ch[field] = value;
      return { ...prev, [clienteId]: { ...cur, [key]: ch } };
    });
    setChannelInfoSuccess(false);
  };
  const saveChannelInfo = () => {
    if (!token || !selectedClienteCanais) return;
    if (!canWrite) { setChannelInfoError("Você não tem permissão para alterar Disponibilizar."); return; }
    setChannelInfoError(null);
    setChannelInfoSuccess(false);
    setSavingChannelInfo(true);
    const payload = { performance_channels: getChannelInfoFor(selectedClienteCanais) };
    apiPut(token, `/api/admin/clientes/${encodeURIComponent(selectedClienteCanais)}`, payload)
      .then((r) => {
        if (r.ok) return;
        return safeResJson(r, {}).then((d) => Promise.reject(new Error(d?.message || d?.error || d?.detail || `Erro ${r.status}`)));
      })
      .then(() => {
        setChannelInfoError(null);
        setChannelInfoSuccess(true);
        setTimeout(() => setChannelInfoSuccess(false), 4000);
      })
      .catch((e) => setChannelInfoError(mensagemErroRede(e) || "Erro ao salvar."))
      .finally(() => setSavingChannelInfo(false));
  };

  const getClienteCanal = (c) => canalByCliente[c.uuid || c.id] ?? c.canal ?? c.Canal ?? "Todos";
  const handleCanalChange = (clienteId, canal) => {
    if (!token || !clienteId) return;
    if (!canWrite) { setCanalError("Você não tem permissão para alterar Disponibilizar."); return; }
    setCanalError(null);
    setSavingCanalId(clienteId);
    apiPut(token, `/api/admin/clientes/${encodeURIComponent(clienteId)}`, { canal })
      .then((r) => {
        if (r.ok) { setCanalByCliente((prev) => ({ ...prev, [clienteId]: canal })); return; }
        return safeResJson(r, {}).then((d) => Promise.reject(new Error(d?.message || d?.error || `Erro ${r.status}`)));
      })
      .catch((e) => setCanalError(mensagemErroRede(e) || "Erro ao salvar canal."))
      .finally(() => setSavingCanalId(null));
  };

  const TABS = [
    { id: "relatorios", label: "Relatórios", count: relatorios.length },
    { id: "materiais", label: "Materiais", count: selectedClienteMateriais ? pastas.length + arquivos.length : clientes.length },
    { id: "reunioes", label: "Reuniões", count: reunioes.length },
    { id: "chamados", label: "Chamados", count: chamados.length },
    { id: "performance", label: "Performance", count: clientes.length },
  ];
  const getClienteNome = (uuid) => (clientes.find((c) => (c.uuid || c.id) === uuid) || {}).nome || (clientes.find((c) => (c.uuid || c.id) === uuid) || {}).name || uuid || "—";

  return (
    <div>
      <PageHeader title="Disponibilizar" sub="Vincule relatórios, materiais, reuniões e chamados a cada cliente. O cliente verá apenas o que for dele."/>
      {err && <div style={{ padding:12, marginBottom:16, background:C.redBg, borderRadius:8, color:C.red, fontSize:12 }}>{err}</div>}
      <div style={{ display:"flex", gap:0, marginBottom:24, borderBottom:`1px solid ${t.b1}` }}>
        {TABS.map((tb) => (
          <button key={tb.id} onClick={()=>setTab(tb.id)} style={{ padding:"10px 20px", borderBottom: tab===tb.id ? `2px solid ${t.accent}` : "2px solid transparent", color: tab===tb.id ? t.t1 : t.t3, fontSize:13, fontWeight:700, background:"transparent", cursor:"pointer", marginBottom:-1 }}>
            {tb.label} {tb.count > 0 && <span style={{ marginLeft:6, opacity:0.8 }}>({tb.count})</span>}
          </button>
        ))}
      </div>

      {loading && clientes.length === 0 ? (
        <div style={{ padding:40, color:t.t3, textAlign:"center" }}>Carregando...</div>
      ) : (
        <>
          {tab === "relatorios" && (
            <Card style={{ overflow:"hidden" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
                <div style={{ color:t.t1, fontWeight:700, fontSize:13 }}>Relatórios por cliente</div>
                {canWrite ? <Btn type="button" onClick={()=>{ setModalRelatorio(true); setSubmitError(null); }}>+ Novo relatório</Btn> : <Tag label="Somente visualização" color={t.t2} bg={t.bg4}/>}
              </div>
              {relatorios.length === 0 ? <div style={{ padding:24, color:t.t3, textAlign:"center" }}>Nenhum relatório. Use &quot;Novo relatório&quot; (requer backend POST /api/admin/relatorios).</div> : (
                <div style={{ display:"grid", gridTemplateColumns:"1fr 100px 120px 80px", gap:12, padding:"10px 16px", background:t.bg3, borderBottom:`1px solid ${t.b1}` }}>
                  <span style={{ color:t.t4, fontSize:9, fontWeight:800, textTransform:"uppercase" }}>Título / Cliente</span><span style={{ color:t.t4, fontSize:9, fontWeight:800, textTransform:"uppercase" }}>Tipo</span><span style={{ color:t.t4, fontSize:9, fontWeight:800, textTransform:"uppercase" }}>Período</span><span/>
                </div>
              )}
              {relatorios.map((r) => (
                <div key={r.uuid||r.id} style={{ display:"grid", gridTemplateColumns:"1fr 100px 120px 80px", gap:12, padding:"12px 16px", borderTop:`1px solid ${t.b1}` }}>
                  <div><div style={{ color:t.t1, fontSize:12, fontWeight:600 }}>{r.titulo||r.title||"—"}</div><div style={{ color:t.t3, fontSize:10 }}>{getClienteNome(r.cliente_uuid)}</div></div>
                  <span style={{ color:t.t2, fontSize:12 }}>{r.tipo||r.type||"—"}</span>
                  <span style={{ color:t.t2, fontSize:12 }}>{r.periodo||r.period||"—"}</span>
                  {r.file_url || r.url ? <a href={r.file_url||r.url} target="_blank" rel="noopener noreferrer" style={{ color:t.accent, fontSize:11 }}>Abrir</a> : <span/>}
                </div>
              ))}
            </Card>
          )}

          {tab === "materiais" && (
            <div style={{ display:"flex", gap:0, minHeight:420, borderRadius:12, overflow:"hidden", border:`1px solid ${t.b1}`, background:t.bg2 }}>
              {/* Sidebar: lista de clientes (estilo Drive) */}
              <div style={{ width:260, flexShrink:0, borderRight:`1px solid ${t.b1}`, background:t.bg3, padding:"12px 0" }}>
                <div style={{ padding:"8px 16px", fontSize:11, fontWeight:700, color:t.t4, textTransform:"uppercase", letterSpacing:0.5 }}>Clientes</div>
                {clientes.length === 0 ? (
                  <div style={{ padding:16, color:t.t3, fontSize:12 }}>Nenhum cliente cadastrado.</div>
                ) : (
                  clientes.map((c) => {
                    const id = c.uuid || c.id;
                    const nome = (c.nome || c.name || c.email) || "Sem nome";
                    const inicial = (nome.charAt(0) || "?").toUpperCase();
                    const ativo = selectedClienteMateriais === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => { setSelectedClienteMateriais(id); setPastaAtual(null); }}
                        style={{
                          display:"flex", alignItems:"center", gap:12, width:"100%", padding:"10px 16px", border:"none", background: ativo ? t.bg2 : "transparent", cursor:"pointer", textAlign:"left",
                          borderLeft: ativo ? `3px solid ${t.accent}` : "3px solid transparent",
                        }}
                      >
                        <div style={{ width:36, height:36, borderRadius:8, background: ativo ? t.accent : t.b1, color: ativo ? "#fff" : t.t3, fontSize:14, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center" }}>{inicial}</div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ color:t.t1, fontSize:13, fontWeight:600, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{nome}</div>
                          <div style={{ color:t.t4, fontSize:10 }}>Arquivos do cliente</div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
              {/* Área principal: pastas e arquivos do cliente selecionado */}
              <div style={{ flex:1, display:"flex", flexDirection:"column", minWidth:0 }}>
                {!selectedClienteMateriais ? (
                  <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", color:t.t3, fontSize:14 }}>Selecione um cliente à esquerda para ver e gerenciar os materiais.</div>
                ) : (
                  <>
                    <div style={{ padding:"12px 20px", borderBottom:`1px solid ${t.b1}`, display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:8 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
                        <button type="button" onClick={() => pastaAtual ? setPastaAtual(null) : setSelectedClienteMateriais(null)} style={{ color:t.t3, background:"none", border:"none", cursor:"pointer", fontSize:14 }} title={pastaAtual ? "Voltar à pasta anterior" : "Voltar aos clientes"}>←</button>
                        <button type="button" onClick={() => { setPastaAtual(null); }} style={{ color:t.t4, background:"none", border:"none", cursor:"pointer", fontSize:12, textDecoration:"underline" }}>Meu Drive</button>
                        <span style={{ color:t.t3 }}>/</span>
                        <button type="button" onClick={() => setPastaAtual(null)} style={{ color:t.t1, fontWeight:600, fontSize:13, background:"none", border:"none", cursor:"pointer", textDecoration:"underline" }}>{getClienteNome(selectedClienteMateriais)}</button>
                        {pastaAtual && (
                          <>
                            <span style={{ color:t.t3 }}>/</span>
                            <span style={{ color:t.t1, fontSize:13 }}>{pastaAtual.nome}</span>
                          </>
                        )}
                      </div>
                      <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                        {canWrite ? (
                          <>
                            <Btn type="button" onClick={() => { setFormPasta({ cliente_uuid: selectedClienteMateriais, parent_uuid: pastaAtual?.uuid || "", nome: "", icone: "📁" }); setModalPasta(true); setSubmitError(null); setArchiveError(null); }}>📁 Nova pasta</Btn>
                            <Btn type="button" v="primary" onClick={() => { setFormArquivo({ cliente_uuid: selectedClienteMateriais, pasta_uuid: pastaAtual?.uuid || "", nome: "", url: "" }); setArquivosSelecionados([]); setModalArquivo(true); setSubmitError(null); setArchiveError(null); }}>⬆ Fazer upload</Btn>
                          </>
                        ) : (
                          <Tag label="Somente visualização" color={t.t2} bg={t.bg4}/>
                        )}
                      </div>
                    </div>
                    {archiveError && (
                      <div style={{ margin:12, marginBottom:0, padding:12, background:C.redBg, borderLeft:`4px solid ${C.red}`, borderRadius:8, color:C.red, fontSize:12 }}>
                        {archiveError}
                        <button type="button" onClick={() => setArchiveError(null)} style={{ marginLeft:8, background:"none", border:"none", color:C.red, cursor:"pointer", textDecoration:"underline" }}>Fechar</button>
                      </div>
                    )}
                    {loadingMateriais ? (
                      <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", color:t.t3 }}>Carregando…</div>
                    ) : (
                      <div style={{ flex:1, overflow:"auto", padding:20 }}>
                        {pastasNaTela.length === 0 && arquivosNaTela.length === 0 ? (
                          <div style={{ textAlign:"center", padding:48, color:t.t3, fontSize:13 }}>Nenhuma pasta nem arquivo aqui. Crie uma pasta ou faça upload de um arquivo.</div>
                        ) : (
                          <>
                            {pastasNaTela.length > 0 && (
                              <>
                                <div style={{ fontSize:11, fontWeight:700, color:t.t4, textTransform:"uppercase", marginBottom:10 }}>Pastas</div>
                                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(120px, 1fr))", gap:12, marginBottom:24 }}>
                                  {pastasNaTela.map((p) => {
                                    const pid = p.uuid ?? p.id ?? p.UUID ?? p.Id ?? p._id;
                                    return (
                                      <div key={pid} style={{ position:"relative", display:"flex", flexDirection:"column", alignItems:"center" }}>
                                        <button
                                          type="button"
                                          onClick={() => setPastaAtual({ uuid: pid, nome: p.nome || "Pasta" })}
                                          style={{ display:"flex", flexDirection:"column", alignItems:"center", padding:16, width:"100%", background:t.bg3, borderRadius:10, border:`1px solid ${t.b1}`, cursor:"pointer", transition:"background .15s" }}
                                          onMouseEnter={(e) => { e.currentTarget.style.background = t.bg4; e.currentTarget.style.borderColor = t.accent; }}
                                          onMouseLeave={(e) => { e.currentTarget.style.background = t.bg3; e.currentTarget.style.borderColor = t.b1; }}
                                        >
                                          <div style={{ fontSize:32, marginBottom:6 }}>{p.icone || "📁"}</div>
                                          <div style={{ color:t.t1, fontSize:12, fontWeight:600, textAlign:"center", overflow:"hidden", textOverflow:"ellipsis", width:"100%" }}>{p.nome || "—"}</div>
                                          <div style={{ color:t.t4, fontSize:10, marginTop:2 }}>Abrir</div>
                                        </button>
                                        <button type="button" onClick={(e) => { e.stopPropagation(); arquivarPasta(pid); }} style={{ marginTop:6, background:"none", border:"none", color:t.t4, fontSize:10, cursor:"pointer", textDecoration:"underline" }} title="Arquivar pasta">Arquivar</button>
                                      </div>
                                    );
                                  })}
                                </div>
                              </>
                            )}
                            {arquivosNaTela.length > 0 && (
                              <>
                                <div style={{ fontSize:11, fontWeight:700, color:t.t4, textTransform:"uppercase", marginBottom:10 }}>Arquivos</div>
                                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(120px, 1fr))", gap:12 }}>
                                  {arquivosNaTela.map((a) => {
                                    const aid = a.uuid ?? a.id ?? a.UUID ?? a.Id ?? a._id;
                                    const ext = (a.extensao || (a.nome || "").split(".").pop() || "").toLowerCase();
                                    const icone = { pdf: "📄", doc: "📄", docx: "📄", xls: "📊", xlsx: "📊", ppt: "📽", pptx: "📽", img: "🖼", jpg: "🖼", png: "🖼", zip: "📦" }[ext] || "📄";
                                    return (
                                      <div key={aid} style={{ display:"flex", flexDirection:"column", alignItems:"center" }}>
                                        <a href={a.url || a.file_url} target="_blank" rel="noopener noreferrer" style={{ display:"flex", flexDirection:"column", alignItems:"center", padding:16, background:t.bg3, borderRadius:10, border:`1px solid ${t.b1}`, textDecoration:"none", color:"inherit" }}>
                                          <div style={{ fontSize:32, marginBottom:6 }}>{icone}</div>
                                          <div style={{ color:t.t1, fontSize:12, fontWeight:600, textAlign:"center", overflow:"hidden", textOverflow:"ellipsis", width:"100%" }}>{a.nome || "—"}</div>
                                        </a>
                                        <button type="button" onClick={() => arquivarArquivo(aid)} style={{ marginTop:6, background:"none", border:"none", color:t.t4, fontSize:10, cursor:"pointer", textDecoration:"underline" }} title="Arquivar arquivo">Arquivar</button>
                                      </div>
                                    );
                                  })}
                                </div>
                              </>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {tab === "reunioes" && (
            <Card style={{ overflow:"hidden" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
                <div style={{ color:t.t1, fontWeight:700, fontSize:13 }}>Reuniões por cliente</div>
                {canWrite ? <Btn type="button" onClick={()=>{ setModalReuniao(true); setSubmitError(null); }}>+ Nova reunião</Btn> : <Tag label="Somente visualização" color={t.t2} bg={t.bg4}/>}
              </div>
              {reunioes.length === 0 ? <div style={{ padding:24, color:t.t3, textAlign:"center" }}>Nenhuma reunião. Use &quot;Nova reunião&quot; (requer backend POST /api/admin/reunioes).</div> : (
                <div style={{ display:"grid", gridTemplateColumns:"1fr 140px 100px", gap:12, padding:"10px 16px", background:t.bg3, borderBottom:`1px solid ${t.b1}` }}>
                  <span style={{ color:t.t4, fontSize:9, fontWeight:800, textTransform:"uppercase" }}>Título / Cliente</span><span style={{ color:t.t4, fontSize:9, fontWeight:800, textTransform:"uppercase" }}>Data/Hora</span><span style={{ color:t.t4, fontSize:9, fontWeight:800, textTransform:"uppercase" }}>Via</span>
                </div>
              )}
              {reunioes.map((ru) => (
                <div key={ru.uuid||ru.id} style={{ display:"grid", gridTemplateColumns:"1fr 140px 100px", gap:12, padding:"12px 16px", borderTop:`1px solid ${t.b1}` }}>
                  <div><div style={{ color:t.t1, fontSize:12, fontWeight:600 }}>{ru.titulo||ru.title||"—"}</div><div style={{ color:t.t3, fontSize:10 }}>{getClienteNome(ru.cliente_uuid)}</div></div>
                  <span style={{ color:t.t2, fontSize:12 }}>{ru.data_hora ? (typeof ru.data_hora==="string" ? ru.data_hora.slice(0,16) : "") : "—"}</span>
                  <span style={{ color:t.t2, fontSize:12 }}>{ru.via||"—"}</span>
                </div>
              ))}
            </Card>
          )}

          {tab === "chamados" && (
            <Card style={{ overflow:"hidden" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
                <div style={{ color:t.t1, fontWeight:700, fontSize:13 }}>Chamados por cliente</div>
                {canWrite ? <Btn type="button" onClick={()=>{ setModalChamado(true); setSubmitError(null); }}>+ Novo chamado</Btn> : <Tag label="Somente visualização" color={t.t2} bg={t.bg4}/>}
              </div>
              {chamados.length === 0 ? <div style={{ padding:24, color:t.t3, textAlign:"center" }}>Nenhum chamado. Use &quot;Novo chamado&quot; (requer backend POST /api/admin/chamados e GET /api/admin/chamados).</div> : (
                <div style={{ display:"grid", gridTemplateColumns:"1fr 90px 100px", gap:12, padding:"10px 16px", background:t.bg3, borderBottom:`1px solid ${t.b1}` }}>
                  <span style={{ color:t.t4, fontSize:9, fontWeight:800, textTransform:"uppercase" }}>Título / Cliente</span><span style={{ color:t.t4, fontSize:9, fontWeight:800, textTransform:"uppercase" }}>Categoria</span><span style={{ color:t.t4, fontSize:9, fontWeight:800, textTransform:"uppercase" }}>Status</span>
                </div>
              )}
              {chamados.map((ch) => (
                <div key={ch.uuid||ch.id} style={{ display:"grid", gridTemplateColumns:"1fr 90px 100px", gap:12, padding:"12px 16px", borderTop:`1px solid ${t.b1}` }}>
                  <div><div style={{ color:t.t1, fontSize:12, fontWeight:600 }}>{ch.titulo||ch.title||"—"}</div><div style={{ color:t.t3, fontSize:10 }}>{getClienteNome(ch.cliente_uuid)}</div></div>
                  <span style={{ color:t.t2, fontSize:12 }}>{ch.categoria||"—"}</span>
                  <StatusBadge s={ch.status||"aberto"} />
                </div>
              ))}
            </Card>
          )}

          {tab === "performance" && (
            <>
            <Card style={{ overflow:"hidden" }}>
              <div style={{ marginBottom:16 }}>
                <div style={{ color:t.t1, fontWeight:700, fontSize:13, marginBottom:4 }}>Canal (Performance)</div>
                <div style={{ color:t.t4, fontSize:11 }}>Defina o canal de performance por cliente. Essa configuração preenche a aba Performance do cliente.</div>
              </div>
              {canalError && <div style={{ marginBottom:12, padding:10, background:C.redBg, borderRadius:8, color:C.red, fontSize:12 }}>{canalError}</div>}
              {clientes.length === 0 ? (
                <div style={{ padding:24, color:t.t3, textAlign:"center" }}>Nenhum cliente cadastrado.</div>
              ) : (
                <div style={{ display:"grid", gridTemplateColumns:"1fr 180px 80px", gap:12, padding:"10px 16px", background:t.bg3, borderBottom:`1px solid ${t.b1}` }}>
                  <span style={{ color:t.t4, fontSize:9, fontWeight:800, textTransform:"uppercase" }}>Cliente</span>
                  <span style={{ color:t.t4, fontSize:9, fontWeight:800, textTransform:"uppercase" }}>Canal</span>
                  <span/>
                </div>
              )}
              {clientes.map((c) => {
                const id = c.uuid || c.id;
                const nome = (c.nome || c.name || c.email) || "—";
                const canalAtual = getClienteCanal(c);
                const saving = savingCanalId === id;
                return (
                  <div key={id} style={{ display:"grid", gridTemplateColumns:"1fr 180px 80px", gap:12, padding:"12px 16px", borderTop:`1px solid ${t.b1}`, alignItems:"center" }}>
                    <div style={{ color:t.t1, fontSize:12, fontWeight:600 }}>{nome}</div>
                    <select value={canalAtual} onChange={(e) => handleCanalChange(id, e.target.value)} disabled={saving} style={{ padding:"8px 12px", background:t.bg2, border:`1px solid ${t.b1}`, borderRadius:8, color:t.t1, fontSize:12, cursor:saving?"wait":"pointer" }}>
                      {CANAL_OPTS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                    <span style={{ color:t.t4, fontSize:10 }}>{saving ? "Salvando…" : ""}</span>
                  </div>
                );
              })}
            </Card>

            <Card style={{ marginTop:24, overflow:"hidden" }}>
              <div style={{ marginBottom:16 }}>
                <div style={{ color:t.t1, fontWeight:700, fontSize:13, marginBottom:4 }}>Preencher informações por canal</div>
                <div style={{ color:t.t4, fontSize:11 }}>Informe dados de Meta Ads, Google Ads, Orgânico e Outros para o cliente. Essas informações alimentam a aba Performance do cliente.</div>
              </div>
              {channelInfoError && <div style={{ marginBottom:12, padding:10, background:C.redBg, borderRadius:8, color:C.red, fontSize:12 }}>{channelInfoError}</div>}
              {channelInfoSuccess && <div style={{ marginBottom:12, padding:10, background:C.greenBg, borderRadius:8, color:C.green, fontSize:12 }}>Informações salvas com sucesso.</div>}
              <FormField label="Cliente">
                <select value={selectedClienteCanais} onChange={(e) => setSelectedClienteCanais(e.target.value)} style={{ width:"100%", maxWidth:320, padding:"10px 14px", background:t.bg3, border:`1px solid ${t.b1}`, borderRadius:8, color:t.t1, fontSize:13 }}>
                  <option value="">— Selecione o cliente</option>
                  {clientes.map((c) => { const id = c.uuid || c.id; return <option key={id} value={id}>{(c.nome || c.name || c.email) || id}</option>; })}
                </select>
              </FormField>
              {selectedClienteCanais && (
                <>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(260px, 1fr))", gap:16, marginTop:20 }}>
                    {CANAL_KEYS.map((key) => {
                      const info = getChannelInfoFor(selectedClienteCanais)[key] || {};
                      const label = CANAL_LABELS[key];
                      const hasAccount = key === "meta_ads" || key === "google_ads";
                      return (
                        <div key={key} style={{ padding:16, background:t.bg3, borderRadius:12, border:`1px solid ${t.b1}` }}>
                          <div style={{ color:t.t1, fontWeight:700, fontSize:12, marginBottom:12 }}>{label}</div>
                          {hasAccount && (
                            <>
                              <div style={{ marginBottom:10 }}>
                                <label style={{ display:"block", color:t.t4, fontSize:10, marginBottom:4 }}>ID da conta</label>
                                <input value={info.account_id || ""} onChange={(e) => setChannelInfoFor(selectedClienteCanais, key, "account_id", e.target.value)} placeholder="Ex: 123456789" style={{ width:"100%", padding:"8px 10px", background:t.bg2, border:`1px solid ${t.b1}`, borderRadius:6, color:t.t1, fontSize:12 }} />
                              </div>
                              <div style={{ marginBottom:10 }}>
                                <label style={{ display:"block", color:t.t4, fontSize:10, marginBottom:4 }}>Nome da conta</label>
                                <input value={info.account_name || ""} onChange={(e) => setChannelInfoFor(selectedClienteCanais, key, "account_name", e.target.value)} placeholder="Ex: Conta Principal" style={{ width:"100%", padding:"8px 10px", background:t.bg2, border:`1px solid ${t.b1}`, borderRadius:6, color:t.t1, fontSize:12 }} />
                              </div>
                            </>
                          )}
                          <div style={{ marginBottom:10 }}>
                            <label style={{ display:"block", color:t.t4, fontSize:10, marginBottom:4 }}>Gasto (R$)</label>
                            <input type="text" value={info.gasto != null && info.gasto !== "" ? info.gasto : ""} onChange={(e) => setChannelInfoFor(selectedClienteCanais, key, "gasto", e.target.value)} placeholder="0,00" style={{ width:"100%", padding:"8px 10px", background:t.bg2, border:`1px solid ${t.b1}`, borderRadius:6, color:t.t1, fontSize:12 }} />
                          </div>
                          <div style={{ marginBottom:10 }}>
                            <label style={{ display:"block", color:t.t4, fontSize:10, marginBottom:4 }}>Leads</label>
                            <input type="number" value={info.leads != null && info.leads !== "" ? info.leads : ""} onChange={(e) => setChannelInfoFor(selectedClienteCanais, key, "leads", e.target.value)} placeholder="0" min={0} style={{ width:"100%", padding:"8px 10px", background:t.bg2, border:`1px solid ${t.b1}`, borderRadius:6, color:t.t1, fontSize:12 }} />
                          </div>
                          <div>
                            <label style={{ display:"block", color:t.t4, fontSize:10, marginBottom:4 }}>Conversões</label>
                            <input type="number" value={info.conversoes != null && info.conversoes !== "" ? info.conversoes : ""} onChange={(e) => setChannelInfoFor(selectedClienteCanais, key, "conversoes", e.target.value)} placeholder="0" min={0} style={{ width:"100%", padding:"8px 10px", background:t.bg2, border:`1px solid ${t.b1}`, borderRadius:6, color:t.t1, fontSize:12 }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ marginTop:20 }}>
                    <Btn onClick={saveChannelInfo} disabled={savingChannelInfo}>{savingChannelInfo ? "Salvando…" : "Salvar informações dos canais"}</Btn>
                  </div>
                </>
              )}
            </Card>
            </>
          )}
        </>
      )}

      <Modal open={modalRelatorio} onClose={()=>{ setModalRelatorio(false); setSubmitError(null); }} title="Novo relatório (disponibilizar para cliente)">
        {submitError && <div style={{ marginBottom:12, padding:10, background:C.redBg, borderRadius:8, color:C.red, fontSize:12 }}>{submitError}</div>}
        <FormField label="Cliente"><Select value={formRelatorio.cliente_uuid} onChange={(v)=>setFormRelatorio((f)=>({ ...f, cliente_uuid: v }))} opts={clientOpts}/></FormField>
        <FormField label="Título"><Input value={formRelatorio.titulo} onChange={(v)=>setFormRelatorio((f)=>({ ...f, titulo: v }))} placeholder="Ex: Relatório Mensal Março"/></FormField>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          <FormField label="Tipo"><Select value={formRelatorio.tipo} onChange={(v)=>setFormRelatorio((f)=>({ ...f, tipo: v }))} opts={["Mensal","Campanha","Trimestral","Anual"]}/></FormField>
          <FormField label="Período"><Input value={formRelatorio.periodo} onChange={(v)=>setFormRelatorio((f)=>({ ...f, periodo: v }))} placeholder="Ex: Mar/2025"/></FormField>
        </div>
        <FormField label="URL do arquivo (opcional)"><Input value={formRelatorio.file_url} onChange={(v)=>setFormRelatorio((f)=>({ ...f, file_url: v }))} placeholder="https://..."/></FormField>
        <div style={{ display:"flex", gap:8, justifyContent:"flex-end", marginTop:16 }}><Btn v="ghost" onClick={()=>setModalRelatorio(false)}>Cancelar</Btn><Btn onClick={submitRelatorio} disabled={submitting}>{submitting?"Salvando…":"Criar relatório"}</Btn></div>
      </Modal>

      <Modal open={modalReuniao} onClose={()=>{ setModalReuniao(false); setSubmitError(null); }} title="Nova reunião (disponibilizar para cliente)">
        {submitError && <div style={{ marginBottom:12, padding:10, background:C.redBg, borderRadius:8, color:C.red, fontSize:12 }}>{submitError}</div>}
        <FormField label="Cliente"><Select value={formReuniao.cliente_uuid} onChange={(v)=>setFormReuniao((f)=>({ ...f, cliente_uuid: v }))} opts={clientOpts}/></FormField>
        <FormField label="Título"><Input value={formReuniao.titulo} onChange={(v)=>setFormReuniao((f)=>({ ...f, titulo: v }))} placeholder="Ex: Alinhamento mensal"/></FormField>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          <FormField label="Data e hora"><Input type="datetime-local" value={formReuniao.data_hora} onChange={(v)=>setFormReuniao((f)=>({ ...f, data_hora: v }))}/></FormField>
          <FormField label="Duração (min)"><Input type="number" value={formReuniao.duracao_min} onChange={(v)=>setFormReuniao((f)=>({ ...f, duracao_min: v }))} placeholder="60"/></FormField>
        </div>
        <FormField label="Via"><Select value={formReuniao.via} onChange={(v)=>setFormReuniao((f)=>({ ...f, via: v }))} opts={["Google Meet","Zoom","Teams","Presencial"]}/></FormField>
        <div style={{ display:"flex", gap:8, justifyContent:"flex-end", marginTop:16 }}><Btn v="ghost" onClick={()=>setModalReuniao(false)}>Cancelar</Btn><Btn onClick={submitReuniao} disabled={submitting}>{submitting?"Salvando…":"Criar reunião"}</Btn></div>
      </Modal>

      <Modal open={modalChamado} onClose={()=>{ setModalChamado(false); setSubmitError(null); }} title="Novo chamado (disponibilizar para cliente)">
        {submitError && <div style={{ marginBottom:12, padding:10, background:C.redBg, borderRadius:8, color:C.red, fontSize:12 }}>{submitError}</div>}
        <FormField label="Cliente"><Select value={formChamado.cliente_uuid} onChange={(v)=>setFormChamado((f)=>({ ...f, cliente_uuid: v }))} opts={clientOpts}/></FormField>
        <FormField label="Título"><Input value={formChamado.titulo} onChange={(v)=>setFormChamado((f)=>({ ...f, titulo: v }))} placeholder="Ex: Dúvida sobre fatura"/></FormField>
        <FormField label="Descrição"><textarea value={formChamado.descricao} onChange={(e)=>setFormChamado((f)=>({ ...f, descricao: e.target.value }))} rows={3} placeholder="Detalhes..." style={{ width:"100%", padding:"10px 14px", background:t.bg3, border:`1px solid ${t.b1}`, borderRadius:8, color:t.t1, fontSize:12, outline:"none" }}/></FormField>
        <FormField label="Categoria"><Select value={formChamado.categoria} onChange={(v)=>setFormChamado((f)=>({ ...f, categoria: v }))} opts={["Suporte","Financeiro","Comercial","Técnico"]}/></FormField>
        <div style={{ display:"flex", gap:8, justifyContent:"flex-end", marginTop:16 }}><Btn v="ghost" onClick={()=>setModalChamado(false)}>Cancelar</Btn><Btn onClick={submitChamado} disabled={submitting}>{submitting?"Salvando…":"Criar chamado"}</Btn></div>
      </Modal>

      <Modal open={modalPasta} onClose={()=>{ setModalPasta(false); setSubmitError(null); }} title={formPasta.parent_uuid ? "Nova subpasta" : "Nova pasta"}>
        {submitError && <div style={{ marginBottom:12, padding:10, background:C.redBg, borderRadius:8, color:C.red, fontSize:12 }}>{submitError}</div>}
        {formPasta.cliente_uuid ? (
          <FormField label="Cliente"><div style={{ padding:"8px 12px", background:t.bg3, borderRadius:8, color:t.t1, fontSize:13 }}>{getClienteNome(formPasta.cliente_uuid)}</div></FormField>
        ) : (
          <FormField label="Cliente"><Select value={formPasta.cliente_uuid} onChange={(v)=>setFormPasta((f)=>({ ...f, cliente_uuid: v }))} opts={clientOpts}/></FormField>
        )}
        {formPasta.parent_uuid && (
          <FormField label="Dentro de"><div style={{ padding:"8px 12px", background:t.bg3, borderRadius:8, color:t.t2, fontSize:12 }}>{pastas.find((p) => (p.uuid || p.id) === formPasta.parent_uuid)?.nome || "Pasta"}</div></FormField>
        )}
        <FormField label="Nome da pasta"><Input value={formPasta.nome} onChange={(v)=>setFormPasta((f)=>({ ...f, nome: v }))} placeholder="Ex: Contratos"/></FormField>
        <FormField label="Ícone"><Input value={formPasta.icone} onChange={(v)=>setFormPasta((f)=>({ ...f, icone: v }))} placeholder="📁"/></FormField>
        <div style={{ display:"flex", gap:8, justifyContent:"flex-end", marginTop:16 }}><Btn v="ghost" onClick={()=>setModalPasta(false)}>Cancelar</Btn><Btn onClick={submitPasta} disabled={submitting}>{submitting?"Salvando…":"Criar pasta"}</Btn></div>
      </Modal>

      <Modal open={modalArquivo} onClose={()=>{ setModalArquivo(false); setSubmitError(null); setArquivosSelecionados([]); }} title={formArquivo.cliente_uuid ? "Fazer upload" : "Novo arquivo (para cliente)"}>
        {submitError && <div style={{ marginBottom:12, padding:10, background:C.redBg, borderRadius:8, color:C.red, fontSize:12 }}>{submitError}</div>}
        {formArquivo.cliente_uuid ? (
          <FormField label="Cliente"><div style={{ padding:"8px 12px", background:t.bg3, borderRadius:8, color:t.t1, fontSize:13 }}>{getClienteNome(formArquivo.cliente_uuid)}</div></FormField>
        ) : (
          <FormField label="Cliente"><Select value={formArquivo.cliente_uuid} onChange={(v)=>setFormArquivo((f)=>({ ...f, cliente_uuid: v }))} opts={clientOpts}/></FormField>
        )}
        <FormField label="Arquivo(s) — até 10 MB cada, pode selecionar vários">
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            <label
              htmlFor="upload-materiais-input"
              onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.03)"; e.currentTarget.style.boxShadow = "0 4px 14px rgba(0,0,0,0.2)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.15)"; }}
              style={{ display:"inline-flex", alignItems:"center", justifyContent:"center", gap:8, padding:"10px 20px", background:t.accent, color:t.accentTxt, borderRadius:10, fontSize:13, fontWeight:700, cursor:"pointer", border:"none", boxShadow:"0 2px 8px rgba(0,0,0,0.15)", transition:"transform .15s ease, box-shadow .15s ease" }}
            >
              <span>📎 Escolher arquivo(s)</span>
              <input id="upload-materiais-input" type="file" multiple onChange={handleFileSelect} accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.txt,.zip" style={{ position:"absolute", width:0, height:0, opacity:0, pointerEvents:"none" }}/>
            </label>
            {arquivosSelecionados.length > 0 && (
              <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                {arquivosSelecionados.map((item, idx) => (
                  <span key={idx} style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"6px 10px", background:t.bg3, borderRadius:8, border:`1px solid ${t.b1}`, fontSize:11, color:t.t1 }}>
                    <span style={{ maxWidth:160, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }} title={item.nome}>{item.nome}</span>
                    <button type="button" onClick={() => setArquivosSelecionados((prev) => prev.filter((_, i) => i !== idx))} style={{ background:"none", border:"none", color:t.t3, cursor:"pointer", padding:0, fontSize:14, lineHeight:1 }} title="Remover">×</button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </FormField>
        <FormField label="Nome"><Input value={formArquivo.nome} onChange={(v)=>setFormArquivo((f)=>({ ...f, nome: v }))} placeholder="Ex: Contrato.pdf (ou use o nome do arquivo)"/></FormField>
        <FormField label="Ou URL (se não fizer upload)"><Input value={formArquivo.url} onChange={(v)=>setFormArquivo((f)=>({ ...f, url: v }))} placeholder="https://..."/></FormField>
        <FormField label="Dentro da pasta (opcional)">
          {formArquivo.cliente_uuid && pastas.length > 0 ? (
            <Select value={formArquivo.pasta_uuid || ""} onChange={(v)=>setFormArquivo((f)=>({ ...f, pasta_uuid: v || "" }))} opts={[{ value: "", label: "— Raiz" }, ...pastas.map((p) => ({ value: p.uuid || p.id, label: `${p.icone || "📁"} ${p.nome || "—"}` }))]}/>
          ) : (
            <Input value={formArquivo.pasta_uuid} onChange={(v)=>setFormArquivo((f)=>({ ...f, pasta_uuid: v }))} placeholder="UUID da pasta (opcional)"/>
          )}
        </FormField>
        <div style={{ display:"flex", gap:8, justifyContent:"flex-end", marginTop:16 }}>
          <Btn v="ghost" onClick={()=>setModalArquivo(false)}>Cancelar</Btn>
          <Btn onClick={submitArquivo} disabled={submitting}>
            {submitting ? "Enviando…" : arquivosSelecionados.length > 1 ? `Subir ${arquivosSelecionados.length} arquivos` : "Subir arquivo"}
          </Btn>
        </div>
      </Modal>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   THEME TOGGLE
═══════════════════════════════════════════════════ */
function ThemeToggle({ isDark, onToggle }) {
  const t = useT();
  const [h, setH] = useState(false);
  return (
    <button onClick={onToggle} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
      title={isDark?"Modo Claro":"Modo Escuro"}
      style={{ width:58, height:28, borderRadius:14, background:h?t.bg4:t.bg3, border:`1px solid ${t.bHi}`,
        cursor:"pointer", position:"relative", transition:"all .2s", flexShrink:0, display:"flex", alignItems:"center", padding:"0 3px" }}>
      <span style={{ position:"absolute", left:6,  fontSize:11, opacity:isDark?0.3:1, transition:"opacity .2s" }}>☀</span>
      <span style={{ position:"absolute", right:6, fontSize:11, opacity:isDark?1:0.3, transition:"opacity .2s" }}>☽</span>
      <div style={{ width:20, height:20, borderRadius:"50%", background:t.accent, position:"absolute",
        left:isDark?33:4, transition:"left .22s cubic-bezier(.4,0,.2,1)", boxShadow:`0 1px 4px ${t.sh}` }}/>
    </button>
  );
}

/* ═══════════════════════════════════════════════════
   PAGE: PRODUÇÃO (Kanban — admin cria/move cards; cliente vê)
═══════════════════════════════════════════════════ */
const PRODUCAO_TIPOS = ["Campanha", "Criativo", "Vídeo", "Landing Page", "Automação"];
const PRODUCAO_PRIO = ["Baixa", "Média", "Alta"];
function ProducaoAdmPage() {
  const t = useT();
  const { token } = useAuth();
  const [clientes, setClientes] = useState([]);
  const [selectedCliente, setSelectedCliente] = useState(null);
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const [modalNovoCard, setModalNovoCard] = useState(false);
  const [formCard, setFormCard] = useState({ cliente_uuid: "", column_id: "", titulo: "", tipo: "Campanha", prioridade: "Média" });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [movingCardId, setMovingCardId] = useState(null);
  const [dragOverColId, setDragOverColId] = useState(null);
  const [moveError, setMoveError] = useState(null);
  const [cardDetailOpen, setCardDetailOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState(null);
  const [editCardForm, setEditCardForm] = useState({ title: "", type: "Campanha", priority: "Média", due: "", description: "" });
  const [commentText, setCommentText] = useState("");
  const [savingCard, setSavingCard] = useState(false);
  const [cardSaveError, setCardSaveError] = useState(null);
  const [archivingCardId, setArchivingCardId] = useState(null);

  const LIST_WIDTH_TRELLO = 272;
  const getCardId = (card) => card && (card.id ?? card.uuid ?? card._id ?? card.Id ?? card.UUID);
  const isCardArchived = (c) => c?.archived === true || c?.Archived === true;

  const openCardDetail = (card, columnId) => {
    setSelectedCard({ ...card, columnId });
    setEditCardForm({
      title: card.title || card.titulo || "",
      type: card.type || card.tipo || "Campanha",
      priority: card.priority || card.prioridade || "Média",
      due: card.due || card.prazo || "",
      description: card.description || card.descricao || "",
    });
    setCommentText("");
    setCardSaveError(null);
    setCardDetailOpen(true);
  };

  useEffect(() => {
    if (!token) return;
    apiGet(token, "/api/admin/clientes?limit=200&offset=0").then((r) => r.ok ? safeResJson(r, {}) : {}).then((data) => {
      const list = data?.items ?? data?.data ?? data?.clientes ?? [];
      setClientes(Array.isArray(list) ? list : []);
    }).catch(() => setClientes([]));
  }, [token]);

  useEffect(() => {
    if (!token || !selectedCliente) { setColumns([]); return; }
    setLoading(true);
    setErr(null);
    apiGet(token, `/api/admin/producao?cliente_uuid=${encodeURIComponent(selectedCliente)}`)
      .then((r) => {
        if (!r.ok) throw new Error("Erro ao carregar produção");
        return safeResJson(r, {});
      })
      .then((data) => {
        const cols = Array.isArray(data?.columns) ? data.columns : Array.isArray(data) ? data : [];
        setColumns(cols);
      })
      .catch((e) => { setErr(mensagemErroRede(e)); setColumns([]); })
      .finally(() => setLoading(false));
  }, [token, selectedCliente]);

  const getClienteNome = (uuid) => (clientes.find((c) => (c.uuid || c.id) === uuid) || {}).nome || (clientes.find((c) => (c.uuid || c.id) === uuid) || {}).name || uuid || "—";

  const loadProducao = () => {
    if (!selectedCliente || !token) return;
    setLoading(true);
    apiGet(token, `/api/admin/producao?cliente_uuid=${encodeURIComponent(selectedCliente)}`)
      .then((r) => r.ok ? safeResJson(r, {}) : {})
      .then((data) => { const cols = Array.isArray(data?.columns) ? data.columns : Array.isArray(data) ? data : []; setColumns(cols); })
      .catch(() => setColumns([]))
      .finally(() => setLoading(false));
  };

  const handleCriarCard = (e) => {
    e?.preventDefault?.();
    if (!formCard.cliente_uuid || !formCard.column_id || !formCard.titulo?.trim()) { setSubmitError("Selecione cliente, coluna e informe o título."); return; }
    setSubmitError(null);
    setSubmitting(true);
    apiPost(token, "/api/admin/producao/cards", {
      cliente_uuid: formCard.cliente_uuid,
      column_id: formCard.column_id,
      title: formCard.titulo.trim(),
      type: formCard.tipo,
      priority: formCard.prioridade,
    })
      .then((r) => {
        if (!r.ok) return safeResJson(r, {}).then((d) => Promise.reject(new Error(d?.message || d?.error)));
        setModalNovoCard(false);
        setFormCard({ cliente_uuid: selectedCliente || "", column_id: "", titulo: "", tipo: "Campanha", prioridade: "Média" });
        loadProducao();
      })
      .catch((e) => setSubmitError(e?.message))
      .finally(() => setSubmitting(false));
  };

  const handleMoverCard = (cardId, newColumnId) => {
    if (!cardId || !newColumnId || movingCardId) return;
    setMoveError(null);
    setMovingCardId(cardId);
    apiPatch(token, `/api/admin/producao/cards/${cardId}`, { column_id: newColumnId })
      .then((r) => { if (r.ok) { setMoveError(null); loadProducao(); } else return safeResJson(r, {}).then((d) => Promise.reject(new Error(d?.message || "Erro ao mover"))); })
      .catch((e) => setMoveError(mensagemErroRede(e)))
      .finally(() => setMovingCardId(null));
  };

  const handleDrop = (targetColumnId, e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverColId(null);
    try {
      const raw = e.dataTransfer.getData("text/plain");
      const data = JSON.parse(raw || "{}");
      const cardId = data.cardId;
      const sourceColumnId = data.columnId;
      if (cardId && targetColumnId && targetColumnId !== sourceColumnId) handleMoverCard(cardId, targetColumnId);
    } catch (_) {}
  };

  const handleDragOver = (e, colId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    e.stopPropagation();
    setDragOverColId(colId);
  };

  const handleSaveCard = (e) => {
    e?.preventDefault?.();
    if (!selectedCard) return;
    const cardId = getCardId(selectedCard);
    if (!cardId) { setCardSaveError("ID do card não encontrado."); return; }
    setCardSaveError(null);
    setSavingCard(true);
    const dueVal = editCardForm.due.trim();
    const dueSend = !dueVal ? undefined : (dueVal.replace(/\D/g, "").length >= 8 ? (dueVal.length === 10 && dueVal.includes("-") ? dueVal : parseDateInput(dueVal)) : dueVal);
    apiPatch(token, `/api/admin/producao/cards/${encodeURIComponent(cardId)}`, {
      title: editCardForm.title.trim() || undefined,
      type: editCardForm.type,
      priority: editCardForm.priority,
      due: dueSend || undefined,
      description: editCardForm.description.trim() || undefined,
    })
      .then((r) => {
        if (r.ok) { setCardDetailOpen(false); setSelectedCard(null); loadProducao(); }
        else return safeResJson(r, {}).then((d) => Promise.reject(new Error(d?.message || d?.error)));
      })
      .catch((e) => setCardSaveError(e?.message || "Erro ao salvar"))
      .finally(() => setSavingCard(false));
  };

  const handleArquivarCard = () => {
    if (!selectedCard || !token) return;
    const cardId = getCardId(selectedCard);
    if (!cardId) { setCardSaveError("ID do card não encontrado."); return; }
    setCardSaveError(null);
    setArchivingCardId(cardId);
    const columnId = selectedCard.columnId;
    setCardDetailOpen(false);
    setSelectedCard(null);
    setColumns((prev) => prev.map((col) => (col.id === columnId ? { ...col, cards: (col.cards || []).filter((c) => getCardId(c) !== cardId) } : col)));
    apiPatch(token, `/api/admin/producao/cards/${encodeURIComponent(cardId)}`, { archived: true })
      .then((r) => {
        if (r.ok) { setMoveError(null); loadProducao(); }
        else return safeResJson(r, {}).then((d) => Promise.reject(new Error(d?.message || d?.error || `Erro ${r.status}`)));
      })
      .catch((e) => { setMoveError(e?.message || "Erro ao arquivar. O card voltou à lista."); loadProducao(); })
      .finally(() => setArchivingCardId(null));
  };

  const handleAddComment = (e) => {
    e?.preventDefault?.();
    const text = commentText?.trim();
    if (!text || !selectedCard) return;
    const cardId = getCardId(selectedCard);
    if (!cardId) return;
    setCardSaveError(null);
    apiPost(token, `/api/admin/producao/cards/${encodeURIComponent(cardId)}/comments`, { content: text })
      .then((r) => {
        if (r.ok) { setCommentText(""); loadProducao(); setSelectedCard((prev) => prev && { ...prev, comments_list: [...(prev.comments_list || prev.comments || []), { content: text, created_at: new Date().toISOString() }] }); }
        else return safeResJson(r, {}).then((d) => Promise.reject(new Error(d?.message || d?.error)));
      })
      .catch((e) => setCardSaveError(e?.message || "Erro ao adicionar comentário"));
  };

  const handleMoveCardToList = (newColumnId) => {
    if (!selectedCard || !newColumnId || newColumnId === selectedCard.columnId) return;
    const cardId = getCardId(selectedCard);
    if (!cardId) return;
    setCardSaveError(null);
    apiPatch(token, `/api/admin/producao/cards/${encodeURIComponent(cardId)}`, { column_id: newColumnId })
      .then((r) => {
        if (r.ok) { setSelectedCard((prev) => prev && { ...prev, columnId: newColumnId }); loadProducao(); }
        else return safeResJson(r, {}).then((d) => Promise.reject(new Error(d?.message || d?.error)));
      })
      .catch((e) => setCardSaveError(e?.message || "Erro ao mover card"));
  };

  const clientOpts = [{ value: "", label: "— Selecione o cliente" }, ...clientes.map((c) => ({ value: c.uuid || c.id, label: (c.nome || c.name || c.email) || "—" }))];
  const columnOpts = columns.map((c) => ({ value: c.id, label: c.label || c.id }));

  return (
    <div>
      <PageHeader title="Produção" sub="Gerencie o Kanban por cliente: crie cards e mova entre colunas. O cliente vê apenas o quadro dele."/>
      {err && <div style={{ padding:12, marginBottom:16, background:C.redBg, borderRadius:8, color:C.red, fontSize:12 }}>{err}</div>}
      {moveError && <div style={{ padding:10, marginBottom:12, background:C.redBg, borderRadius:8, color:C.red, fontSize:12 }}>{moveError}</div>}
      <div style={{ display:"flex", gap:0, minHeight:420, borderRadius:12, overflow:"hidden", border:`1px solid ${t.b1}`, background:t.bg2 }}>
        <div style={{ width:240, flexShrink:0, borderRight:`1px solid ${t.b1}`, background:t.bg3, padding:"12px 0" }}>
          <div style={{ padding:"8px 16px", fontSize:11, fontWeight:700, color:t.t4, textTransform:"uppercase" }}>Cliente</div>
          {clientes.length === 0 ? <div style={{ padding:16, color:t.t3, fontSize:12 }}>Nenhum cliente.</div> : clientes.map((c) => {
            const id = c.uuid || c.id;
            const nome = (c.nome || c.name || c.email) || "—";
            const ativo = selectedCliente === id;
            return (
              <button key={id} type="button" onClick={() => setSelectedCliente(id)} style={{ display:"flex", alignItems:"center", gap:10, width:"100%", padding:"10px 16px", border:"none", background: ativo ? t.bg2 : "transparent", cursor:"pointer", textAlign:"left", borderLeft: ativo ? `3px solid ${t.accent}` : "3px solid transparent" }}>
                <span style={{ width:32, height:32, borderRadius:8, background: ativo ? t.accent : t.b1, color: ativo ? t.accentText : t.t3, fontSize:12, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center" }}>{(nome.charAt(0)||"?").toUpperCase()}</span>
                <span style={{ color:t.t1, fontSize:12, fontWeight:600, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{nome}</span>
              </button>
            );
          })}
        </div>
        <div style={{ flex:1, display:"flex", flexDirection:"column", minWidth:0 }}>
          {!selectedCliente ? (
            <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", color:t.t3, fontSize:14 }}>Selecione um cliente para ver e gerenciar o Kanban.</div>
          ) : (
            <>
              <div style={{ padding:"12px 20px", borderBottom:`1px solid ${t.b1}`, display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:8 }}>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <span style={{ color:t.t1, fontWeight:600, fontSize:13 }}>{getClienteNome(selectedCliente)}</span>
                  <span style={{ color:t.t4, fontSize:11 }}>Arraste os cards entre as listas para mover</span>
                </div>
                <Btn type="button" onClick={() => { setFormCard({ ...formCard, cliente_uuid: selectedCliente, column_id: columns[0]?.id || "" }); setModalNovoCard(true); setSubmitError(null); }}>+ Novo card</Btn>
              </div>
              {loading ? (
                <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", color:t.t3 }}>Carregando…</div>
              ) : (
                <div style={{ flex:1, overflow:"auto", padding:16, background:t.isDark ? "#1e2128" : "#f4f5f7", borderRadius:8, minHeight:380 }}>
                  {columns.length === 0 ? (
                    <div style={{ color:t.t3, fontSize:13 }}>Nenhuma coluna. O backend deve retornar colunas em GET /api/admin/producao?cliente_uuid=...</div>
                  ) : (
                    <div style={{ display:"flex", gap:14, alignItems:"flex-start" }}>
                      {columns.map((col) => (
                        <div
                          key={col.id}
                          onDragOver={(e) => handleDragOver(e, col.id)}
                          onDragLeave={() => setDragOverColId(null)}
                          onDrop={(e) => handleDrop(col.id, e)}
                          style={{
                            width: LIST_WIDTH_TRELLO,
                            minWidth: LIST_WIDTH_TRELLO,
                            flexShrink: 0,
                            background: dragOverColId === col.id ? (t.isDark ? "#3a3d44" : "#dfe1e6") : (t.isDark ? "#2c2e33" : "#ebecf0"),
                            borderRadius: 8,
                            padding: 10,
                            maxHeight: "calc(100vh - 280px)",
                            minHeight: 200,
                            display: "flex",
                            flexDirection: "column",
                            transition: "background .15s",
                            border: dragOverColId === col.id ? `2px dashed ${t.accent}` : "2px solid transparent",
                          }}
                        >
                          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10, padding: "6px 6px 8px" }}>
                            <span style={{ color:t.t1, fontSize:14, fontWeight:700 }}>{col.label || col.id}</span>
                            <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                              <span style={{ color:t.t3, fontSize:12, fontWeight:600, background:t.isDark ? "rgba(255,255,255,.08)" : "rgba(0,0,0,.06)", padding:"4px 10px", borderRadius:6 }}>{(col.cards || []).filter((c) => !isCardArchived(c)).length}</span>
                              <button type="button" style={{ background:"transparent", border:"none", color:t.t4, cursor:"pointer", padding:4, fontSize:16, lineHeight:1 }} title="Opções">⋯</button>
                            </div>
                          </div>
                          <div style={{ flex:1, minHeight:0, overflowY:"auto", display:"flex", flexDirection:"column", gap:8 }}>
                            {(col.cards || []).filter((c) => !isCardArchived(c)).map((c, idx) => {
                              const cardId = getCardId(c);
                              const key = cardId ?? `card-${col.id}-${idx}`;
                              if (!cardId) return null;
                              return (
                              <div
                                key={key}
                                draggable
                                onDragStart={(ev) => { ev.dataTransfer.setData("text/plain", JSON.stringify({ cardId, columnId: col.id })); ev.dataTransfer.effectAllowed = "move"; ev.dataTransfer.setData("application/json", JSON.stringify({ cardId, columnId: col.id })); }}
                                onDragOver={(e) => { e.stopPropagation(); handleDragOver(e, col.id); }}
                                onDrop={(e) => { e.stopPropagation(); handleDrop(col.id, e); }}
                                style={{
                                  background: t.isDark ? "#252628" : "#fff",
                                  border: `1px solid ${t.isDark ? "rgba(255,255,255,.08)" : "rgba(0,0,0,.06)"}`,
                                  borderRadius: 8,
                                  padding: 0,
                                  boxShadow: t.isDark ? "0 1px 3px rgba(0,0,0,.3)" : "0 1px 2px rgba(0,0,0,.08)",
                                  opacity: movingCardId === cardId ? 0.6 : 1,
                                  display: "flex",
                                  overflow: "hidden",
                                  cursor: "grab",
                                }}
                              >
                                <div style={{ width: 24, minHeight: 48, cursor: "grab", background: t.isDark ? "rgba(255,255,255,.04)" : "rgba(0,0,0,.04)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }} title="Arraste para mover">
                                  <span style={{ fontSize: 12, color: t.t4 }}>⋮⋮</span>
                                </div>
                                <div
                                  onClick={() => openCardDetail(c, col.id)}
                                  style={{ flex: 1, minWidth: 0, padding: "10px 12px 12px", cursor: "pointer" }}
                                >
                                  <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:8 }}>
                                    {(c.type || c.tipo) && <span style={{ padding:"4px 8px", borderRadius:4, background:C.blue, opacity:0.9, fontSize:10, color:"#fff", fontWeight:600 }}>{c.type || c.tipo}</span>}
                                    {(c.priority || c.prioridade) && <span style={{ padding:"4px 8px", borderRadius:4, background:C.amber, opacity:0.9, fontSize:10, color:"#fff", fontWeight:600 }}>{c.priority || c.prioridade}</span>}
                                  </div>
                                  <div style={{ color:t.t1, fontSize:14, fontWeight:600, lineHeight:1.4, marginBottom:6 }}>{c.title || c.titulo || "—"}</div>
                                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:6 }}>
                                    {(c.due || c.prazo) && <span style={{ fontSize:11, color:t.t4 }}>📅 {c.due || c.prazo}</span>}
                                    {(c.owner || c.owner_uuid) && (
                                      <span style={{ width:22, height:22, borderRadius:"50%", background:t.bg4, border:`1px solid ${t.b1}`, display:"inline-flex", alignItems:"center", justifyContent:"center", fontSize:9, fontWeight:800, color:t.t2 }} title={typeof c.owner==="string" ? c.owner : (c.owner?.name || c.owner_uuid || "")}>
                                        {(typeof c.owner==="string" ? c.owner : (c.owner?.name || c.owner_uuid || "?")).split(" ").map(p=>p[0]).join("").slice(0,2) || "?"}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ); })}
                            <button type="button" onClick={() => { setFormCard((f) => ({ ...f, cliente_uuid: selectedCliente || "", column_id: col.id })); setModalNovoCard(true); }} style={{ flexShrink:0, width:"100%", padding:"10px 12px", background:"transparent", border:"none", borderRadius:8, color:t.t3, fontSize:13, cursor:"pointer", textAlign:"left", display:"flex", alignItems:"center", gap:8 }}
                              onMouseEnter={(e) => { e.currentTarget.style.background = t.isDark ? "rgba(255,255,255,.06)" : "rgba(0,0,0,.06)"; e.currentTarget.style.color = t.t2; }}
                              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = t.t3; }}>
                              <span style={{ fontSize:16 }}>+</span> Adicionar um cartão
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <Modal open={modalNovoCard} onClose={() => { setModalNovoCard(false); setSubmitError(null); }} title="Novo card" width={440}>
        {submitError && <div style={{ marginBottom:12, padding:10, background:C.redBg, borderRadius:8, color:C.red, fontSize:12 }}>{submitError}</div>}
        <form onSubmit={handleCriarCard}>
          <FormField label="Cliente"><Select value={formCard.cliente_uuid} onChange={(v) => setFormCard((f) => ({ ...f, cliente_uuid: v }))} opts={clientOpts}/></FormField>
          <FormField label="Coluna"><Select value={formCard.column_id} onChange={(v) => setFormCard((f) => ({ ...f, column_id: v }))} opts={[{ value: "", label: "— Selecione" }, ...columnOpts]}/></FormField>
          <FormField label="Título"><Input value={formCard.titulo} onChange={(v) => setFormCard((f) => ({ ...f, titulo: v }))} placeholder="Ex: Criativos campanha verão"/></FormField>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <FormField label="Tipo"><Select value={formCard.tipo} onChange={(v) => setFormCard((f) => ({ ...f, tipo: v }))} opts={PRODUCAO_TIPOS}/></FormField>
            <FormField label="Prioridade"><Select value={formCard.prioridade} onChange={(v) => setFormCard((f) => ({ ...f, prioridade: v }))} opts={PRODUCAO_PRIO}/></FormField>
          </div>
          <div style={{ display:"flex", gap:8, justifyContent:"flex-end", marginTop:16 }}><Btn type="button" v="ghost" onClick={() => setModalNovoCard(false)}>Cancelar</Btn><Btn type="submit" disabled={submitting}>{submitting ? "Criando…" : "Criar card"}</Btn></div>
        </form>
      </Modal>

      <Modal open={cardDetailOpen} onClose={() => { setCardDetailOpen(false); setSelectedCard(null); setCardSaveError(null); }} title="Card" width={600}>
        {selectedCard && (
          <div>
            {cardSaveError && <div style={{ marginBottom:12, padding:10, background:C.redBg, borderRadius:8, color:C.red, fontSize:12 }}>{cardSaveError}</div>}
            <div style={{ marginBottom:16 }}>
              <label style={{ display:"block", color:t.t3, fontSize:11, fontWeight:700, marginBottom:6 }}>LISTA / STATUS</label>
              <select value={selectedCard.columnId || ""} onChange={(e) => handleMoveCardToList(e.target.value)} style={{ width:"100%", maxWidth:280, padding:"10px 14px", background:t.bg3, border:`1px solid ${t.b1}`, borderRadius:8, color:t.t1, fontSize:13, fontWeight:600, cursor:"pointer" }}>
                {columnOpts.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <form onSubmit={handleSaveCard} id="card-detail-form">
              <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:16 }}>
                <span style={{ width:22, height:22, borderRadius:"50%", border:`2px solid ${t.b2}`, flexShrink:0 }} />
                <input type="text" value={editCardForm.title} onChange={(e) => setEditCardForm((f) => ({ ...f, title: e.target.value }))} placeholder="Título do card"
                  style={{ flex:1, minWidth:0, padding:"6px 0", background:"transparent", border:"none", color:t.t1, fontSize:18, fontWeight:700, outline:"none" }} />
              </div>
              {/* Botões estilo Trello: Adicionar, Etiquetas, Datas, Checklist, Membros */}
              <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom:20 }}>
                <span style={{ padding:"8px 14px", background:t.bg3, borderRadius:8, color:t.t2, fontSize:13, display:"inline-flex", alignItems:"center", gap:6 }}>+ Adicionar</span>
                <span style={{ padding:"8px 14px", background:t.bg3, borderRadius:8, color:t.t2, fontSize:13, display:"inline-flex", alignItems:"center", gap:6 }}>🏷 Etiquetas</span>
                <span style={{ padding:"8px 14px", background:t.bg3, borderRadius:8, color:t.t2, fontSize:13, display:"inline-flex", alignItems:"center", gap:6 }}>📅 Datas</span>
                <span style={{ padding:"8px 14px", background:t.bg3, borderRadius:8, color:t.t2, fontSize:13, display:"inline-flex", alignItems:"center", gap:6 }}>☑ Checklist</span>
                <span style={{ padding:"8px 14px", background:t.bg3, borderRadius:8, color:t.t2, fontSize:13, display:"inline-flex", alignItems:"center", gap:6 }}>👤 Membros</span>
              </div>
              {/* Tipo e Prioridade (etiquetas) + Data */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12, marginBottom:20 }}>
                <FormField label="Tipo"><Select value={editCardForm.type} onChange={(v) => setEditCardForm((f) => ({ ...f, type: v }))} opts={PRODUCAO_TIPOS}/></FormField>
                <FormField label="Prioridade"><Select value={editCardForm.priority} onChange={(v) => setEditCardForm((f) => ({ ...f, priority: v }))} opts={PRODUCAO_PRIO}/></FormField>
                <FormField label="Vencimento">
                  <input type="text" value={formatDateInput(editCardForm.due)} onChange={(e) => { const v = e.target.value; const iso = v.replace(/\D/g, "").length >= 8 ? parseDateInput(v) : v; setEditCardForm((f) => ({ ...f, due: iso || "" })); }} placeholder="DD/MM/AAAA" maxLength={10} style={{ width:"100%", padding:"9px 13px", background:t.bg3, border:`1px solid ${t.b1}`, borderRadius:8, color:t.t1, fontSize:12, outline:"none" }}/>
                </FormField>
              </div>
              {/* Descrição estilo Trello */}
              <div style={{ marginBottom:20 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                  <span style={{ color:t.t3, fontSize:14 }}>☰</span>
                  <span style={{ color:t.t2, fontSize:14, fontWeight:600 }}>Descrição</span>
                </div>
                <textarea value={editCardForm.description} onChange={(e) => setEditCardForm((f) => ({ ...f, description: e.target.value }))} rows={4} placeholder="Adicione uma descrição mais detalhada..." style={{ width:"100%", padding:"12px 14px", background:t.bg3, border:`1px solid ${t.b1}`, borderRadius:8, color:t.t1, fontSize:13, outline:"none", resize:"vertical", lineHeight:1.5 }}/>
              </div>
              <div style={{ display:"flex", gap:8, justifyContent:"space-between", flexWrap:"wrap", marginBottom:20 }}>
                <Btn type="button" v="ghost" onClick={handleArquivarCard} style={{ color:t.t4 }} title="Arquivar card">Arquivar card</Btn>
                <div style={{ display:"flex", gap:8 }}><Btn type="button" v="ghost" onClick={() => setCardDetailOpen(false)}>Fechar</Btn><Btn type="submit" disabled={savingCard}>{savingCard ? "Salvando…" : "Salvar alterações"}</Btn></div>
              </div>
            </form>
            <div style={{ borderTop:`1px solid ${t.b1}`, paddingTop:16 }}>
              <div style={{ color:t.t2, fontSize:12, fontWeight:700, marginBottom:10 }}>Comentários</div>
              <div style={{ maxHeight:160, overflowY:"auto", marginBottom:12 }}>
                {(() => { const list = selectedCard.comments_list ?? selectedCard.comments ?? []; return list.length > 0 ? list.map((com, i) => (
                  <div key={i} style={{ padding:"10px 12px", background:t.bg3, borderRadius:8, marginBottom:6, fontSize:13, color:t.t1 }}>{typeof com === "string" ? com : (com.content || com.texto || com.body || "—")}</div>
                )) : <div style={{ color:t.t4, fontSize:12 }}>Nenhum comentário ainda.</div>; })()}
              </div>
              <form onSubmit={handleAddComment} style={{ display:"flex", gap:8 }}>
                <input value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="Escreva um comentário..." style={{ flex:1, padding:"10px 14px", background:t.bg3, border:`1px solid ${t.b1}`, borderRadius:8, color:t.t1, fontSize:12, outline:"none" }}/>
                <Btn type="submit" disabled={!commentText?.trim()}>Enviar</Btn>
              </form>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   PAGE: COMERCIAL
═══════════════════════════════════════════════════ */
function ComercialPage() {
  const t = useT();
  const { token } = useAuth();
  const [comercialData, setComercialData] = useState(null);
  const [period, setPeriod]   = useState("semana");
  const [selected, setSelected] = useState(null);
  const [addOpen, setAddOpen]   = useState(false);
  const [editV, setEditV]       = useState(null);
  const [form, setForm] = useState({ name:"", email:"", phone:"", comissao:"8", meta:"20000" });

  useEffect(() => {
    if (!token) return;
    apiGet(token, "/api/admin/comercial")
      .then((r) => r.ok ? safeResJson(r, null) : null)
      .then(setComercialData);
  }, [token]);

  const raw = (comercialData?.vendedores ?? comercialData?.vendadores ?? []);
  const VENDEDORES = Array.isArray(raw) ? raw.map((v,i) => {
    const nome = v.nome || v.name || "Vendedor";
    const totalMes = (v.vendas && (v.vendas.totalMes != null || v.vendas.total_mes != null)) ? (v.vendas.totalMes ?? v.vendas.total_mes) : (v.total_mes ?? v.totalMes ?? 0);
    return {
      id: v.uuid || v.id || i+1,
      name: nome,
      avatar: (nome).split(/\s+/).map(s=>s[0]).join("").slice(0,2).toUpperCase() || "?",
      status: v.status || "Ativo",
      email: v.email || "",
      phone: v.phone || v.telefone || "",
      comissao: v.comissao ?? 8,
      meta: v.meta ?? 20000,
      joined: v.joined || v.created_at ? (typeof v.created_at==="string" ? v.created_at.slice(0,7) : "") : "",
      vendas: {
        hoje: v.vendas?.hoje ?? [],
        semana: v.vendas?.semana ?? [{ dia:"Seg",val:0 },{ dia:"Ter",val:0 },{ dia:"Qua",val:0 },{ dia:"Qui",val:0 },{ dia:"Sex",val:0 }],
        mes: v.vendas?.mes ?? [],
        total: totalMes,
        totalMes,
      },
    };
  }) : [];

  const ativos    = VENDEDORES.filter(v=>v.status==="Ativo");
  const totalMes  = ativos.reduce((s,v)=>s+v.vendas.totalMes, 0);
  const totalComissao = ativos.reduce((s,v)=>s+(v.vendas.totalMes*(v.comissao/100)), 0);
  const melhor    = [...ativos].sort((a,b)=>b.vendas.totalMes-a.vendas.totalMes)[0];

  /* mini bar */
  function SalesBar({ data, color }) {
    const max = Math.max(...data.map(d=>d.val), 1);
    return (
      <div style={{ display:"flex", alignItems:"flex-end", gap:4, height:44 }}>
        {data.map((d,i) => {
          const isLast = i===data.length-1;
          const h = Math.max(3, (d.val/max)*36);
          return (
            <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:3 }}>
              <div style={{ width:"100%", borderRadius:"2px 2px 0 0", height:`${h}px`,
                background: isLast?(color||t.accent):t.bg4, transition:"height .5s ease" }}/>
              <span style={{ fontSize:8, color:t.t4 }}>{d.dia||d.sem}</span>
            </div>
          );
        })}
      </div>
    );
  }

  /* rank badge */
  const rankColor = (i) => [C.amber,"#9CA3AF","#CD7F32"][i]||t.t4;
  const rankLabel = (i) => ["🥇","🥈","🥉"][i]||`#${i+1}`;

  /* edit modal state */
  const openEdit = (v) => {
    setEditV({ ...v, comissaoEdit: String(v.comissao), metaEdit: String(v.meta) });
  };

  const PERIOD_DATA = (v) => period==="hoje" ? v.vendas.hoje.map((x,i)=>({ dia:`${i+1}`, val:x.valor }))
    : period==="semana" ? v.vendas.semana : v.vendas.mes;

  const PERIOD_TOTAL = (v) => {
    if(period==="hoje")   return v.vendas.hoje.reduce((s,x)=>s+x.valor,0);
    if(period==="semana") return v.vendas.semana.reduce((s,x)=>s+x.val,0);
    return v.vendas.totalMes;
  };

  const COLORS = [C.blue, C.purple, C.cyan, C.orange];

  return (
    <div>
      <PageHeader
        title="Comercial"
        sub="Acompanhe vendedores, comissões e desempenho de vendas."
        action={
          <div style={{ display:"flex", gap:8 }}>
            <Btn v="ghost" sz="sm">↓ Exportar</Btn>
            <Btn onClick={()=>setAddOpen(true)}>+ Novo Vendedor</Btn>
          </div>
        }
      />

      {/* ─ KPIs ─ */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:20 }}>
        <KPICard label="Total Vendido (Mês)"  value={`R$${(totalMes/1000).toFixed(1)}k`} delta="+18%" sub="pelos vendedores ativos"/>
        <KPICard label="Comissões a Pagar"    value={`R$${totalComissao.toLocaleString("pt-BR",{minimumFractionDigits:0,maximumFractionDigits:0})}`} delta={null} sub="total este mês" accent={C.amber}/>
        <KPICard label="Vendedores Ativos"    value={ativos.length} delta={null} sub={`${VENDEDORES.length} cadastrados`}/>
        <KPICard label="Top Vendedor"         value={melhor?.name.split(" ")[0]||"—"} delta={null} sub={`R$${(melhor?.vendas.totalMes/1000).toFixed(1)}k vendido`} accent={C.green}/>
      </div>

      {/* ─ Ranking geral ─ */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 340px", gap:14, marginBottom:20 }}>
        {/* Ranking cards */}
        <Card style={{ padding:"24px" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
            <div style={{ color:t.t1, fontWeight:700, fontSize:13 }}>Ranking de Vendas</div>
            <FilterBar opts={["hoje","semana","mes"]} active={period} onChange={setPeriod}/>
          </div>

          {[...VENDEDORES].sort((a,b)=>PERIOD_TOTAL(b)-PERIOD_TOTAL(a)).map((v,i) => {
            const total = PERIOD_TOTAL(v);
            const meta  = v.meta;
            const pct   = Math.min(100, Math.round((total/meta)*100));
            const vc    = COLORS[i%COLORS.length];
            const comissaoVal = Math.round(total*(v.comissao/100));
            return (
              <div key={v.id}
                onClick={()=>setSelected(selected===v.id?null:v.id)}
                style={{ display:"flex", alignItems:"center", gap:14, padding:"14px 0",
                  borderBottom:i<VENDEDORES.length-1?`1px solid ${t.b2}`:"none",
                  cursor:"pointer" }}>
                {/* rank */}
                <div style={{ width:28, textAlign:"center", fontSize:16, flexShrink:0 }}>{rankLabel(i)}</div>
                {/* avatar */}
                <div style={{ position:"relative", flexShrink:0 }}>
                  <div style={{ width:40, height:40, borderRadius:"50%",
                    background: v.status==="Inativo" ? t.bg4 : `${vc}20`,
                    border:`2px solid ${v.status==="Inativo"?t.b1:vc+"50"}`,
                    display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <span style={{ color:v.status==="Inativo"?t.t4:vc, fontSize:12, fontWeight:800 }}>{v.avatar}</span>
                  </div>
                  <div style={{ position:"absolute", bottom:1, right:1, width:9, height:9, borderRadius:"50%",
                    background: v.status==="Ativo"?C.green:"#555", border:`2px solid ${t.bg2}` }}/>
                </div>
                {/* info */}
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:5 }}>
                    <span style={{ color:t.t1, fontSize:13, fontWeight:700 }}>{v.name}</span>
                    <Tag label={`${v.comissao}% comissão`} color={vc} bg={`${vc}14`}/>
                  </div>
                  {/* progress bar */}
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <div style={{ flex:1, height:5, background:t.bg4, borderRadius:3, overflow:"hidden" }}>
                      <div style={{ height:"100%", width:`${pct}%`, background:vc, borderRadius:3, transition:"width .8s ease" }}/>
                    </div>
                    <span style={{ color:t.t3, fontSize:10, whiteSpace:"nowrap" }}>{pct}% da meta</span>
                  </div>
                </div>
                {/* values */}
                <div style={{ textAlign:"right", flexShrink:0 }}>
                  <div style={{ color:total>0?t.t1:t.t4, fontSize:14, fontWeight:800 }}>R${(total/1000).toFixed(1)}k</div>
                  <div style={{ color:C.green, fontSize:10, marginTop:2, fontWeight:700 }}>+R${comissaoVal.toLocaleString("pt-BR")}</div>
                </div>
                <div style={{ display:"flex", gap:6, flexShrink:0 }}>
                  <button onClick={e=>{e.stopPropagation();openEdit(v);}} style={{ padding:"4px 10px", borderRadius:7, cursor:"pointer", fontSize:10, fontWeight:700, background:t.bg3, color:t.t2, border:`1px solid ${t.b1}` }}>✏ Comissão</button>
                </div>
              </div>
            );
          })}
        </Card>

        {/* Comparative bar */}
        <Card style={{ padding:"24px" }}>
          <div style={{ color:t.t1, fontWeight:700, fontSize:13, marginBottom:20 }}>Volume por Vendedor</div>
          {[...VENDEDORES].sort((a,b)=>PERIOD_TOTAL(b)-PERIOD_TOTAL(a)).map((v,i) => {
            const total = PERIOD_TOTAL(v);
            const maxV  = Math.max(...VENDEDORES.map(x=>PERIOD_TOTAL(x)), 1);
            const pct   = (total/maxV)*100;
            const vc    = COLORS[i%COLORS.length];
            return (
              <div key={v.id} style={{ marginBottom:14 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                  <span style={{ color:t.t2, fontSize:11 }}>{v.name.split(" ")[0]}</span>
                  <span style={{ color:t.t1, fontSize:11, fontWeight:700 }}>R${(total/1000).toFixed(1)}k</span>
                </div>
                <div style={{ height:8, background:t.bg4, borderRadius:4, overflow:"hidden" }}>
                  <div style={{ height:"100%", width:`${pct}%`, background:vc, borderRadius:4, transition:"width .8s ease" }}/>
                </div>
              </div>
            );
          })}
          {/* comissão total */}
          <div style={{ marginTop:20, paddingTop:16, borderTop:`1px solid ${t.b1}` }}>
            <div style={{ color:t.t4, fontSize:9, fontWeight:800, letterSpacing:1.8, textTransform:"uppercase", marginBottom:10 }}>COMISSÕES ESTE MÊS</div>
            {ativos.map((v,i) => {
              const vc = COLORS[i%COLORS.length];
              const com = Math.round(v.vendas.totalMes*(v.comissao/100));
              return (
                <div key={v.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"7px 0", borderBottom:i<ativos.length-1?`1px solid ${t.b2}`:"none" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                    <div style={{ width:6, height:6, borderRadius:"50%", background:vc }}/>
                    <span style={{ color:t.t2, fontSize:11 }}>{v.name.split(" ")[0]}</span>
                    <span style={{ color:t.t4, fontSize:10 }}>({v.comissao}%)</span>
                  </div>
                  <span style={{ color:C.green, fontSize:12, fontWeight:700 }}>R${com.toLocaleString("pt-BR")}</span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* ─ Painel individual expandido ─ */}
      {selected && (() => {
        const v   = VENDEDORES.find(x=>x.id===selected);
        if(!v) return null;
        const vc  = COLORS[VENDEDORES.indexOf(v)%COLORS.length];
        const pdata = PERIOD_DATA(v);
        const total = PERIOD_TOTAL(v);
        const comV  = Math.round(total*(v.comissao/100));
        const meta  = v.meta;
        const pct   = Math.min(100,Math.round((total/meta)*100));
        return (
          <Card style={{ padding:"28px", marginBottom:20, borderLeft:`3px solid ${vc}`, animation:"fadeIn .2s ease" }}>
            <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:22 }}>
              <div style={{ display:"flex", alignItems:"center", gap:16 }}>
                <div style={{ width:56, height:56, borderRadius:"50%", background:`${vc}18`, border:`2px solid ${vc}40`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <span style={{ color:vc, fontSize:18, fontWeight:800 }}>{v.avatar}</span>
                </div>
                <div>
                  <div style={{ color:t.t1, fontSize:17, fontWeight:800 }}>{v.name}</div>
                  <div style={{ color:t.t3, fontSize:12, marginTop:3 }}>
                    {v.email} · {formatPhone(v.phone)} · Na equipe desde {v.joined}
                  </div>
                </div>
              </div>
              <div style={{ display:"flex", gap:8 }}>
                <Btn v="ghost" sz="sm" onClick={()=>openEdit(v)}>✏ Editar Comissão</Btn>
                <Btn v="danger" sz="sm">⊘ Desativar</Btn>
              </div>
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:12, marginBottom:22 }}>
              {[
                { label:"Vendido (período)", val:`R$${(total/1000).toFixed(1)}k`, c:vc         },
                { label:"Comissão",          val:`R$${comV.toLocaleString("pt-BR")}`, c:C.green },
                { label:"Meta do Mês",       val:`R$${(meta/1000).toFixed(0)}k`, c:t.t1         },
                { label:"% da Meta",         val:`${pct}%`, c:pct>=100?C.green:pct>=70?C.amber:C.red },
                { label:"Taxa de Comissão",  val:`${v.comissao}%`, c:vc                         },
              ].map((k,i) => (
                <div key={i} style={{ padding:"14px 16px", background:t.bg3, borderRadius:10, border:`1px solid ${t.b1}` }}>
                  <div style={{ color:t.t3, fontSize:10, marginBottom:8 }}>{k.label}</div>
                  <div style={{ color:k.c, fontSize:20, fontWeight:800 }}>{k.val}</div>
                </div>
              ))}
            </div>

            {/* mini chart */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
              <div>
                <div style={{ color:t.t4, fontSize:9, fontWeight:800, letterSpacing:1.8, textTransform:"uppercase", marginBottom:12 }}>
                  EVOLUÇÃO — {period==="hoje"?"HOJE":period==="semana"?"ESTA SEMANA":"ESTE MÊS"}
                </div>
                {pdata.length > 0
                  ? <SalesBar data={pdata} color={vc}/>
                  : <div style={{ height:44, display:"flex", alignItems:"center", color:t.t4, fontSize:12 }}>Sem vendas neste período.</div>
                }
              </div>
              <div>
                <div style={{ color:t.t4, fontSize:9, fontWeight:800, letterSpacing:1.8, textTransform:"uppercase", marginBottom:12 }}>
                  VENDAS DE HOJE
                </div>
                {v.vendas.hoje.length>0 ? v.vendas.hoje.map((vd,i) => (
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:12, padding:"9px 0", borderBottom:i<v.vendas.hoje.length-1?`1px solid ${t.b2}`:"none" }}>
                    <div style={{ width:6, height:6, borderRadius:"50%", background:vc, flexShrink:0 }}/>
                    <div style={{ flex:1 }}>
                      <div style={{ color:t.t1, fontSize:12, fontWeight:600 }}>{vd.cliente}</div>
                      <div style={{ color:t.t3, fontSize:10 }}>{vd.plano} · {vd.hora}</div>
                    </div>
                    <span style={{ color:t.t1, fontSize:12, fontWeight:800 }}>R${(vd.valor/1000).toFixed(1)}k</span>
                  </div>
                )) : (
                  <div style={{ color:t.t4, fontSize:12 }}>Nenhuma venda hoje ainda.</div>
                )}
              </div>
            </div>
          </Card>
        );
      })()}

      {/* ─ Tabela de todos os vendedores ─ */}
      <Card style={{ overflow:"hidden" }}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 110px 110px 120px 120px 90px 90px", gap:12, padding:"9px 20px", background:t.bg3, borderBottom:`1px solid ${t.b1}` }}>
          {["Vendedor","Status","Meta (mês)","Vendido (mês)","Comissão","% Comis.",""].map((h,i)=>(
            <span key={i} style={{ color:t.t4, fontSize:9, fontWeight:800, letterSpacing:1.4, textTransform:"uppercase" }}>{h}</span>
          ))}
        </div>
        {VENDEDORES.map((v,i) => {
          const vc  = COLORS[i%COLORS.length];
          const pct = Math.min(100,Math.round((v.vendas.totalMes/v.meta)*100));
          const com = Math.round(v.vendas.totalMes*(v.comissao/100));
          return (
            <div key={v.id} style={{ display:"grid", gridTemplateColumns:"1fr 110px 110px 120px 120px 90px 90px", gap:12, padding:"13px 20px", alignItems:"center", borderTop:`1px solid ${t.b1}`, transition:"background .14s", background:selected===v.id?t.bg3:"transparent" }}
              onMouseEnter={e=>{ if(selected!==v.id)e.currentTarget.style.background=t.bg3; }}
              onMouseLeave={e=>{ if(selected!==v.id)e.currentTarget.style.background="transparent"; }}>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <div style={{ width:32, height:32, borderRadius:"50%", background:`${vc}18`, border:`1px solid ${vc}30`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  <span style={{ color:vc, fontSize:10, fontWeight:800 }}>{v.avatar}</span>
                </div>
                <div>
                  <div style={{ color:t.t1, fontSize:12, fontWeight:600 }}>{v.name}</div>
                  <div style={{ color:t.t3, fontSize:10, marginTop:1 }}>{v.email}</div>
                </div>
              </div>
              <StatusBadge s={v.status}/>
              <span style={{ color:t.t2, fontSize:12 }}>R${(v.meta/1000).toFixed(0)}k</span>
              <div>
                <div style={{ color:t.t1, fontSize:12, fontWeight:700, marginBottom:4 }}>R${(v.vendas.totalMes/1000).toFixed(1)}k</div>
                <div style={{ height:3, background:t.bg4, borderRadius:2, overflow:"hidden" }}>
                  <div style={{ height:"100%", width:`${pct}%`, background:pct>=100?C.green:pct>=70?C.amber:C.red, borderRadius:2 }}/>
                </div>
              </div>
              <span style={{ color:C.green, fontSize:12, fontWeight:700 }}>R${com.toLocaleString("pt-BR")}</span>
              <div>
                <span style={{ color:vc, fontSize:14, fontWeight:800 }}>{v.comissao}%</span>
              </div>
              <div style={{ display:"flex", gap:5 }}>
                <button onClick={()=>setSelected(selected===v.id?null:v.id)} style={{ padding:"4px 10px", borderRadius:7, cursor:"pointer", fontSize:10, fontWeight:700, background:t.bg3, color:t.t2, border:`1px solid ${t.b1}` }}>
                  {selected===v.id?"Fechar":"Detalhes"}
                </button>
              </div>
            </div>
          );
        })}
      </Card>

      {/* ─ ADD modal ─ */}
      <Modal open={addOpen} onClose={()=>setAddOpen(false)} title="Novo Vendedor">
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          <FormField label="Nome Completo"><Input value={form.name} onChange={v=>setForm({...form,name:v})} placeholder="Ana Costa"/></FormField>
          <FormField label="Email"><Input value={form.email} onChange={v=>setForm({...form,email:v})} placeholder="ana@united.com.br"/></FormField>
          <FormField label="Telefone"><input type="tel" value={formatPhoneInput(form.phone)} onChange={(e)=>setForm({...form, phone: parsePhoneInput(e.target.value)})} placeholder="(11) 98765-4321" style={{ width:"100%", padding:"9px 13px", background:t.bg3, border:`1px solid ${t.b1}`, borderRadius:8, color:t.t1, fontSize:12, outline:"none" }}/></FormField>
          <FormField label="Meta Mensal (R$)"><input type="text" inputMode="decimal" value={formatCurrencyInput(form.meta)} onChange={(e)=>setForm({...form, meta: parseCurrencyInput(e.target.value) })} placeholder="R$ 20.000,00" style={{ width:"100%", padding:"9px 13px", background:t.bg3, border:`1px solid ${t.b1}`, borderRadius:8, color:t.t1, fontSize:12, outline:"none" }}/></FormField>
        </div>
        <FormField label="% de Comissão">
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <input type="range" min="1" max="20" value={form.comissao} onChange={e=>setForm({...form,comissao:e.target.value})} style={{ flex:1, accentColor:C.blue }}/>
            <div style={{ minWidth:52, padding:"7px 12px", background:t.bg3, border:`1px solid ${t.bHi}`, borderRadius:8, textAlign:"center" }}>
              <span style={{ color:C.blue, fontSize:16, fontWeight:800 }}>{form.comissao}%</span>
            </div>
          </div>
        </FormField>
        <div style={{ display:"flex", gap:8, justifyContent:"flex-end", marginTop:8 }}>
          <Btn v="ghost" onClick={()=>setAddOpen(false)}>Cancelar</Btn>
          <Btn onClick={()=>setAddOpen(false)}>Adicionar Vendedor</Btn>
        </div>
      </Modal>

      {/* ─ EDIT comissão modal ─ */}
      <Modal open={!!editV} onClose={()=>setEditV(null)} title={editV?`Editar — ${editV.name}`:""} width={420}>
        {editV && (
          <>
            <div style={{ display:"flex", alignItems:"center", gap:14, padding:"14px 16px", background:t.bg3, borderRadius:10, border:`1px solid ${t.b1}`, marginBottom:20 }}>
              <div style={{ width:40, height:40, borderRadius:"50%", background:C.blueBg, border:`1px solid ${C.blue}30`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                <span style={{ color:C.blue, fontSize:14, fontWeight:800 }}>{editV.avatar}</span>
              </div>
              <div>
                <div style={{ color:t.t1, fontSize:13, fontWeight:700 }}>{editV.name}</div>
                <div style={{ color:t.t3, fontSize:11 }}>{editV.email}</div>
              </div>
            </div>
            <FormField label="Meta Mensal (R$)">
              <Input type="number" value={editV.metaEdit} onChange={v=>setEditV({...editV,metaEdit:v})} placeholder="20000"/>
            </FormField>
            <FormField label="Taxa de Comissão">
              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                <input type="range" min="1" max="20" value={editV.comissaoEdit}
                  onChange={e=>setEditV({...editV,comissaoEdit:e.target.value})}
                  style={{ flex:1, accentColor:C.green }}/>
                <div style={{ minWidth:52, padding:"7px 12px", background:t.bg3, border:`1px solid ${t.bHi}`, borderRadius:8, textAlign:"center" }}>
                  <span style={{ color:C.green, fontSize:16, fontWeight:800 }}>{editV.comissaoEdit}%</span>
                </div>
              </div>
              <div style={{ color:t.t3, fontSize:11, marginTop:8 }}>
                Comissão estimada este mês: <strong style={{ color:C.green }}>R${Math.round(editV.vendas.totalMes*(editV.comissaoEdit/100)).toLocaleString("pt-BR")}</strong>
              </div>
            </FormField>
            <div style={{ display:"flex", gap:8, justifyContent:"flex-end", marginTop:8 }}>
              <Btn v="ghost" onClick={()=>setEditV(null)}>Cancelar</Btn>
              <Btn onClick={()=>setEditV(null)}>Salvar Alterações</Btn>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}


export default function AdmApp() {
  const { user } = useAuth();
  const [isDark, setIsDark] = useState(true);
  const theme = isDark ? DARK : LIGHT;
  const [page, setPage] = useState("overview");
  const [collapsed, setCollapsed] = useState(false);
  const [fading, setFading] = useState(false);
  const [openAddClientModal, setOpenAddClientModal] = useState(false);
  const t = theme;
  const userName = user?.name || user?.email || "Usuário";
  const userInitials = (userName||"A").split(/\s+/).map(s=>s[0]).join("").slice(0,2).toUpperCase();

  const roleRaw = String(user?.role ?? user?.cargo ?? user?.type ?? "").trim().toLowerCase();
  const roleLabel = roleRaw.includes("gestor") ? "Gestor" : (roleRaw.includes("colaborador") || roleRaw.includes("integrante")) ? "Colaborador" : "Admin";
  const isAdmin = roleLabel === "Admin";
  const isGestor = roleLabel === "Gestor";
  const isColab = roleLabel === "Colaborador";
  const perms = {
    roleLabel,
    // Visualização
    canViewFinanceiro: isAdmin || isGestor,
    // Edição
    canWriteDisponibilizar: isAdmin || isGestor,
    canWriteAny: isAdmin,
    // Conveniência
    isAdmin,
    isGestor,
    isColab,
  };

  const navItems = ADM_NAV.filter((it) => {
    if (it.id === "financeiro" && !perms.canViewFinanceiro) return false;
    return true;
  });

  const goPage = (p, openAdd) => {
    setFading(true);
    setOpenAddClientModal(p === "clientes" && !!openAdd);
    setTimeout(() => { setPage(p); setFading(false); }, 120);
  };

  const PAGE_LABELS = {
    overview:"Visão Geral", clientes:"Clientes", colaboradores:"Colaboradores",
    financeiro:"Financeiro", produtos:"Produtos", alertas:"Alertas",
    notificacoes:"Notificações", relatorios:"Relatórios", disponibilizar:"Disponibilizar", producao:"Produção", comercial:"Comercial",
  };

  return (
    <Ctx.Provider value={theme}>
      <div style={{ display:"flex", height:"100vh", background:t.bg0, overflow:"hidden" }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
          *{box-sizing:border-box;margin:0;padding:0;font-family:'Plus Jakarta Sans',sans-serif;}
          ::-webkit-scrollbar{width:3px;height:3px;}
          ::-webkit-scrollbar-thumb{background:${t.isDark?"rgba(255,255,255,.1)":"rgba(0,0,0,.15)"};border-radius:2px;}
          ::-webkit-scrollbar-track{background:transparent;}
          input,select,textarea{font-family:'Plus Jakarta Sans',sans-serif;}
          input::placeholder,textarea::placeholder{color:${t.t4};}
          @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
          @keyframes modalIn{from{opacity:0;transform:scale(.97) translateY(8px)}to{opacity:1;transform:none}}
          .enter{animation:fadeIn .22s cubic-bezier(.4,0,.2,1);}
          .leave{animation:fadeIn .12s reverse forwards;}
        `}</style>

        {/* ─── SIDEBAR ─── */}
        <aside style={{ width:collapsed?52:214, background:t.bg1, borderRight:`1px solid ${t.b1}`, display:"flex", flexDirection:"column", transition:"width .26s cubic-bezier(.4,0,.2,1)", flexShrink:0, overflow:"hidden" }}>
          {/* Logo */}
          <div style={{ padding:collapsed?"18px 10px":"18px 16px", borderBottom:`1px solid ${t.b1}`, flexShrink:0 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <div style={{ width:32, height:32, flexShrink:0, borderRadius:9, background:t.accent, display:"flex", alignItems:"center", justifyContent:"center" }}>
                <span style={{ color:t.accentTxt, fontWeight:900, fontSize:15 }}>U</span>
              </div>
              {!collapsed && (
                <div>
                  <div style={{ color:t.t1, fontSize:12, fontWeight:800, letterSpacing:2 }}>UNITED</div>
                  <div style={{ display:"flex", alignItems:"center", gap:4, marginTop:3 }}>
                    <div style={{ width:5, height:5, borderRadius:"50%", background:C.red }}/>
                    <span style={{ color:C.red, fontSize:8, fontWeight:800, letterSpacing:2, textTransform:"uppercase" }}>Painel ADM</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Admin badge */}
          {!collapsed && (
            <div style={{ padding:"10px 12px", borderBottom:`1px solid ${t.b1}` }}>
              <div style={{ background:`${C.red}0a`, border:`1px solid ${C.red}22`, borderRadius:9, padding:"9px 12px" }}>
                <div style={{ color:C.red, fontSize:7, letterSpacing:2.5, textTransform:"uppercase", marginBottom:4 }}>Usuário</div>
                <div style={{ color:t.t1, fontSize:11, fontWeight:700 }}>{userName}</div>
                <div style={{ display:"flex", alignItems:"center", gap:5, marginTop:4 }}>
                  <Tag label={roleLabel} color={C.red} bg={C.redBg}/>
                </div>
              </div>
            </div>
          )}

          {/* Nav */}
          <nav style={{ flex:1, padding:"10px 6px", overflowY:"auto" }}>
            {navItems.map(item => {
              const active = page===item.id;
              return (
                <div key={item.id} onClick={()=>goPage(item.id)}
                  style={{ display:"flex", alignItems:"center", gap:9, padding:collapsed?"9px 11px":"8px 11px",
                    borderRadius:8, marginBottom:1, cursor:"pointer",
                    background:active?t.bg4:"transparent",
                    borderLeft:active?`2px solid ${t.accent}`:"2px solid transparent",
                    transition:"all .13s" }}
                  onMouseEnter={e=>{ if(!active)e.currentTarget.style.background=t.bg3; }}
                  onMouseLeave={e=>{ if(!active)e.currentTarget.style.background="transparent"; }}>
                  <span style={{ fontSize:13, color:active?t.t1:t.t3, flexShrink:0 }}>{item.icon}</span>
                  {!collapsed && <>
                    <span style={{ fontSize:11, fontWeight:active?700:500, color:active?t.t1:t.t3, flex:1 }}>{item.label}</span>
                    {item.b && <span style={{ fontSize:9, fontWeight:700, color:C.amber, background:C.amberBg, padding:"1px 6px", borderRadius:10 }}>{item.b}</span>}
                  </>}
                </div>
              );
            })}
          </nav>

          {/* Collapse */}
          <div style={{ padding:"8px 6px", borderTop:`1px solid ${t.b1}` }}>
            <div onClick={()=>setCollapsed(!collapsed)} style={{ display:"flex", alignItems:"center", gap:9, padding:"7px 11px", borderRadius:8, cursor:"pointer", transition:"background .13s" }}
              onMouseEnter={e=>e.currentTarget.style.background=t.bg3}
              onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              <span style={{ fontSize:11, color:t.t4 }}>{collapsed?"▶":"◀"}</span>
              {!collapsed && <span style={{ fontSize:11, color:t.t4 }}>Recolher</span>}
            </div>
          </div>
        </aside>

        {/* ─── MAIN ─── */}
        <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", minWidth:0 }}>
          {/* TOPBAR */}
          <header style={{ height:56, flexShrink:0, background:t.bg1, borderBottom:`1px solid ${t.b1}`, display:"flex", alignItems:"center", padding:"0 26px", gap:14 }}>
            <div style={{ display:"flex", alignItems:"center", gap:6, flexShrink:0 }}>
              <Tag label="ADM" color={C.red} bg={C.redBg}/>
              <span style={{ color:t.t4 }}>·</span>
              <span style={{ color:t.t1, fontSize:12, fontWeight:700 }}>{PAGE_LABELS[page]||page}</span>
            </div>
            <div style={{ flex:1 }}/>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              {/* Quick stats */}
              <div style={{ display:"flex", gap:10, padding:"5px 14px", background:t.bg3, borderRadius:8, border:`1px solid ${t.b1}` }}>
                <span style={{ color:t.t3, fontSize:11 }}>Painel administrativo</span>
              </div>
              <ThemeToggle isDark={isDark} onToggle={()=>setIsDark(!isDark)}/>
              {/* Alert bell */}
              <div style={{ position:"relative", cursor:"pointer", width:32, height:32, borderRadius:8, background:t.bg3, border:`1px solid ${t.b1}`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                <span style={{ color:t.t2, fontSize:14 }}>◐</span>
                <div style={{ position:"absolute", top:6, right:6, width:7, height:7, borderRadius:"50%", background:C.red, border:`2px solid ${t.bg1}` }}/>
              </div>
              {/* Avatar */}
              <div style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", padding:"5px 10px", borderRadius:8, background:t.bg3, border:`1px solid ${t.b1}` }}>
                <div style={{ width:22, height:22, borderRadius:"50%", background:t.bg5, display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <span style={{ color:t.t2, fontSize:8, fontWeight:800 }}>{userInitials}</span>
                </div>
                <span style={{ color:t.t2, fontSize:11, fontWeight:600 }}>{userName}</span>
                <Tag label={roleLabel} color={C.red} bg={C.redBg}/>
              </div>
            </div>
          </header>

          {/* CONTENT */}
          <main style={{ flex:1, overflowY:"auto", padding:"28px 30px", background:t.bg0, transition:"background .3s" }}>
            <div className={fading?"leave":"enter"} key={page+isDark}>
              {page==="overview"      && <OverviewPage onNavigate={(p, openAdd)=>goPage(p, openAdd)} perms={perms}/>}
              {page==="clientes"      && <ClientesPage openAddModal={openAddClientModal} onAddModalConsumed={()=>setOpenAddClientModal(false)} perms={perms}/>}
              {page==="colaboradores" && <ColabsPage perms={perms}/>}
              {page==="financeiro"    && (perms.canViewFinanceiro ? <FinanceiroPage perms={perms}/> : <Card style={{ padding:22 }}><div style={{ color:t.t1, fontWeight:800, fontSize:14, marginBottom:6 }}>Acesso restrito</div><div style={{ color:t.t3, fontSize:12, lineHeight:1.6 }}>Você não tem permissão para visualizar o Financeiro.</div></Card>)}
              {page==="produtos"       && <ProdutosPage perms={perms}/>}
              {page==="alertas"       && <AlertasPage perms={perms}/>}
              {page==="notificacoes"  && <NotificacoesPage perms={perms}/>}
              {page==="relatorios"    && <RelatoriosAdmPage perms={perms}/>}
              {page==="disponibilizar" && <DisponibilizarPage perms={perms}/>}
              {page==="producao"      && <ProducaoAdmPage perms={perms}/>}
              {page==="comercial"     && <ComercialPage perms={perms}/>}
            </div>
          </main>
        </div>
      </div>
    </Ctx.Provider>
  );
}
