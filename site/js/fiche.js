// Une fiche, présentation « l'horloge qu'on fait défiler » (choix du 25/11/2026) : un cadran de 24 heures en
// haut, au centre ; le texte dessous, une étape à la fois. Seul le défilement fait avancer l'horloge (rien ne se déroule
// tout seul : leçon de l'ancien « voyage dans le temps », retiré). Sans JavaScript, la page se lit de haut en bas.
const racine = document.documentElement, etapes = [...document.querySelectorAll(".f-etape")];
const avecHorloge = racine.classList.contains("horloge") && etapes.length > 0;

// ---- Les notes : un clic sur le rond ouvre, sous son paragraphe, pourquoi cette note et les sources (copie du bloc de
// la partie « Fiabilité et sources », masquée). Sans JavaScript, le lien y mène.
document.addEventListener("click", (ev) => {
  const note = ev.target.closest(".f-note");
  if (!note) return;
  ev.preventDefault();
  cacherBulle();
  const n = note.dataset.ligne, p = note.closest("p");
  const ouvert = p.nextElementSibling && p.nextElementSibling.classList.contains("f-detail") ? p.nextElementSibling : null;
  const memeNote = ouvert && ouvert.dataset.ligne === n;
  const avant = note.getBoundingClientRect().top;
  document.querySelectorAll(".f-detail").forEach((d) => d.remove());
  document.querySelectorAll(".f-note[aria-expanded='true']").forEach((b) => b.setAttribute("aria-expanded", "false"));
  document.querySelectorAll(".f-phrase.actif").forEach((s) => s.classList.remove("actif"));
  etapes.forEach((e) => e.classList.remove("ouvert"));
  if (!memeNote) {
    const detail = document.createElement("div");
    detail.className = "f-detail";
    detail.dataset.ligne = n;
    detail.innerHTML = document.getElementById("n-" + n).innerHTML;
    p.after(detail);
    note.setAttribute("aria-expanded", "true");
    document.getElementById("p-" + n).classList.add("actif");
    // l'étape défile alors normalement, pour qu'on puisse lire tout le détail
    const etape = note.closest(".f-etape");
    if (etape) etape.classList.add("ouvert");
  }
  // la phrase ne bouge pas à l'écran quand l'étape se détache (ou se rattache) sous le cadran
  if (avecHorloge) scrollBy({ top: note.getBoundingClientRect().top - avant, behavior: "instant" });
  if (memeNote) montrerBulle(note);  // le détail se ferme : la bulle revient tout de suite (demande du 25/11/2026)
  majHorloge();
});

// ---- Au survol d'une note (ou au clavier) : une bulle avec la note et pourquoi (demande du 25/11/2026) ----
let bulle = null;
function montrerBulle(note) {
  // pas de bulle quand le détail de cette note est déjà ouvert : il dit la même chose (demande du 25/11/2026)
  if (note.getAttribute("aria-expanded") === "true") return cacherBulle();
  if (!bulle) { bulle = document.createElement("div"); bulle.className = "f-bulle"; bulle.setAttribute("role", "tooltip"); document.body.append(bulle); }
  bulle.innerHTML = "";
  const b = document.createElement("b"); b.textContent = note.dataset.note; b.style.color = note.dataset.couleur || "";
  const s = document.createElement("span"); s.textContent = note.dataset.pourquoi;
  bulle.append(b, s);
  bulle.hidden = false;
  const r = note.getBoundingClientRect(), w = bulle.offsetWidth, h = bulle.offsetHeight;
  bulle.style.left = Math.max(8, Math.min(innerWidth - w - 8, r.left + r.width / 2 - w / 2)) + "px";
  bulle.style.top = (r.bottom + 8 + h < innerHeight ? r.bottom + 8 : r.top - h - 8) + "px";
}
function cacherBulle() { if (bulle) bulle.hidden = true; }
// au survol, la phrase de la note est surlignée aussi (comme au clic)
const surligner = (note, oui) => { const p = document.getElementById("p-" + note.dataset.ligne); if (p) p.classList.toggle("survol", oui); };
document.addEventListener("mouseover", (ev) => { const n = ev.target.closest(".f-note"); if (n) { montrerBulle(n); surligner(n, true); } });
document.addEventListener("mouseout", (ev) => { const n = ev.target.closest(".f-note"); if (n) { cacherBulle(); surligner(n, false); } });
document.addEventListener("focusin", (ev) => { const n = ev.target.closest(".f-note"); if (n) montrerBulle(n); });
document.addEventListener("focusout", cacherBulle);
addEventListener("scroll", cacherBulle, { passive: true });

