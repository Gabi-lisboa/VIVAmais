import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase, supabaseEnabled } from "./supabase";
import {
  Heart, House, CalendarDays, Users, HandHeart, ShoppingBasket, Pill,
  Phone, CircleHelp, Mic, Volume2, Menu, Bell, MapPin, Clock, ChevronRight,
  Accessibility, LogOut, UserRound, ClipboardList, Settings, Plus, Search,
  Check, X, ShieldAlert, Stethoscope, MessageCircle, ClipboardCheck, Send,
  UserPlus, CalendarCheck, Activity, LockKeyhole, Eye, EyeOff, ArrowLeft,
  MapPinned, CircleUserRound, FileText, HeartHandshake
} from "lucide-react";

const STORAGE_KEY = "viva-mais-demo-v1";

const initialData = {
  users: [
    { id: "idosa1", name: "Maria Oliveira", email: "maria@viva.demo", password: "123456", role: "idoso", phone: "(11) 99999-1111", city: "Santo André", familyIds: ["familia1"] },
    { id: "familia1", name: "Ana Oliveira", email: "ana@viva.demo", password: "123456", role: "familiar", phone: "(11) 98888-2222", linkedElderIds: ["idosa1"] },
    { id: "vol1", name: "Carlos Santos", email: "carlos@viva.demo", password: "123456", role: "voluntario", phone: "(11) 97777-3333", skills: "Companhia e acompanhamento", city: "Santo André" }
  ],
  requests: [
    { id: 1, elderId: "idosa1", title: "Acompanhamento ao mercado", details: "Preciso de companhia para fazer compras.", category: "Mercado", date: "2026-11-18", status: "Disponível", volunteerId: null, createdAt: "Hoje" },
    { id: 2, elderId: "idosa1", title: "Companhia para conversar", details: "Gostaria de conversar durante a tarde.", category: "Companhia", date: "2026-11-20", status: "Aceita", volunteerId: "vol1", createdAt: "Ontem" }
  ],
  activities: [
    { id: 1, title: "Oficina de artes", place: "Centro Comunitário", date: "2026-11-18", time: "15:00", category: "Cultura", city: "Santo André" },
    { id: 2, title: "Grupo de música", place: "Casa de Cultura", date: "2026-11-19", time: "14:00", category: "Convivência", city: "Santo André" },
    { id: 3, title: "Caminhada no parque", place: "Parque Central", date: "2026-11-21", time: "08:30", category: "Bem-estar", city: "Santo André" }
  ],
  checkins: [{ id: 1, elderId: "idosa1", mood: "Bem", date: "Hoje", note: "Estou me sentindo bem." }],
  reminders: [
    { id: 1, elderId: "idosa1", title: "Tomar medicamento", date: "Hoje", time: "20:00", kind: "Medicamento", done: false },
    { id: 2, elderId: "idosa1", title: "Consulta médica", date: "21/11/2026", time: "10:00", kind: "Consulta", done: false }
  ],
  alerts: []
};

function readStore() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : initialData;
  } catch { return initialData; }
}

const roleNames = { idoso: "Pessoa idosa", familiar: "Familiar", voluntario: "Voluntário" };
const navByRole = {
  idoso: [
    ["Início", House], ["Pedir ajuda", HandHeart], ["Atividades", CalendarDays],
    ["Saúde", Pill], ["Minha família", Users], ["Meu bem-estar", Heart], ["Configurações", Settings]
  ],
  familiar: [
    ["Início", House], ["Pessoa acompanhada", HeartHandshake], ["Solicitações", ClipboardList],
    ["Agenda", CalendarDays], ["Bem-estar", Activity], ["Configurações", Settings]
  ],
  voluntario: [
    ["Início", House], ["Pedidos disponíveis", HandHeart], ["Minha agenda", CalendarDays],
    ["Atividades", MapPinned], ["Meu histórico", ClipboardCheck], ["Configurações", Settings]
  ]
};

function Logo() {
  return <div className="brand-lockup">
    <div className="brand-symbol"><Heart size={36} strokeWidth={2.8}/></div>
    <div className="brand-word">VIVA<span>+</span></div>
    <div className="brand-tag">Conectando pessoas</div>
  </div>;
}


function mapCloudRequest(r) {
  return {
    id: r.id, elderId: r.elder_id, title: r.title, details: r.details || '',
    category: r.category, date: r.requested_date || 'A combinar',
    status: r.status, volunteerId: r.volunteer_id,
    targetVolunteerId: null, urgent: r.urgent, createdAt: r.created_at
  };
}

