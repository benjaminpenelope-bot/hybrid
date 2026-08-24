import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  ResponsiveContainer, Tooltip, CartesianGrid, ReferenceLine,
} from "recharts";

/* ─────────────────────────────────────────────────────────────
   ATHLETE OS — design tokens
   Fond charbon, accent typographique blanc chaud.
   La couleur ne sert qu'à identifier les disciplines.
   ───────────────────────────────────────────────────────────── */
const T = {
  bg: "#0B0C0E",
  bg2: "#101215",
  card: "#141719",
  cardHi: "#191D20",
  line: "#24282D",
  line2: "#2E333A",
  text: "#EFF1F3",
  mut: "#878E98",
  dim: "#5B626B",
  run: "#E2603A",
  swim: "#2F97AE",
  street: "#7C6BE3",
  legs: "#C2547A",
  rest: "#565D67",
  ok: "#5BBF7B",
  warn: "#E0A73C",
  bad: "#D8524A",
};

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;500;600;700&family=Inter:wght@400;500;600&display=swap');

.aos *, .aos *::before, .aos *::after { box-sizing: border-box; }
.aos {
  --bg:${T.bg}; --card:${T.card}; --line:${T.line}; --text:${T.text}; --mut:${T.mut};
  background:${T.bg}; color:${T.text}; min-height:100vh; width:100%;
  font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
  font-size:15px; line-height:1.45; -webkit-font-smoothing:antialiased;
  padding-bottom:86px; position:relative; overflow-x:hidden;
}
.aos button { font-family:inherit; cursor:pointer; border:none; background:none; color:inherit; }
.aos input, .aos textarea, .aos select { font-family:inherit; }
.aos ::-webkit-scrollbar { width:6px; height:6px; }
.aos ::-webkit-scrollbar-thumb { background:${T.line2}; border-radius:99px; }

.dsp { font-family:'Barlow Condensed',Impact,sans-serif; text-transform:uppercase; letter-spacing:.02em; font-weight:600; line-height:1; }
.num { font-variant-numeric:tabular-nums; font-family:'Barlow Condensed',sans-serif; font-weight:600; letter-spacing:0; }
.eyebrow { font-family:'Barlow Condensed',sans-serif; text-transform:uppercase; letter-spacing:.16em; font-size:11px; font-weight:600; color:${T.mut}; }

.wrap { max-width:520px; margin:0 auto; padding:0 16px; }
.stack { display:flex; flex-direction:column; }
.row { display:flex; align-items:center; }
.between { display:flex; align-items:center; justify-content:space-between; }
.grid2 { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
.grid3 { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; }

.card { background:${T.card}; border:1px solid ${T.line}; border-radius:16px; padding:16px; }
.card.tight { padding:13px; }
.card.flat { background:${T.bg2}; }

.pill { display:inline-flex; align-items:center; gap:5px; padding:4px 9px; border-radius:99px;
  font-size:10.5px; font-weight:600; letter-spacing:.09em; text-transform:uppercase;
  font-family:'Barlow Condensed',sans-serif; border:1px solid transparent; }

.btn { display:flex; align-items:center; justify-content:center; gap:8px; width:100%;
  padding:15px; border-radius:13px; background:${T.text}; color:${T.bg};
  font-family:'Barlow Condensed',sans-serif; text-transform:uppercase; letter-spacing:.09em;
  font-size:16px; font-weight:700; transition:transform .12s ease, opacity .12s ease; }
.btn:active { transform:scale(.98); }
.btn.ghost { background:transparent; border:1px solid ${T.line2}; color:${T.text}; }
.btn.sm { padding:10px; font-size:13px; border-radius:10px; }
.btn:disabled { opacity:.35; }

.tabbar { position:fixed; bottom:0; left:0; right:0; z-index:50;
  background:rgba(11,12,14,.93); backdrop-filter:blur(16px); border-top:1px solid ${T.line};
  display:flex; padding:8px 4px calc(8px + env(safe-area-inset-bottom,0px)); }
.tabbar .in { max-width:520px; margin:0 auto; width:100%; display:flex; }
.tab { flex:1; display:flex; flex-direction:column; align-items:center; gap:4px; padding:6px 0;
  font-family:'Barlow Condensed',sans-serif; text-transform:uppercase; letter-spacing:.09em;
  font-size:10px; font-weight:600; color:${T.dim}; transition:color .15s; }
.tab.on { color:${T.text}; }
.tab .ic { font-size:17px; line-height:1; filter:grayscale(1) opacity(.6); transition:filter .15s; }
.tab.on .ic { filter:none; }

.bar { height:5px; border-radius:99px; background:${T.line}; overflow:hidden; }
.bar > i { display:block; height:100%; border-radius:99px; transition:width .7s cubic-bezier(.2,.8,.2,1); }

.inp { width:100%; background:${T.bg2}; border:1px solid ${T.line2}; border-radius:11px;
  padding:12px 13px; color:${T.text}; font-size:15px; outline:none; transition:border-color .15s; }
.inp:focus { border-color:${T.mut}; }
.aos :focus-visible { outline:2px solid ${T.text}; outline-offset:2px; }

.chip { padding:9px 12px; border-radius:10px; border:1px solid ${T.line2}; background:${T.bg2};
  font-family:'Barlow Condensed',sans-serif; text-transform:uppercase; letter-spacing:.06em;
  font-size:13px; font-weight:600; color:${T.mut}; transition:all .15s; }
.chip.on { background:${T.text}; color:${T.bg}; border-color:${T.text}; }

.fade { animation:fade .35s ease both; }
@keyframes fade { from { opacity:0; transform:translateY(7px); } to { opacity:1; transform:none; } }
.pop { animation:pop .4s cubic-bezier(.2,1.3,.4,1) both; }
@keyframes pop { from { opacity:0; transform:scale(.9); } to { opacity:1; transform:scale(1); } }
.pulse { animation:pulse 2.4s ease-in-out infinite; }
@keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:.55; } }
@media (prefers-reduced-motion: reduce) {
  .aos *, .fade, .pop, .pulse { animation:none !important; transition:none !important; }
}

.sheet { position:fixed; inset:0; z-index:100; background:${T.bg}; overflow-y:auto;
  animation:up .28s cubic-bezier(.2,.8,.2,1) both; }
@keyframes up { from { transform:translateY(18px); opacity:0; } to { transform:none; opacity:1; } }

.dayc { border-radius:13px; border:1px solid ${T.line}; padding:11px 12px; background:${T.card};
  display:flex; align-items:center; gap:11px; width:100%; text-align:left; transition:border-color .15s; }
.dayc:active { border-color:${T.line2}; }
.dot { width:8px; height:8px; border-radius:99px; flex:none; }
.strike { text-decoration:line-through; opacity:.45; }
`;

/* ─────────────────────────────────────────────────────────────
   Utilitaires
   ───────────────────────────────────────────────────────────── */
const iso = (d) => new Date(d).toISOString().slice(0, 10);
const addD = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const DAYS_FR = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
const MONTHS_FR = ["janv", "févr", "mars", "avr", "mai", "juin", "juil", "août", "sept", "oct", "nov", "déc"];
const fmtDate = (s) => { const d = new Date(s + "T12:00:00"); return `${DAYS_FR[d.getDay()]} ${d.getDate()} ${MONTHS_FR[d.getMonth()]}`; };
const pace = (min, km) => { if (!km) return "—"; const p = min / km; return `${Math.floor(p)}:${String(Math.round((p % 1) * 60)).padStart(2, "0")}`; };
const paceToMin = (str) => { const [m, s] = str.split(":").map(Number); return m + s / 60; };
const mmss = (sec) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, "0")}`;
const clamp = (v, a = 0, b = 100) => Math.max(a, Math.min(b, v));
const uid = () => Math.random().toString(36).slice(2, 9);
const sum = (a) => a.reduce((x, y) => x + y, 0);

const TYPES = {
  RUN:    { label: "Running",      icon: "🏃", color: T.run },
  LONG:   { label: "Sortie longue", icon: "🏃", color: T.run },
  SWIM:   { label: "Natation",     icon: "🏊", color: T.swim },
  UPPER:  { label: "Street haut",  icon: "🤸", color: T.street },
  LOWER:  { label: "Street bas",   icon: "🦵", color: T.legs },
  REST:   { label: "Récupération", icon: "😴", color: T.rest },
};

/* ─────────────────────────────────────────────────────────────
   MOTEUR DE PROGRAMME
   Microcycle : 6 jours d'activité, 1 vrai jour de repos (lundi),
   un seul doublé (mardi : footing + haut du corps, systèmes différents).
   ───────────────────────────────────────────────────────────── */
const RUN_KM_W1 = 15;           // volume course semaine 1 (base 10,2 km la semaine passée)
const RUN_GROWTH = 1.08;        // +8 % / semaine
const DELOAD_EVERY = 4;         // toutes les 4 semaines : -30 %

function weekVolume(w) {
  let v = RUN_KM_W1 * Math.pow(RUN_GROWTH, w - 1);
  if (w % DELOAD_EVERY === 0) v *= 0.7;
  return Math.round(v * 2) / 2;
}

function runPhase(w) {
  if (w <= 12) return { key: "BASE", label: "Base aérobie", desc: "Construire le volume et l'endurance fondamentale." };
  if (w <= 26) return { key: "BUILD", label: "Développement", desc: "Seuil, côtes, sorties longues qui s'allongent." };
  if (w <= 42) return { key: "SPECIFIC", label: "Spécifique marathon", desc: "Allure cible, longues avec blocs à allure marathon." };
  if (w <= 45) return { key: "TAPER", label: "Affûtage", desc: "Volume réduit, intensité conservée." };
  return { key: "RACE", label: "Course", desc: "Marathon." };
}

function buildStrength(kind, w) {
  const prog = Math.floor((w - 1) / 3); // +1 rep toutes les 3 semaines
  if (kind === "UPPER") {
    const isTest = w === 1;
    const base = [
      { n: "Tractions strictes", sets: 4, reps: `${5 + prog}–${8 + prog}`, rest: 120, rir: 2, cue: "Scapulas basses, menton au-dessus de la barre, descente contrôlée 2 s." },
      { n: "Dips", sets: 4, reps: `${7 + prog}–${11 + prog}`, rest: 120, rir: 2, cue: "Buste légèrement penché, coudes proches, épaules loin des oreilles." },
      { n: "Tractions supination", sets: 3, reps: `${6 + prog}–${9 + prog}`, rest: 90, rir: 2, cue: "Amplitude complète, pas de balancier." },
      { n: "Pompes lestées ou déclinées", sets: 3, reps: "10–15", rest: 75, rir: 2, cue: "Gainage verrouillé, corps en une ligne." },
      { n: "Relevés de jambes suspendu", sets: 3, reps: "8–12", rest: 60, rir: 2, cue: "Bassin qui bascule, aucun élan." },
    ];
    if (isTest) {
      return [
        { n: "TEST — Tractions max strictes", sets: 1, reps: "AMRAP", rest: 240, rir: 0, cue: "Une seule série, forme stricte. Arrête dès que le menton ne passe plus proprement.", test: "pullups" },
        { n: "TEST — Dips max", sets: 1, reps: "AMRAP", rest: 240, rir: 0, cue: "Amplitude complète, épaules sous contrôle.", test: "dips" },
        { n: "TEST — Muscle-ups consécutifs", sets: 1, reps: "AMRAP", rest: 180, rir: 0, cue: "Compte uniquement les répétitions propres, sans kipping excessif.", test: "muscleups" },
        { n: "TEST — Relevés de jambes max", sets: 1, reps: "AMRAP", rest: 120, rir: 0, cue: "Suspendu à la barre, jambes tendues, orteils au niveau de la barre. Aucun élan : dès que tu balances, la série est finie.", test: "legraises" },
        { n: "Tractions — volume léger", sets: 3, reps: "50 % du max", rest: 90, rir: 3, cue: "Tu viens de tester : on reste loin de l'échec." },
      ];
    }
    return base;
  }
  return [
    { n: "Squats poids du corps", sets: 4, reps: `${15 + prog * 2}`, rest: 75, rir: 3, cue: "Talons au sol, genoux dans l'axe, descente sous la parallèle." },
    { n: "Fentes bulgares", sets: 3, reps: "10 / jambe", rest: 90, rir: 2, cue: "Buste droit, genou arrière qui descend, appui sur tout le pied avant." },
    { n: "Squats sautés", sets: 4, reps: "8", rest: 90, rir: 3, cue: "Réception amortie et silencieuse. Qualité avant quantité." },
    { n: "Hip thrust au sol / pont fessier unilatéral", sets: 3, reps: "12 / jambe", rest: 60, rir: 2, cue: "Verrouille en haut 1 s, pas de cambrure lombaire." },
    { n: "Mollets debout", sets: 3, reps: "20", rest: 45, rir: 2, cue: "Amplitude complète — assurance tendineuse pour la course." },
    { n: "Gainage planche", sets: 3, reps: "45 s", rest: 45, rir: 2, cue: "Bassin verrouillé, fessiers serrés.", unit: "s" },
  ];
}

function buildSession(date, w, weekday) {
  const vol = weekVolume(w);
  const kmEF1 = Math.round(vol * 0.3 * 2) / 2;
  const kmEF2 = Math.round(vol * 0.28 * 2) / 2;
  const kmLong = Math.round((vol - kmEF1 - kmEF2) * 2) / 2;
  const phase = runPhase(w);
  const base = { id: uid(), date, status: "planned", week: w };

  switch (weekday) {
    case 1: return { ...base, type: "REST", kind: "rest", title: "Récupération complète", duration: 0, intensity: 0,
      goal: "Laisser les adaptations se faire. C'est ici que tu progresses.",
      why: "Sept jours d'affilée sans coupure, c'est la voie rapide vers la blessure de surcharge quand le volume de course monte.",
      cues: ["Marche 20–30 min si tu veux bouger", "Mobilité hanches / chevilles 10 min", "Vise 8 h de sommeil"] };

    case 2: return { ...base, type: "UPPER", kind: "strength", title: "Haut du corps + footing", duration: 75, intensity: 3,
      goal: "Force relative sur barre. Footing souple en complément, à distance de la séance de barre.",
      why: "Doublé volontaire : course et traction sollicitent des systèmes différents. Ça libère un vrai jour de repos.",
      target: "Tractions et dips en progression douce, jamais à l'échec sauf jour de test.",
      cues: ["Barre le matin, footing le soir (ou l'inverse) — au moins 4 h d'écart", "Si tu dois couper, garde la barre"],
      exercises: buildStrength("UPPER", w),
      extra: { type: "RUN", km: kmEF1, note: `Footing souple ${kmEF1} km @ 6:20–6:50/km` } };

    case 3: return { ...base, type: "RUN", kind: "run", title: `Endurance fondamentale — ${kmEF2} km`, duration: Math.round(kmEF2 * 6.6), intensity: 2,
      goal: `${kmEF2} km à 6:20–6:50/km. FC sous 150 bpm.`,
      why: "80 % du volume marathon se court lentement. C'est ce qui construit le réseau capillaire et la solidité tendineuse.",
      target: `Allure 6:20–6:50/km · FC moyenne < 150 bpm`,
      cues: ["Tu dois pouvoir parler en courant", "Cadence 170–180 pas/min", "Si la FC dérive au-dessus de 155, ralentis"],
      exercises: [{ n: "Footing continu", sets: 1, reps: `${kmEF2} km`, rest: 0, rir: 4, cue: "Allure conversationnelle du début à la fin." }] };

    case 4: return { ...base, type: "SWIM", kind: "swim", title: "Natation — technique + fractionné", duration: 45, intensity: 2,
      goal: "Construire la distance continue en brasse et poser les bases du crawl.",
      why: "Passer de 25 m continus à 1 500 m est d'abord un problème technique et respiratoire, pas un problème de condition physique.",
      target: swimTarget(w).session,
      cues: ["Brasse : temps de glisse d'1 s bras tendus après chaque poussée", "Crawl : 4 × 25 m battements avec planche, puis 4 × 25 m rattrapé", "Souffle dans l'eau en continu, jamais de blocage"],
      exercises: [{ n: "Bloc principal", sets: 1, reps: swimTarget(w).session, rest: 0, rir: 3, cue: "Repos 30 s entre les longueurs." }] };

    case 5: return { ...base, type: "RUN", kind: "run", title: `Footing souple — ${kmEF1} km`, duration: Math.round(kmEF1 * 6.7), intensity: 2,
      goal: `${kmEF1} km vraiment lents, jambes encore chargées de la veille.`,
      why: "Cette séance sert à accumuler du temps de course, pas à performer.",
      target: "6:30–7:00/km. Si les jambes sont lourdes, coupe à 20 min sans culpabiliser.",
      cues: ["Terminer avec la sensation de pouvoir en refaire autant", "4 × 20 s de lignes droites en fin de séance"],
      exercises: [{ n: "Footing continu", sets: 1, reps: `${kmEF1} km`, rest: 0, rir: 4, cue: "Lent. Vraiment lent." }] };

    case 6: return { ...base, type: "LOWER", kind: "strength", title: "Bas du corps + gainage", duration: 45, intensity: 3,
      goal: "Renforcement structurel : genoux, chevilles, chaîne postérieure.",
      why: "Le volume de course va doubler en trois mois. Sans travail de force, ce sont les tendons qui lâchent en premier.",
      target: "Pas d'échec musculaire. On cherche la qualité de mouvement et la résistance tendineuse.",
      cues: ["Placé 24 h avant la sortie longue : reste à RIR 2–3", "Si les cuisses tirent encore demain matin, tu es allé trop loin"],
      exercises: buildStrength("LOWER", w) };

    default: return { ...base, type: "LONG", kind: "run", title: `Sortie longue — ${kmLong} km`, duration: Math.round(kmLong * 7), intensity: 3,
      goal: `${kmLong} km en continu, très lentement.`,
      why: `Phase ${phase.label}. La sortie longue est la séance qui décide de ton marathon. On l'allonge de 1 km par semaine maximum.`,
      target: `6:40–7:10/km. L'objectif est la durée, pas l'allure.`,
      cues: ["Pars plus lentement que ce qui te semble confortable", "Bois si la sortie dépasse 60 min", "Si tu dois marcher 2 min, marche — la séance reste réussie"],
      exercises: [{ n: "Sortie longue", sets: 1, reps: `${kmLong} km`, rest: 0, rir: 4, cue: "Régularité du début à la fin." }] };
  }
}