// ---- Le cadran : l'histoire de la Terre ramenée à 24 heures (calcul de Monde, dit comme tel) ----
const DUREE = 4.5e9, JOUR = 86400, LOUPE = 180;           // la loupe : les 3 dernières minutes
const ages = etapes.map((e) => Number(e.dataset.age));
const sec = (age) => (DUREE - age) / DUREE * JOUR;
function heure(s) {
  if (s >= JOUR - 0.5) return "minuit";
  const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = Math.floor(s % 60), mm = String(m).padStart(2, "0");
  return h === 23 && m >= 57 ? `${h} h ${mm} min ${String(x).padStart(2, "0")} s` : `${h} h ${mm}`;
}
const ns = (t, a = {}) => { const e = document.createElementNS("http://www.w3.org/2000/svg", t); for (const k in a) e.setAttribute(k, a[k]); return e; };
const el = (t, a = {}, ...enf) => { const e = document.createElement(t); for (const k in a) e.setAttribute(k, a[k]); e.append(...enf); return e; };
const secteur = (cx, cy, r, a) => {
  if (a <= 0.0005) return "";
  if (a >= 2 * Math.PI - 1e-4) return `M${cx} ${cy - r} A${r} ${r} 0 1 1 ${cx - 0.01} ${cy - r} Z`;
  return `M${cx} ${cy} L${cx} ${cy - r} A${r} ${r} 0 ${a > Math.PI ? 1 : 0} 1 ${cx + r * Math.sin(a)} ${cy - r * Math.cos(a)} Z`;
};
function cadran(r, c, graduations, nombre, etiquettes, pas) {
  const svg = ns("svg", { viewBox: `0 0 ${2 * c} ${2 * c}`, "aria-hidden": "true" }), pol = (a, rr) => [c + rr * Math.sin(a), c - rr * Math.cos(a)];
  svg.append(ns("circle", { cx: c, cy: c, r, class: "bord" }));
  const passe = ns("path", { class: "passe" }); svg.append(passe);
  for (let k = 0; k < graduations; k++) {
    const a = k / graduations * 2 * Math.PI, [x1, y1] = pol(a, r - (k % pas ? r * 0.05 : r * 0.1)), [x2, y2] = pol(a, r);
    svg.append(ns("line", { x1, y1, x2, y2, class: "trait" + (k % pas ? "" : " gros") }));
  }
  etiquettes.forEach(([v, t]) => { const [x, y] = pol(v / nombre * 2 * Math.PI, r + r * 0.15); const tx = ns("text", { x, y, class: "h" }); tx.textContent = t; svg.append(tx); });
  return { svg, passe, pol };
}