function App() {
  const [db, setDb] = useState(readStore);
  const [user, setUser] = useState(null);
  const [page, setPage] = useState("Início");
  const [authMode, setAuthMode] = useState("login");
  const [toast, setToast] = useState("");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [search, setSearch] = useState("");
  const [authLoading, setAuthLoading] = useState(supabaseEnabled);
  const [syncError, setSyncError] = useState("");
  const [acceptedNotice, setAcceptedNotice] = useState(null);
  const noticeQueue = useRef([]);
  const pendingNoticeIds = useRef(new Set());
  const syncedUserId = useRef(null);
  const syncReady = useRef(false);
  const saveTimer = useRef(null);
  const currentUserId = user?.id;
  async function refreshRequests() {
    if (!supabaseEnabled || !currentUserId) return;
    const { data, error } = await supabase.from('help_requests')
      .select('id,elder_id,title,details,category,requested_date,status,volunteer_id,urgent,created_at')
      .order('created_at', { ascending: false }).limit(250);
    if (error) { setSyncError('Não foi possível carregar pedidos: ' + error.message); return; }
    const requests = (data || []).map(mapCloudRequest);
    setDb(d => ({...d, requests}));
    if (user?.role === 'idoso') {
      // v2: só considera "visto" quando o idoso fecha o aviso.
      // Isso impede que uma atualização da página faça a mensagem desaparecer.
      const key = `viva-accepted-v2-${currentUserId}`;
      let saved = [];
      try { saved = JSON.parse(localStorage.getItem(key) || '[]'); } catch {}
      const seen = new Set(Array.isArray(saved) ? saved.map(String) : []);
      const fresh = requests.filter(r =>
        String(r.elderId) === String(currentUserId) &&
        (String(r.status).trim().toLowerCase() === 'aceita' ||
         String(r.status).trim().toLowerCase() === 'aceito') &&
        !seen.has(String(r.id)) && !pendingNoticeIds.current.has(String(r.id))
      );
      fresh.forEach(r => {
        pendingNoticeIds.current.add(String(r.id));
        noticeQueue.current.push(r);
      });
      if (fresh.length) setAcceptedNotice(old => old || noticeQueue.current.shift() || null);
    }
  }
  useEffect(() => {
    noticeQueue.current = [];
    pendingNoticeIds.current.clear();
    setAcceptedNotice(null);
    if (!supabaseEnabled || !currentUserId) return;
    refreshRequests();
    const timer = window.setInterval(refreshRequests, 8000);
    const onFocus = () => refreshRequests();
    window.addEventListener('focus', onFocus);
    return () => {window.clearInterval(timer); window.removeEventListener('focus', onFocus);};
  }, [currentUserId, user?.role]);

  async function createRequest(item) {
    if (!supabaseEnabled) {
      update(d => { d.requests.unshift(item); return d; });
      return true;
    }
    const { data, error } = await supabase.from('help_requests').insert({
      elder_id: item.elderId, title: item.title, details: item.details || '',
      category: item.category || 'Apoio', requested_date: item.date || 'A combinar',
      urgent: Boolean(item.urgent)
    }).select('id,elder_id,title,details,category,requested_date,status,volunteer_id,urgent,created_at').single();
    if (error) { notify('Não foi possível enviar o pedido: ' + error.message); return false; }
    setDb(d => ({...d, requests: [mapCloudRequest(data), ...d.requests.filter(r => r.id !== data.id)]}));
    return true;
  }

  async function changeRequestStatus(id, action) {
    if (!supabaseEnabled) {
      update(d => {const r=d.requests.find(x=>x.id===id); if (r) {
        r.status=action==='accept'?'Aceita':'Concluída';
        if(action==='accept') r.volunteerId=currentUserId;
      } return d;});
      return true;
    }
    const { error } = await supabase.rpc(action === 'accept' ? 'accept_help_request' : 'finish_help_request', {p_request_id:id});
    if (error) {notify('Não foi possível atualizar pedido: ' + error.message);return false;}
    await refreshRequests();
    return true;
  }

  useEffect(() => {
    if (!supabaseEnabled) return;
    let active = true;
    async function loadSession() {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (!active) return;
      if (error) setSyncError(error.message);
      if (session?.user) await restoreUser(session.user);
      else setAuthLoading(false);
    }
    async function restoreUser(authUser) {
      setAuthLoading(true);
      syncReady.current = false;
      const { data: profile, error } = await supabase.from('profiles').select('*').eq('id', authUser.id).single();
      if (!active) return;
      if (error || !profile) {
        setSyncError('Perfil não encontrado. Confira se o SQL de instalação foi executado.');
        setAuthLoading(false);
        return;
      }
      const { data: saved, error: stateError } = await supabase.from('user_data').select('payload').eq('user_id', authUser.id).maybeSingle();
      if (!active) return;
      if (stateError) setSyncError('Não foi possível carregar os dados: ' + stateError.message);
      const current = { id: profile.id, name: profile.full_name, email: authUser.email, role: profile.role, phone: profile.phone || '', city: profile.city || '', skills: profile.skills || '', familyIds: [], linkedElderIds: [] };
      const payload = saved?.payload || {};
      setDb({ users: [current], requests: [], activities: initialData.activities, checkins: payload.checkins || [], reminders: payload.reminders || [], alerts: payload.alerts || [] });
      syncedUserId.current = authUser.id;
      setUser(current);
      setAuthLoading(false);
      // Enable saving after the initial state has been applied.
      window.setTimeout(() => { if (active) syncReady.current = true; }, 0);
    }
    loadSession();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        syncReady.current = false; syncedUserId.current = null;
        setUser(null); setDb(initialData); setAuthLoading(false);
      }
      // SIGNED_IN is handled by explicit login and initial session restoration.
    });
    return () => { active = false; subscription.unsubscribe(); if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, []);

  useEffect(() => {
    if (!supabaseEnabled || !syncReady.current || !syncedUserId.current) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    const userId = syncedUserId.current;
    saveTimer.current = setTimeout(async () => {
      const payload = { requests: [], checkins: db.checkins.filter(x => x.elderId === userId), reminders: db.reminders.filter(x => x.elderId === userId), alerts: db.alerts.filter(x => x.elderId === userId) };
      const { error } = await supabase.from('user_data').upsert({ user_id: userId, payload, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
      if (error) setSyncError('Falha ao salvar no Supabase: ' + error.message);
      else setSyncError('');
    }, 500);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [JSON.stringify(db.checkins), JSON.stringify(db.reminders), JSON.stringify(db.alerts)]);

  useEffect(() => { if (!supabaseEnabled) localStorage.setItem(STORAGE_KEY, JSON.stringify(db)); }, [db]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(timer);
  }, [toast]);

  const update = (fn) => setDb(prev => fn(structuredClone(prev)));
  const notify = (text) => setToast(text);
  const logout = async () => {
    if (supabaseEnabled) {
      syncReady.current = false;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      await supabase.auth.signOut();
    }
    setUser(null); setPage("Início"); setMobileMenu(false);
  };

  if (authLoading) return <div className="auth-screen"><div className="auth-form-panel"><h2>Carregando VIVA+...</h2></div></div>;
  if (!user) return <AuthScreen db={db} update={update} authMode={authMode} setAuthMode={setAuthMode}
    onLogin={setUser} notify={notify} onCloudLogin={async authUser => {
      const { data: profile, error } = await supabase.from('profiles').select('*').eq('id', authUser.id).single();
      if (error) throw new Error('Perfil indisponível: ' + error.message);
      const { data: saved, error: stateError } = await supabase.from('user_data').select('payload').eq('user_id', authUser.id).maybeSingle();
      if (stateError) throw new Error(stateError.message);
      const current = { id: profile.id, name: profile.full_name, email: authUser.email, role: profile.role, phone: profile.phone || '', city: profile.city || '', skills: profile.skills || '', familyIds: [], linkedElderIds: [] };
      const payload = saved?.payload || {};
      setDb({ users: [current], requests: [], activities: initialData.activities, checkins: payload.checkins || [], reminders: payload.reminders || [], alerts: payload.alerts || [] });
      syncedUserId.current = authUser.id;
      setUser(current);
      window.setTimeout(() => { syncReady.current = true; }, 0);
    }} />;

  const currentUser = db.users.find(u => u.id === user.id) || user;
  const nav = navByRole[currentUser.role] || navByRole.idoso;

  return <div className="app-shell">
    <aside className={`sidebar ${mobileMenu ? "open" : ""}`}>
      <Logo />
      <div className="side-profile">
        <div className="avatar">{currentUser.name?.[0]?.toUpperCase() || "V"}</div>
        <div><strong>{currentUser.name}</strong><small>{roleNames[currentUser.role]}</small></div>
      </div>
      <nav className="side-nav">
        {nav.map(([label, Icon]) => <button key={label} className={`nav-item ${page === label ? "active" : ""}`}
          onClick={() => { setPage(label); setMobileMenu(false); }}>
          <Icon size={20}/><span>{label}</span>
        </button>)}
      </nav>
      <div className="sidebar-bottom">
        <div className="sidebar-message"><Heart size={18}/><span>Ninguém precisa envelhecer sozinho.</span></div>
        <button className="nav-item logout" onClick={logout}><LogOut size={19}/> Sair da conta</button>
      </div>
    </aside>

    <main className="main-area">
      <header className="topbar">
        <button className="mobile-menu-button" onClick={() => setMobileMenu(!mobileMenu)} aria-label="Abrir menu"><Menu/></button>
        <div className="top-search"><Search size={18}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar na plataforma..." /></div>
        <div className="top-user"><span className="role-chip">{roleNames[currentUser.role]}</span><div className="avatar small">{currentUser.name?.[0]?.toUpperCase()}</div></div>
      </header>

      {supabaseEnabled && <div className="cloud-banner">☁️ Supabase conectado · Vínculos familiares com aprovação disponíveis. Alertas de emergência ainda não enviam notificações reais.</div>}
      {syncError && <div className="cloud-error" role="alert">{syncError}</div>}
      <div className="page-content">
        {currentUser.role === "idoso" && <ElderPages page={page} user={currentUser} db={db} update={update} notify={notify} speak={speak} createRequest={createRequest}/>}
        {currentUser.role === "familiar" && <FamilyPages page={page} user={currentUser} db={db} update={update} notify={notify}/>}
        {currentUser.role === "voluntario" && <VolunteerPages page={page} user={currentUser} db={db} update={update} notify={notify} changeRequestStatus={changeRequestStatus} refreshRequests={refreshRequests}/>}
      </div>
      <footer className="footer">VIVA+ · Conectando pessoas · Demonstração acadêmica</footer>
    </main>
    {acceptedNotice && currentUser.role === 'idoso' && <div className="accepted-overlay">
      <div className="accepted-dialog" role="dialog" aria-modal="true" aria-labelledby="accepted-title" aria-describedby="accepted-description">
        <div className="accepted-icon"><HeartHandshake size={42}/></div>
        <h2 id="accepted-title">Boas notícias! 💜</h2>
        <p id="accepted-description">Um voluntário aceitou seu pedido de ajuda!</p>
        <div className="accepted-request"><span>SEU PEDIDO</span><strong>{acceptedNotice.title}</strong><div><Check size={20}/> Ajuda confirmada</div></div>
        <button className="accepted-read" onClick={() => speak(`Boas notícias! Um voluntário aceitou seu pedido de ajuda! Seu pedido: ${acceptedNotice.title}. Ajuda confirmada.`)}><Volume2 size={22}/> Ouvir mensagem</button>
        <button className="accepted-close" onClick={() => { window.speechSynthesis?.cancel();
          const key = `viva-accepted-v2-${currentUserId}`;
          let saved = [];
          try { saved = JSON.parse(localStorage.getItem(key) || '[]'); } catch {}
          const seen = new Set(Array.isArray(saved) ? saved.map(String) : []);
          seen.add(String(acceptedNotice.id));
          try { localStorage.setItem(key, JSON.stringify([...seen])); } catch {}
          pendingNoticeIds.current.delete(String(acceptedNotice.id));
          setAcceptedNotice(noticeQueue.current.shift() || null); }}>Entendi, obrigado! 💜</button>
      </div>
    </div>}
    {toast && <div className="toast" role="status"><Check size={18}/>{toast}<button onClick={() => setToast("")}><X size={16}/></button></div>}
  </div>;
}

function speak(text) {
  if (!("speechSynthesis" in window)) return alert("Leitura em voz alta não suportada neste navegador.");
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text); u.lang = "pt-BR"; window.speechSynthesis.speak(u);
}