function swimTarget(w) {
  const ladder = [
    { d: 50, session: "8 × 25 m brasse, 30 s de repos + 4 × 25 m éducatifs crawl" },
    { d: 75, session: "6 × 50 m brasse continus, 40 s de repos + 4 × 25 m crawl" },
    { d: 100, session: "5 × 75 m brasse, 45 s de repos + 6 × 25 m crawl" },
    { d: 150, session: "4 × 100 m brasse, 60 s de repos + 4 × 50 m crawl" },
    { d: 200, session: "3 × 150 m brasse + 4 × 50 m crawl" },
    { d: 300, session: "2 × 200 m + 1 × 100 m, récup 90 s" },
    { d: 400, session: "2 × 300 m, récup 2 min" },
    { d: 600, session: "1 × 500 m + 2 × 100 m" },
    { d: 800, session: "1 × 750 m + 200 m souple" },
    { d: 1000, session: "1 × 1 000 m continu" },
    { d: 1200, session: "1 × 1 200 m continu" },
    { d: 1500, session: "1 × 1 500 m continu — objectif atteint" },
  ];
  const i = Math.min(ladder.length - 1, Math.floor((w - 1) / 3));
  return ladder[i];
}

function generatePlan(fromDate, weeks = 8, startWeek = 1) {
  const out = [];
  let d = new Date(fromDate + "T12:00:00");
  for (let i = 0; i < weeks * 7; i++) {
    const w = startWeek + Math.floor(i / 7);
    out.push(buildSession(iso(d), w, d.getDay()));
    d = addD(d, 1);
  }
  return out;
}

/* ─────────────────────────────────────────────────────────────
   HISTORIQUE RÉEL — rien d'inventé.
   Les champs non communiqués restent à null et s'affichent « À TESTER ».
   ───────────────────────────────────────────────────────────── */
const TODAY = iso(new Date());
const D = (n) => iso(addD(new Date(TODAY + "T12:00:00"), n));

const SEED_HISTORY = [
  { id: uid(), date: D(-5), type: "SWIM", kind: "swim", status: "done", title: "Piscine",
    log: { minutes: 45, distance: null, continuous: 25, pauses: null, stroke: "Brasse" }, rpe: null, rpeEst: 4 },
  { id: uid(), date: D(-4), type: "RUN", kind: "run", status: "done", title: "Running",
    log: { km: 4.43, minutes: 25.4, hr: null, elev: 16 }, rpe: null, rpeEst: 6 },
  { id: uid(), date: D(-3), type: "UPPER", kind: "strength", status: "done", title: "Street — haut du corps",
    log: { note: "EMOM pyramide 1→7→1 · ≈ 49 répétitions au total", reps: 49, sets: 13 }, rpe: null, rpeEst: 7 },
  { id: uid(), date: D(-2), type: "RUN", kind: "run", status: "done", title: "Running",
    log: { km: 5.75, minutes: 37.57, hr: 156, elev: 18 }, rpe: null, rpeEst: 5 },
  { id: uid(), date: D(-1), type: "SWIM", kind: "swim", status: "done", title: "Piscine",
    log: { minutes: 45, distance: null, continuous: 25, pauses: null, stroke: "Brasse" }, rpe: null, rpeEst: 4 },
];

const SEED_TODAY = {
  ...buildSession(TODAY, 0, 6),
  id: uid(), date: TODAY, type: "LOWER", kind: "strength", status: "planned",
  title: "Bas du corps — mise en route",
  duration: 40, intensity: 2,
  goal: "Première séance jambes de la préparation. On calibre, on ne détruit pas.",
  why: "Tu enchaînes cinq jours d'activité. Cette séance doit rester à RIR 3 : demain c'est repos, et la montée du volume de course commence mardi.",
  target: "Squats : tu fais 5 × 10 facilement. On teste où est vraiment ta limite, une seule fois.",
  cues: ["Aucune série à l'échec sauf le test", "Si les genoux tirent, réduis l'amplitude avant de réduire les reps"],
  exercises: [
    { n: "TEST — Squats max en une série", sets: 1, reps: "AMRAP", rest: 180, rir: 0, cue: "Forme stricte, sous la parallèle. Arrête quand la technique se dégrade.", test: "squats" },
    { n: "Fentes bulgares", sets: 3, reps: "10 / jambe", rest: 90, rir: 3, cue: "Buste droit, genou arrière vers le sol." },
    { n: "Pont fessier unilatéral", sets: 3, reps: "12 / jambe", rest: 60, rir: 2, cue: "Verrouille 1 s en haut." },
    { n: "Mollets debout", sets: 3, reps: "20", rest: 45, rir: 2, cue: "Amplitude complète — protection du tendon d'Achille." },
    { n: "Gainage planche", sets: 3, reps: "45 s", rest: 45, rir: 2, cue: "Bassin verrouillé.", unit: "s" },
    { n: "Relevés de jambes au sol", sets: 3, reps: "12", rest: 45, rir: 2, cue: "Lombaires plaquées au sol." },
  ],
};

const INITIAL = {
  profile: { name: "Benjamin", age: 25, height: 191, startWeight: 83, goalWeight: 88, startDate: TODAY },
  sessions: [...SEED_HISTORY, SEED_TODAY, ...generatePlan(D(1), 8, 1)],
  weights: [{ date: TODAY, kg: 83 }],
  measures: [],
  photos: [],
  wellness: [],
  benchmarks: {
    pullups: null, dips: null, muscleups: null, legraises: null, pushups: null,
    squats: { v: 50, partial: true, note: "5 × 10 facile — maximum réel inconnu" },
  },
  swimBest: { continuous: 25, crawl: false },
  records: [],
  onboarded: false,
  coachLog: [],
};

/* ─────────────────────────────────────────────────────────────
   MOTEUR DE SCORE
   Chaque sous-score est une somme de composantes pondérées.
   Une composante inconnue vaut null et est retirée du calcul :
   le score global est alors marqué « partiel ».
   ───────────────────────────────────────────────────────────── */
function agg(parts) {
  const known = parts.filter((p) => p.v !== null && p.v !== undefined);
  const wTot = sum(parts.map((p) => p.w));
  const wKnown = sum(known.map((p) => p.w));
  if (!wKnown) return { score: null, coverage: 0, parts };
  const raw = sum(known.map((p) => p.v * p.w)) / wKnown;
  return { score: Math.round(clamp(raw)), coverage: wKnown / wTot, parts };
}

function computeScores(s) {
  const done = s.sessions.filter((x) => x.status === "done");
  const last7 = done.filter((x) => x.date > D(-8));
  const last14 = done.filter((x) => x.date > D(-15));
  const runs = done.filter((x) => x.kind === "run" && x.log?.km);
  const swims = done.filter((x) => x.kind === "swim");

  const km7 = sum(last7.filter((x) => x.log?.km).map((x) => x.log.km));
  const longest = runs.length ? Math.max(...runs.map((x) => x.log.km)) : 0;
  const bestPace = runs.filter((r) => r.log.km >= 3).length
    ? Math.min(...runs.filter((r) => r.log.km >= 3).map((r) => r.log.minutes / r.log.km))
    : null;

  // RUNNING — cible : marathon sub 4 h (5:41/km)
  const running = agg([
    { k: "Volume hebdo", w: 35, v: km7 !== null ? clamp((km7 / 55) * 100) : null, detail: `${km7.toFixed(1)} km / 55 km` },
    { k: "Sortie longue", w: 30, v: longest ? clamp((longest / 32) * 100) : 0, detail: `${longest.toFixed(1)} km / 32 km` },
    { k: "Vitesse", w: 35, v: bestPace === null ? null : clamp(((7 - bestPace) / (7 - 4.5)) * 100), detail: bestPace ? `${pace(bestPace, 1)}/km` : "à mesurer" },
  ]);

  // NATATION — cible : 1 500 m continus
  const cont = s.swimBest.continuous || 0;
  const swimFreq = swims.filter((x) => x.date > D(-15)).length;
  const natation = agg([
    { k: "Distance continue", w: 65, v: cont > 0 ? clamp((Math.log(cont / 25) / Math.log(1500 / 25)) * 100) : 0, detail: `${cont} m / 1 500 m` },
    { k: "Régularité", w: 20, v: clamp((swimFreq / 4) * 100), detail: `${swimFreq} séances / 14 j` },
    { k: "Crawl", w: 15, v: s.swimBest.crawl ? 60 : 0, detail: s.swimBest.crawl ? "en cours" : "non acquis" },
  ]);

  // FORCE — force relative, tous les repères viennent des tests
  const b = s.benchmarks;
  const bv = (x) => (x && typeof x === "object" ? x.v : x);
  const force = agg([
    { k: "Tractions max", w: 40, v: bv(b.pullups) ? clamp((bv(b.pullups) / 20) * 100) : null, detail: bv(b.pullups) ? `${bv(b.pullups)} / 20` : "À TESTER" },
    { k: "Dips max", w: 35, v: bv(b.dips) ? clamp((bv(b.dips) / 30) * 100) : null, detail: bv(b.dips) ? `${bv(b.dips)} / 30` : "À TESTER" },
    { k: "Squats max", w: 25, v: bv(b.squats) ? clamp((bv(b.squats) / 80) * 100) : null, detail: bv(b.squats) ? `${bv(b.squats)} / 80` : "À TESTER" },
  ]);

  // STREET — figures et gainage
  const street = agg([
    { k: "Muscle-up", w: 45, v: bv(b.muscleups) ? clamp((bv(b.muscleups) / 8) * 100) : 25, detail: bv(b.muscleups) ? `${bv(b.muscleups)} consécutifs / 8` : "acquis · nombre À TESTER" },
    { k: "Relevés de jambes", w: 25, v: bv(b.legraises) ? clamp((bv(b.legraises) / 20) * 100) : null, detail: bv(b.legraises) ? `${bv(b.legraises)} / 20` : "À TESTER" },
    { k: "Volume barre", w: 30, v: clamp((sum(last14.filter((x) => x.type === "UPPER").map((x) => x.log?.reps || 40)) / 300) * 100), detail: "14 derniers jours" },
  ]);

  // PHYSIQUE
  const ws = s.weights;
  const cur = ws.length ? ws[ws.length - 1].kg : s.profile.startWeight;
  const gain = cur - s.profile.startWeight;
  const target = s.profile.goalWeight - s.profile.startWeight;
  const weeksIn = Math.max(1, Math.ceil((new Date(TODAY) - new Date(s.profile.startDate)) / 6048e5));
  const rate = gain / weeksIn;
  const bmi = cur / Math.pow(s.profile.height / 100, 2);
  const physique = agg([
    { k: "Progression poids", w: 40, v: clamp((gain / target) * 100), detail: `${cur.toFixed(1)} kg → ${s.profile.goalWeight} kg` },
    { k: "Vitesse de prise", w: 25, v: rate <= 0.25 ? 100 : clamp(100 - (rate - 0.25) * 200), detail: `${rate >= 0 ? "+" : ""}${rate.toFixed(2)} kg / semaine` },
    { k: "Suivi mensurations", w: 20, v: s.measures.length ? clamp(s.measures.length * 50) : 0, detail: `${s.measures.length} relevé(s)` },
    { k: "Composition", w: 15, v: bmi >= 21 && bmi <= 25 ? 85 : 55, detail: `IMC ${bmi.toFixed(1)}` },
  ]);

  // ENDURANCE — minutes aérobies et efficacité cardiaque
  const aerobicMin = sum(last7.filter((x) => ["run", "swim"].includes(x.kind)).map((x) => x.log?.minutes || 0));
  const hrRuns = runs.filter((r) => r.log.hr);
  const eff = hrRuns.length ? Math.min(...hrRuns.map((r) => (r.log.minutes / r.log.km) * (r.log.hr / 150))) : null;
  const endurance = agg([
    { k: "Minutes aérobies", w: 60, v: clamp((aerobicMin / 300) * 100), detail: `${Math.round(aerobicMin)} min / 300 min` },
    { k: "Efficacité cardiaque", w: 40, v: eff === null ? null : clamp(((7.5 - eff) / 3) * 100), detail: hrRuns.length ? `indice ${eff.toFixed(2)}` : "FC insuffisamment mesurée" },
  ]);

  const rec = recovery(s);
  const recuperation = { score: rec.score, coverage: rec.coverage, parts: rec.parts };

  const subs = {
    running: { ...running, label: "Running", icon: "🏃", color: T.run, weight: 28 },
    natation: { ...natation, label: "Natation", icon: "🏊", color: T.swim, weight: 20 },
    physique: { ...physique, label: "Physique", icon: "🧍", color: "#8A9BB0", weight: 14 },
    street: { ...street, label: "Street", icon: "🤸", color: T.street, weight: 12 },
    force: { ...force, label: "Force", icon: "💪", color: "#B98A4E", weight: 10 },
    endurance: { ...endurance, label: "Endurance", icon: "❤️", color: "#C05B6E", weight: 10 },
    recuperation: { ...recuperation, label: "Récup", icon: "🔋", color: T.ok, weight: 6 },
  };

  const list = Object.values(subs);
  const known = list.filter((x) => x.score !== null);
  const wKnown = sum(known.map((x) => x.weight));
  const global = wKnown ? Math.round(sum(known.map((x) => x.score * x.weight)) / wKnown) : 0;
  // Couverture : part du score reposant sur une donnée réellement mesurée
  const coverage = sum(list.map((x) => x.weight * (x.coverage ?? 0))) / 100;
  const missing = Math.round((1 - coverage) * 100);

  return { subs, global, missing };
}

/* Charge d'entraînement : sRPE = durée × RPE */
function loadSeries(s, days = 7) {
  const out = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = D(-i);
    const day = s.sessions.filter((x) => x.date === d && x.status === "done");
    const l = sum(day.map((x) => (x.log?.minutes || x.duration || 0) * (x.rpe || x.rpeEst || 0)));
    out.push({ date: d, day: DAYS_FR[new Date(d + "T12:00:00").getDay()], load: Math.round(l), est: day.every((x) => !x.rpe) && day.length > 0 });
  }
  return out;
}

function recovery(s) {
  const l7 = sum(loadSeries(s, 7).map((x) => x.load));
  // La charge chronique est ramenée à l'historique réellement disponible :
  // sans cela, une première semaine de données produirait un faux signal rouge.
  const first = s.sessions.filter((x) => x.status === "done").map((x) => x.date).sort()[0];
  const span = clamp(first ? Math.round((new Date(TODAY) - new Date(first)) / 864e5) + 1 : 7, 7, 28);
  const l28 = (sum(loadSeries(s, 28).map((x) => x.load)) / span) * 7;
  const acwr = l28 > 0 ? l7 / l28 : 1;
  const lastW = s.wellness.length ? s.wellness[s.wellness.length - 1] : null;
  let streak = 0;
  for (let i = 1; i <= 14; i++) {
    const d = D(-i);
    if (s.sessions.some((x) => x.date === d && x.status === "done")) streak++; else break;
  }
  const parts = [
    { k: "Sommeil", w: 30, v: lastW ? clamp(((lastW.sleep - 5) / 3.5) * 100) : null, detail: lastW ? `${lastW.sleep} h` : "à renseigner" },
    { k: "Fatigue ressentie", w: 30, v: lastW ? clamp((1 - (lastW.fatigue - 1) / 9) * 100) : null, detail: lastW ? `${lastW.fatigue}/10` : "à renseigner" },
    { k: "Ratio de charge", w: 20, v: clamp(acwr <= 1.3 ? 100 - Math.abs(acwr - 1) * 60 : 100 - (acwr - 1.3) * 120 - 18), detail: `A:C ${acwr.toFixed(2)}` },
    { k: "Jours consécutifs", w: 20, v: clamp(100 - Math.max(0, streak - 3) * 25), detail: `${streak} j sans coupure` },
  ];
  const a = agg(parts);
  const score = a.score === null ? 65 : a.score;
  const zone = score >= 70 ? "GREEN" : score >= 45 ? "YELLOW" : "RED";
  return { ...a, score, coverage: a.coverage, zone, acwr, l7, l28, streak, soreness: lastW?.soreness || null };
}