let peindre = () => {};
function construireHorloge() {
  const boite = document.getElementById("horloge");
  const G = cadran(118, 150, 24, 24, [[0, "minuit"], [6, "6 h"], [12, "midi"], [18, "18 h"]], 6);
  G.svg.classList.add("h-principal");
  const pts = ages.slice(0, -1).map((a) => { const [x, y] = G.pol(sec(a) / JOUR * 2 * Math.PI, 116); const k = ns("circle", { cx: x, cy: y, r: 3.2, class: "pt" }); G.svg.append(k); return k; });
  { const [x, y] = G.pol(-LOUPE / JOUR * Math.PI, 116); G.svg.append(ns("circle", { cx: x, cy: y, r: 7, class: "zone" })); }  // la part agrandie
  const aig = ns("line", { class: "aiguille", x1: 150, y1: 150 }); G.svg.append(aig, ns("circle", { cx: 150, cy: 150, r: 5, class: "axe" }));

  const L = cadran(58, 75, 18, LOUPE, [[0, "minuit"], [60, "23 h 58"], [120, "23 h 59"]], 6);
  L.svg.querySelectorAll(".h").forEach((t) => t.style.fontSize = "12px");
  const notre = ns("path", { class: "notre", opacity: 0 }); L.svg.append(notre);
  { const [x, y] = L.pol((LOUPE - (JOUR - sec(3e5))) / LOUPE * 2 * Math.PI, 58); notre.setAttribute("d", `M75 75 L${x} ${y} A58 58 0 0 1 75 17 Z`); }
  const lpts = ages.slice(0, -1).map((a) => { const reste = JOUR - sec(a); if (reste > LOUPE) return null; const [x, y] = L.pol((LOUPE - reste) / LOUPE * 2 * Math.PI, 56); const k = ns("circle", { cx: x, cy: y, r: 2.6, class: "pt" }); L.svg.append(k); return k; });
  const laig = ns("line", { class: "aiguille", x1: 75, y1: 75 }); L.svg.append(laig, ns("circle", { cx: 75, cy: 75, r: 3.5, class: "axe" }));
  const legende = el("p");
  const loupe = el("div", { class: "h-loupe" }, el("p", {}, "Les 3 dernières minutes, agrandies"), L.svg, legende);
  const lu = el("p", { class: "h-lu" }, "");
  boite.append(el("p", { class: "h-titre" }, "Si l'histoire de la Terre tenait en une journée"),
    el("p", { class: "h-sous" }, el("b", {}, "Calcul de Monde"), " : 4,5 milliards d'années ramenés à 24 heures."),
    el("div", { class: "h-cadrans", role: "button", tabindex: "0", title: "Étape suivante", "aria-label": "Passer à l'étape suivante" }, G.svg, loupe), lu);
  boite.hidden = false;

  peindre = (age, i) => {
    const s = sec(age), a = s / JOUR * 2 * Math.PI, [x, y] = G.pol(a, 100);
    aig.setAttribute("x2", x); aig.setAttribute("y2", y);
    G.passe.setAttribute("d", secteur(150, 150, 118, a));
    pts.forEach((k, j) => k.classList.toggle("ici", j === i));
    lu.firstChild.textContent = heure(s);
    const reste = JOUR - s, al = reste <= LOUPE ? (LOUPE - reste) / LOUPE * 2 * Math.PI : 0, [lx, ly] = L.pol(al, 46);
    loupe.classList.toggle("on", i >= 0 && ages[i] <= 2e6);  // la loupe arrive avec le genre Homo
    laig.setAttribute("x2", lx); laig.setAttribute("y2", ly);
    L.passe.setAttribute("d", secteur(75, 75, 58, al));
    lpts.forEach((k, j) => k && k.classList.toggle("ici", j === i));
    const nous = i >= 0 && ages[i] <= 3e5;
    notre.setAttribute("opacity", nous ? 1 : 0);
    legende.textContent = nous ? "En jaune : notre espèce, environ les 6 dernières secondes." : "Le genre Homo et notre espèce y tiennent.";
  };
}

// La taille du cadran suit la hauteur de la fenêtre ; on mesure la barre et l'horloge pour placer le texte dessous.
function mesurer() {
  const barre = document.querySelector(".f-barre"), hBarre = barre && getComputedStyle(barre).display !== "none" ? barre.offsetHeight : 0;
  racine.style.setProperty("--barre", hBarre + "px");
  racine.style.setProperty("--d", Math.round(Math.max(160, Math.min(290, (innerHeight - hBarre) * 0.34))) + "px");
  racine.style.setProperty("--horloge", document.getElementById("horloge").offsetHeight + "px");
  // la dernière étape occupe tout le bas de la fenêtre : on peut la faire monter jusque sous le cadran, même sans rien
  // après elle en bas de page (liens du bas retirés le 25/11/2026)
  etapes[etapes.length - 1].style.minHeight = Math.ceil(innerHeight - pose() + 2) + "px";
}