function AuthScreen({ db, update, authMode, setAuthMode, onLogin, notify, onCloudLogin }) {
  const [role, setRole] = useState("idoso");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");

  const [submitting, setSubmitting] = useState(false);
  async function submit(e) {
    e.preventDefault(); setError("");
    if (supabaseEnabled) {
      setSubmitting(true);
      try {
        if (authMode === 'login') {
          const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
          if (error) throw error;
          await onCloudLogin(data.user);
        } else {
          if (!name.trim() || password.length < 6) throw new Error('Informe nome e senha com pelo menos 6 caracteres.');
          const { data, error } = await supabase.auth.signUp({
            email: email.trim(), password,
            options: { data: { full_name: name.trim(), role } }
          });
          if (error) throw error;
          if (!data.session) { setError('Cadastro realizado! Confirme o e-mail recebido e depois faça login.'); setAuthMode('login'); }
          else await onCloudLogin(data.user);
        }
      } catch (err) { setError(err.message || 'Não foi possível acessar sua conta.'); }
      finally { setSubmitting(false); }
      return;
    }
    if (authMode === "login") {
      const found = db.users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
      if (!found) return setError("E-mail ou senha incorretos. Confira os dados ou crie uma conta.");
      onLogin(found); return;
    }
    if (!name.trim() || !email.trim() || password.length < 6) return setError("Preencha todos os campos. A senha precisa ter pelo menos 6 caracteres.");
    if (db.users.some(u => u.email.toLowerCase() === email.toLowerCase())) return setError("Este e-mail já está cadastrado.");
    const newUser = { id: crypto.randomUUID(), name: name.trim(), email: email.trim(), password, role,
      phone: "", city: "", familyIds: [], linkedElderIds: [], skills: "" };
    update(d => { d.users.push(newUser); return d; });
    onLogin(newUser);
  }

  return <div className="auth-screen">
    <div className="auth-brand-panel">
      <Logo/>
      <div className="auth-quote"><h1>Conexões que fazem bem.</h1><p>Uma rede de apoio, companhia e cuidado para que ninguém precise envelhecer sozinho.</p></div>
      <div className="auth-heart"><Heart size={100}/></div>
    </div>
    <div className="auth-form-panel">
      <form className="auth-form" onSubmit={submit}>
        <span className="eyebrow">BEM-VINDO AO VIVA+</span>
        <h2>{authMode === "login" ? "Acesse sua conta" : "Crie sua conta"}</h2>
        <p className="muted">{authMode === "login" ? "Entre para se conectar à sua rede de apoio." : "Faça parte de uma comunidade que aproxima pessoas."}</p>
        {authMode === "register" && <>
          <label>Como deseja participar?</label>
          <div className="role-choice">
            {["idoso", "familiar", "voluntario"].map(r => <button type="button" key={r} className={role === r ? "chosen" : ""} onClick={() => setRole(r)}>{roleNames[r]}</button>)}
          </div>
          <label>Nome completo</label><input required value={name} onChange={e => setName(e.target.value)} placeholder="Seu nome"/>
        </>}
        <label>E-mail</label><input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="voce@email.com"/>
        <label>Senha</label>
        <div className="password-wrap"><input type={showPass ? "text" : "password"} required minLength="6" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo de 6 caracteres"/><button type="button" onClick={() => setShowPass(!showPass)} aria-label="Mostrar senha">{showPass ? <EyeOff size={18}/> : <Eye size={18}/>}</button></div>
        {error && <div className="form-error">{error}</div>}
        <button className="primary-button full" type="submit" disabled={submitting}>{submitting ? 'Aguarde...' : authMode === "login" ? "Entrar" : "Criar minha conta"} <ChevronRight size={18}/></button>
        <p className="switch-auth">{authMode === "login" ? "Ainda não tem conta?" : "Já possui cadastro?"} <button type="button" onClick={() => {setAuthMode(authMode === "login" ? "register" : "login"); setError("");}}>{authMode === "login" ? "Cadastre-se" : "Fazer login"}</button></p>
        {!supabaseEnabled && authMode === "login" && <div className="demo-access"><strong>Acesso para demonstração</strong><span>Idoso: maria@viva.demo · 123456</span><span>Familiar: ana@viva.demo · 123456</span><span>Voluntário: carlos@viva.demo · 123456</span></div>}
        <small className="privacy-note"><LockKeyhole size={13}/>{supabaseEnabled ? 'Autenticação protegida pelo Supabase Auth.' : 'Demonstração local. Não utilize senhas reais.'}</small>
      </form>
    </div>
  </div>;
}