const ZONES = {
  GREEN:  { c: T.ok,   t: "Entraînement normal", d: "Rien ne bloque. Applique la séance prévue telle quelle." },
  YELLOW: { c: T.warn, t: "Baisse l'intensité",  d: "Garde la séance mais retire une série, ou ralentis de 20 s/km." },
  RED:    { c: T.bad,  t: "Récupération prioritaire", d: "Repos ou marche. Reprendre à l'identique aggraverait la dette." },
};

const LEVELS = [
  { min: 0,  n: 1, t: "Beginner Athlete" },
  { min: 30, n: 2, t: "Developing Athlete" },
  { min: 50, n: 3, t: "Hybrid Athlete" },
  { min: 70, n: 4, t: "Advanced Athlete" },
  { min: 85, n: 5, t: "Elite Hybrid" },
];
const levelOf = (g) => [...LEVELS].reverse().find((l) => g >= l.min);

/* ─────────────────────────────────────────────────────────────
   PRIMITIVES UI
   ───────────────────────────────────────────────────────────── */
const Meter = ({ v, c = T.text, h = 5 }) => (
  <div className="bar" style={{ height: h }}><i style={{ width: `${clamp(v)}%`, background: c }} /></div>
);

const Pill = ({ c = T.mut, children, solid }) => (
  <span className="pill" style={solid ? { background: c, color: T.bg } : { color: c, borderColor: c + "55", background: c + "14" }}>{children}</span>
);

const Stat = ({ label, value, sub, c = T.text }) => (
  <div className="card tight">
    <div className="eyebrow" style={{ marginBottom: 6 }}>{label}</div>
    <div className="num" style={{ fontSize: 26, color: c, lineHeight: 1 }}>{value}</div>
    {sub && <div style={{ fontSize: 11.5, color: T.dim, marginTop: 4 }}>{sub}</div>}
  </div>
);

const Section = ({ title, right, children, style }) => (
  <div style={{ marginTop: 26, ...style }}>
    <div className="between" style={{ marginBottom: 11 }}>
      <div className="eyebrow">{title}</div>{right}
    </div>
    {children}
  </div>
);

/* Signature : anneau segmenté. Chaque arc = une discipline,
   sa longueur = son poids dans le score, son remplissage = sa note. */
function ScoreRing({ subs, global, missing }) {
  const R = 86, SW = 13, C = 2 * Math.PI * R;
  const list = Object.values(subs);
  const gap = 3.2;
  let acc = 0;
  const arcs = list.map((s) => {
    const len = (s.weight / 100) * C - gap;
    const a = { ...s, off: acc, len };
    acc += (s.weight / 100) * C;
    return a;
  });
  return (
    <div style={{ position: "relative", width: 210, height: 210, margin: "0 auto" }}>
      <svg width="210" height="210" viewBox="0 0 210 210" style={{ transform: "rotate(-90deg)" }}>
        {arcs.map((a, i) => (
          <g key={i}>
            <circle cx="105" cy="105" r={R} fill="none" stroke={T.line} strokeWidth={SW}
              strokeDasharray={`${a.len} ${C - a.len}`} strokeDashoffset={-a.off} strokeLinecap="butt" />
            <circle cx="105" cy="105" r={R} fill="none" stroke={a.color} strokeWidth={SW}
              strokeDasharray={`${a.len * ((a.score ?? 0) / 100)} ${C}`} strokeDashoffset={-a.off}
              strokeLinecap="butt" style={{ transition: "stroke-dasharray 1s cubic-bezier(.2,.8,.2,1)" }} />
          </g>
        ))}
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div className="eyebrow" style={{ fontSize: 9.5 }}>Athlete Score</div>
        <div className="num" style={{ fontSize: 62, letterSpacing: "-.02em", marginTop: 2 }}>{global}</div>
        <div style={{ fontSize: 11, color: T.dim, marginTop: -2 }}>sur 100{missing > 0 ? ` · partiel` : ""}</div>
      </div>
    </div>
  );
}

const SubScoreRow = ({ s }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "9px 0" }}>
    <span style={{ fontSize: 15, width: 20 }}>{s.icon}</span>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div className="between" style={{ marginBottom: 5 }}>
        <span className="dsp" style={{ fontSize: 14 }}>{s.label}</span>
        <span className="num" style={{ fontSize: 15, color: s.score === null ? T.dim : T.text }}>
          {s.score === null ? "—" : s.score}
        </span>
      </div>
      <Meter v={s.score ?? 0} c={s.color} h={4} />
    </div>
    <span className="num" style={{ fontSize: 11, color: T.dim, width: 24, textAlign: "right" }}>{s.weight}%</span>
  </div>
);

function SessionBadge({ type }) {
  const t = TYPES[type];
  return <Pill c={t.color}>{t.icon} {t.label}</Pill>;
}

/* ─────────────────────────────────────────────────────────────
   ACCUEIL
   ───────────────────────────────────────────────────────────── */
function Home({ st, scores, rec, onStart, go, set }) {
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState(null);
  const today = st.sessions.find((x) => x.date === TODAY);
  const lvl = levelOf(scores.global);
  const load = loadSeries(st, 7);
  const l7 = sum(load.map((x) => x.load));
  const t = today ? TYPES[today.type] : null;

  return (
    <div className="wrap fade">
      <div className="between" style={{ padding: "18px 0 4px" }}>
        <div>
          <div className="dsp" style={{ fontSize: 22, letterSpacing: ".06em" }}>Athlete OS</div>
          <div style={{ fontSize: 12, color: T.dim, marginTop: 2 }}>{fmtDate(TODAY)} · {st.profile.name}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="num" style={{ fontSize: 13, color: T.mut }}>LVL {lvl.n}</div>
          <div className="eyebrow" style={{ fontSize: 9.5 }}>{lvl.t}</div>
        </div>
      </div>

      <div style={{ marginTop: 14 }}><ScoreRing subs={scores.subs} global={scores.global} missing={scores.missing} /></div>

      {scores.missing > 0 && (
        <div className="card flat" style={{ marginTop: 10, padding: 11, display: "flex", gap: 9, alignItems: "flex-start" }}>
          <span style={{ fontSize: 13 }}>⚠️</span>
          <div style={{ fontSize: 12.5, color: T.mut, lineHeight: 1.5 }}>
            <b style={{ color: T.text }}>{scores.missing} % du score est en attente de tests.</b> Tractions, dips, muscle-ups consécutifs et relevés de jambes ne sont pas mesurés. Le test est programmé dans la séance haut du corps de mardi.
          </div>
        </div>
      )}

      <button className="card" onClick={() => setOpen(!open)} style={{ width: "100%", marginTop: 10, textAlign: "left" }}>
        <div className="between">
          <span className="eyebrow">Détail des sous-scores</span>
          <span style={{ color: T.dim, fontSize: 12 }}>{open ? "▲" : "▼"}</span>
        </div>
        {open && <div style={{ marginTop: 6 }}>{Object.values(scores.subs).map((s, i) => <SubScoreRow key={i} s={s} />)}</div>}
      </button>

      {/* Récupération */}
      <button className="card" onClick={() => go("recovery")} style={{ width: "100%", marginTop: 10, textAlign: "left", borderColor: ZONES[rec.zone].c + "40" }}>
        <div className="between">
          <div className="row" style={{ gap: 10 }}>
            <span className="dot pulse" style={{ background: ZONES[rec.zone].c, width: 10, height: 10 }} />
            <div>
              <div className="dsp" style={{ fontSize: 15 }}>{ZONES[rec.zone].t}</div>
              <div style={{ fontSize: 11.5, color: T.dim, marginTop: 2 }}>Charge 7 j : {l7} u · ratio {rec.acwr.toFixed(2)}</div>
            </div>
          </div>
          <div className="num" style={{ fontSize: 24, color: ZONES[rec.zone].c }}>{rec.score}</div>
        </div>
      </button>

      {/* Séance du jour */}
      <Section title="Ta séance du jour">
        {!today || today.type === "REST" ? (
          <div className="card" style={{ textAlign: "center", padding: 30 }}>
            <div style={{ fontSize: 32 }}>😴</div>
            <div className="dsp" style={{ fontSize: 22, marginTop: 8 }}>Récupération</div>
            <div style={{ fontSize: 13, color: T.mut, marginTop: 8, lineHeight: 1.5 }}>
              {today?.goal || "Aucune séance programmée aujourd'hui."}
            </div>
          </div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "18px 16px 16px", background: `linear-gradient(160deg, ${t.color}1F, transparent 70%)` }}>
              <div className="between" style={{ marginBottom: 12 }}>
                <SessionBadge type={today.type} />
                <span className="num" style={{ fontSize: 13, color: T.mut }}>{today.duration} min</span>
              </div>
              <div className="dsp" style={{ fontSize: 27, lineHeight: 1.05 }}>{today.title}</div>
              <div style={{ fontSize: 13.5, color: T.mut, marginTop: 9, lineHeight: 1.5 }}>{today.goal}</div>

              <div className="row" style={{ gap: 5, marginTop: 13 }}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <span key={i} style={{ flex: 1, height: 3, borderRadius: 9, background: i <= today.intensity ? t.color : T.line }} />
                ))}
                <span className="eyebrow" style={{ marginLeft: 8, fontSize: 9.5 }}>Intensité {today.intensity}/5</span>
              </div>
            </div>

            {today.status === "done" ? (
              <div style={{ padding: 16, borderTop: `1px solid ${T.line}`, textAlign: "center" }}>
                <Pill c={T.ok} solid>✓ Séance terminée</Pill>
              </div>
            ) : (
              <div style={{ padding: 16, borderTop: `1px solid ${T.line}` }}>
                <div style={{ fontSize: 12.5, color: T.mut, lineHeight: 1.55, marginBottom: 14 }}>
                  <b style={{ color: T.text }}>Pourquoi cette séance : </b>{today.why}
                </div>
                {today.exercises && (
                  <div style={{ marginBottom: 14 }}>
                    {today.exercises.slice(0, 6).map((e, i) => (
                      <div key={i} className="between" style={{ padding: "7px 0", borderBottom: i < today.exercises.length - 1 ? `1px solid ${T.line}` : "none" }}>
                        <span style={{ fontSize: 13, color: e.test ? T.warn : T.text }}>{e.n}</span>
                        <span className="num" style={{ fontSize: 13, color: T.mut }}>{e.sets} × {e.reps}</span>
                      </div>
                    ))}
                  </div>
                )}
                <button className="btn" onClick={() => onStart(today)}>Commencer la séance</button>
                <button className="btn ghost sm" style={{ marginTop: 9 }} onClick={() => setEdit(today)}>Modifier la séance</button>
              </div>
            )}
          </div>
        )}
      </Section>

      <Section title="Charge des 7 derniers jours" right={<span className="num" style={{ fontSize: 12, color: T.mut }}>{l7} unités</span>}>
        <div className="card tight">
          <ResponsiveContainer width="100%" height={92}>
            <BarChart data={load}>
              <XAxis dataKey="day" tick={{ fill: T.dim, fontSize: 10 }} axisLine={false} tickLine={false} />
              <Bar dataKey="load" radius={[4, 4, 0, 0]} fill={T.line2} />
            </BarChart>
          </ResponsiveContainer>
          <div style={{ fontSize: 11.5, color: T.dim, marginTop: 4, lineHeight: 1.5 }}>
            Charge = durée × RPE. Les séances passées sans RPE saisi utilisent une estimation, marquée comme telle.
          </div>
        </div>
      </Section>

      {edit && (
        <SessionEditor session={edit} onClose={() => setEdit(null)}
          onSave={(ns) => { set((p) => ({ ...p, sessions: p.sessions.map((x) => (x.id === ns.id ? ns : x)) })); setEdit(null); }} />
      )}

      <Section title="Prochains jours">
        <div className="stack" style={{ gap: 7 }}>
          {st.sessions.filter((x) => x.date > TODAY).slice(0, 4).map((s) => (
            <button key={s.id} className="dayc" onClick={() => go("week")}>
              <span className="dot" style={{ background: TYPES[s.type].color }} />
              <span style={{ fontSize: 12, color: T.dim, width: 62 }}>{fmtDate(s.date)}</span>
              <span style={{ fontSize: 13.5, flex: 1 }}>{s.title}</span>
              <span className="num" style={{ fontSize: 12, color: T.dim }}>{s.duration ? `${s.duration}'` : "—"}</span>
            </button>
          ))}
        </div>
      </Section>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   MODE SÉANCE
   ───────────────────────────────────────────────────────────── */
function RestTimer({ sec, onDone }) {
  const [left, setLeft] = useState(sec);
  useEffect(() => { setLeft(sec); }, [sec]);
  useEffect(() => {
    if (left <= 0) return;
    const t = setTimeout(() => setLeft((l) => l - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);
  const pct = (1 - left / sec) * 100;
  return (
    <div className="card pop" style={{ textAlign: "center", padding: 26 }}>
      <div className="eyebrow">Récupération</div>
      <div className="num" style={{ fontSize: 58, margin: "8px 0 14px" }}>{mmss(Math.max(0, left))}</div>
      <Meter v={pct} c={T.text} h={4} />
      <div className="grid2" style={{ marginTop: 16 }}>
        <button className="btn ghost sm" onClick={() => setLeft((l) => l + 30)}>+30 s</button>
        <button className="btn sm" onClick={onDone}>{left <= 0 ? "Série suivante" : "Passer"}</button>
      </div>
    </div>
  );
}

function NumPad({ label, value, set, unit, hint }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div className="between" style={{ marginBottom: 7 }}>
        <span className="eyebrow">{label}</span>
        {hint && <span style={{ fontSize: 11, color: T.dim }}>{hint}</span>}
      </div>
      <div className="row" style={{ gap: 9 }}>
        <button className="btn ghost" style={{ width: 52, padding: 13 }} onClick={() => set(Math.max(0, (+value || 0) - 1))}>−</button>
        <div style={{ flex: 1, position: "relative" }}>
          <input className="inp" inputMode="decimal" value={value} onChange={(e) => set(e.target.value)}
            style={{ textAlign: "center", fontSize: 24, fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 600, padding: "10px 13px" }} />
          {unit && <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: T.dim, fontSize: 12 }}>{unit}</span>}
        </div>
        <button className="btn ghost" style={{ width: 52, padding: 13 }} onClick={() => set((+value || 0) + 1)}>+</button>
      </div>
    </div>
  );
}