// ---- Le suivi : l'étape en cours est la dernière arrivée sous le cadran ; entre deux étapes, l'aiguille avance à
// proportion du défilement.
const tete = document.querySelector(".f-tete");
function majHorloge() {
  if (!avecHorloge) return;
  const ligne = pose() + 1, hauts = etapes.map((e) => e.getBoundingClientRect().top);
  let i = -1;
  while (i + 1 < etapes.length && hauts[i + 1] <= ligne) i++;
  // une étape dont une note est ouverte reste l'étape en cours tant qu'on la lit
  const ouverte = etapes.findIndex((e) => e.classList.contains("ouvert"));
  if (ouverte >= 0 && i > ouverte && etapes[ouverte].getBoundingClientRect().bottom > ligne) i = ouverte;
  etapes.forEach((e, k) => { e.classList.toggle("avenir", k > i); e.classList.toggle("passe", k < i); e.classList.toggle("ici", k === i); });
  tete.classList.toggle("parti", i >= 0);
  let age = DUREE;
  if (i >= etapes.length - 1) age = 0;
  else if (i >= 0) {
    // l'aiguille reste un instant sur l'heure de l'étape, puis avance vers la suivante, qu'elle atteint quand la
    // suivante apparaît
    const depart = hauts[i] - ligne, fin = hauts[i + 1] - ligne;   // en pixels de défilement
    const marge = 30;  // quelques pixels de défilement où l'aiguille reste exactement sur l'heure de l'étape
    const f = Math.max(0, Math.min(1, (-depart - marge) / (fin - depart - marge || 1)));
    age = ages[i] + (ages[i + 1] - ages[i]) * f;
  }
  etapeIci = i;
  peindre(age, i);
}

// Un clic sur l'horloge (ou Entrée, Espace quand elle a le focus) passe à l'étape suivante (demande du
// 25/11/2026) : la page défile jusqu'à elle, posée sous le cadran, et l'aiguille avance pendant le défilement.
let etapeIci = -1;
const pose = () => { const R = getComputedStyle(racine); return parseFloat(R.getPropertyValue("--barre")) + parseFloat(R.getPropertyValue("--horloge")) + 4; };
function poser(etape, comment) { scrollTo({ top: etape.getBoundingClientRect().top + scrollY - pose(), behavior: comment }); }
function suivante() {
  const k = Math.min(etapeIci + 1, etapes.length - 1);
  poser(etapes[k], matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth");
}

// Une adresse qui vise une phrase (#p-N) : on fait défiler jusqu'à son étape, posée sous le cadran, et la phrase est
// surlignée 3 secondes.
function cibler() {
  const m = location.hash.match(/^#(p-\w+)$/), s = m && document.getElementById(m[1]);
  if (!s) return;
  const etape = s.closest(".f-etape");
  if (avecHorloge && etape) {
    poser(etape, "instant");
    majHorloge();  // tout de suite, sans attendre l'image suivante
  } else s.scrollIntoView({ block: "center" });
  clearTimeout(s.minuteur);
  s.classList.remove("fin-cible");
  s.classList.add("cible");
  s.minuteur = setTimeout(() => { s.classList.add("fin-cible"); s.classList.remove("cible"); }, 3000);
}

if (avecHorloge) {
  construireHorloge();
  document.querySelector(".f-consigne").hidden = false;
  const cadrans = document.querySelector(".h-cadrans");
  cadrans.addEventListener("click", suivante);
  cadrans.addEventListener("keydown", (ev) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); suivante(); } });
  etapes[etapes.length - 1].classList.add("f-dernier");
  // Plus une étape couvre de temps, plus il faut défiler pour la passer (demande du 25/11/2026 : les premières
  // passaient trop vite pour les milliards d'années qu'elles représentent). Pas tout à fait à proportion : à l'échelle,
  // les dernières étapes ne feraient même pas un pixel ; on prend la racine carrée de la durée, plafonnée.
  etapes.slice(0, -1).forEach((e, k) => {
    const millions = (ages[k] - ages[k + 1]) / 1e6;
    e.style.minHeight = `calc(38vh + ${Math.min(150, 3 * Math.sqrt(millions)).toFixed(1)}vh)`;
  });
  mesurer();
  let prevu = false;
  addEventListener("scroll", () => { if (!prevu) { prevu = true; requestAnimationFrame(() => { prevu = false; majHorloge(); }); } }, { passive: true });
  addEventListener("resize", () => { mesurer(); majHorloge(); });
  if (document.fonts) document.fonts.ready.then(() => { mesurer(); if (/^#p-/.test(location.hash) && scrollY > 0) cibler(); majHorloge(); });
  majHorloge();
}
addEventListener("hashchange", cibler);
cibler();

// Ouverte dans le panneau de droite de l'accueil (?panneau) : Échap demande à l'accueil de fermer le panneau.
if (racine.classList.contains("en-panneau") && window.parent !== window) {
  addEventListener("keydown", (ev) => { if (ev.key === "Escape") window.parent.postMessage("monde:fermer-fiche", location.origin); });
}
