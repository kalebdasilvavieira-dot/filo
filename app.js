(() => {
  const $ = id => document.getElementById(id);
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const GOAL = 67;

  /* Navegação */
  const VIEWS = ["perguntar", "ouvir", "aprender", "mural"];
  let current = null;
  function show(name, focus) {
    if (!VIEWS.includes(name)) name = "perguntar";
    if (name === current) return;
    current = name;
    VIEWS.forEach(v => { $("v-" + v).hidden = v !== name; });
    document.querySelectorAll(".tab").forEach(t => t.removeAttribute("aria-current"));
    document.querySelector('.tab[data-tab="' + name + '"]').setAttribute("aria-current", "page");
    window.scrollTo(0, 0);
    if (focus) { const h = $("v-" + name).querySelector("[tabindex]"); if (h) h.focus({ preventScroll: true }); }
    if (name === "perguntar") startWaves(); else stopWaves();
  }
  function go(name) { if (location.hash !== "#" + name) location.hash = name; else show(name, true); }
  addEventListener("hashchange", () => show(location.hash.slice(1), true));
  document.querySelectorAll("[data-go]").forEach(b => b.addEventListener("click", () => go(b.dataset.go)));

  /* Armazenamento local (conveniência por aparelho) */
  const KEY = "dois-ouvidos-licoes";
  const store = {
    get() { try { const v = JSON.parse(localStorage.getItem(KEY) || "[]"); return Array.isArray(v) ? v : []; } catch (e) { return []; } },
    set(v) { try { localStorage.setItem(KEY, JSON.stringify(v.slice(-200))); } catch (e) {} }
  };

  /* Ondas do topo */
  const cv = $("waves"), cx = cv.getContext("2d");
  let raf = null; const t0 = performance.now();
  function sizeCanvas() { const r = cv.getBoundingClientRect(), d = Math.min(devicePixelRatio || 1, 2); cv.width = Math.max(1, r.width * d); cv.height = Math.max(1, r.height * d); cx.setTransform(d, 0, 0, d, 0, 0); }
  function draw(t) {
    const w = cv.clientWidth, h = cv.clientHeight; if (!w) return;
    const cs = getComputedStyle(document.documentElement);
    const A = cs.getPropertyValue("--hero-a").trim(), B = cs.getPropertyValue("--hero-b").trim();
    cx.clearRect(0, 0, w, h);
    [{ x: w * .3, y: h * .36, col: A, p: 2600, max: Math.max(w, h) * .75, n: 6, core: 9 },
     { x: w * .78, y: h * .28, col: B, p: 4160, max: Math.max(w, h) * .32, n: 3, core: 6 }].forEach(s => {
      for (let i = 0; i < s.n; i++) {
        const ph = ((t / s.p) + i / s.n) % 1;
        cx.beginPath(); cx.arc(s.x, s.y, s.core + ph * s.max, 0, 6.2832);
        cx.strokeStyle = s.col; cx.globalAlpha = (1 - ph) * .55; cx.lineWidth = 1.6; cx.stroke();
      }
      cx.globalAlpha = 1; cx.beginPath(); cx.arc(s.x, s.y, s.core, 0, 6.2832); cx.fillStyle = s.col; cx.fill();
    });
  }
  function loop(now) { draw(now - t0); raf = requestAnimationFrame(loop); }
  function startWaves() { sizeCanvas(); if (reduce) { draw(1200); return; } if (!raf) raf = requestAnimationFrame(loop); }
  function stopWaves() { if (raf) cancelAnimationFrame(raf); raf = null; }
  addEventListener("resize", () => { if (current === "perguntar") { sizeCanvas(); draw(performance.now() - t0); } });
  document.addEventListener("visibilitychange", () => { if (document.hidden) stopWaves(); else if (current === "perguntar") startWaves(); });

  /* Perguntas */
  const DECK = {
    "Trabalho": { tint: "--t1", dot: "--ouvir", q: [
      "Qual foi o erro que mais te ensinou nesse trabalho?", "O que você sabe fazer aqui que ninguém percebe?",
      "Se você estivesse começando hoje, o que faria diferente?", "Qual decisão recente foi mais difícil de tomar? Por quê?",
      "Que conselho você daria para alguém no meu lugar?", "O que você gostaria que mais gente entendesse sobre o que você faz?" ] },
    "Família": { tint: "--t2", dot: "--falar", q: [
      "Como era um dia comum quando você tinha a minha idade?", "Qual foi a fase mais difícil da sua vida, e o que te ajudou a passar por ela?",
      "O que você aprendeu tarde demais?", "Quem te ensinou a coisa mais útil que você sabe?",
      "Do que você mais se orgulha e quase nunca fala?", "Que mudança no mundo mais te surpreendeu?" ] },
    "Amizade": { tint: "--t3", dot: "--ink", q: [
      "O que tem ocupado sua cabeça ultimamente?", "Em que você mudou de ideia nos últimos anos?",
      "O que você está aprendendo agora?", "Qual livro, filme ou pessoa mudou o jeito como você pensa?",
      "O que te deixa realmente animado hoje em dia?", "Tem algo em que você é muito bom e eu nunca soube?" ] },
    "Alguém novo": { tint: "--t4", dot: "--muted", q: [
      "Como você chegou até aqui?", "O que você faz que exige mais habilidade do que parece?",
      "Qual é a melhor coisa sobre o lugar onde você cresceu?", "O que as pessoas costumam entender errado sobre a sua área?",
      "Que pergunta você gostaria que te fizessem mais vezes?", "O que você recomendaria que eu conhecesse por aqui?" ] }
  };
  const TIPS = [
    "Quando a pessoa terminar, conte até dois antes de responder. Muitas vezes ela continua, e a melhor parte vem depois da pausa.",
    "Troque “eu também” por “e depois, o que aconteceu?”.",
    "Repita com suas palavras o que entendeu antes de dar sua opinião.",
    "Se você está pensando na sua resposta, não está ouvindo. Volte para a frase dela.",
    "Pergunte “por quê?” uma vez a mais do que parece educado.",
    "Segure a vontade de dar conselho. Primeiro entenda o problema inteiro."
  ];
  const ctxEl = $("ctx"), qEl = $("question"), qcard = $("qcard"), dotsEl = $("dots");
  let ctx = "Trabalho", qi = 0; const order = {};
  const shuffled = n => { const a = [...Array(n).keys()]; for (let i = n - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  function renderQ(animate) {
    const d = DECK[ctx], n = d.q.length; order[ctx] = order[ctx] || shuffled(n);
    const set = () => {
      qEl.textContent = d.q[order[ctx][qi % n]]; qEl.classList.remove("out");
      qcard.style.background = "var(" + d.tint + ")";
      dotsEl.replaceChildren(...d.q.map((_, i) => { const e = document.createElement("i"); if (i === qi % n) e.className = "on"; return e; }));
    };
    if (animate && !reduce) { qEl.classList.add("out"); setTimeout(set, 190); } else set();
    [...ctxEl.children].forEach(b => b.setAttribute("aria-pressed", String(b.dataset.ctx === ctx)));
  }
  Object.entries(DECK).forEach(([k, d]) => {
    const b = document.createElement("button"); b.type = "button"; b.className = "chip"; b.dataset.ctx = k;
    const dot = document.createElement("span"); dot.className = "dot"; dot.style.background = "var(" + d.tint + ")"; dot.style.boxShadow = "inset 0 0 0 1.5px var(" + d.dot + ")";
    b.append(dot, k);
    b.addEventListener("click", () => { if (ctx === k) return; ctx = k; qi = 0; renderQ(true); });
    ctxEl.appendChild(b);
  });
  $("nextQ").addEventListener("click", () => { qi++; renderQ(true); });
  renderQ(false);
  $("tip").textContent = TIPS[Math.floor(Math.random() * TIPS.length)];

  /* Medidor */
  const C = 2 * Math.PI * 110;
  const st = { mode: null, resume: null, o: 0, f: 0, since: 0 };
  let ticker = null, lock = null, resetTimer = null, lastSession = null;
  const fmt = ms => { const s = Math.floor(ms / 1000); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); };
  const clock = () => performance.now();
  function flush() { if (st.mode) { const t = clock(); st[st.mode] += t - st.since; st.since = t; } }
  const pctOf = (o, f) => (o + f) < 1000 ? null : Math.round(o / (o + f) * 100);
  function verdictFor(p) {
    if (p === null) return st.mode ? "Medindo…" : st.resume ? "Medição pausada." : "Toque em um dos botões quando a conversa começar.";
    if (p >= GOAL) return "Você está ouvindo bem. Continue perguntando.";
    if (p >= 50) return "Quase lá. Faça uma pergunta e espere a resposta inteira.";
    return "Você está falando mais do que ouvindo. Pare na próxima frase e pergunte algo.";
  }
  function renderMeter() {
    flush();
    const tot = st.o + st.f, p = pctOf(st.o, st.f);
    $("tO").textContent = fmt(st.o); $("tF").textContent = fmt(st.f);
    $("total").textContent = fmt(tot) + " de conversa";
    $("pct").textContent = p === null ? "–" : p + "%";
    const lo = tot ? st.o / tot * C : 0, lf = tot ? st.f / tot * C : 0;
    $("arcO").setAttribute("stroke-dasharray", lo + " " + C);
    $("arcF").setAttribute("stroke-dasharray", lf + " " + C);
    $("arcF").setAttribute("stroke-dashoffset", String(-lo));
    $("verdict").textContent = verdictFor(p);
    $("tgO").setAttribute("aria-pressed", String(st.mode === "o"));
    $("tgF").setAttribute("aria-pressed", String(st.mode === "f"));
    const has = tot > 0;
    $("pause").disabled = !has; $("reset").disabled = !has; $("finish").disabled = !has;
    $("pause").textContent = st.resume && !st.mode ? "Retomar" : "Pausar";
  }
  async function keepAwake(on) {
    try {
      if (on && !lock && navigator.wakeLock) { lock = await navigator.wakeLock.request("screen"); lock.addEventListener("release", () => { lock = null; }); }
      else if (!on && lock) { await lock.release(); lock = null; }
    } catch (e) {}
  }
  function setMode(m) {
    flush();
    st.mode = m; st.resume = m || st.resume; st.since = clock();
    if (m) { if (!ticker) ticker = setInterval(renderMeter, 250); keepAwake(true); }
    else { clearInterval(ticker); ticker = null; keepAwake(false); }
    renderMeter();
  }
  $("tgO").addEventListener("click", () => setMode(st.mode === "o" ? null : "o"));
  $("tgF").addEventListener("click", () => setMode(st.mode === "f" ? null : "f"));
  $("pause").addEventListener("click", () => { if (st.mode) setMode(null); else if (st.resume) setMode(st.resume); });
  $("reset").addEventListener("click", () => {
    const b = $("reset");
    if (!resetTimer) { b.textContent = "Zerar mesmo?"; resetTimer = setTimeout(() => { resetTimer = null; b.textContent = "Zerar"; }, 3000); return; }
    clearTimeout(resetTimer); resetTimer = null; b.textContent = "Zerar";
    setMode(null); st.o = 0; st.f = 0; st.resume = null; renderMeter();
  });
  $("finish").addEventListener("click", () => {
    setMode(null);
    const tot = st.o + st.f;
    lastSession = tot >= 1000 ? { o: st.o, f: st.f, pct: pctOf(st.o, st.f) } : null;
    st.o = 0; st.f = 0; st.resume = null; renderMeter();
    renderSession(); go("aprender");
  });
  addEventListener("pagehide", () => { flush(); });
  document.addEventListener("visibilitychange", () => { if (!document.hidden && st.mode) { keepAwake(true); renderMeter(); } });
  renderMeter();

  /* Aprender */
  function renderSession() {
    const box = $("sess");
    if (!lastSession) { box.hidden = true; return; }
    const p = lastSession.pct, tot = lastSession.o + lastSession.f;
    box.hidden = false;
    $("sessPct").textContent = "Você ouviu " + p + "% da conversa";
    $("sessTime").textContent = fmt(tot) + (p >= GOAL ? ", acima da meta." : ", abaixo da meta de " + GOAL + "%.");
    $("sessArc").setAttribute("stroke-dasharray", (p / 100 * 119.4) + " 119.4");
  }
  function renderStats() {
    const h = store.get(), withP = h.filter(x => typeof x.pct === "number");
    $("mCount").textContent = h.length;
    $("mAvg").textContent = withP.length ? Math.round(withP.reduce((a, x) => a + x.pct, 0) / withP.length) + "%" : "–";
    $("mHit").textContent = withP.length ? withP.filter(x => x.pct >= GOAL).length + " de " + withP.length : "–";
  }
  const licao = $("licao"), statusEl = $("status");
  function setStatus(msg, cls) { statusEl.textContent = msg; statusEl.className = "status" + (cls ? " " + cls : ""); }
  licao.addEventListener("input", () => { $("cc").textContent = licao.value.length + " / 280"; if (statusEl.classList.contains("err")) setStatus(""); });
  renderStats();

  /* Mural compartilhado */
  let db = null;
  const wallEl = $("wall"), notice = $("wallNotice");
  const rtf = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" });
  function ago(ts) {
    const m = Math.round((ts - Date.now()) / 60000);
    if (Math.abs(m) < 1) return "agora";
    if (Math.abs(m) < 60) return rtf.format(m, "minute");
    const h = Math.round(m / 60); if (Math.abs(h) < 24) return rtf.format(h, "hour");
    return rtf.format(Math.round(h / 24), "day");
  }
  function emptyWall(title, text) {
    const d = document.createElement("div"); d.className = "empty";
    const b = document.createElement("b"); b.textContent = title;
    const s = document.createElement("span"); s.textContent = text; d.append(b, s);
    if (title.startsWith("O mural está vazio")) {
      const a = document.createElement("button"); a.type = "button"; a.className = "btn go"; a.textContent = "Escrever a primeira lição";
      a.addEventListener("click", () => go("aprender")); d.append(a);
    }
    wallEl.replaceChildren(d);
  }
  function renderWall(snap) {
    if (snap.empty) { emptyWall("O mural está vazio", "Guarde uma lição com a opção de publicar ligada e ela aparece aqui."); return; }
    const tints = ["--t1", "--t2", "--t3", "--t4"];
    wallEl.replaceChildren(...snap.docs.map((doc, i) => {
      const x = doc.data() || {};
      const text = String(x.text || "").slice(0, 280), rel = String(x.rel || "").trim().slice(0, 60);
      const n = document.createElement("article"); n.className = "note"; n.style.background = "var(" + tints[i % 4] + ")";
      const q = document.createElement("blockquote"); q.textContent = "“" + text + "”";
      const who = document.createElement("div"); who.className = "who";
      const av = document.createElement("span"); av.className = "av"; av.setAttribute("aria-hidden", "true"); av.textContent = (rel[0] || "?").toUpperCase();
      const info = document.createElement("div"), nm = document.createElement("span"), r = document.createElement("span");
      nm.className = "n"; nm.textContent = rel ? rel[0].toUpperCase() + rel.slice(1) : "Alguém"; r.className = "r"; r.textContent = typeof x.ts === "number" ? ago(x.ts) : "";
      info.append(nm, r); who.append(av, info);
      if (typeof x.pct === "number" && x.pct >= 0 && x.pct <= 100) {
        const bd = document.createElement("span"); bd.className = "badge"; bd.textContent = "ouviu " + Math.round(x.pct) + "%"; who.append(bd);
      }
      n.append(q, who); return n;
    }));
  }
  async function initWall() {
    const timer = setTimeout(() => {
      notice.hidden = false; notice.textContent = "O mural demorou a responder. Suas lições continuam guardadas neste aparelho.";
      emptyWall("Mural indisponível", "Tente de novo em instantes.");
    }, 10000);
    try { db = window.claude && claude.use ? await claude.use("db") : null; } catch (e) { db = null; }
    if (!db) {
      clearTimeout(timer);
      notice.hidden = false; notice.textContent = "O mural precisa de conexão e de uma conta. Você ainda pode guardar lições neste aparelho.";
      $("share").checked = false; $("share").disabled = true;
      emptyWall("Mural indisponível", "Entre na sua conta para ler e publicar lições.");
      return;
    }
    db.collection("wall").orderBy("ts", "desc").limit(60).onSnapshot(
      snap => { clearTimeout(timer); notice.hidden = true; renderWall(snap); },
      () => { clearTimeout(timer); notice.hidden = false; notice.textContent = "Não foi possível carregar o mural agora."; emptyWall("Mural indisponível", "Tente de novo em instantes."); }
    );
  }
  initWall();

  $("form").addEventListener("submit", async e => {
    e.preventDefault();
    const text = licao.value.trim(), rel = $("rel").value.trim();
    if (text.length < 8) { setStatus("Escreva pelo menos uma frase sobre o que você aprendeu.", "err"); licao.focus(); return; }
    const btn = $("save"); btn.disabled = true; setStatus("Guardando…");
    const pct = lastSession ? lastSession.pct : null;
    const h = store.get(); h.push({ t: text, rel, pct, ts: Date.now() }); store.set(h); renderStats();
    let msg = "Lição guardada neste aparelho.", cls = "ok";
    if ($("share").checked && db) {
      try {
        const doc = { text, ts: Date.now() }; if (rel) doc.rel = rel; if (pct !== null) doc.pct = pct;
        await db.collection("wall").add(doc);
        msg = "Lição guardada e publicada no mural.";
      } catch (err) { msg = "Guardada neste aparelho, mas não foi possível publicar. Tente de novo mais tarde."; cls = "err"; }
    }
    setStatus(msg, cls); btn.disabled = false;
    if (cls === "ok") { licao.value = ""; $("rel").value = ""; $("cc").textContent = "0 / 280"; lastSession = null; renderSession(); }
  });

  /* Início */
  show(location.hash.slice(1), false);
})();