function Scale({ label, value, set, max = 10, hint }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div className="between" style={{ marginBottom: 8 }}>
        <span className="eyebrow">{label}</span>
        {hint && <span style={{ fontSize: 11, color: T.dim }}>{hint}</span>}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${max > 5 ? 10 : max + 1},1fr)`, gap: 4 }}>
        {Array.from({ length: max > 5 ? 10 : max + 1 }, (_, i) => (max > 5 ? i + 1 : i)).map((n) => (
          <button key={n} className="chip" style={{ padding: "10px 0", textAlign: "center", ...(value === n ? { background: T.text, color: T.bg, borderColor: T.text } : {}) }}
            onClick={() => set(n)}>{n}</button>
        ))}
      </div>
    </div>
  );
}

function detectPRs(st, session, log) {
  const prs = [];
  const done = st.sessions.filter((x) => x.status === "done" && x.id !== session.id);
  if (session.kind === "run") {
    const prev = done.filter((x) => x.kind === "run" && x.log?.km);
    const bestLong = prev.length ? Math.max(...prev.map((x) => x.log.km)) : 0;
    if (log.km > bestLong) prs.push({ t: "Plus longue sortie", v: `${log.km} km` });
    if (log.km >= 4) {
      const p = log.minutes / log.km;
      const bestP = prev.filter((x) => x.log.km >= 4).map((x) => x.log.minutes / x.log.km);
      if (!bestP.length || p < Math.min(...bestP)) prs.push({ t: "Meilleure allure sur 4 km+", v: `${pace(p, 1)}/km` });
    }
  }
  if (session.kind === "swim") {
    if (log.continuous > (st.swimBest.continuous || 0)) prs.push({ t: "Distance continue", v: `${log.continuous} m` });
    const prevD = done.filter((x) => x.kind === "swim" && x.log?.distance).map((x) => x.log.distance);
    if (log.distance && (!prevD.length || log.distance > Math.max(...prevD))) prs.push({ t: "Volume natation", v: `${log.distance} m` });
  }
  if (session.kind === "strength") {
    (log.tests || []).forEach((t) => {
      const b = st.benchmarks[t.key];
      const old = b && typeof b === "object" ? b.v : b;
      if (!old || t.value > old) prs.push({ t: `Record ${t.name}`, v: `${t.value}${t.unit || ""}` });
    });
    const prevVol = done.filter((x) => x.type === session.type && x.log?.reps).map((x) => x.log.reps);
    if (log.reps && (!prevVol.length || log.reps > Math.max(...prevVol))) prs.push({ t: "Volume total", v: `${log.reps} reps` });
  }
  return prs;
}

function SessionRunner({ session, st, onFinish, onClose }) {
  const isStrength = session.kind === "strength";
  const flat = useMemo(() => {
    if (!isStrength) return [];
    const arr = [];
    session.exercises.forEach((e, ei) => { for (let s = 0; s < e.sets; s++) arr.push({ ...e, ei, si: s }); });
    return arr;
  }, [session]);

  const [phase, setPhase] = useState(isStrength && flat.length === 0 ? "wrap" : "work"); // work | rest | wrap | done
  const [idx, setIdx] = useState(0);
  const [reps, setReps] = useState("");
  const [rir, setRir] = useState(null);
  const [logs, setLogs] = useState([]);
  const [run, setRun] = useState({ km: "", minutes: "", hr: "", elev: "" });
  const [swim, setSwim] = useState({ minutes: "", distance: "", continuous: "", pauses: "", stroke: "Brasse", crawl: false });
  const [rpe, setRpe] = useState(null);
  const [note, setNote] = useState("");
  const [pain, setPain] = useState("");
  const [sleep, setSleep] = useState(7);
  const [fatigue, setFatigue] = useState(4);
  const [result, setResult] = useState(null);
  const cur = flat[idx];

  const validateSet = () => {
    const r = +reps || 0;
    setLogs((L) => [...L, { ei: cur.ei, name: cur.n, set: cur.si + 1, reps: r, rir, unit: cur.unit, test: cur.test }]);
    setReps(""); setRir(null);
    if (idx + 1 >= flat.length) setPhase("wrap");
    else setPhase("rest");
  };

  const finish = () => {
    let log = {};
    let tests = [];
    if (isStrength) {
      tests = logs.filter((l) => l.test).map((l) => ({ key: l.test, name: l.name.replace("TEST — ", ""), value: l.reps, unit: l.unit }));
      log = { reps: sum(logs.filter((l) => l.unit !== "s").map((l) => l.reps)), sets: logs.length, sets_detail: logs, tests, minutes: session.duration };
    } else if (session.kind === "run") {
      log = { km: +run.km || 0, minutes: +run.minutes || 0, hr: +run.hr || null, elev: +run.elev || null };
    } else {
      log = { minutes: +swim.minutes || 0, distance: +swim.distance || null, continuous: +swim.continuous || 0, pauses: +swim.pauses || null, stroke: swim.stroke, crawl: swim.crawl };
    }
    const prs = detectPRs(st, session, log);
    const payload = { session, log, rpe, note, pain, sleep, fatigue, prs, tests };
    setResult(payload);
    setPhase("done");
    onFinish(payload);
  };

  const t = TYPES[session.type];

  return (
    <div className="sheet">
      <div className="wrap" style={{ paddingTop: 16, paddingBottom: 40 }}>
        <div className="between" style={{ marginBottom: 16 }}>
          <SessionBadge type={session.type} />
          <button className="eyebrow" onClick={onClose} style={{ color: T.mut }}>Fermer ✕</button>
        </div>

        {phase !== "done" && (
          <>
            <div className="dsp" style={{ fontSize: 24, marginBottom: 4 }}>{session.title}</div>
            {isStrength && phase !== "wrap" && (
              <>
                <Meter v={(idx / flat.length) * 100} c={t.color} />
                <div className="num" style={{ fontSize: 11, color: T.dim, marginTop: 6 }}>
                  Série {idx + 1} / {flat.length}
                </div>
              </>
            )}
          </>
        )}

        {/* MUSCULATION — série en cours */}
        {isStrength && phase === "work" && cur && (
          <div className="fade" style={{ marginTop: 18 }} key={idx}>
            <div className="card" style={{ borderColor: cur.test ? T.warn + "66" : T.line }}>
              {cur.test && <div style={{ marginBottom: 10 }}><Pill c={T.warn}>Test de référence</Pill></div>}
              <div className="dsp" style={{ fontSize: 28, lineHeight: 1.05 }}>{cur.n.replace("TEST — ", "")}</div>
              <div className="num" style={{ fontSize: 17, color: t.color, marginTop: 7 }}>
                Série {cur.si + 1}/{cur.sets} · {cur.reps}{cur.unit === "s" ? "" : " reps"}
              </div>
              <div style={{ fontSize: 12.5, color: T.mut, marginTop: 11, lineHeight: 1.55 }}>{cur.cue}</div>
            </div>

            <div style={{ marginTop: 18 }}>
              <NumPad label={cur.unit === "s" ? "Secondes tenues" : "Répétitions réalisées"} value={reps} set={setReps} unit={cur.unit === "s" ? "s" : "reps"} />
              {!cur.test && (
                <Scale label="RIR — répétitions encore possibles" value={rir} set={setRir} max={5}
                  hint={`cible ${cur.rir}`} />
              )}
              <button className="btn" disabled={reps === "" || (!cur.test && rir === null)} onClick={validateSet}>
                Valider la série
              </button>
            </div>
          </div>
        )}

        {isStrength && phase === "rest" && (
          <div style={{ marginTop: 18 }}>
            <div className="card flat tight" style={{ marginBottom: 12 }}>
              <div className="between">
                <span style={{ fontSize: 13, color: T.ok }}>✓ {logs[logs.length - 1]?.name.replace("TEST — ", "")} — {logs[logs.length - 1]?.reps}{logs[logs.length - 1]?.unit === "s" ? " s" : " reps"}</span>
              </div>
            </div>
            <RestTimer sec={cur?.rest || 90} onDone={() => { setIdx(idx + 1); setPhase("work"); }} />
            {flat[idx + 1] && (
              <div className="card tight" style={{ marginTop: 12 }}>
                <div className="eyebrow" style={{ marginBottom: 5 }}>Ensuite</div>
                <div style={{ fontSize: 14 }}>{flat[idx + 1].n.replace("TEST — ", "")} · série {flat[idx + 1].si + 1}/{flat[idx + 1].sets}</div>
              </div>
            )}
          </div>
        )}

        {/* COURSE */}
        {session.kind === "run" && phase === "work" && (
          <div style={{ marginTop: 18 }}>
            <div className="card" style={{ marginBottom: 18 }}>
              <div className="eyebrow" style={{ marginBottom: 7 }}>Objectif</div>
              <div style={{ fontSize: 14.5 }}>{session.target}</div>
              <div style={{ marginTop: 12 }}>
                {session.cues.map((c, i) => (
                  <div key={i} style={{ fontSize: 12.5, color: T.mut, marginTop: 5 }}>· {c}</div>
                ))}
              </div>
            </div>
            <div className="eyebrow" style={{ marginBottom: 10 }}>Enregistre ta sortie</div>
            <NumPad label="Distance" value={run.km} set={(v) => setRun({ ...run, km: v })} unit="km" />
            <NumPad label="Durée" value={run.minutes} set={(v) => setRun({ ...run, minutes: v })} unit="min" />
            <div className="grid2">
              <div><NumPad label="FC moyenne" value={run.hr} set={(v) => setRun({ ...run, hr: v })} unit="bpm" /></div>
              <div><NumPad label="D+" value={run.elev} set={(v) => setRun({ ...run, elev: v })} unit="m" /></div>
            </div>
            {run.km && run.minutes && (
              <div className="card flat tight" style={{ marginBottom: 14, textAlign: "center" }}>
                <span className="eyebrow">Allure </span>
                <span className="num" style={{ fontSize: 22, color: T.run }}>{pace(+run.minutes, +run.km)}/km</span>
              </div>
            )}
            <button className="btn" disabled={!run.km || !run.minutes} onClick={() => setPhase("wrap")}>Terminer la sortie</button>
          </div>
        )}

        {/* NATATION */}
        {session.kind === "swim" && phase === "work" && (
          <div style={{ marginTop: 18 }}>
            <div className="card" style={{ marginBottom: 18 }}>
              <div className="eyebrow" style={{ marginBottom: 7 }}>Bloc du jour</div>
              <div style={{ fontSize: 14.5 }}>{session.target}</div>
              <div style={{ marginTop: 12 }}>
                {session.cues.map((c, i) => <div key={i} style={{ fontSize: 12.5, color: T.mut, marginTop: 5 }}>· {c}</div>)}
              </div>
            </div>
            <NumPad label="Temps dans l'eau" value={swim.minutes} set={(v) => setSwim({ ...swim, minutes: v })} unit="min" />
            <NumPad label="Distance totale" value={swim.distance} set={(v) => setSwim({ ...swim, distance: v })} unit="m" hint="laisse vide si non compté" />
            <NumPad label="Plus longue distance sans arrêt" value={swim.continuous} set={(v) => setSwim({ ...swim, continuous: v })} unit="m" />
            <NumPad label="Nombre de pauses" value={swim.pauses} set={(v) => setSwim({ ...swim, pauses: v })} unit="" />
            <div style={{ marginBottom: 16 }}>
              <div className="eyebrow" style={{ marginBottom: 8 }}>Nage principale</div>
              <div className="row" style={{ gap: 7 }}>
                {["Brasse", "Crawl", "Mixte"].map((s) => (
                  <button key={s} className={`chip${swim.stroke === s ? " on" : ""}`} style={{ flex: 1 }}
                    onClick={() => setSwim({ ...swim, stroke: s, crawl: s !== "Brasse" })}>{s}</button>
                ))}
              </div>
            </div>
            <button className="btn" disabled={!swim.minutes} onClick={() => setPhase("wrap")}>Terminer la séance</button>
          </div>
        )}

        {/* BILAN À CHAUD */}
        {phase === "wrap" && (
          <div className="fade" style={{ marginTop: 20 }}>
            <div className="dsp" style={{ fontSize: 26, marginBottom: 16 }}>Comment c'était ?</div>
            <Scale label="RPE global de la séance" value={rpe} set={setRpe} max={10} hint="1 = très facile · 10 = maximal" />
            <Scale label="Fatigue générale" value={fatigue} set={setFatigue} max={10} />
            <NumPad label="Sommeil de la nuit dernière" value={sleep} set={setSleep} unit="h" />
            <div style={{ marginBottom: 14 }}>
              <div className="eyebrow" style={{ marginBottom: 7 }}>Douleur inhabituelle ? (facultatif)</div>
              <input className="inp" value={pain} onChange={(e) => setPain(e.target.value)} placeholder="ex : genou droit en fin de sortie" />
            </div>
            <div style={{ marginBottom: 16 }}>
              <div className="eyebrow" style={{ marginBottom: 7 }}>Commentaire</div>
              <textarea className="inp" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Sensations, météo, contexte…" />
            </div>
            <button className="btn" disabled={rpe === null} onClick={finish}>Enregistrer la séance</button>
          </div>
        )}

        {/* RÉSUMÉ */}
        {phase === "done" && result && <Summary r={result} st={st} onClose={onClose} />}
      </div>
    </div>
  );
}

function Summary({ r, st, onClose }) {
  const { session, log, prs, rpe, pain } = r;
  const prev = st.sessions.filter((x) => x.status === "done" && x.type === session.type && x.id !== session.id).slice(-1)[0];
  const load = Math.round((log.minutes || session.duration) * rpe);
  const reco = rpe >= 8 ? "48 h avant une nouvelle séance intense. Demain : repos ou activité très légère."
    : rpe >= 6 ? "24 h de récupération sur ce système. La séance de demain reste applicable."
    : "Récupération standard. Rien à ajuster.";

  return (
    <div className="fade" style={{ marginTop: 22, textAlign: "center" }}>
      <div style={{ fontSize: 40 }}>🎉</div>
      <div className="dsp" style={{ fontSize: 30, marginTop: 6 }}>Séance terminée</div>
      <div style={{ fontSize: 13, color: T.mut, marginTop: 6 }}>{session.title}</div>

      {prs.length > 0 && (
        <div className="card pop" style={{ marginTop: 18, borderColor: T.warn + "66", background: T.warn + "0F" }}>
          <div className="eyebrow" style={{ color: T.warn }}>🏆 Nouveau record</div>
          {prs.map((p, i) => (
            <div key={i} className="between" style={{ marginTop: 9 }}>
              <span style={{ fontSize: 13.5 }}>{p.t}</span>
              <span className="num" style={{ fontSize: 19, color: T.warn }}>{p.v}</span>
            </div>
          ))}
        </div>
      )}

      <div className="grid2" style={{ marginTop: 14, textAlign: "left" }}>
        {session.kind === "run" && <>
          <Stat label="Distance" value={`${log.km}`} sub="km" c={T.run} />
          <Stat label="Allure" value={pace(log.minutes, log.km)} sub="/km" />
          <Stat label="Durée" value={Math.round(log.minutes)} sub="min" />
          <Stat label="FC moyenne" value={log.hr || "—"} sub={log.hr ? "bpm" : "non mesurée"} />
        </>}
        {session.kind === "swim" && <>
          <Stat label="Continu max" value={`${log.continuous}`} sub="m" c={T.swim} />
          <Stat label="Distance totale" value={log.distance || "—"} sub={log.distance ? "m" : "non comptée"} />
          <Stat label="Temps dans l'eau" value={Math.round(log.minutes)} sub="min" />
          <Stat label="Nage" value={log.stroke} sub={`${log.pauses ?? "—"} pauses`} />
        </>}
        {session.kind === "strength" && <>
          <Stat label="Volume total" value={log.reps} sub="répétitions" c={T.street} />
          <Stat label="Séries" value={log.sets} sub="validées" />
        </>}
        <Stat label="RPE global" value={`${rpe}/10`} sub="ressenti" />
        <Stat label="Charge" value={load} sub="unités sRPE" />
      </div>

      {prev && session.kind === "run" && prev.log?.km && (
        <div className="card tight" style={{ marginTop: 12, textAlign: "left" }}>
          <div className="eyebrow" style={{ marginBottom: 6 }}>Comparaison avec la dernière sortie</div>
          <div style={{ fontSize: 13, color: T.mut }}>
            {fmtDate(prev.date)} · {prev.log.km} km à {pace(prev.log.minutes, prev.log.km)}/km →{" "}
            <b style={{ color: log.km >= prev.log.km ? T.ok : T.mut }}>
              {log.km >= prev.log.km ? "+" : ""}{(log.km - prev.log.km).toFixed(2)} km
            </b>
          </div>
        </div>
      )}

      {(log.tests || []).length > 0 && (
        <div className="card tight" style={{ marginTop: 12, textAlign: "left" }}>
          <div className="eyebrow" style={{ marginBottom: 6 }}>Repères enregistrés</div>
          {log.tests.map((t, i) => (
            <div key={i} className="between" style={{ marginTop: 6, fontSize: 13 }}>
              <span>{t.name}</span><span className="num" style={{ fontSize: 16 }}>{t.value}{t.unit === "s" ? " s" : ""}</span>
            </div>
          ))}
          <div style={{ fontSize: 11.5, color: T.dim, marginTop: 8 }}>Ces valeurs remplacent les « À TESTER » et débloquent la part manquante de ton score.</div>
        </div>
      )}

      <div className="card tight" style={{ marginTop: 12, textAlign: "left" }}>
        <div className="eyebrow" style={{ marginBottom: 6 }}>Récupération recommandée</div>
        <div style={{ fontSize: 13, color: T.mut, lineHeight: 1.5 }}>{reco}</div>
        {pain && (
          <div style={{ fontSize: 12.5, color: T.warn, marginTop: 9, lineHeight: 1.5 }}>
            Douleur signalée : « {pain} ». Réduis ou interromps l'activité concernée. Si elle persiste au-delà de quelques jours ou s'aggrave, consulte un professionnel de santé — cette application ne pose aucun diagnostic.
          </div>
        )}
      </div>

      <button className="btn" style={{ marginTop: 18 }} onClick={onClose}>Retour à l'accueil</button>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   SEMAINE — calendrier + réorganisation
   ───────────────────────────────────────────────────────────── */
/* ─────────────────────────────────────────────────────────────
   ÉDITEUR DE SÉANCE
   ───────────────────────────────────────────────────────────── */
const WEEKDAY_OF = { REST: 1, UPPER: 2, RUN: 3, SWIM: 4, LOWER: 6, LONG: 0 };

function SessionEditor({ session, onSave, onClose }) {
  const [s, setS] = useState(() => ({ ...session, exercises: (session.exercises || []).map((e) => ({ ...e })) }));
  const setF = (k, v) => setS((p) => ({ ...p, [k]: v }));
  const upEx = (i, k, v) => setS((p) => ({ ...p, exercises: p.exercises.map((e, j) => (j === i ? { ...e, [k]: v } : e)) }));
  const delEx = (i) => setS((p) => ({ ...p, exercises: p.exercises.filter((_, j) => j !== i) }));
  const addEx = () => setS((p) => ({
    ...p,
    exercises: [...(p.exercises || []), { n: "Nouvel exercice", sets: 3, reps: "10", rest: 90, rir: 2, cue: "" }],
  }));
  const moveEx = (i, dir) => setS((p) => {
    const a = [...p.exercises]; const j = i + dir;
    if (j < 0 || j >= a.length) return p;
    [a[i], a[j]] = [a[j], a[i]];
    return { ...p, exercises: a };
  });
  const swapType = (t) => {
    if (t === s.type) return;
    const fresh = buildSession(s.date, s.week || 1, WEEKDAY_OF[t]);
    setS({ ...fresh, id: s.id, date: s.date, status: s.status, week: s.week });
  };

  const isRest = s.type === "REST";

  return (
    <div className="sheet" style={{ zIndex: 120 }}>
      <div className="wrap" style={{ paddingTop: 16, paddingBottom: 40 }}>
        <div className="between" style={{ marginBottom: 16 }}>
          <span className="eyebrow">Modifier · {fmtDate(s.date)}</span>
          <button className="eyebrow" onClick={onClose} style={{ color: T.mut }}>Annuler ✕</button>
        </div>

        <div className="eyebrow" style={{ marginBottom: 8 }}>Type de séance</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
          {Object.keys(TYPES).map((k) => (
            <button key={k} className={`chip${s.type === k ? " on" : ""}`} onClick={() => swapType(k)}>
              {TYPES[k].icon} {TYPES[k].label}
            </button>
          ))}
        </div>
        <div style={{ fontSize: 11.5, color: T.dim, marginBottom: 18, lineHeight: 1.5 }}>
          Changer de type recharge le contenu type de cette discipline pour ta semaine en cours. Utile quand la piscine est fermée ou qu'il pleut.
        </div>

        <div style={{ marginBottom: 14 }}>
          <div className="eyebrow" style={{ marginBottom: 7 }}>Titre</div>
          <input className="inp" value={s.title} onChange={(e) => setF("title", e.target.value)} />
        </div>

        {!isRest && (
          <>
            <NumPad label="Durée estimée" value={s.duration} set={(v) => setF("duration", +v || 0)} unit="min" />
            <Scale label="Intensité visée" value={s.intensity} set={(v) => setF("intensity", v)} max={5} hint="1 = souple · 5 = maximal" />
          </>
        )}

        <div style={{ marginBottom: 14 }}>
          <div className="eyebrow" style={{ marginBottom: 7 }}>Objectif</div>
          <textarea className="inp" rows={2} value={s.goal || ""} onChange={(e) => setF("goal", e.target.value)} />
        </div>

        {!isRest && (
          <div style={{ marginBottom: 18 }}>
            <div className="eyebrow" style={{ marginBottom: 7 }}>Objectif de performance</div>
            <textarea className="inp" rows={2} value={s.target || ""} onChange={(e) => setF("target", e.target.value)}
              placeholder="ex : 6 km à 6:40/km, FC sous 150" />
          </div>
        )}

        {!isRest && (
          <>
            <div className="between" style={{ marginBottom: 10 }}>
              <span className="eyebrow">Contenu ({(s.exercises || []).length})</span>
              <button className="eyebrow" onClick={addEx} style={{ color: T.text }}>+ Ajouter</button>
            </div>
            <div className="stack" style={{ gap: 10 }}>
              {(s.exercises || []).map((e, i) => (
                <div key={i} className="card tight">
                  <div className="row" style={{ gap: 7, marginBottom: 9 }}>
                    <input className="inp" value={e.n} onChange={(ev) => upEx(i, "n", ev.target.value)} style={{ fontSize: 14 }} />
                  </div>
                  <div className="grid2" style={{ marginBottom: 8 }}>
                    <div>
                      <div className="eyebrow" style={{ marginBottom: 4 }}>Séries</div>
                      <input className="inp" inputMode="numeric" value={e.sets}
                        onChange={(ev) => upEx(i, "sets", Math.max(1, +ev.target.value || 1))} style={{ padding: "9px 11px" }} />
                    </div>
                    <div>
                      <div className="eyebrow" style={{ marginBottom: 4 }}>Répétitions</div>
                      <input className="inp" value={e.reps} onChange={(ev) => upEx(i, "reps", ev.target.value)} style={{ padding: "9px 11px" }} />
                    </div>
                    <div>
                      <div className="eyebrow" style={{ marginBottom: 4 }}>Repos (s)</div>
                      <input className="inp" inputMode="numeric" value={e.rest}
                        onChange={(ev) => upEx(i, "rest", +ev.target.value || 0)} style={{ padding: "9px 11px" }} />
                    </div>
                    <div>
                      <div className="eyebrow" style={{ marginBottom: 4 }}>RIR visé</div>
                      <input className="inp" inputMode="numeric" value={e.rir}
                        onChange={(ev) => upEx(i, "rir", +ev.target.value || 0)} style={{ padding: "9px 11px" }} />
                    </div>
                  </div>
                  <input className="inp" value={e.cue || ""} onChange={(ev) => upEx(i, "cue", ev.target.value)}
                    placeholder="Consigne technique" style={{ fontSize: 12.5, padding: "9px 11px" }} />
                  <div className="row" style={{ gap: 6, marginTop: 9 }}>
                    <button className="btn ghost sm" style={{ width: 44 }} onClick={() => moveEx(i, -1)}>↑</button>
                    <button className="btn ghost sm" style={{ width: 44 }} onClick={() => moveEx(i, 1)}>↓</button>
                    <button className="btn ghost sm" onClick={() => delEx(i)} style={{ color: T.bad }}>Supprimer</button>
                  </div>
                </div>
              ))}
              {(s.exercises || []).length === 0 && (
                <div className="card" style={{ textAlign: "center", padding: 22, fontSize: 13, color: T.mut }}>
                  Aucun exercice. Ajoute-en un, ou repasse la séance en récupération.
                </div>
              )}
            </div>
          </>
        )}

        <div style={{ marginTop: 22 }}>
          <button className="btn" onClick={() => onSave({ ...s, edited: true })}>Enregistrer les modifications</button>
          <div style={{ fontSize: 11.5, color: T.dim, marginTop: 10, lineHeight: 1.5 }}>
            Tes modifications ne touchent que cette journée. Le reste du programme et la montée de volume restent inchangés.
          </div>
        </div>
      </div>
    </div>
  );
}

/* Reporter = échanger la séance avec celle du lendemain.
   Simple et prévisible : le jour de repos se déplace avec, ce qui garantit
   qu'on ne crée jamais sept jours d'affilée sans coupure. */
function rotatePostpone(sessions, id) {
  const s = sessions.find((x) => x.id === id);
  if (!s) return sessions;
  const nd = iso(addD(new Date(s.date + "T12:00:00"), 1));
  const other = sessions.find((x) => x.date === nd && x.status === "planned");
  if (!other) return sessions.map((x) => (x.id === id ? { ...x, date: nd, moved: true } : x));
  return sessions.map((x) =>
    x.id === id ? { ...x, date: nd, moved: true }
    : x.id === other.id ? { ...x, date: s.date, moved: true }
    : x);
}

function Week({ st, set, onStart }) {
  const [off, setOff] = useState(0);
  const [sel, setSel] = useState(null);
  const [edit, setEdit] = useState(null);
  const monday = useMemo(() => {
    const t = new Date(TODAY + "T12:00:00");
    const diff = (t.getDay() + 6) % 7;
    return addD(t, -diff + off * 7);
  }, [off]);
  const days = Array.from({ length: 7 }, (_, i) => iso(addD(monday, i)));
  const weekSessions = st.sessions.filter((x) => days.includes(x.date));
  const km = sum(weekSessions.filter((x) => x.status === "done" && x.log?.km).map((x) => x.log.km));
  const doneN = weekSessions.filter((x) => x.status === "done").length;
  const plannedN = weekSessions.filter((x) => x.type !== "REST").length;

  const mark = (id, status) => set((p) => ({ ...p, sessions: p.sessions.map((x) => (x.id === id ? { ...x, status } : x)) }));
  const postpone = (id) => { set((p) => ({ ...p, sessions: rotatePostpone(p.sessions, id) })); setSel(null); };
  const saveEdit = (ns) => {
    set((p) => ({ ...p, sessions: p.sessions.map((x) => (x.id === ns.id ? ns : x)) }));
    setEdit(null); setSel(ns);
  };

  return (
    <div className="wrap fade">
      <div className="between" style={{ padding: "18px 0 14px" }}>
        <div className="dsp" style={{ fontSize: 22 }}>Semaine</div>
        <div className="row" style={{ gap: 8 }}>
          <button className="btn ghost sm" style={{ width: 40 }} onClick={() => setOff(off - 1)}>‹</button>
          <span className="num" style={{ fontSize: 12, color: T.mut, width: 76, textAlign: "center" }}>
            {off === 0 ? "En cours" : `${off > 0 ? "+" : ""}${off} sem.`}
          </span>
          <button className="btn ghost sm" style={{ width: 40 }} onClick={() => setOff(off + 1)}>›</button>
        </div>
      </div>

      <div className="grid3" style={{ marginBottom: 16 }}>
        <Stat label="Séances" value={`${doneN}/${plannedN}`} sub="réalisées" />
        <Stat label="Course" value={km.toFixed(1)} sub="km" c={T.run} />
        <Stat label="Charge" value={sum(loadSeries(st, 7).map((x) => x.load))} sub="7 jours" />
      </div>

      <div className="stack" style={{ gap: 8 }}>
        {days.map((d) => {
          const ss = st.sessions.filter((x) => x.date === d);
          const isToday = d === TODAY;
          return (
            <div key={d}>
              <div className="row" style={{ gap: 8, marginBottom: 6 }}>
                <span className="eyebrow" style={{ color: isToday ? T.text : T.dim }}>{fmtDate(d)}</span>
                {isToday && <Pill c={T.text}>Aujourd'hui</Pill>}
              </div>
              {ss.length === 0 && <div className="dayc" style={{ opacity: .5 }}><span className="dot" style={{ background: T.rest }} /><span style={{ fontSize: 13 }}>Rien de programmé</span></div>}
              {ss.map((s) => (
                <button key={s.id} className="dayc" onClick={() => setSel(s)} style={{ marginBottom: 6 }}>
                  <span className="dot" style={{ background: TYPES[s.type].color, opacity: s.status === "skipped" ? .3 : 1 }} />
                  <span style={{ fontSize: 16 }}>{TYPES[s.type].icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className={s.status === "skipped" ? "strike" : ""} style={{ fontSize: 13.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.title}</div>
                    <div style={{ fontSize: 11, color: T.dim, marginTop: 1 }}>
                      {s.duration ? `${s.duration} min` : "repos"}
                      {s.moved && " · déplacée"}
                      {s.edited && " · modifiée"}
                      {s.status === "done" && s.log?.km ? ` · ${s.log.km} km` : ""}
                    </div>
                  </div>
                  {s.status === "done" && <span style={{ color: T.ok, fontSize: 14 }}>✓</span>}
                  {s.status === "skipped" && <span style={{ color: T.dim, fontSize: 14 }}>✕</span>}
                </button>
              ))}
            </div>
          );
        })}
      </div>

      {sel && (
        <div className="sheet">
          <div className="wrap" style={{ paddingTop: 16, paddingBottom: 40 }}>
            <div className="between" style={{ marginBottom: 16 }}>
              <SessionBadge type={sel.type} />
              <button className="eyebrow" onClick={() => setSel(null)} style={{ color: T.mut }}>Fermer ✕</button>
            </div>
            <div className="eyebrow">{fmtDate(sel.date)}</div>
            <div className="dsp" style={{ fontSize: 27, marginTop: 5 }}>{sel.title}</div>
            <div style={{ fontSize: 13.5, color: T.mut, marginTop: 9, lineHeight: 1.55 }}>{sel.goal}</div>

            {sel.why && <div className="card" style={{ marginTop: 14 }}>
              <div className="eyebrow" style={{ marginBottom: 6 }}>Pourquoi</div>
              <div style={{ fontSize: 13, color: T.mut, lineHeight: 1.55 }}>{sel.why}</div>
            </div>}

            {sel.target && <div className="card" style={{ marginTop: 10 }}>
              <div className="eyebrow" style={{ marginBottom: 6 }}>Objectif de performance</div>
              <div style={{ fontSize: 13.5 }}>{sel.target}</div>
            </div>}

            {sel.exercises && (
              <div className="card" style={{ marginTop: 10 }}>
                <div className="eyebrow" style={{ marginBottom: 8 }}>Contenu</div>
                {sel.exercises.map((e, i) => (
                  <div key={i} style={{ padding: "9px 0", borderTop: i ? `1px solid ${T.line}` : "none" }}>
                    <div className="between">
                      <span style={{ fontSize: 13.5, color: e.test ? T.warn : T.text }}>{e.n}</span>
                      <span className="num" style={{ fontSize: 13, color: T.mut }}>{e.sets} × {e.reps}</span>
                    </div>
                    <div style={{ fontSize: 11.5, color: T.dim, marginTop: 3 }}>
                      {e.rest ? `repos ${e.rest} s · ` : ""}RIR {e.rir} — {e.cue}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {sel.cues && !sel.exercises && (
              <div className="card" style={{ marginTop: 10 }}>
                <div className="eyebrow" style={{ marginBottom: 8 }}>Consignes</div>
                {sel.cues.map((c, i) => <div key={i} style={{ fontSize: 13, color: T.mut, marginTop: 5 }}>· {c}</div>)}
              </div>
            )}

            {sel.extra && (
              <div className="card" style={{ marginTop: 10, borderColor: T.run + "44" }}>
                <div className="eyebrow" style={{ marginBottom: 6, color: T.run }}>Deuxième bloc du jour</div>
                <div style={{ fontSize: 13.5 }}>{sel.extra.note}</div>
              </div>
            )}

            <div style={{ marginTop: 20 }}>
              {sel.status === "planned" && sel.type !== "REST" && (
                <button className="btn" onClick={() => { setSel(null); onStart(sel); }}>Commencer la séance</button>
              )}
              {sel.edited && <div style={{ marginTop: 10 }}><Pill c={T.warn}>Séance modifiée</Pill></div>}
              <button className="btn ghost" style={{ marginTop: 10 }} onClick={() => setEdit(sel)}>Modifier la séance</button>
              <div className="grid3" style={{ marginTop: 10 }}>
                <button className="btn ghost sm" onClick={() => { mark(sel.id, "done"); setSel(null); }}>Fait</button>
                <button className="btn ghost sm" onClick={() => postpone(sel.id)}>Reporter</button>
                <button className="btn ghost sm" onClick={() => { mark(sel.id, "skipped"); setSel(null); }}>Sauter</button>
              </div>
              <div style={{ fontSize: 11.5, color: T.dim, marginTop: 10, lineHeight: 1.5 }}>
                « Reporter » échange cette séance avec celle du lendemain. Le jour de repos se déplace avec elle : tu ne peux pas te retrouver avec sept jours d'affilée sans coupure.
              </div>
            </div>
          </div>
        </div>
      )}

      {edit && <SessionEditor session={edit} onSave={saveEdit} onClose={() => setEdit(null)} />}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   PERFORMANCES — running / natation / street
   ───────────────────────────────────────────────────────────── */
function marathonReadiness(st) {
  const runs = st.sessions.filter((x) => x.status === "done" && x.kind === "run" && x.log?.km);
  const km7 = sum(runs.filter((x) => x.date > D(-8)).map((x) => x.log.km));
  const longest = runs.length ? Math.max(...runs.map((x) => x.log.km)) : 0;
  const best = runs.filter((r) => r.log.km >= 4).map((r) => r.log.minutes / r.log.km);
  const bp = best.length ? Math.min(...best) : null;
  const v = clamp((km7 / 55) * 100) * 0.4 + clamp((longest / 32) * 100) * 0.35 + (bp ? clamp(((7 - bp) / (7 - 5.0)) * 100) : 0) * 0.25;
  return { pct: Math.round(v), km7, longest, bp };
}

function Running({ st }) {
  const runs = st.sessions.filter((x) => x.status === "done" && x.kind === "run" && x.log?.km);
  const m = marathonReadiness(st);
  const week = st.sessions.filter((x) => x.status === "planned")[0]?.week || 1;
  const phase = runPhase(week);
  const km30 = sum(runs.filter((x) => x.date > D(-31)).map((x) => x.log.km));
  const hrRuns = runs.filter((r) => r.log.hr);
  const chart = runs.map((r) => ({ d: fmtDate(r.date).slice(0, 6), km: r.log.km, pace: +(r.log.minutes / r.log.km).toFixed(2) }));
  const best5 = runs.filter((r) => r.log.km >= 5);

  return (
    <div className="fade">
      <div className="card" style={{ background: `linear-gradient(160deg, ${T.run}1A, transparent 65%)` }}>
        <div className="between">
          <div className="eyebrow">Marathon sub 4 h</div>
          <Pill c={T.run}>{phase.key}</Pill>
        </div>
        <div className="row" style={{ alignItems: "baseline", gap: 8, margin: "10px 0 12px" }}>
          <span className="num" style={{ fontSize: 44 }}>{m.pct}</span>
          <span style={{ fontSize: 13, color: T.mut }}>% de préparation</span>
        </div>
        <Meter v={m.pct} c={T.run} h={7} />
        <div className="row" style={{ gap: 4, marginTop: 10 }}>
          {["BASE", "BUILD", "SPECIFIC", "TAPER", "RACE"].map((p) => (
            <span key={p} className="eyebrow" style={{ flex: 1, textAlign: "center", fontSize: 8.5, color: p === phase.key ? T.run : T.dim }}>{p}</span>
          ))}
        </div>
        <div style={{ fontSize: 12.5, color: T.mut, marginTop: 12, lineHeight: 1.55 }}>
          <b style={{ color: T.text }}>Tu n'es pas en état de courir un marathon aujourd'hui.</b> Avec {m.km7.toFixed(1)} km sur les 7 derniers jours et {m.longest.toFixed(1)} km de plus longue sortie, il te manque le volume, pas la vitesse. L'objectif de la phase {phase.label} : atteindre 40 km/semaine et 18 km de sortie longue avant de parler d'allure spécifique.
        </div>
      </div>

      <div className="grid2" style={{ marginTop: 12 }}>
        <Stat label="Volume 7 jours" value={m.km7.toFixed(1)} sub="km · cible 55" c={T.run} />
        <Stat label="Volume 30 jours" value={km30.toFixed(1)} sub="km" />
        <Stat label="Meilleure allure" value={m.bp ? `${pace(m.bp, 1)}` : "—"} sub="/km sur 4 km+" />
        <Stat label="Plus longue sortie" value={m.longest.toFixed(2)} sub="km" />
        <Stat label="Meilleur 5 km" value={best5.length ? mmss(Math.min(...best5.map((r) => (r.log.minutes / r.log.km) * 5)) * 60) : "À TESTER"} sub={best5.length ? "chrono" : "cours 5 km d'une traite"} c={best5.length ? T.text : T.warn} />
        <Stat label="Meilleur 10 km" value="À TESTER" sub="jamais couru" c={T.warn} />
        <Stat label="FC moyenne" value={hrRuns.length ? Math.round(sum(hrRuns.map((r) => r.log.hr)) / hrRuns.length) : "—"} sub={hrRuns.length ? "bpm" : "1 sortie mesurée"} />
        <Stat label="Allure marathon cible" value="5:41" sub="/km pour 3 h 59" c={T.run} />
      </div>

      {chart.length > 1 && (
        <Section title="Distance par sortie">
          <div className="card tight">
            <ResponsiveContainer width="100%" height={140}>
              <AreaChart data={chart}>
                <defs><linearGradient id="gr" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={T.run} stopOpacity={.45} /><stop offset="100%" stopColor={T.run} stopOpacity={0} />
                </linearGradient></defs>
                <CartesianGrid stroke={T.line} vertical={false} />
                <XAxis dataKey="d" tick={{ fill: T.dim, fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: T.dim, fontSize: 10 }} axisLine={false} tickLine={false} width={26} />
                <Tooltip contentStyle={{ background: T.cardHi, border: `1px solid ${T.line2}`, borderRadius: 10, fontSize: 12 }} labelStyle={{ color: T.mut }} />
                <Area dataKey="km" stroke={T.run} strokeWidth={2} fill="url(#gr)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Section>
      )}

      <Section title="Évaluation honnête du calendrier">
        <div className="card">
          <div style={{ fontSize: 13, color: T.mut, lineHeight: 1.6 }}>
            <p style={{ margin: "0 0 10px" }}><b style={{ color: T.text }}>Sub 4 h en 12 mois : atteignable, mais serré.</b> Ta vitesse n'est pas le problème — 5:44/km sur 4,4 km montre que le moteur existe. Le problème est la tolérance au volume : passer de 10 à 45 km par semaine demande 5 à 6 mois de montée prudente, et c'est la période où la majorité des blessures arrivent.</p>
            <p style={{ margin: "0 0 10px" }}><b style={{ color: T.warn }}>Conflit à trancher : les 5 kg.</b> Prendre 5 kg, c'est +6 % de masse à transporter sur 42 km. À vitesse égale, ça coûte plusieurs minutes sur le chrono final. Les deux objectifs se contredisent partiellement.</p>
            <p style={{ margin: 0 }}><b style={{ color: T.text }}>Recommandation :</b> +2 à 3 kg pendant les 6 premiers mois (phase base, volume encore modéré), puis stabilisation du poids sur la préparation spécifique. Les 2 à 3 kg restants après le marathon. Si tu tiens absolument à 88 kg avant la course, vise plutôt 4 h 15 et assume-le.</p>
          </div>
        </div>
      </Section>
    </div>
  );
}

function Swimming({ st }) {
  const swims = st.sessions.filter((x) => x.status === "done" && x.kind === "swim");
  const cont = st.swimBest.continuous || 0;
  const ladder = [25, 50, 100, 200, 300, 500, 750, 1000, 1500];
  const total = sum(swims.filter((s) => s.log?.distance).map((s) => s.log.distance));
  const minutes = sum(swims.map((s) => s.log?.minutes || 0));
  const idx = ladder.findIndex((x) => x > cont);
  const next = idx === -1 ? 1500 : ladder[idx];

  return (
    <div className="fade">
      <div className="card" style={{ background: `linear-gradient(160deg, ${T.swim}1A, transparent 65%)` }}>
        <div className="eyebrow">Objectif · 1 500 m sans arrêt</div>
        <div className="row" style={{ alignItems: "baseline", gap: 8, margin: "10px 0 14px" }}>
          <span className="num" style={{ fontSize: 44 }}>{cont}</span>
          <span style={{ fontSize: 13, color: T.mut }}>m en continu · prochain palier {next} m</span>
        </div>
        <div className="row" style={{ gap: 3 }}>
          {ladder.map((l) => (
            <div key={l} style={{ flex: 1, textAlign: "center" }}>
              <div style={{ height: 6, borderRadius: 9, background: cont >= l ? T.swim : T.line, marginBottom: 5 }} />
              <div className="num" style={{ fontSize: 8.5, color: cont >= l ? T.swim : T.dim }}>{l >= 1000 ? l / 1000 + "k" : l}</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 12.5, color: T.mut, marginTop: 14, lineHeight: 1.55 }}>
          Le passage de 25 à 100 m est presque uniquement technique : glisse en brasse et respiration continue. Ne cherche pas à forcer la distance avant que 4 × 50 m ne passent sans essoufflement.
        </div>
      </div>

      <div className="grid2" style={{ marginTop: 12 }}>
        <Stat label="Distance continue" value={cont} sub="m · record" c={T.swim} />
        <Stat label="Distance totale" value={total || "—"} sub={total ? "m cumulés" : "jamais comptée"} c={total ? T.text : T.warn} />
        <Stat label="Temps dans l'eau" value={minutes} sub="min cumulées" />
        <Stat label="Séances" value={swims.length} sub="enregistrées" />
        <Stat label="Allure / 100 m" value="À TESTER" sub="chronomètre 100 m brasse" c={T.warn} />
        <Stat label="Crawl" value={st.swimBest.crawl ? "En cours" : "Non acquis"} sub="objectif 6 mois" c={st.swimBest.crawl ? T.swim : T.warn} />
      </div>

      <Section title="Ce qui te bloque aujourd'hui">
        <div className="card">
          <div style={{ fontSize: 13, color: T.mut, lineHeight: 1.6 }}>
            Tu passes 45 min dans l'eau mais tu ne comptes pas ta distance : impossible de mesurer une progression. À partir de la prochaine séance, note le nombre de longueurs. C'est la donnée la plus importante des trois prochains mois.
          </div>
        </div>
      </Section>
    </div>
  );
}

const BADGES = [
  { k: "muscleups", v: 1, t: "Premier muscle-up", got: true },
  { k: "pullups", v: 10, t: "10 tractions strictes" },
  { k: "dips", v: 15, t: "15 dips" },
  { k: "muscleups", v: 3, t: "3 muscle-ups d'affilée" },
  { k: "legraises", v: 10, t: "10 relevés de jambes stricts" },
  { k: "pullups", v: 15, t: "15 tractions" },
  { k: "muscleups", v: 5, t: "5 muscle-ups d'affilée" },
  { k: "dips", v: 25, t: "25 dips" },
  { k: "legraises", v: 20, t: "20 relevés de jambes" },
  { k: "pullups", v: 20, t: "20 tractions" },
];

function Street({ st }) {
  const b = st.benchmarks;
  const bv = (x) => (x && typeof x === "object" ? x.v : x);
  const cards = [
    { t: "Tractions", k: "pullups", goal: 20, u: "reps", c: T.street },
    { t: "Dips", k: "dips", goal: 30, u: "reps", c: T.street },
    { t: "Muscle-up", k: "muscleups", goal: 8, u: "consécutifs", c: T.street },
    { t: "Relevés de jambes", k: "legraises", goal: 20, u: "reps suspendu", c: T.street },
    { t: "Squats", k: "squats", goal: 80, u: "reps", c: T.legs },
  ];
  const upper = st.sessions.filter((x) => x.status === "done" && ["UPPER", "LOWER"].includes(x.type));
  const vol = sum(upper.filter((x) => x.date > D(-15)).map((x) => x.log?.reps || 0));

  return (
    <div className="fade">
      <div className="grid2">
        {cards.map((c) => {
          const val = bv(b[c.k]);
          const partial = b[c.k] && typeof b[c.k] === "object" && b[c.k].partial;
          return (
            <div key={c.k} className="card tight">
              <div className="eyebrow" style={{ marginBottom: 6 }}>{c.t}</div>
              {val ? (
                <>
                  <div className="row" style={{ alignItems: "baseline", gap: 5 }}>
                    <span className="num" style={{ fontSize: 28, color: c.c }}>{val}</span>
                    <span style={{ fontSize: 11, color: T.dim }}>/ {c.goal}</span>
                  </div>
                  <div style={{ marginTop: 8 }}><Meter v={(val / c.goal) * 100} c={c.c} h={4} /></div>
                  <div style={{ fontSize: 10.5, color: partial ? T.warn : T.dim, marginTop: 6 }}>
                    {partial ? "minimum connu, max non testé" : c.u}
                  </div>
                </>
              ) : (
                <>
                  <div className="dsp" style={{ fontSize: 19, color: T.warn }}>À TESTER</div>
                  <div style={{ fontSize: 11, color: T.dim, marginTop: 7, lineHeight: 1.45 }}>
                    {c.k === "muscleups" ? "Acquis, mais nombre consécutif inconnu." : c.k === "legraises" ? "Une série maximale suspendu, sans élan." : "Une série maximale, forme stricte."}
                  </div>
                </>
              )}
            </div>
          );
        })}
        <div className="card tight">
          <div className="eyebrow" style={{ marginBottom: 6 }}>Volume 14 jours</div>
          <div className="num" style={{ fontSize: 28 }}>{vol}</div>
          <div style={{ fontSize: 10.5, color: T.dim, marginTop: 6 }}>répétitions barre</div>
        </div>
      </div>

      <Section title="Badges">
        <div className="card">
          {BADGES.map((bd, i) => {
            const val = bv(b[bd.k]) || 0;
            const got = bd.got || val >= bd.v;
            return (
              <div key={i} className="between" style={{ padding: "9px 0", borderTop: i ? `1px solid ${T.line}` : "none", opacity: got ? 1 : .42 }}>
                <span style={{ fontSize: 13 }}>{got ? "🏅" : "🔒"} {bd.t}</span>
                <span className="num" style={{ fontSize: 12, color: got ? T.warn : T.dim }}>{got ? "obtenu" : `${val}/${bd.v}`}</span>
              </div>
            );
          })}
        </div>
      </Section>

      <Section title="Protocole de test">
        <div className="card">
          <div style={{ fontSize: 13, color: T.mut, lineHeight: 1.6 }}>
            Échauffement 10 min, puis une seule série maximale par mouvement avec 3 à 4 min de repos entre chaque. Ordre : tractions, dips, muscle-ups, relevés de jambes. Ne teste jamais deux fois le même mois — c'est une séance coûteuse nerveusement. Le test est déjà placé dans ta séance haut du corps de mardi.
          </div>
        </div>
      </Section>
    </div>
  );
}

function Perf({ st }) {
  const [tab, setTab] = useState("run");
  return (
    <div className="wrap fade">
      <div className="dsp" style={{ fontSize: 22, padding: "18px 0 14px" }}>Performances</div>
      <div className="row" style={{ gap: 7, marginBottom: 16 }}>
        {[["run", "🏃 Running"], ["swim", "🏊 Natation"], ["street", "🤸 Street"]].map(([k, l]) => (
          <button key={k} className={`chip${tab === k ? " on" : ""}`} style={{ flex: 1 }} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>
      {tab === "run" && <Running st={st} />}
      {tab === "swim" && <Swimming st={st} />}
      {tab === "street" && <Street st={st} />}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   PHYSIQUE
   ───────────────────────────────────────────────────────────── */
function Physique({ st, set }) {
  const [w, setW] = useState("");
  const [ms, setMs] = useState({ waist: "", chest: "", arm: "", thigh: "" });
  const [cmp, setCmp] = useState([0, 0]);
  const fileRef = useRef(null);

  const ws = st.weights;
  const cur = ws.length ? ws[ws.length - 1].kg : st.profile.startWeight;
  const goal = st.profile.goalWeight;
  const start = st.profile.startWeight;
  const prog = clamp(((cur - start) / (goal - start)) * 100);
  const weekly = useMemo(() => {
    const byWeek = {};
    ws.forEach((x) => {
      const d = new Date(x.date + "T12:00:00");
      const k = `${d.getFullYear()}-S${Math.ceil(((d - new Date(d.getFullYear(), 0, 1)) / 864e5 + 1) / 7)}`;
      (byWeek[k] = byWeek[k] || []).push(x.kg);
    });
    return Object.entries(byWeek).map(([k, v]) => ({ k, kg: +(sum(v) / v.length).toFixed(1) }));
  }, [ws]);

  const addWeight = () => {
    if (!w) return;
    set((p) => ({ ...p, weights: [...p.weights.filter((x) => x.date !== TODAY), { date: TODAY, kg: +w }].sort((a, b) => a.date.localeCompare(b.date)) }));
    setW("");
  };
  const addMeasure = () => {
    if (!ms.waist && !ms.chest && !ms.arm && !ms.thigh) return;
    set((p) => ({ ...p, measures: [...p.measures, { date: TODAY, ...Object.fromEntries(Object.entries(ms).map(([k, v]) => [k, +v || null])) }] }));
    setMs({ waist: "", chest: "", arm: "", thigh: "" });
  };
  const addPhoto = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      const img = new Image();
      img.onload = () => {
        const cv = document.createElement("canvas");
        const scale = 520 / img.width;
        cv.width = 520; cv.height = img.height * scale;
        cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
        const data = cv.toDataURL("image/jpeg", 0.68);
        set((p) => ({ ...p, photos: [...p.photos, { date: TODAY, data }] }));
      };
      img.src = r.result;
    };
    r.readAsDataURL(f);
  };

  const last = st.measures[st.measures.length - 1];
  const first = st.measures[0];
  const rate = ws.length > 1 ? (cur - ws[0].kg) / Math.max(1, (new Date(ws[ws.length - 1].date) - new Date(ws[0].date)) / 6048e5) : 0;

  return (
    <div className="wrap fade">
      <div className="dsp" style={{ fontSize: 22, padding: "18px 0 14px" }}>Physique</div>

      <div className="card">
        <div className="between" style={{ alignItems: "baseline" }}>
          <div className="row" style={{ alignItems: "baseline", gap: 7 }}>
            <span className="num" style={{ fontSize: 42 }}>{cur.toFixed(1)}</span>
            <span style={{ fontSize: 14, color: T.mut }}>kg</span>
          </div>
          <span className="num" style={{ fontSize: 15, color: T.dim }}>objectif {goal} kg</span>
        </div>
        <div style={{ margin: "14px 0 8px" }}><Meter v={prog} c="#8A9BB0" h={7} /></div>
        <div className="between">
          <span className="num" style={{ fontSize: 11, color: T.dim }}>{start} kg</span>
          <span className="num" style={{ fontSize: 11, color: T.dim }}>+{(cur - start).toFixed(1)} kg</span>
          <span className="num" style={{ fontSize: 11, color: T.dim }}>{goal} kg</span>
        </div>
        {rate > 0.35 && (
          <div className="card flat tight" style={{ marginTop: 12, borderColor: T.warn + "55" }}>
            <div style={{ fontSize: 12.5, color: T.warn, lineHeight: 1.5 }}>
              ⚠️ +{rate.toFixed(2)} kg/semaine. Au-delà de 0,25 kg/semaine, la part de gras augmente et ta course en paie le prix. Réduis le surplus calorique.
            </div>
          </div>
        )}
      </div>

      <Section title="Ajouter une pesée">
        <div className="row" style={{ gap: 9 }}>
          <input className="inp" inputMode="decimal" placeholder="83.4" value={w} onChange={(e) => setW(e.target.value)} />
          <button className="btn" style={{ width: 110 }} onClick={addWeight}>Ajouter</button>
        </div>
      </Section>

      {ws.length > 1 ? (
        <Section title="Évolution du poids" right={<span className="num" style={{ fontSize: 11, color: T.dim }}>moy. hebdo {weekly[weekly.length - 1]?.kg} kg</span>}>
          <div className="card tight">
            <ResponsiveContainer width="100%" height={150}>
              <LineChart data={ws.map((x) => ({ d: fmtDate(x.date).slice(0, 6), kg: x.kg }))}>
                <CartesianGrid stroke={T.line} vertical={false} />
                <XAxis dataKey="d" tick={{ fill: T.dim, fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis domain={[start - 2, goal + 1]} tick={{ fill: T.dim, fontSize: 10 }} axisLine={false} tickLine={false} width={30} />
                <ReferenceLine y={goal} stroke={T.line2} strokeDasharray="4 4" />
                <Tooltip contentStyle={{ background: T.cardHi, border: `1px solid ${T.line2}`, borderRadius: 10, fontSize: 12 }} />
                <Line dataKey="kg" stroke="#8A9BB0" strokeWidth={2} dot={{ r: 3, fill: "#8A9BB0" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Section>
      ) : (
        <Section title="Évolution du poids">
          <div className="card" style={{ textAlign: "center", padding: 24 }}>
            <div style={{ fontSize: 13, color: T.mut, lineHeight: 1.5 }}>
              Une seule pesée enregistrée. Pèse-toi 3 fois par semaine, le matin à jeun : c'est la moyenne hebdomadaire qui compte, pas le chiffre du jour.
            </div>
          </div>
        </Section>
      )}

      <Section title="Mensurations">
        <div className="card">
          <div className="grid2" style={{ marginBottom: 10 }}>
            {[["waist", "Taille"], ["chest", "Poitrine"], ["arm", "Bras"], ["thigh", "Cuisse"]].map(([k, l]) => (
              <div key={k}>
                <div className="eyebrow" style={{ marginBottom: 5 }}>{l} (cm)</div>
                <input className="inp" inputMode="decimal" value={ms[k]} onChange={(e) => setMs({ ...ms, [k]: e.target.value })}
                  placeholder={last?.[k] ? String(last[k]) : "—"} />
              </div>
            ))}
          </div>
          <button className="btn ghost sm" onClick={addMeasure}>Enregistrer le relevé</button>
          {last && first && last !== first && (
            <div style={{ marginTop: 14 }}>
              {[["chest", "Poitrine"], ["arm", "Bras"], ["thigh", "Cuisse"], ["waist", "Taille"]].map(([k, l]) => last[k] && first[k] && (
                <div key={k} className="between" style={{ padding: "6px 0", fontSize: 13 }}>
                  <span style={{ color: T.mut }}>{l}</span>
                  <span className="num">{first[k]} → {last[k]} cm <span style={{ color: last[k] - first[k] > 0 ? T.ok : T.mut }}>({last[k] - first[k] > 0 ? "+" : ""}{(last[k] - first[k]).toFixed(1)})</span></span>
                </div>
              ))}
            </div>
          )}
          {!last && <div style={{ fontSize: 11.5, color: T.dim, marginTop: 10 }}>Aucun relevé. Mesure au même moment de la journée, muscle relâché, une fois par mois.</div>}
        </div>
      </Section>

      <Section title="Photos mensuelles" right={<button className="eyebrow" onClick={() => fileRef.current?.click()} style={{ color: T.text }}>+ Ajouter</button>}>
        <input ref={fileRef} type="file" accept="image/*" onChange={addPhoto} style={{ display: "none" }} />
        {st.photos.length === 0 ? (
          <button className="card" onClick={() => fileRef.current?.click()} style={{ width: "100%", textAlign: "center", padding: 28 }}>
            <div style={{ fontSize: 26 }}>📷</div>
            <div style={{ fontSize: 13, color: T.mut, marginTop: 9, lineHeight: 1.5 }}>
              Ajoute une photo aujourd'hui : c'est ta référence de départ. Même lumière, même pose, même heure chaque mois.
            </div>
          </button>
        ) : (
          <>
            <div className="row" style={{ gap: 8, overflowX: "auto", paddingBottom: 4 }}>
              {st.photos.map((p, i) => (
                <button key={i} onClick={() => setCmp([cmp[1], i])} style={{ flex: "none" }}>
                  <img src={p.data} alt={p.date} style={{ width: 92, height: 122, objectFit: "cover", borderRadius: 10, border: `1px solid ${T.line2}` }} />
                  <div className="num" style={{ fontSize: 10, color: T.dim, marginTop: 4 }}>{fmtDate(p.date).slice(4)}</div>
                </button>
              ))}
            </div>
            {st.photos.length > 1 && (
              <div className="card tight" style={{ marginTop: 10 }}>
                <div className="eyebrow" style={{ marginBottom: 8 }}>Avant / après</div>
                <div className="grid2">
                  {[cmp[0], cmp[1]].map((i, j) => st.photos[i] && (
                    <div key={j}>
                      <img src={st.photos[i].data} alt="" style={{ width: "100%", borderRadius: 10 }} />
                      <div className="num" style={{ fontSize: 10.5, color: T.dim, marginTop: 4, textAlign: "center" }}>{fmtDate(st.photos[i].date)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </Section>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   OBJECTIFS
   ───────────────────────────────────────────────────────────── */
function Goals({ st, scores }) {
  const m = marathonReadiness(st);
  const cur = st.weights[st.weights.length - 1]?.kg || 83;
  const bv = (x) => (x && typeof x === "object" ? x.v : x);
  const blocks = [
    { h: "12 mois", sub: "août 2027", items: [
      { i: "🏃", t: "Marathon en moins de 4 h", now: `${m.km7.toFixed(1)} km/sem · plus longue sortie ${m.longest.toFixed(1)} km`, p: m.pct },
      { i: "🏊", t: "1 500 m sans arrêt", now: `${st.swimBest.continuous} m continus`, p: clamp((Math.log(st.swimBest.continuous / 25) / Math.log(60)) * 100) },
      { i: "🧍", t: "88 kg sec", now: `${cur.toFixed(1)} kg`, p: clamp(((cur - 83) / 5) * 100) },
      { i: "🤸", t: "20 tractions · 30 dips · 8 muscle-ups", now: bv(st.benchmarks.pullups) ? `${bv(st.benchmarks.pullups)} tractions` : "repères non testés", p: bv(st.benchmarks.pullups) ? clamp((bv(st.benchmarks.pullups) / 20) * 100) : 0 },
    ] },
    { h: "6 mois", sub: "février 2027", items: [
      { i: "🏃", t: "Semi-marathon en 1 h 55", now: "prérequis : 35 km/semaine tenus 4 semaines", p: clamp((m.km7 / 35) * 100) },
      { i: "🏊", t: "500 m continus + 100 m crawl", now: `${st.swimBest.continuous} m`, p: clamp((st.swimBest.continuous / 500) * 100) },
      { i: "🧍", t: "86 kg avec tour de taille stable", now: `${cur.toFixed(1)} kg`, p: clamp(((cur - 83) / 3) * 100) },
    ] },
    { h: "3 mois", sub: "novembre 2026", items: [
      { i: "🏃", t: "30 km par semaine, sortie longue de 16 km", now: `${m.km7.toFixed(1)} km · ${m.longest.toFixed(1)} km`, p: clamp((m.km7 / 30) * 100) },
      { i: "🏃", t: "10 km d'une traite sous 55 min", now: "jamais couru", p: 0 },
      { i: "🏊", t: "200 m continus en brasse", now: `${st.swimBest.continuous} m`, p: clamp((st.swimBest.continuous / 200) * 100) },
      { i: "💪", t: "+2 tractions, +3 dips, +4 relevés de jambes sur le max testé", now: "test de référence mardi", p: 0 },
    ] },
    { h: "Cette semaine", sub: "objectifs concrets", items: [
      { i: "🏃", t: "15 km de course répartis sur 3 sorties", now: `${m.km7.toFixed(1)} km réalisés`, p: clamp((m.km7 / 15) * 100) },
      { i: "🏊", t: "2 séances, dont 8 × 25 m avec 30 s de repos", now: "en cours", p: 0 },
      { i: "💪", t: "Tester tractions, dips, muscle-ups, relevés de jambes", now: "mardi", p: 0 },
      { i: "⚖️", t: "3 pesées le matin à jeun", now: `${st.weights.length} enregistrée(s)`, p: clamp((st.weights.length / 3) * 100) },
    ] },
  ];

  return (
    <div className="wrap fade">
      <div className="dsp" style={{ fontSize: 22, padding: "18px 0 6px" }}>Mes objectifs</div>
      <div style={{ fontSize: 12.5, color: T.dim, marginBottom: 4 }}>Chaque objectif est mesurable et se recalcule avec tes données.</div>
      {blocks.map((b, i) => (
        <Section key={i} title={b.h} right={<span style={{ fontSize: 11, color: T.dim }}>{b.sub}</span>}>
          <div className="stack" style={{ gap: 8 }}>
            {b.items.map((it, j) => (
              <div key={j} className="card tight">
                <div className="between" style={{ marginBottom: 7 }}>
                  <span style={{ fontSize: 13.5 }}>{it.i} {it.t}</span>
                  <span className="num" style={{ fontSize: 13, color: T.mut }}>{Math.round(it.p)}%</span>
                </div>
                <Meter v={it.p} c={T.text} h={4} />
                <div style={{ fontSize: 11.5, color: T.dim, marginTop: 6 }}>{it.now}</div>
              </div>
            ))}
          </div>
        </Section>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   RÉCUPÉRATION + BILANS
   ───────────────────────────────────────────────────────────── */
function Recovery({ st, set, rec }) {
  const [sleep, setSleep] = useState(7);
  const [fatigue, setFatigue] = useState(4);
  const [motiv, setMotiv] = useState(7);
  const [sore, setSore] = useState("");
  const l7 = loadSeries(st, 7);
  const l28 = loadSeries(st, 28);
  const z = ZONES[rec.zone];

  const save = () => set((p) => ({ ...p, wellness: [...p.wellness.filter((x) => x.date !== TODAY), { date: TODAY, sleep: +sleep, fatigue, motivation: motiv, soreness: sore }] }));

  return (
    <div className="wrap fade">
      <div className="dsp" style={{ fontSize: 22, padding: "18px 0 14px" }}>Récupération</div>

      <div className="card" style={{ borderColor: z.c + "44", background: `linear-gradient(160deg, ${z.c}14, transparent 65%)` }}>
        <div className="between">
          <div className="row" style={{ gap: 10 }}>
            <span className="dot" style={{ background: z.c, width: 11, height: 11 }} />
            <span className="dsp" style={{ fontSize: 19 }}>{z.t}</span>
          </div>
          <span className="num" style={{ fontSize: 34, color: z.c }}>{rec.score}</span>
        </div>
        <div style={{ fontSize: 13, color: T.mut, marginTop: 10, lineHeight: 1.55 }}>{z.d}</div>
        <div style={{ marginTop: 14 }}>
          {rec.parts.map((p, i) => (
            <div key={i} className="between" style={{ padding: "7px 0", borderTop: i ? `1px solid ${T.line}` : "none" }}>
              <span style={{ fontSize: 12.5, color: T.mut }}>{p.k}</span>
              <span className="num" style={{ fontSize: 12.5, color: p.v === null ? T.warn : T.text }}>{p.detail}</span>
            </div>
          ))}
        </div>
        {rec.coverage < 1 && (
          <div style={{ fontSize: 11.5, color: T.warn, marginTop: 10, lineHeight: 1.5 }}>
            Sommeil et fatigue non renseignés aujourd'hui : le score est calculé sur la charge uniquement.
          </div>
        )}
      </div>

      <Section title="Ton état aujourd'hui">
        <div className="card">
          <NumPad label="Heures de sommeil" value={sleep} set={setSleep} unit="h" />
          <Scale label="Fatigue" value={fatigue} set={setFatigue} max={10} hint="1 = frais · 10 = vidé" />
          <Scale label="Motivation" value={motiv} set={setMotiv} max={10} />
          <div style={{ marginBottom: 14 }}>
            <div className="eyebrow" style={{ marginBottom: 7 }}>Courbatures ou douleurs</div>
            <input className="inp" value={sore} onChange={(e) => setSore(e.target.value)} placeholder="ex : mollets, tendon d'Achille gauche" />
          </div>
          <button className="btn" onClick={save}>Enregistrer</button>
          <div style={{ fontSize: 11.5, color: T.dim, marginTop: 11, lineHeight: 1.5 }}>
            Cette application ne pose aucun diagnostic. Une douleur inhabituelle, qui augmente à l'effort ou dure plus de quelques jours doit t'amener à réduire ou arrêter l'activité concernée, et à consulter un professionnel de santé.
          </div>
        </div>
      </Section>

      <Section title="Charge d'entraînement" right={<Pill c={rec.acwr > 1.5 ? T.bad : rec.acwr > 1.3 ? T.warn : T.ok}>ratio {rec.acwr.toFixed(2)}</Pill>}>
        <div className="card tight">
          <ResponsiveContainer width="100%" height={110}>
            <BarChart data={l28.slice(-14)}>
              <XAxis dataKey="day" tick={{ fill: T.dim, fontSize: 9 }} axisLine={false} tickLine={false} interval={1} />
              <YAxis hide />
              <Tooltip contentStyle={{ background: T.cardHi, border: `1px solid ${T.line2}`, borderRadius: 10, fontSize: 12 }} />
              <ReferenceLine y={rec.l28 / 7} stroke={T.line2} strokeDasharray="4 4" />
              <Bar dataKey="load" radius={[4, 4, 0, 0]} fill={T.line2} />
            </BarChart>
          </ResponsiveContainer>
          <div style={{ fontSize: 12, color: T.mut, marginTop: 8, lineHeight: 1.55 }}>
            Charge 7 jours : <b style={{ color: T.text }}>{rec.l7} u</b> · moyenne hebdomadaire de référence : {Math.round(rec.l28)} u.
            {rec.acwr > 1.4 ? " Tu montes plus vite que ce que ton corps a absorbé. Allège la semaine." : rec.acwr < 0.8 ? " Charge en baisse : tu peux remonter progressivement." : " Progression maîtrisée."}
          </div>
        </div>
      </Section>

      <Section title="Repères de charge">
        <div className="card tight">
          {[["Faible", "< 900 u", T.ok], ["Modérée", "900 – 1 800 u", T.warn], ["Élevée", "> 1 800 u", T.bad]].map(([a, b, c], i) => (
            <div key={i} className="between" style={{ padding: "8px 0", borderTop: i ? `1px solid ${T.line}` : "none" }}>
              <span className="row" style={{ gap: 8, fontSize: 13 }}><span className="dot" style={{ background: c }} />{a}</span>
              <span className="num" style={{ fontSize: 12.5, color: T.mut }}>{b}</span>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

function Review({ st, scores, rec }) {
  const done = st.sessions.filter((x) => x.status === "done");
  const w = done.filter((x) => x.date > D(-8));
  const prevW = done.filter((x) => x.date > D(-15) && x.date <= D(-8));
  const km = (a) => sum(a.filter((x) => x.log?.km).map((x) => x.log.km));
  const planned = st.sessions.filter((x) => x.date > D(-8) && x.date <= TODAY && x.type !== "REST").length;
  const swimD = sum(w.filter((x) => x.kind === "swim").map((x) => x.log?.distance || 0));
  const vol = sum(w.filter((x) => x.kind === "strength").map((x) => x.log?.reps || 0));
  const delta = (a, b) => (b > 0 ? Math.round(((a - b) / b) * 100) : null);
  const dKm = delta(km(w), km(prevW));

  return (
    <div className="wrap fade">
      <div className="dsp" style={{ fontSize: 22, padding: "18px 0 4px" }}>Ton bilan</div>
      <div style={{ fontSize: 12.5, color: T.dim, marginBottom: 6 }}>7 derniers jours</div>

      <div className="grid2" style={{ marginTop: 12 }}>
        <Stat label="Séances" value={`${w.length}/${planned}`} sub="réalisées / prévues" />
        <Stat label="Course" value={km(w).toFixed(1)} sub={dKm === null ? "km" : `km · ${dKm > 0 ? "+" : ""}${dKm}% vs S-1`} c={T.run} />
        <Stat label="Natation" value={swimD || "—"} sub={swimD ? "m" : "distance non comptée"} c={T.swim} />
        <Stat label="Volume barre" value={vol || "—"} sub="répétitions" c={T.street} />
        <Stat label="Poids moyen" value={st.weights.length ? (sum(st.weights.slice(-3).map((x) => x.kg)) / st.weights.slice(-3).length).toFixed(1) : "—"} sub="kg" />
        <Stat label="Charge" value={rec.l7} sub="unités sRPE" />
      </div>

      <Section title="Ce qui progresse">
        <div className="card">
          <div style={{ fontSize: 13, color: T.mut, lineHeight: 1.6 }}>
            La régularité. Cinq jours d'activité consécutifs sur six, avec une alternance course / piscine / barre déjà cohérente. C'est la base qui manque à la plupart des gens et tu l'as déjà.
          </div>
        </div>
      </Section>

      <Section title="Ce qui doit progresser">
        <div className="card">
          <div style={{ fontSize: 13, color: T.mut, lineHeight: 1.6 }}>
            <p style={{ margin: "0 0 9px" }}><b style={{ color: T.text }}>Le volume de course.</b> {km(w).toFixed(1)} km sur la semaine, il en faudra 45 à 55 pour un sub 4 h. C'est le chantier numéro un des six prochains mois.</p>
            <p style={{ margin: "0 0 9px" }}><b style={{ color: T.text }}>Les données de natation.</b> Deux séances de 45 min sans distance notée : impossible de piloter la progression.</p>
            <p style={{ margin: 0 }}><b style={{ color: T.text }}>Tes repères de force.</b> {scores.missing} % du score attend un test de tractions, dips, muscle-ups et relevés de jambes.</p>
          </div>
        </div>
      </Section>

      <Section title="Ce qu'on ajuste la semaine prochaine">
        <div className="card">
          <div style={{ fontSize: 13, color: T.mut, lineHeight: 1.6 }}>
            Course portée à 15 km sur 3 sorties, toutes en endurance fondamentale. Un vrai jour de repos le lundi. Test de force mardi. Deux séances de natation avec distance comptée. Aucune séance à haute intensité : à ce stade, la fatigue coûterait plus qu'elle ne rapporterait.
            <br /><br />
            <span style={{ color: T.warn }}>Point de vigilance : </span>+50 % de volume de course d'une semaine sur l'autre. C'est acceptable depuis une base aussi basse, mais si un footing dépasse RPE 6 ou si un tendon se manifeste, on plafonne la semaine suivante au lieu de monter.
          </div>
        </div>
      </Section>

      <Section title="Score de la semaine">
        <div className="card" style={{ textAlign: "center", padding: 22 }}>
          <div className="num" style={{ fontSize: 46 }}>{Math.round((w.length / Math.max(1, planned)) * 60 + clamp((km(w) / 15) * 100) * 0.4)}</div>
          <div style={{ fontSize: 12, color: T.dim, marginTop: 4 }}>assiduité 60 % · volume atteint 40 %</div>
        </div>
      </Section>

      <Section title="Bilan mensuel">
        <div className="card">
          <div style={{ fontSize: 13, color: T.mut, lineHeight: 1.6 }}>
            Disponible à partir du {fmtDate(D(30))}, avec la comparaison automatique mois par mois : distance de course, distance continue en natation, poids, répétitions à la barre.
          </div>
        </div>
      </Section>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   COACH
   ───────────────────────────────────────────────────────────── */
function contextFor(st, scores, rec) {
  const done = st.sessions.filter((x) => x.status === "done").slice(-8);
  const next = st.sessions.filter((x) => x.date >= TODAY && x.status === "planned").slice(0, 4);
  const bv = (x) => (x && typeof x === "object" ? x.v : x);
  return {
    profil: "Homme 25 ans, 1m91, 83 kg, sans salle de sport. Objectifs 12 mois : marathon sub 4h (priorité 1), 1500 m nage continue (priorité 2), 88 kg sec (priorité 3), progression tractions/dips/muscle-up.",
    score_global: scores.global,
    sous_scores: Object.fromEntries(Object.entries(scores.subs).map(([k, v]) => [k, v.score])),
    recuperation: { score: rec.score, zone: rec.zone, charge_7j: rec.l7, ratio_aigu_chronique: +rec.acwr.toFixed(2), jours_consecutifs: rec.streak },
    reperes_force: { tractions: bv(st.benchmarks.pullups) || "non testé", dips: bv(st.benchmarks.dips) || "non testé", muscle_ups: bv(st.benchmarks.muscleups) || "non testé", releves_de_jambes: bv(st.benchmarks.legraises) || "non testé" },
    natation_continu_m: st.swimBest.continuous,
    seances_recentes: done.map((s) => ({ date: s.date, type: s.type, log: s.log, rpe: s.rpe })),
    seances_a_venir: next.map((s) => ({ date: s.date, type: s.type, titre: s.title, objectif: s.target || s.goal })),
  };
}

function localAnswer(msg, st, rec) {
  const m = msg.toLowerCase();
  if (/fatigu|crev|épuis|epuis|vidé|vide/.test(m))
    return `Ton score de récupération est à ${rec.score} (${rec.zone}), charge 7 jours ${rec.l7} u. Aujourd'hui : garde la séance mais retire la dernière série de chaque exercice, ou remplace le footing par 25 min très souples. Si la fatigue dure plus de trois jours, c'est un problème de sommeil ou d'alimentation, pas d'entraînement.`;
  if (/mal|douleur|blessu|tendon|genou|cheville/.test(m))
    return `Arrête l'activité qui déclenche la douleur — pas de « je force un peu pour voir ». Remplace par du vélo, de la nage ou du repos selon la zone. Si ça persiste plus de quelques jours, si ça réveille la nuit ou si ça s'aggrave à l'effort : consulte un professionnel de santé. Je ne pose aucun diagnostic.`;
  if (/30 min|peu de temps|pas le temps|court/.test(m))
    return `Version 30 min de ta séance : garde les deux premiers exercices au volume prévu, supprime le reste. Sur un footing, 25 min en endurance fondamentale valent bien mieux qu'une séance sautée. Ne compense jamais en montant l'intensité.`;
  if (/km|couru|footing|run/.test(m))
    return `Enregistre-la depuis l'écran Semaine (bouton « Fait » puis les détails) pour qu'elle compte dans ton volume, ta charge et ton score running. Si elle n'était pas prévue, la séance de demain sera automatiquement allégée.`;
  if (/nage|piscine|crawl|brasse/.test(m))
    return `Ta distance continue de référence est ${st.swimBest.continuous} m. Compte tes longueurs à la prochaine séance : sans ce chiffre, aucune progression n'est mesurable. Travaille la glisse en brasse avant de chercher la distance.`;
  return `Score global ${st ? "" : ""}${rec.score} en récupération, zone ${rec.zone}. Dis-moi ton état (fatigue, douleur, temps disponible) ou une séance réalisée, et j'ajuste. Une connexion internet est nécessaire pour les réponses détaillées.`;
}

