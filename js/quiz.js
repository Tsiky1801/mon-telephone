/* Quiz « Culture générale » — modes, niveaux, records et historique. */
"use strict";

(() => {
  const { el, showToast, fmtDate } = window.PhoneUI;
  const DATA = window.QUIZ_DATA || [];
  const HIST_KEY = "mt.quiz.history.v1";

  const MODES = {
    normal: { label: "Normal", desc: "10 questions, à ton rythme", n: 10, time: 0, lives: 0 },
    chrono: { label: "Chrono", desc: "10 questions, 15 s chacune + bonus de temps", n: 10, time: 15, lives: 0 },
    survie: { label: "Survie", desc: "3 erreurs et la partie est terminée", n: 0, time: 0, lives: 3 },
  };
  const LEVELS = {
    1: { label: "Facile", pts: 10 },
    2: { label: "Moyen", pts: 15 },
    3: { label: "Difficile", pts: 20 },
  };

  let selMode = "normal";
  let selLevel = 1;
  let scoreMode = "normal";
  let scoreLevel = 1;
  let game = null;
  let timerId = null;

  const $ = (id) => document.getElementById(id);

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // ------------------------------------------------------------------ HISTORIQUE
  function loadHist() {
    try { return JSON.parse(localStorage.getItem(HIST_KEY) || "[]"); } catch (e) { return []; }
  }

  function saveHist(h) {
    try { localStorage.setItem(HIST_KEY, JSON.stringify(h.slice(-200))); } catch (e) { /* plein */ }
  }

  function statsFor(m, l) {
    const h = loadHist().filter((x) => x.m === m && x.l === l);
    if (!h.length) return null;
    let best = h[0];
    let worst = h[0];
    for (const x of h) {
      if (x.s > best.s) best = x;
      if (x.s < worst.s) worst = x;
    }
    return { best, worst, n: h.length };
  }

  // ------------------------------------------------------------------ PANNEAUX
  function showPanel(name) {
    for (const p of ["menu", "game", "result", "scores"]) {
      const node = $("quiz-" + p);
      if (node) node.classList.toggle("hidden", p !== name);
    }
  }

  function showMenu() {
    stopTimer();
    game = null;
    showPanel("menu");
  }

  // ------------------------------------------------------------------ SÉLECTION
  function paintSelection() {
    document.querySelectorAll(".quiz-mode").forEach((b) => {
      const on = b.dataset.mode === selMode;
      b.classList.toggle("border-teal-500", on);
      b.classList.toggle("bg-teal-500/10", on);
      b.classList.toggle("border-slate-800", !on);
      b.classList.toggle("bg-slate-900", !on);
    });
    document.querySelectorAll(".quiz-level").forEach((b) => {
      const on = +b.dataset.level === selLevel;
      b.classList.toggle("bg-indigo-600", on);
      b.classList.toggle("text-white", on);
      b.classList.toggle("border-indigo-500", on);
      b.classList.toggle("bg-slate-900", !on);
      b.classList.toggle("text-slate-300", !on);
      b.classList.toggle("border-slate-800", !on);
    });
  }

  // ------------------------------------------------------------------ PARTIE
  let playedRecent = [];
  function notePlayed(q) {
    playedRecent.push(q);
    if (playedRecent.length > 40) playedRecent = playedRecent.slice(-40);
  }
  function freshOrder(pool, n) {
    const recent = new Set(playedRecent);
    const fresh = pool.filter((q) => !recent.has(q));
    const old = pool.filter((q) => recent.has(q));
    let order = shuffle(fresh);
    if (n) {
      order = order.length >= n
        ? order.slice(0, n)
        : order.concat(shuffle(old)).slice(0, Math.max(n, Math.min(pool.length, n)));
    } else if (order.length < 4) {
      order = order.concat(shuffle(old));
    }
    return order;
  }

  function startGame() {
    if (!DATA.length) { showToast("Aucune question disponible.", "err"); return; }
    let pool = DATA.filter((q) => q.l === selLevel);
    if (pool.length < 4) pool = DATA.slice();
    const mode = MODES[selMode];
    const order = freshOrder(pool, mode.n);
    game = {
      pool,
      order,
      i: 0,
      score: 0,
      right: 0,
      wrong: 0,
      lives: mode.lives,
      answered: false,
      question: null,
    };
    showPanel("game");
    renderQuestion();
  }

  function currentQuestion() {
    if (game.i >= game.order.length) game.order = freshOrder(game.pool);
    const q = game.order[game.i % game.order.length];
    notePlayed(q);
    return q;
  }

  function renderQuestion() {
    const mode = MODES[selMode];
    const q = currentQuestion();
    game.question = q;
    game.answered = false;

    $("q-progress").textContent = mode.n
      ? "Question " + (game.i + 1) + "/" + mode.n
      : "Question " + (game.i + 1);
    $("q-score").textContent = game.score + " pts";
    $("q-cat").textContent = q.c + " · niveau " + LEVELS[selLevel].label.toLowerCase();

    const livesEl = $("q-lives");
    if (mode.lives) {
      livesEl.classList.remove("hidden");
      livesEl.textContent = "♥".repeat(Math.max(0, game.lives)) + "♡".repeat(Math.max(0, mode.lives - game.lives));
    } else {
      livesEl.classList.add("hidden");
    }

    $("q-text").textContent = q.q;

    const wrap = $("q-answers");
    wrap.innerHTML = "";
    q.o.forEach((opt, idx) => {
      wrap.append(el("button", {
        class: "q-answer w-full text-left bg-slate-900 border-2 border-slate-800 rounded-xl px-4 py-3 text-sm font-medium active:border-indigo-500",
        onclick: (ev) => answer(idx, ev.currentTarget),
      }, opt));
    });

    $("q-next").classList.add("hidden");
    if (mode.time) startTimer(mode.time);
    else {
      $("q-timer-wrap").classList.add("hidden");
      $("q-chrono").classList.add("hidden");
    }
  }

  function stopTimer() {
    if (timerId) { clearInterval(timerId); timerId = null; }
  }

  function startTimer(sec) {
    stopTimer();
    const wrap = $("q-timer-wrap");
    const bar = $("q-timer");
    wrap.classList.remove("hidden");
    $("q-chrono").classList.remove("hidden");
    const end = Date.now() + sec * 1000;
    game.remaining = sec;
    bar.style.width = "100%";
    timerId = setInterval(() => {
      const left = Math.max(0, end - Date.now());
      game.remaining = left / 1000;
      bar.style.width = (left / (sec * 1000)) * 100 + "%";
      $("q-chrono").textContent = Math.ceil(left / 1000) + " s";
      if (left <= 0) {
        stopTimer();
        timeout();
      }
    }, 100);
  }

  function markAnswers(correctIdx, chosenIdx) {
    document.querySelectorAll("#q-answers .q-answer").forEach((b, idx) => {
      b.disabled = true;
      b.classList.remove("active:border-indigo-500");
      if (idx === correctIdx) {
        b.classList.add("border-teal-400", "bg-teal-500/15", "text-teal-200");
      } else if (idx === chosenIdx) {
        b.classList.add("border-rose-400", "bg-rose-500/15", "text-rose-200");
      } else {
        b.classList.add("opacity-50");
      }
    });
  }

  function answer(idx) {
    if (!game || game.answered) return;
    game.answered = true;
    stopTimer();
    const q = game.question;
    const correct = idx === q.a;
    markAnswers(q.a, idx);
    if (correct) {
      let pts = LEVELS[selLevel].pts;
      if (MODES[selMode].time) pts += Math.ceil((game.remaining || 0) / 2);
      game.score += pts;
      game.right++;
      showToast("+" + pts + " pts", "ok");
    } else {
      game.wrong++;
      if (MODES[selMode].lives) {
        game.lives--;
        $("q-lives").textContent = "♥".repeat(Math.max(0, game.lives)) +
          "♡".repeat(Math.max(0, MODES[selMode].lives - game.lives));
      }
    }
    $("q-score").textContent = game.score + " pts";
    const last = MODES[selMode].n && game.i + 1 >= MODES[selMode].n;
    const dead = MODES[selMode].lives && game.lives <= 0;
    $("q-next").textContent = dead || last ? "Voir le résultat" : "Question suivante";
    $("q-next").classList.remove("hidden");
  }

  function timeout() {
    if (!game || game.answered) return;
    game.answered = true;
    game.wrong++;
    markAnswers(game.question.a, -1);
    showToast("Temps écoulé !", "err");
    const last = MODES[selMode].n && game.i + 1 >= MODES[selMode].n;
    $("q-next").textContent = last ? "Voir le résultat" : "Question suivante";
    $("q-next").classList.remove("hidden");
  }

  function nextQuestion() {
    if (!game) return;
    const dead = MODES[selMode].lives && game.lives <= 0;
    const last = MODES[selMode].n && game.i + 1 >= MODES[selMode].n;
    if (dead || last) { endGame(); return; }
    game.i++;
    renderQuestion();
  }

  // ------------------------------------------------------------------ RÉSULTAT
  function endGame() {
    stopTimer();
    const played = game.right + game.wrong;
    const before = statsFor(selMode, selLevel);
    const prevBest = before ? before.best.s : null;
    const entry = { m: selMode, l: selLevel, s: game.score, r: game.right, p: played, d: Date.now() };
    const hist = loadHist();
    hist.push(entry);
    saveHist(hist);
    const after = statsFor(selMode, selLevel);
    const isRecord = prevBest == null ? played > 0 && game.score > 0 : game.score > prevBest;

    const panel = $("quiz-result");
    panel.innerHTML = "";
    panel.append(
      el("div", { class: "rounded-2xl bg-gradient-to-br from-teal-700 via-teal-800 to-slate-900 border border-teal-500/30 p-5 text-center shadow-lg" },
        el("p", { class: "text-teal-200 text-sm" }, MODES[selMode].label + " · " + LEVELS[selLevel].label),
        el("p", { class: "text-sm text-teal-100/80 mt-1" }, isRecord ? "Nouveau record !" : "Partie terminée"),
        el("p", { class: "text-4xl font-extrabold mt-1" }, game.score + " pts"),
        el("p", { class: "text-sm text-teal-100/80 mt-1" }, game.right + " bonne(s) réponse(s) sur " + played)
      ),
      el("div", { class: "grid grid-cols-2 gap-3 mt-4" },
        statBox("Meilleur score", after.best.s + " pts", fmtDate(after.best.d)),
        statBox("Plus faible", after.worst.s + " pts", fmtDate(after.worst.d))
      ),
      el("p", { class: "text-[11px] text-slate-500 text-center mt-2" }, after.n + " partie(s) jouée(s) dans ce mode/niveau."),
      el("div", { class: "flex gap-2 mt-4" },
        el("button", { class: "flex-1 bg-teal-500 hover:bg-teal-400 text-slate-950 rounded-xl py-3 font-bold", onclick: startGame }, "Rejouer"),
        el("button", { class: "flex-1 bg-slate-800 hover:bg-slate-700 rounded-xl py-3 font-semibold", onclick: showMenu }, "Menu")
      ),
      el("button", { class: "w-full mt-2 bg-slate-900 border border-slate-800 rounded-xl py-2.5 text-sm font-semibold text-indigo-300", onclick: () => { renderScores(); showPanel("scores"); } }, "Voir tous les scores")
    );
    showPanel("result");
  }

  function statBox(label, value, sub) {
    return el("div", { class: "bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center" },
      el("p", { class: "text-[11px] uppercase tracking-wide text-slate-500 font-semibold" }, label),
      el("p", { class: "text-xl font-extrabold text-teal-300 mt-1" }, value),
      sub ? el("p", { class: "text-[11px] text-slate-500 mt-0.5" }, sub) : null
    );
  }

  // ------------------------------------------------------------------ SCORES
  function renderScores() {
    const panel = $("quiz-scores");
    panel.innerHTML = "";

    const tabsM = el("div", { class: "flex gap-2 mb-2" });
    for (const [key, m] of Object.entries(MODES)) {
      tabsM.append(el("button", {
        class: "flex-1 text-xs font-bold rounded-lg py-2 border " +
          (key === scoreMode ? "bg-teal-600 border-teal-500 text-white" : "bg-slate-900 border-slate-800 text-slate-300"),
        onclick: () => { scoreMode = key; renderScores(); },
      }, m.label));
    }
    const tabsL = el("div", { class: "flex gap-2 mb-4" });
    for (const [key, l] of Object.entries(LEVELS)) {
      tabsL.append(el("button", {
        class: "flex-1 text-xs font-bold rounded-lg py-2 border " +
          (+key === scoreLevel ? "bg-indigo-600 border-indigo-500 text-white" : "bg-slate-900 border-slate-800 text-slate-300"),
        onclick: () => { scoreLevel = +key; renderScores(); },
      }, l.label));
    }

    const st = statsFor(scoreMode, scoreLevel);
    const body = el("div");
    if (!st) {
      body.append(el("div", { class: "bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center" },
        el("p", { class: "text-sm text-slate-400" }, "Aucune partie dans ce mode/niveau."),
        el("p", { class: "text-xs text-slate-600 mt-1" }, "Joue une partie pour ouvrir l'historique.")
      ));
    } else {
      body.append(
        el("div", { class: "grid grid-cols-2 gap-3" },
          statBox("Record (plus haut)", st.best.s + " pts", fmtDate(st.best.d)),
          statBox("Plus faible", st.worst.s + " pts", fmtDate(st.worst.d))
        ),
        el("p", { class: "text-sm font-semibold text-slate-300 mt-4 mb-2" }, "Historique (" + st.n + " partie(s))"),
      );
      const hist = loadHist()
        .filter((x) => x.m === scoreMode && x.l === scoreLevel)
        .slice(-12).reverse();
      const list = el("div", { class: "bg-slate-900 border border-slate-800 rounded-2xl divide-y divide-slate-800 overflow-hidden" });
      for (const x of hist) {
        const isBest = x.s === st.best.s;
        const isWorst = x.s === st.worst.s;
        list.append(el("div", { class: "flex items-center gap-3 px-4 py-2.5" },
          el("span", { class: "text-[11px] text-slate-500 w-28 flex-none" }, fmtDate(x.d)),
          el("span", { class: "text-sm font-bold flex-1 " + (isBest ? "text-teal-300" : isWorst ? "text-rose-300" : "text-slate-200") },
            x.s + " pts"),
          el("span", { class: "text-[11px] text-slate-500" }, x.r + "/" + x.p + " bonnes"),
          isBest ? el("span", { class: "text-[10px] font-bold text-teal-900 bg-teal-400 rounded px-1" }, "RECORD")
            : isWorst ? el("span", { class: "text-[10px] font-bold text-rose-900 bg-rose-400 rounded px-1" }, "MIN")
            : null
        ));
      }
      body.append(list);
    }

    panel.append(
      el("div", { class: "flex items-center gap-2 mb-3" },
        el("h2", { class: "text-lg font-bold flex-1" }, "Scores"),
        el("button", { class: "bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-indigo-300", onclick: showMenu }, "Menu")
      ),
      tabsM, tabsL, body
    );
  }

  // ------------------------------------------------------------------ INIT
  function init() {
    if (!document.getElementById("quiz-menu")) return;

    document.querySelectorAll(".quiz-mode").forEach((b) => {
      b.addEventListener("click", () => { selMode = b.dataset.mode; paintSelection(); });
    });
    document.querySelectorAll(".quiz-level").forEach((b) => {
      b.addEventListener("click", () => { selLevel = +b.dataset.level; paintSelection(); });
    });
    $("quiz-start").addEventListener("click", startGame);
    $("quiz-scores-open").addEventListener("click", () => { renderScores(); showPanel("scores"); });
    $("q-next").addEventListener("click", nextQuestion);
    const dl = $("quiz-install-game");
    if (dl) dl.addEventListener("click", () => {
      // Origine distincte (port 8322) : l'app installée « Mon Téléphone » ne
      // réclame pas cette URL, Chrome ouvre un vrai onglet → installation possible.
      const url = location.port === "8322"
        ? location.href
        : location.protocol + "//" + location.hostname + ":8322/jeu.html";
      const a = document.createElement("a");
      a.href = url;
      a.target = "_blank";
      a.rel = "noopener";
      document.body.append(a);
      a.click();
      a.remove();
    });
    paintSelection();
  }

  window.PhoneQuiz = { showMenu, startGame };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