function PageHeader({ title, subtitle, action }) {
  return <div className="page-header"><div><span className="eyebrow">VIVA+ · CONECTANDO PESSOAS</span><h1>{title}</h1><p>{subtitle}</p></div>{action}</div>;
}
function Card({ children, className="" }) { return <section className={`card ${className}`}>{children}</section>; }
function Empty({ text }) { return <div className="empty-state"><Heart size={25}/><p>{text}</p></div>; }


function normalizeVoice(text) {
  return (text || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function distanceKm(aLat, aLng, bLat, bLng) {
  const toRad = value => value * Math.PI / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const value = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

function EmergencyDialog({ onConfirm, onCancel, busy, message }) {
  return <div className="emergency-overlay" role="presentation">
    <section className="emergency-dialog" role="dialog" aria-modal="true" aria-labelledby="emergency-title">
      <div className="emergency-dialog-icon"><ShieldAlert size={42}/></div>
      <h2 id="emergency-title">Você precisa de ajuda?</h2>
      <p>Vamos registrar seu pedido e sua localização, se autorizada. O envio real aos contatos será habilitado em uma próxima etapa.</p>
      {message && <p className="emergency-feedback" role="status">{message}</p>}
      <button className="emergency-confirm" disabled={busy} onClick={onConfirm}>
        {busy ? "Enviando alerta..." : "SIM, PRECISO DE AJUDA"}
      </button>
      <button className="emergency-cancel" disabled={busy} onClick={onCancel}>Não, cancelar</button>
      <small>Este recurso não envia notificações de emergência para terceiros. No modo Supabase, o registro fica salvo na sua conta. Em perigo real, ligue 192 (SAMU) ou 190 (Polícia Militar).</small>
    </section>
  </div>;
}

function ElderPages({ page, user, db, update, notify, createRequest }) {
  const [requestTitle, setRequestTitle] = useState("");
  const [listeningEmergency, setListeningEmergency] = useState(false);
  const [showEmergency, setShowEmergency] = useState(false);
  const [emergencyBusy, setEmergencyBusy] = useState(false);
  const [emergencyFeedback, setEmergencyFeedback] = useState("");
  const recognitionRef = useRef(null);

  useEffect(() => {
    if (!listeningEmergency) return;
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      setListeningEmergency(false);
      notify("Seu navegador não oferece escuta contínua. Tente Chrome ou Edge.");
      return;
    }

    let shouldContinue = true;
    let restartTimer = null;
    const recognition = new Recognition();
    recognitionRef.current = recognition;
    recognition.lang = "pt-BR";
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = event => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const spoken = normalizeVoice(event.results[i][0].transcript);
        if (/(\bsocorro\b|preciso de ajuda|ativar emergencia|emergencia)/.test(spoken)) {
          shouldContinue = false;
          setListeningEmergency(false);
          setEmergencyFeedback("");
          setShowEmergency(true);
          speak("Entendi que você pode precisar de ajuda. Confirme na tela para enviar um alerta.");
          break;
        }
      }
    };
    recognition.onerror = event => {
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        shouldContinue = false;
        setListeningEmergency(false);
        notify("Permita o uso do microfone nas configurações do navegador.");
      }
    };
    recognition.onend = () => {
      if (shouldContinue) {
        restartTimer = window.setTimeout(() => {
          try { recognition.start(); } catch {}
        }, 700);
      }
    };

    try { recognition.start(); }
    catch {
      shouldContinue = false;
      setListeningEmergency(false);
      notify("Não foi possível iniciar o microfone. Tente novamente.");
    }

    return () => {
      shouldContinue = false;
      if (restartTimer) window.clearTimeout(restartTimer);
      recognition.onresult = null;
      recognition.onend = null;
      try { recognition.stop(); } catch {}
      if (recognitionRef.current === recognition) recognitionRef.current = null;
    };
  }, [listeningEmergency]);

  function sendEmergency() {
    setEmergencyBusy(true);
    setEmergencyFeedback("Obtendo sua localização...");
    const finishAlert = async (coords) => {
      const volunteers = db.users.filter(u => u.role === "voluntario");
      const located = coords ? volunteers
        .filter(v => Number.isFinite(v.latitude) && Number.isFinite(v.longitude))
        .map(v => ({ ...v, distanceKm: distanceKm(coords.latitude, coords.longitude, v.latitude, v.longitude) }))
        .sort((a, b) => a.distanceKm - b.distanceKm) : [];
      const nearest = located[0] || null;
      const alertId = Date.now();
      const location = coords ? { latitude: coords.latitude, longitude: coords.longitude } : null;
      const alert = {
        id: alertId, elderId: user.id, createdAt: new Date().toISOString(),
        date: new Date().toLocaleString("pt-BR"), message: "Alerta de emergência solicitado",
        location, volunteerId: nearest?.id || null,
        distanceKm: nearest ? Number(nearest.distanceKm.toFixed(2)) : null,
        status: "Enviado"
      };
      update(d => {
        d.alerts = d.alerts || [];
        d.alerts.unshift(alert);
        if (!supabaseEnabled) d.requests.unshift({
          id: alertId + 1, elderId: user.id, title: "EMERGÊNCIA — pedido de apoio",
          details: location
            ? (nearest
              ? `Alerta urgente. Voluntário mais próximo: ${nearest.name} (${nearest.distanceKm.toFixed(1)} km).`
              : "Alerta urgente. Localização recebida, mas nenhum voluntário compartilhou sua localização ainda.")
            : "Alerta urgente. A localização não foi compartilhada; verificar contato com a pessoa.",
          category: "Emergência", date: new Date().toLocaleString("pt-BR"),
          status: "Disponível", volunteerId: null,
          targetVolunteerId: nearest?.id || null, urgent: true,
          location, createdAt: new Date().toISOString()
        });
        return d;
      });
      if (supabaseEnabled) {
        const ok = await createRequest({
          elderId: user.id, title: 'EMERGÊNCIA — pedido de apoio',
          details: 'Pedido urgente de ajuda. Localização e acionamento oficial não são enviados automaticamente.',
          category: 'Emergência', date: new Date().toLocaleString('pt-BR'), urgent: true
        });
        if (!ok) { setEmergencyBusy(false); setEmergencyFeedback('O pedido não foi enviado. Tente novamente ou ligue 192/190 em caso de perigo.'); return; }
      }
      setEmergencyBusy(false);
      setShowEmergency(false);
      setEmergencyFeedback("");
      if (nearest) {
        notify(`Alerta registrado nesta demonstração. ${nearest.name} é o voluntário mais próximo (${nearest.distanceKm.toFixed(1)} km).`);
        speak(`Alerta enviado. O voluntário ${nearest.name} está a aproximadamente ${nearest.distanceKm.toFixed(1)} quilômetros.`);
      } else {
        notify(coords
          ? "Alerta registrado neste navegador. Ainda não há voluntário com localização compartilhada."
          : "Alerta registrado neste navegador, sem localização disponível.");
        speak("Seu alerta foi registrado. Seus contatos e voluntários poderão verificar a solicitação.");
      }
    };

    if (!navigator.geolocation) {
      finishAlert(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      position => finishAlert({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
      () => finishAlert(null),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  }

  const myRequestTitlePlaceholder = "Ex.: companhia para ir ao mercado";
  const [requestDetails, setRequestDetails] = useState("");
  const [mood, setMood] = useState("");
  const [reminderTitle, setReminderTitle] = useState("");
  const [reminderTime, setReminderTime] = useState("20:00");
  const myRequests = db.requests.filter(r => r.elderId === user.id);
  const myReminders = db.reminders.filter(r => r.elderId === user.id);
  const family = db.users.filter(u => (user.familyIds || []).includes(u.id));
  const [familyInvites, setFamilyInvites] = useState([]);
  const [familyLoading, setFamilyLoading] = useState(false);
  async function refreshFamilyInvites() {
    if (!supabaseEnabled) return;
    setFamilyLoading(true);
    const { data, error } = await supabase.rpc('get_family_connections');
    setFamilyLoading(false);
    if (error) return notify('Não foi possível carregar solicitações: ' + error.message);
    setFamilyInvites((data || []).filter(item => item.status === 'pending'));
    update(d => {const me=d.users.find(u=>u.id===user.id); if (!me) return d;
      const approved=(data || []).filter(item=>item.status==='approved');
      me.familyIds=approved.map(item=>item.id);
      d.users=[...d.users.filter(u=>u.id===user.id || !approved.some(item=>item.id===u.id)),...approved.map(item=>({id:item.id,name:item.name,city:item.city,role:'familiar'}))];
      return d;});
  }
  useEffect(() => { if (supabaseEnabled) refreshFamilyInvites(); }, [user.id]);
  async function answerFamilyInvite(id, approved) {
    const { error } = await supabase.rpc('respond_family_link', {p_link_id:id, p_approve:approved});
    if (error) return notify('Erro ao responder: ' + error.message);
    notify(approved ? 'Familiar autorizado!' : 'Solicitação recusada.');
    await refreshFamilyInvites();
  }
  const activities = db.activities.filter(a => !user.city || !a.city || a.city.toLowerCase() === user.city.toLowerCase());

  if (page === "Início") return <>
    <PageHeader title={`Olá, ${user.name.split(" ")[0]}!`} subtitle="Estamos aqui para ajudar. O que você gostaria de fazer hoje?"
      action={<button className="outline-button" onClick={() => speak("Olá! Bem-vindo ao VIVA Mais. Você pode pedir ajuda, ver atividades ou falar com sua família.")}><Volume2 size={18}/> Ouvir instruções</button>}/>
    <Card className="emergency-listening-card">
      <div className="emergency-listening-copy">
        <strong><Mic size={20}/> Assistente de emergência por voz</strong>
        <span>{listeningEmergency ? "Escuta ativa. Diga “Socorro” ou “Preciso de ajuda”." : "Ative para que o VIVA+ reconheça um pedido de socorro enquanto estiver aberto."}</span>
      </div>
      <button className={listeningEmergency ? "voice-stop-button" : "voice-start-button"}
        onClick={() => { if (listeningEmergency) setListeningEmergency(false); else { setEmergencyFeedback(""); setListeningEmergency(true); } }}>
        {listeningEmergency ? "Desativar escuta" : "Ativar escuta"}
      </button>
    </Card>
    <Card className="mood-card"><div><h2>Como você está se sentindo?</h2><p>Escolha uma carinha ou fale com a gente.</p></div><div className="mood-buttons">
      {[["😊","Bem"],["😐","Mais ou menos"],["🙁","Triste"]].map(([emoji,label]) => <button key={label} className={mood === label ? "selected-mood" : ""} onClick={() => {setMood(label); update(d => {d.checkins.unshift({id:Date.now(), elderId:user.id, mood:label, date:"Hoje", note:""}); return d;}); notify("Seu check-in foi registrado."); speak(`Você informou que está ${label}. Obrigado por contar.`);}}><span>{emoji}</span>{label}</button>)}
      <button className="voice-mood" onClick={() => startVoice(notify, text => {setMood(text); update(d => {d.checkins.unshift({id:Date.now(), elderId:user.id, mood:text, date:"Hoje", note:"Resposta por voz"}); return d;});})}><Mic size={25}/> Falar como estou</button>
    </div></Card>
    <h2 className="section-title">Como podemos ajudar?</h2>
    <div className="feature-grid">
      <Feature icon={HandHeart} title="Preciso de ajuda" text="Peça apoio para tarefas do dia a dia" onClick={() => notify("Acesse 'Pedir ajuda' no menu para enviar uma solicitação.")}/>
      <Feature icon={Users} title="Quero companhia" text="Converse ou encontre alguém para acompanhar você" onClick={() => notify("Você pode pedir companhia na área 'Pedir ajuda'.")}/>
      <Feature icon={CalendarDays} title="Ver atividades" text="Encontros e oficinas na comunidade" onClick={() => notify("Acesse 'Atividades' no menu.")}/>
      <Feature icon={Pill} title="Minha saúde" text="Veja seus lembretes de cuidado" onClick={() => notify("Acesse 'Saúde' no menu.")}/>
      <Feature icon={Phone} title="Minha família" text="Veja quem está conectado a você" onClick={() => notify("Acesse 'Minha família' no menu.")}/>
      <Feature icon={ShieldAlert} title="Emergência" text="Pedir ajuda e compartilhar sua localização" danger onClick={() => {setEmergencyFeedback(""); setShowEmergency(true);}}/>
    </div>
    <div className="two-columns">
      <Card><CardTitle icon={CalendarDays} title="Próximas atividades"/>{activities.slice(0,2).map(a => <ActivityRow key={a.id} item={a}/>)}{!activities.length && <Empty text="Ainda não há atividades cadastradas para sua região."/>}</Card>
      <Card><CardTitle icon={Pill} title="Meus lembretes"/>{myReminders.slice(0,3).map(r => <ReminderRow key={r.id} item={r} onToggle={() => update(d => {const x=d.reminders.find(v=>v.id===r.id); x.done=!x.done; return d;})}/>)}{!myReminders.length && <Empty text="Você ainda não tem lembretes."/>}</Card>
    </div>
    {showEmergency && <EmergencyDialog busy={emergencyBusy} message={emergencyFeedback}
      onConfirm={sendEmergency} onCancel={() => {setShowEmergency(false); setEmergencyFeedback("");}}/>}
  </>;

  if (page === "Pedir ajuda") return <>
    <PageHeader title="Pedir ajuda" subtitle="Conte o que você precisa. Alguém da rede VIVA+ poderá ajudar."/>
    <div className="two-columns">
      <Card><CardTitle icon={HandHeart} title="Nova solicitação"/>
        <form className="stack-form" onSubmit={async e => {e.preventDefault(); if(!requestTitle.trim()) return; const ok=await createRequest({id:Date.now(), elderId:user.id, title:requestTitle, details:requestDetails, category:"Apoio", date:"A combinar", status:"Disponível", volunteerId:null, createdAt:"Agora"}); if(ok){setRequestTitle("");setRequestDetails("");notify("Sua solicitação foi criada.");}}}>
          <label>Do que você precisa?</label><input required value={requestTitle} onChange={e=>setRequestTitle(e.target.value)} placeholder="Ex.: companhia para ir ao mercado"/>
          <label>Conte um pouco mais</label><textarea value={requestDetails} onChange={e=>setRequestDetails(e.target.value)} placeholder="Escreva ou peça ajuda para preencher..." rows="4"/>
          <button type="button" className="outline-button" onClick={() => startVoice(notify, setRequestDetails)}><Mic size={17}/> Falar em vez de escrever</button>
          <button className="primary-button" type="submit"><Send size={17}/> Enviar solicitação</button>
        </form>
      </Card>
      <Card><CardTitle icon={ClipboardList} title="Minhas solicitações"/>{myRequests.map(r => <RequestRow key={r.id} item={r} db={db}/>)}{!myRequests.length && <Empty text="Você ainda não fez solicitações."/>}</Card>
    </div>
  </>;

  if (page === "Atividades") return <>
    <PageHeader title="Atividades da comunidade" subtitle="Encontros, oficinas e experiências para fazer novas amizades."/>
    <div className="activity-grid">{activities.map(a => <Card key={a.id}><div className="activity-art"><CalendarDays size={32}/></div><span className="tag">{a.category}</span><h3>{a.title}</h3><p><MapPin size={15}/>{a.place}</p><p><CalendarDays size={15}/>{a.date} · {a.time}</p><button className="outline-button full" onClick={() => notify(`Interesse registrado em ${a.title}. A confirmação depende da organização do evento.`)}>Tenho interesse</button></Card>)}</div>
    {!activities.length && <Empty text="Nenhuma atividade cadastrada para esta região ainda."/>}
    <p className="helper-text">As atividades exibidas são exemplos cadastrados na demonstração. A integração com fontes externas de eventos será uma etapa futura.</p>
  </>;

  if (page === "Saúde") return <>
    <PageHeader title="Saúde e bem-estar" subtitle="Organize seus lembretes de medicamentos e consultas."/>
    <div className="two-columns">
      <Card><CardTitle icon={Plus} title="Adicionar lembrete"/>
        <form className="stack-form" onSubmit={e => {e.preventDefault(); update(d => {d.reminders.push({id:Date.now(), elderId:user.id, title:reminderTitle, date:"Hoje", time:reminderTime, kind:"Lembrete", done:false}); return d;}); setReminderTitle(""); notify("Lembrete adicionado.");}}>
          <label>O que deseja lembrar?</label><input required value={reminderTitle} onChange={e=>setReminderTitle(e.target.value)} placeholder="Ex.: tomar medicamento"/>
          <label>Horário</label><input type="time" value={reminderTime} onChange={e=>setReminderTime(e.target.value)}/>
          <button className="primary-button" type="submit">Salvar lembrete</button>
        </form>
      </Card>
      <Card><CardTitle icon={Clock} title="Meus lembretes"/>{myReminders.map(r=><ReminderRow key={r.id} item={r} onToggle={()=>update(d=>{const x=d.reminders.find(v=>v.id===r.id);x.done=!x.done;return d;})}/>)}{!myReminders.length&&<Empty text="Nenhum lembrete por enquanto."/>}</Card>
    </div>
  </>;

  if (page === "Minha família") return <>
    <PageHeader title="Minha família" subtitle="Pessoas autorizadas a acompanhar você no VIVA+."/>
    <Card><CardTitle icon={Users} title="Pessoas conectadas"/>{family.map(f=><div className="person-row" key={f.id}><div className="avatar">{f.name[0]}</div><div className="person-info"><strong>{f.name}</strong><small>{f.email} · Familiar</small></div><span className="status good">Conectado</span></div>)}{!family.length&&<Empty text="Você ainda não tem familiares conectados. Compartilhe seu e-mail de cadastro com alguém da família para que essa pessoa solicite o vínculo."/>}</Card>
    {supabaseEnabled && <Card><CardTitle icon={UserPlus} title="Solicitações de familiares"/>
      <button className="outline-button" onClick={refreshFamilyInvites} disabled={familyLoading}>Atualizar solicitações</button>
      {familyInvites.map(invite => <div className="list-row" key={invite.link_id}><div><strong>{invite.name}</strong><small>Quer acompanhar suas informações</small></div><div className="inline-form"><button className="primary-button" onClick={()=>answerFamilyInvite(invite.link_id,true)}>Aceitar</button><button className="outline-button" onClick={()=>answerFamilyInvite(invite.link_id,false)}>Recusar</button></div></div>)}
      {!familyInvites.length && <p className="helper-text">Nenhuma solicitação pendente. Use Atualizar solicitações se alguém acabou de pedir acesso.</p>}
    </Card>}
    <Card><CardTitle icon={UserPlus} title="Como conectar alguém?"/><p>Peça para seu familiar criar uma conta no VIVA+ e solicitar o vínculo usando seu e-mail cadastrado. Você decide se aceita ou recusa.</p></Card>
  </>;

  if (page === "Meu bem-estar") return <>
    <PageHeader title="Meu bem-estar" subtitle="Veja seus registros de como está se sentindo."/>
    <Card><CardTitle icon={Heart} title="Histórico de check-ins"/>{db.checkins.filter(c=>c.elderId===user.id).map(c=><div className="list-row" key={c.id}><strong>{c.mood}</strong><span>{c.date}</span></div>)}</Card>
  </>;

  return <SettingsPage user={user} notify={notify}/>;
}

function FamilyPages({ page, user, db, update, notify }) {
  const linked = db.users.filter(u => (user.linkedElderIds || []).includes(u.id));
  const [email, setEmail] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [familyPending, setFamilyPending] = useState([]);
  const [familyWorking, setFamilyWorking] = useState(false);
  async function refreshConnections() {
    if (!supabaseEnabled) return;
    const {data,error}=await supabase.rpc('get_family_connections');
    if (error) return notify('Não foi possível consultar vínculos: '+error.message);
    const approved=(data||[]).filter(x=>x.status==='approved');
    setFamilyPending((data||[]).filter(x=>x.status==='pending'));
    update(d=>{
      const me=d.users.find(u=>u.id===user.id);
      if (!me) return d;
      me.linkedElderIds=approved.map(x=>x.id);
      d.users=[...d.users.filter(u=>u.id===user.id),...approved.map(x=>({id:x.id,name:x.name,city:x.city,role:'idoso'}))];
      d.requests=approved.flatMap(x=>x.shared?.requests||[]);
      d.reminders=approved.flatMap(x=>x.shared?.reminders||[]);
      d.checkins=approved.flatMap(x=>x.shared?.checkins||[]);
      d.alerts=approved.flatMap(x=>x.shared?.alerts||[]);
      return d;
    });
  }
  useEffect(()=>{if(supabaseEnabled) refreshConnections();},[user.id]);
  const requests = db.requests.filter(r => linked.some(e => e.id === r.elderId));
  const reminders = db.reminders.filter(r => linked.some(e => e.id === r.elderId));
  const checkins = db.checkins.filter(c => linked.some(e => e.id === c.elderId));
  const emergencyAlerts = (db.alerts || []).filter(a => linked.some(e => e.id === a.elderId));

  async function linkElder(e) {
    e.preventDefault();
    if (supabaseEnabled) {
      setFamilyWorking(true);
      const {data,error}=await supabase.rpc('request_family_link',{p_elder_email:email.trim()});
      setFamilyWorking(false);
      if (error) return notify('Não foi possível solicitar: '+error.message);
      setEmail(''); notify(data || 'Solicitação registrada.');
      await refreshConnections();
      return;
    }
    const target = db.users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.role === "idoso");
    if (!target) return notify("Não encontramos uma conta de idoso com esse e-mail.");
    if ((user.linkedElderIds || []).includes(target.id)) return notify("Essa pessoa já está vinculada.");
    update(d => {const fam=d.users.find(u=>u.id===user.id); const elder=d.users.find(u=>u.id===target.id); fam.linkedElderIds=[...(fam.linkedElderIds||[]),target.id]; elder.familyIds=[...(elder.familyIds||[]),user.id]; return d;});
    setEmail(""); notify("Vínculo criado nesta demonstração.");
  }

  if (page === "Início" || page === "Pessoa acompanhada") return <>
    <PageHeader title="Sua rede de cuidado" subtitle="Acompanhe as pessoas que autorizaram compartilhar informações com você."/>
    <Card><CardTitle icon={UserPlus} title="Conectar-se a uma pessoa idosa"/>
      <form className="inline-form" onSubmit={linkElder}><input type="email" required placeholder="E-mail cadastrado pela pessoa idosa" value={email} onChange={e=>setEmail(e.target.value)}/><button className="primary-button" disabled={familyWorking}>{familyWorking ? 'Enviando...' : 'Solicitar vínculo'}</button></form>
      {supabaseEnabled && <><button className="outline-button" onClick={refreshConnections}>Atualizar vínculos</button>{familyPending.map(item=><p className="helper-text" key={item.link_id}>Solicitação pendente para {item.name}. Aguarde a aprovação.</p>)}</>}
      <p className="helper-text">{supabaseEnabled ? 'O idoso precisa entrar em Minha família e aceitar sua solicitação. Depois, clique em Atualizar vínculos.' : 'Na demonstração local, você pode conectar a conta maria@viva.demo.'}</p>
    </Card>
    <div className="people-grid">{linked.map(elder=><Card key={elder.id}><div className="person-card-head"><div className="avatar large">{elder.name[0]}</div><div><h3>{elder.name}</h3><span className="status good">Vínculo ativo</span></div></div><p className="muted">{elder.city || "Cidade não informada"}</p><button className="outline-button full" onClick={()=>notify(`Você está acompanhando ${elder.name}.`)}>Ver informações autorizadas</button></Card>)}</div>
    {!linked.length&&<Empty text="Você ainda não está conectado a uma pessoa idosa. Use o campo acima para solicitar um vínculo."/>}
    {emergencyAlerts.length > 0 && <Card className="family-emergency-card">
      <CardTitle icon={ShieldAlert} title="Alertas de emergência"/>
      {emergencyAlerts.slice(0,5).map(alert => {
        const elder = linked.find(e => e.id === alert.elderId);
        const volunteer = db.users.find(v => v.id === alert.volunteerId);
        return <div className="list-row" key={alert.id}>
          <div><strong>{elder?.name || "Pessoa acompanhada"}</strong><small>{alert.date || new Date(alert.createdAt).toLocaleString("pt-BR")}</small>
          <small>{volunteer ? `Voluntário mais próximo: ${volunteer.name}${alert.distanceKm != null ? ` · ${alert.distanceKm} km` : ""}` : "Aguardando voluntário com localização disponível"}</small></div>
          <span className="status pending">Alerta</span>
        </div>;
      })}
    </Card>}
    <div className="two-columns">
      <Card><CardTitle icon={ClipboardList} title="Solicitações recentes"/>{requests.slice(0,4).map(r=><RequestRow key={r.id} item={r} db={db}/>)}{!requests.length&&<Empty text="Nenhuma solicitação compartilhada."/>}</Card>
      <Card><CardTitle icon={Pill} title="Lembretes compartilhados"/>{reminders.map(r=><ReminderRow key={r.id} item={r}/>)}{!reminders.length&&<Empty text="Nenhum lembrete compartilhado."/>}</Card>
    </div>
  </>;

  if (page === "Solicitações") return <><PageHeader title="Solicitações" subtitle="Pedidos das pessoas idosas vinculadas a você."/><Card>{requests.map(r=><RequestRow key={r.id} item={r} db={db}/>)}{!requests.length&&<Empty text="Nenhuma solicitação encontrada."/>}</Card></>;
  if (page === "Agenda") return <><PageHeader title="Agenda compartilhada" subtitle="Lembretes e compromissos autorizados."/><Card>{reminders.map(r=><ReminderRow key={r.id} item={r}/>)}{!reminders.length&&<Empty text="Nenhum compromisso compartilhado."/>}</Card></>;
  if (page === "Bem-estar") return <><PageHeader title="Bem-estar" subtitle="Confira os check-ins compartilhados pelas pessoas vinculadas."/><Card>{checkins.map(c=><div className="list-row" key={c.id}><strong>{linked.find(e=>e.id===c.elderId)?.name}</strong><span>{c.mood} · {c.date}</span></div>)}{!checkins.length&&<Empty text="Nenhum check-in compartilhado."/>}</Card></>;
  return <SettingsPage user={user} notify={notify}/>;
}

function VolunteerPages({ page, user, db, update, notify, changeRequestStatus, refreshRequests }) {
  const [skills, setSkills] = useState(user.skills || "");
  const [city, setCity] = useState(user.city || "");
  const available = db.requests.filter(r => r.status === "Disponível" && (!r.targetVolunteerId || r.targetVolunteerId === user.id));
  const accepted = db.requests.filter(r => r.volunteerId === user.id && r.status === "Aceita");
  const history = db.requests.filter(r => r.volunteerId === user.id && r.status === "Concluída");

  async function accept(id) {
    if (await changeRequestStatus(id, 'accept')) notify("Você aceitou o pedido de apoio.");
  }
  async function finish(id) {
    if (await changeRequestStatus(id, 'finish')) notify("Atividade marcada como concluída.");
  }

  function shareVolunteerLocation() {
    if (!navigator.geolocation) return notify("A geolocalização não está disponível neste navegador.");
    notify("Solicitando sua localização...");
    navigator.geolocation.getCurrentPosition(position => {
      update(d => {
        const volunteer = d.users.find(u => u.id === user.id);
        if (volunteer) {
          volunteer.latitude = position.coords.latitude;
          volunteer.longitude = position.coords.longitude;
          volunteer.locationUpdatedAt = new Date().toISOString();
        }
        return d;
      });
      notify("Localização compartilhada para aproximar pedidos de emergência. Você pode atualizar quando quiser.");
    }, () => notify("Não foi possível obter sua localização. Confira a permissão do navegador."),
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 });
  }

  if (page === "Início" || page === "Pedidos disponíveis") return <>
    <PageHeader title={`Olá, ${user.name.split(" ")[0]}!`} subtitle="Veja como você pode fazer a diferença hoje."/>
    <div className="stats-grid"><Stat icon={HandHeart} value={available.length} label="Pedidos disponíveis"/><Stat icon={CalendarCheck} value={accepted.length} label="Acompanhamentos aceitos"/><Stat icon={Heart} value={history.length} label="Ações concluídas"/></div>
    <Card className="volunteer-location-card">
      <CardTitle icon={MapPin} title="Localização para pedidos próximos"/>
      <p className="helper-text">Compartilhe sua localização atual para calcular distâncias nesta demonstração. Os dados ficam neste navegador e só são atualizados quando você tocar no botão.</p>
      <button className="outline-button" onClick={shareVolunteerLocation}><MapPinned size={17}/> Compartilhar minha localização atual</button>
      {user.latitude != null && user.longitude != null && <span className="location-confirmation"><Check size={15}/> Localização compartilhada</span>}
    </Card>
    <Card><CardTitle icon={HandHeart} title="Pedidos que precisam de apoio"/><button className="outline-button" onClick={refreshRequests} style={{marginBottom:12}}>Atualizar pedidos</button>{available.map(r=><div className="request-card" key={r.id}><div><span className="tag">{r.category}</span><h3>{r.title}</h3><p>{r.details || "A pessoa não adicionou detalhes."}</p><small><CalendarDays size={14}/> {r.date}</small></div><button className="primary-button" onClick={()=>accept(r.id)}>Aceitar pedido</button></div>)}{!available.length&&<Empty text="Não há pedidos disponíveis no momento."/>}</Card>
    <Card><CardTitle icon={CalendarDays} title="Meus acompanhamentos"/>{accepted.map(r=><div className="request-card" key={r.id}><div><h3>{r.title}</h3><p>{r.details}</p><span className="status good">Aceita</span></div><button className="outline-button" onClick={()=>finish(r.id)}>Marcar concluída</button></div>)}{!accepted.length&&<Empty text="Você ainda não aceitou pedidos."/>}</Card>
  </>;

  if (page === "Minha agenda") return <><PageHeader title="Minha agenda" subtitle="Acompanhe os pedidos que você aceitou."/><Card>{accepted.map(r=><div className="request-card" key={r.id}><div><h3>{r.title}</h3><p>{r.date} · {r.details}</p></div><button className="outline-button" onClick={()=>finish(r.id)}>Concluir</button></div>)}{!accepted.length&&<Empty text="Sua agenda está vazia."/>}</Card></>;
  if (page === "Atividades") return <><PageHeader title="Atividades da comunidade" subtitle="Conheça iniciativas cadastradas na plataforma."/><div className="activity-grid">{db.activities.map(a=><Card key={a.id}><span className="tag">{a.category}</span><h3>{a.title}</h3><p><MapPin size={15}/>{a.place}</p><p><CalendarDays size={15}/>{a.date} · {a.time}</p></Card>)}</div></>;
  if (page === "Meu histórico") return <><PageHeader title="Meu histórico" subtitle="Veja as atividades que você concluiu."/><Card>{history.map(r=><div className="list-row" key={r.id}><strong>{r.title}</strong><span className="status good">Concluída</span></div>)}{!history.length&&<Empty text="Você ainda não concluiu atividades."/>}</Card></>;
  return <SettingsPage user={user} notify={notify}/>;
}

function SettingsPage({ user, notify }) {
  return <><PageHeader title="Configurações" subtitle="Informações da sua conta e preferências."/><Card><CardTitle icon={UserRound} title="Meu perfil"/><div className="profile-details"><div className="avatar large">{user.name[0]}</div><div><h3>{user.name}</h3><p>{user.email}</p><span className="tag">{roleNames[user.role]}</span></div></div><p className="helper-text">Esta versão demonstra a navegação e os fluxos principais. A edição segura de perfil e recuperação de senha serão conectadas ao serviço de autenticação na etapa de produção.</p></Card><Card><CardTitle icon={Accessibility} title="Acessibilidade"/><button className="outline-button" onClick={()=>speak("O VIVA Mais conecta pessoas e oferece apoio, companhia e inclusão.")}><Volume2 size={17}/> Ouvir apresentação do VIVA+</button></Card></>;
}

function Feature({ icon: Icon, title, text, onClick, danger }) {
  return <button className={`feature-card ${danger ? "danger-card" : ""}`} onClick={onClick}><span className="feature-icon"><Icon size={26}/></span><strong>{title}</strong><small>{text}</small><ChevronRight size={17} className="feature-arrow"/></button>;
}
function CardTitle({ icon: Icon, title }) { return <div className="card-title"><Icon size={20}/><h3>{title}</h3></div>; }
function ActivityRow({ item }) { return <div className="activity-row"><div className="mini-icon"><CalendarDays size={18}/></div><div><strong>{item.title}</strong><small>{item.date} · {item.time} · {item.place}</small></div></div>; }
function ReminderRow({ item, onToggle }) { return <div className="reminder-row"><div className="mini-icon"><Pill size={18}/></div><div className="row-grow"><strong className={item.done ? "done-text" : ""}>{item.title}</strong><small>{item.date} · {item.time}</small></div>{onToggle && <button className={`check-button ${item.done ? "checked" : ""}`} onClick={onToggle} aria-label="Marcar lembrete">{item.done ? <Check size={16}/> : <Clock size={16}/>}</button>}</div>; }
function RequestRow({ item, db }) { const volunteer = db.users.find(u=>u.id===item.volunteerId); return <div className="request-row"><div className="row-grow"><strong>{item.title}</strong><small>{item.details || "Sem detalhes"} · {item.date}</small>{volunteer&&<small>Voluntário: {volunteer.name}</small>}</div><span className={`status ${item.status==="Aceita"?"good":item.status==="Concluída"?"done":"pending"}`}>{item.status}</span></div>; }
function Stat({ icon: Icon, value, label }) { return <Card className="stat-card"><div className="mini-icon"><Icon size={20}/></div><strong>{value}</strong><span>{label}</span></Card>; }

function startVoice(notify, onText) {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Recognition) return notify("O reconhecimento de voz não está disponível neste navegador. Tente usar o Chrome ou Edge.");
  const rec = new Recognition(); rec.lang = "pt-BR"; rec.interimResults = false; rec.maxAlternatives = 1;
  rec.onresult = e => { const text = e.results[0][0].transcript; onText(text); notify(`Você disse: "${text}"`); };
  rec.onerror = () => notify("Não consegui entender. Tente novamente.");
  rec.start();
}

export default App;