function Coach({ st, scores, rec, set }) {
  const [msgs, setMsgs] = useState(st.coachLog?.length ? st.coachLog : [
    { r: "a", t: `Salut Benjamin. J'ai ton historique des six derniers jours et ton programme jusqu'à fin octobre. Dis-moi comment tu te sens, ce que tu as fait, ou le temps dont tu disposes — j'ajuste la suite.` },
  ]);
  const [inp, setInp] = useState("");
  const [busy, setBusy] = useState(false);
  const end = useRef(null);
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, busy]);

  const send = async (text) => {
    const t = (text ?? inp).trim();
    if (!t || busy) return;
    const next = [...msgs, { r: "u", t }];
    setMsgs(next); setInp(""); setBusy(true);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6", max_tokens: 1000,
          messages: [{ role: "user", content:
`Tu es le coach d'ATHLETE OS, une application d'entraînement hybride. Tu réponds en français, en tutoyant, de façon directe et concise (5 phrases maximum, pas de liste à puces sauf si vraiment nécessaire). Tu es honnête : si l'athlète veut trop en faire, tu le dis. Tu privilégies la récupération et la progression prudente du volume de course. Tu ne poses jamais de diagnostic médical : en cas de douleur inhabituelle tu recommandes de réduire l'activité et de consulter. Tu n'inventes jamais une performance non mesurée.

Données de l'athlète (JSON) :
${JSON.stringify(contextFor(st, scores, rec))}

Historique de la conversation :
${next.slice(-6).map((m) => `${m.r === "u" ? "Athlète" : "Coach"} : ${m.t}`).join("\n")}

Réponds au dernier message de l'athlète.` }],
        }),
      });
      const data = await res.json();
      const out = (data.content || []).filter((c) => c.type === "text").map((c) => c.text).join("\n").trim();
      setMsgs((M) => [...M, { r: "a", t: out || localAnswer(t, st, rec) }]);
    } catch {
      setMsgs((M) => [...M, { r: "a", t: localAnswer(t, st, rec) }]);
    } finally { setBusy(false); }
  };

  useEffect(() => { set((p) => ({ ...p, coachLog: msgs.slice(-20) })); }, [msgs]);

  const quick = ["Je suis fatigué aujourd'hui", "J'ai mal aux jambes", "Je n'ai que 30 minutes", "J'ai couru 7 km"];

  return (
    <div className="wrap fade">
      <div className="dsp" style={{ fontSize: 22, padding: "18px 0 14px" }}>Coach</div>
      <div className="stack" style={{ gap: 10 }}>
        {msgs.map((m, i) => (
          <div key={i} style={{ alignSelf: m.r === "u" ? "flex-end" : "flex-start", maxWidth: "88%" }}>
            <div className="card tight" style={{
              background: m.r === "u" ? T.text : T.card, color: m.r === "u" ? T.bg : T.text,
              borderColor: m.r === "u" ? T.text : T.line, fontSize: 13.5, lineHeight: 1.55, whiteSpace: "pre-wrap",
            }}>{m.t}</div>
          </div>
        ))}
        {busy && <div className="card tight pulse" style={{ alignSelf: "flex-start", fontSize: 13, color: T.mut }}>Le coach analyse tes données…</div>}
        <div ref={end} />
      </div>

      <div style={{ marginTop: 16, display: "flex", gap: 7, flexWrap: "wrap" }}>
        {quick.map((q) => <button key={q} className="chip" style={{ fontSize: 12 }} onClick={() => send(q)}>{q}</button>)}
      </div>

      <div className="row" style={{ gap: 9, marginTop: 14 }}>
        <input className="inp" value={inp} onChange={(e) => setInp(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Écris au coach…" />
        <button className="btn" style={{ width: 92 }} onClick={() => send()} disabled={busy}>Envoyer</button>
      </div>
      <div style={{ fontSize: 11.5, color: T.dim, marginTop: 10, lineHeight: 1.5 }}>
        Le coach lit réellement tes séances, tes scores et ta charge. Sans connexion, il bascule sur des réponses locales plus courtes.
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   ADAPTATION AUTOMATIQUE
   ───────────────────────────────────────────────────────────── */
function adapt(sessions, payload) {
  const { rpe, fatigue, pain, session } = payload;
  const future = sessions.filter((x) => x.date > session.date && x.status === "planned");
  const hard = rpe >= 8 || fatigue >= 8 || !!pain;
  const easy = rpe <= 4 && fatigue <= 4 && !pain;
  if (!hard && !easy) return sessions;
  const targets = future.slice(0, hard ? 2 : 3).map((x) => x.id);
  return sessions.map((x) => {
    if (!targets.includes(x.id) || x.type === "REST") return x;
    const f = hard ? 0.85 : 1.05;
    return {
      ...x,
      duration: Math.round(x.duration * f),
      adapted: hard ? "allégée" : "légèrement relevée",
      goal: hard
        ? `${x.goal} — volume réduit de 15 % suite à une séance à RPE ${rpe}${pain ? " et une douleur signalée" : ""}.`
        : `${x.goal} — légèrement relevé, la dernière séance est passée facilement.`,
    };
  });
}

/* ─────────────────────────────────────────────────────────────
   APPLICATION
   ───────────────────────────────────────────────────────────── */
const KEY = "athlete-os-v1";

export default function App() {
  const [st, setSt] = useState(INITIAL);
  const [tab, setTab] = useState("home");
  const [active, setActive] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await window.storage.get(KEY);
        if (r?.value) setSt(JSON.parse(r.value));
      } catch { /* première ouverture */ }
      setLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    const id = setTimeout(() => { window.storage?.set(KEY, JSON.stringify(st)).catch(() => {}); }, 600);
    return () => clearTimeout(id);
  }, [st, loaded]);

  const scores = useMemo(() => computeScores(st), [st]);
  const rec = useMemo(() => recovery(st), [st]);

  const finishSession = (p) => {
    setSt((prev) => {
      let sessions = prev.sessions.map((x) => (x.id === p.session.id
        ? { ...x, status: "done", log: p.log, rpe: p.rpe, note: p.note, pain: p.pain } : x));
      sessions = adapt(sessions, p);
      const benchmarks = { ...prev.benchmarks };
      (p.tests || []).forEach((t) => { benchmarks[t.key] = t.value; });
      const swimBest = p.session.kind === "swim"
        ? { continuous: Math.max(prev.swimBest.continuous || 0, p.log.continuous || 0), crawl: prev.swimBest.crawl || !!p.log.crawl }
        : prev.swimBest;
      return {
        ...prev, sessions, benchmarks, swimBest,
        records: [...prev.records, ...p.prs.map((x) => ({ ...x, date: TODAY }))],
        wellness: [...prev.wellness.filter((x) => x.date !== TODAY), { date: TODAY, sleep: +p.sleep, fatigue: p.fatigue, motivation: 6, soreness: p.pain }],
      };
    });
    if (p.prs.length) setToast(`🏆 ${p.prs[0].t} — ${p.prs[0].v}`);
    setTimeout(() => setToast(null), 4000);
  };

  const reset = () => { window.storage?.delete(KEY).catch(() => {}); setSt(INITIAL); setTab("home"); };

  const TABS = [
    ["home", "🏠", "Accueil"], ["week", "🗓", "Semaine"], ["perf", "📈", "Perfs"],
    ["body", "🧍", "Corps"], ["coach", "💬", "Coach"],
  ];

  return (
    <div className="aos">
      <style>{CSS}</style>

      {tab === "home" && <Home st={st} scores={scores} rec={rec} onStart={setActive} go={setTab} set={setSt} />}
      {tab === "week" && <Week st={st} set={setSt} onStart={setActive} />}
      {tab === "perf" && <Perf st={st} />}
      {tab === "body" && <Physique st={st} set={setSt} />}
      {tab === "coach" && <Coach st={st} scores={scores} rec={rec} set={setSt} />}
      {tab === "goals" && <Goals st={st} scores={scores} />}
      {tab === "recovery" && <Recovery st={st} set={setSt} rec={rec} />}
      {tab === "review" && <Review st={st} scores={scores} rec={rec} />}

      {["home", "week", "perf", "body", "coach"].includes(tab) && (
        <div className="wrap" style={{ marginTop: 26 }}>
          <div className="grid3">
            {[["goals", "Objectifs"], ["recovery", "Récupération"], ["review", "Bilan"]].map(([k, l]) => (
              <button key={k} className="btn ghost sm" onClick={() => setTab(k)}>{l}</button>
            ))}
          </div>
          <button className="eyebrow" onClick={reset} style={{ display: "block", margin: "18px auto 0", color: T.dim }}>
            Réinitialiser les données
          </button>
        </div>
      )}

      {!["home", "week", "perf", "body", "coach"].includes(tab) && (
        <div className="wrap" style={{ marginTop: 24 }}>
          <button className="btn ghost sm" onClick={() => setTab("home")}>Retour à l'accueil</button>
        </div>
      )}

      {toast && (
        <div className="pop" style={{ position: "fixed", top: 16, left: 16, right: 16, zIndex: 200, maxWidth: 488, margin: "0 auto" }}>
          <div className="card" style={{ background: T.warn, color: T.bg, borderColor: T.warn, textAlign: "center", fontWeight: 600, fontSize: 14 }}>{toast}</div>
        </div>
      )}

      {active && (
        <SessionRunner session={active} st={st}
          onFinish={finishSession}
          onClose={() => { setActive(null); setTab("home"); }} />
      )}

      <nav className="tabbar">
        <div className="in">
          {TABS.map(([k, ic, l]) => (
            <button key={k} className={`tab${tab === k ? " on" : ""}`} onClick={() => setTab(k)}>
              <span className="ic">{ic}</span>{l}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
