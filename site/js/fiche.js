// Une fiche, présentation « l'horloge » (choix du 25/11/2026) : un cadran de 24 heures en haut, au centre ; le texte
// dessous, une étape à la fois. Depuis le 26/11/2026, on passe d'une étape à l'autre par deux flèches, à gauche et à
// droite de l'horloge (ou les flèches du clavier) : plus de défilement d'étape en étape ni d'aiguille tirée à la main.
// Rien ne se déroule tout seul (leçon de l'ancien « voyage dans le temps », retiré). Sans JavaScript, la page se lit de
// haut en bas.
const racine = document.documentElement, etapes = [...document.querySelectorAll(".f-etape")];
const avecHorloge = racine.classList.contains("horloge") && etapes.length > 0;

// ---- Les notes : chaque phrase porte la sienne (plus de rond après elle depuis le 26/11/2026). Au survol, ou au
// clavier, la phrase se surligne (CSS) et une bulle donne la note et pourquoi ; un clic, ou Entrée, ouvre sous son
// paragraphe ce qui fait baisser la note et les sources (copie du bloc de la partie « Fiabilité et sources », masquée).
const phraseDe = (ev) => ev.target instanceof Element ? ev.target.closest(".f-phrase") : null;
let defileMoi = 0;  // quand fiche.js fait défiler lui-même, la bulle reste
function basculer(phrase, x, y) {
  cacherBulle();
  const n = phrase.dataset.ligne, p = phrase.closest("p");
  const ouvert = p.nextElementSibling && p.nextElementSibling.classList.contains("f-detail") ? p.nextElementSibling : null;
  const memeNote = ouvert && ouvert.dataset.ligne === n;
  defileMoi = performance.now();  // si la page raccourcit en refermant, son défilement ne cache pas la bulle
  fermerDetails();
  if (!memeNote) {
    const detail = document.createElement("div");
    detail.className = "f-detail";
    detail.dataset.ligne = n;
    detail.innerHTML = document.getElementById("n-" + n).innerHTML;
    p.after(detail);
    phrase.setAttribute("aria-expanded", "true");
    phrase.classList.add("actif");
  }
  if (memeNote) montrerBulle(phrase, x, y);  // le détail se ferme : la bulle revient tout de suite (demande du 25/11/2026)
}
function fermerDetails() {
  document.querySelectorAll(".f-detail").forEach((d) => d.remove());
  document.querySelectorAll(".f-phrase[aria-expanded='true']").forEach((s) => s.setAttribute("aria-expanded", "false"));
  document.querySelectorAll(".f-phrase.actif").forEach((s) => s.classList.remove("actif"));
}
document.addEventListener("click", (ev) => {
  const phrase = phraseDe(ev);
  if (!phrase || String(getSelection())) return;  // on sélectionnait du texte : rien ne s'ouvre
  basculer(phrase, ev.clientX, ev.clientY);
  // un clic de souris ne laisse pas le focus sur la phrase : sinon la barre d'espace, qui fait défiler la page,
  // ouvrirait ou fermerait son détail
  if (ev.detail > 0) phrase.blur();
});
document.addEventListener("keydown", (ev) => {
  const phrase = phraseDe(ev);
  if (phrase && (ev.key === "Enter" || ev.key === " ")) { ev.preventDefault(); basculer(phrase); }
});

// La bulle : sous la ligne de la phrase que survole la souris, à sa hauteur (une phrase tient souvent sur deux ou trois
// lignes : sous la dernière, elle cacherait la phrase suivante) ; au clavier, sous la première ligne.
let bulle = null, bullePour = null, bulleLigne = -1;
function montrerBulle(phrase, x, y) {
  // pas de bulle quand le détail de cette note est déjà ouvert : il dit la même chose (demande du 25/11/2026)
  if (phrase.getAttribute("aria-expanded") === "true") return cacherBulle();
  const lignes = [...phrase.getClientRects()];
  if (!lignes.length) return;
  let k = y == null ? 0 : lignes.findIndex((r) => y >= r.top - 2 && y <= r.bottom + 2);
  if (k < 0) k = 0;
  if (bulle && !bulle.hidden && bullePour === phrase && bulleLigne === k) return;  // même ligne : la bulle ne bouge pas
  if (!bulle) { bulle = document.createElement("div"); bulle.className = "f-bulle"; bulle.setAttribute("role", "tooltip"); document.body.append(bulle); }
  if (bullePour !== phrase) {
    bulle.innerHTML = "";
    const b = document.createElement("b"); b.textContent = phrase.dataset.note; b.style.color = phrase.dataset.couleur || "";
    const s = document.createElement("span"); s.textContent = phrase.dataset.pourquoi;
    bulle.append(b, s);
  }
  bullePour = phrase; bulleLigne = k;
  bulle.hidden = false;
  const r = lignes[k], w = bulle.offsetWidth, h = bulle.offsetHeight, cx = x == null ? r.left + r.width / 2 : x;
  bulle.style.left = Math.max(8, Math.min(innerWidth - w - 8, cx - w / 2)) + "px";
  bulle.style.top = (r.bottom + 8 + h < innerHeight ? r.bottom + 8 : r.top - h - 8) + "px";
}
function cacherBulle() { if (bulle) bulle.hidden = true; }
// mousemove plutôt que mouseover : la bulle suit la ligne survolée, et revient sans attendre après un défilement
document.addEventListener("mousemove", (ev) => { const phrase = phraseDe(ev); if (phrase) montrerBulle(phrase, ev.clientX, ev.clientY); });
document.addEventListener("mouseout", (ev) => { const phrase = phraseDe(ev); if (phrase && !phrase.contains(ev.relatedTarget)) cacherBulle(); });
// au clavier seulement (un clic donne aussi le focus à la phrase : la bulle est déjà là, sous la souris)
document.addEventListener("focusin", (ev) => { const phrase = phraseDe(ev); if (phrase && phrase.matches(":focus-visible")) montrerBulle(phrase); });
document.addEventListener("focusout", (ev) => { if (bullePour === ev.target && !ev.target.matches(":hover")) cacherBulle(); });
addEventListener("scroll", () => { if (performance.now() - defileMoi > 150) cacherBulle(); }, { passive: true });

// ---- Le cadran : l'histoire de la Terre ramenée à 24 heures (une comparaison, que le titre « Si l'histoire de la Terre
// tenait en une journée » annonce comme telle ; la ligne « Calcul de Monde » est retirée le 26/11/2026). Dessin du 26/11/2026
// (maquette outils/maquette/horloge/directions.html, « Au trait, avec l'aiguille ») : un cercle fin, l'aiguille remplit
// la part passée, un trait jaune sur le bord. À partir de 23 h, un petit cadran pour la dernière minute (le genre Homo,
// notre espèce, la sortie d'Afrique y tiennent) : sur le grand cadran, elle ferait moins d'un pixel. ----
const DUREE = 4.5e9, JOUR = 86400;
const R = 118, PX = 150, PY = 193, PR = 37, DEBUT_PETIT = JOUR - 3600;   // le petit cadran arrive à 23 h
const ages = etapes.map((e) => Number(e.dataset.age));
const sec = (age) => (DUREE - age) / DUREE * JOUR;
function heure(s) {
  if (s >= JOUR - 0.5) return "minuit";
  const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = Math.floor(s % 60), mm = String(m).padStart(2, "0");
  return h === 23 && m >= 57 ? `${h} h ${mm} min ${String(x).padStart(2, "0")} s` : `${h} h ${mm}`;
}
const ns = (t, a = {}) => { const e = document.createElementNS("http://www.w3.org/2000/svg", t); for (const k in a) e.setAttribute(k, a[k]); return e; };
const el = (t, a = {}, ...enf) => { const e = document.createElement(t); for (const k in a) e.setAttribute(k, a[k]); e.append(...enf); return e; };
const pol = (a, r, cx = 150, cy = 150) => [cx + r * Math.sin(a), cy - r * Math.cos(a)];
// la part passée (secteur) et le trait sur le bord (arc), depuis minuit, dans le sens des aiguilles
const arc = (cx, cy, r, a) => {
  if (a <= 0.0005) return "";
  if (a >= 2 * Math.PI - 1e-4) return `M${cx} ${cy - r} A${r} ${r} 0 1 1 ${cx} ${cy + r} A${r} ${r} 0 1 1 ${cx} ${cy - r}`;
  const [x, y] = pol(a, r, cx, cy);
  return `M${cx} ${cy - r} A${r} ${r} 0 ${a > Math.PI ? 1 : 0} 1 ${x.toFixed(2)} ${y.toFixed(2)}`;
};
const secteur = (cx, cy, r, a) => {
  if (a <= 0.0005) return "";
  if (a >= 2 * Math.PI - 1e-4) return arc(cx, cy, r, a) + " Z";
  const [x, y] = pol(a, r, cx, cy);
  return `M${cx} ${cy} L${cx} ${cy - r} A${r} ${r} 0 ${a > Math.PI ? 1 : 0} 1 ${x.toFixed(2)} ${y.toFixed(2)} Z`;
};
const traits = (g, cx, cy, r, n, long, gros) => {
  for (let k = 0; k < n; k++) {
    const a = k / n * 2 * Math.PI, g6 = gros(k), [x1, y1] = pol(a, r - long(g6), cx, cy), [x2, y2] = pol(a, r, cx, cy);
    g.append(ns("line", { x1, y1, x2, y2, class: "trait" + (g6 ? " gros" : "") }));
  }
};

let peindre = () => {};
const fleches = {};
function construireHorloge() {
  const boite = document.getElementById("horloge");
  const svg = ns("svg", { viewBox: "0 0 300 300", "aria-hidden": "true", class: "h-principal" });
  const zone = ns("path", { class: "passe" }), bordPasse = ns("path", { class: "passe-bord" });
  svg.append(ns("circle", { cx: 150, cy: 150, r: R, class: "bord" }), zone, bordPasse);
  traits(svg, 150, 150, R, 24, (g) => g ? 12 : 6, (k) => k % 6 === 0);
  // le petit cadran de la dernière minute
  const petit = ns("g", { class: "h-petit" });
  const pZone = ns("path", { class: "passe" }), pBord = ns("path", { class: "passe-bord fin" });
  petit.append(ns("circle", { cx: PX, cy: PY, r: PR, class: "bord" }), pZone, pBord);
  traits(petit, PX, PY, PR, 6, () => 5, () => true);
  const pAig = ns("line", { class: "aiguille fine", x1: PX, y1: PY, x2: PX, y2: PY - PR + 4 }), pNom = ns("text", { x: PX, y: PY + PR + 14, class: "h" });
  pNom.textContent = "la dernière minute";
  petit.append(pAig, ns("circle", { cx: PX, cy: PY, r: 2.5, class: "axe" }), pNom);
  const aig = ns("line", { class: "aiguille", x1: 150, y1: 150, x2: 150, y2: 150 - R + 8 });
  svg.append(petit, aig, ns("circle", { cx: 150, cy: 150, r: 4.5, class: "axe" }));
  // les deux flèches, à gauche et à droite du cadran (demande du 26/11/2026)
  const fleche = (sens, nom) => {
    const b = el("button", { type: "button", class: "h-fleche", "aria-label": nom, title: nom }), dessin = ns("svg", { viewBox: "0 0 24 24", "aria-hidden": "true" });
    dessin.append(ns("path", { d: sens > 0 ? "M9 5 L16 12 L9 19" : "M15 5 L8 12 L15 19" }));
    b.append(dessin);
    b.addEventListener("click", () => allerA(ici + sens));
    return b;
  };
  fleches.arriere = fleche(-1, "Étape précédente");
  fleches.avant = fleche(1, "Étape suivante");
  const lu = el("p", { class: "h-lu" }, "");
  boite.append(el("div", { class: "h-rangee" }, fleches.arriere, el("div", { class: "h-cadrans" }, svg), fleches.avant),
    lu, el("p", { class: "h-titre" }, "Si l'histoire de la Terre tenait en une journée"));
  boite.hidden = false;

  peindre = (s) => {
    const a = s / JOUR * 2 * Math.PI;
    zone.setAttribute("d", secteur(150, 150, R, a)); bordPasse.setAttribute("d", arc(150, 150, R, a));
    aig.setAttribute("transform", `rotate(${(s / JOUR * 360).toFixed(3)} 150 150)`);
    lu.firstChild.textContent = heure(s);
    petit.classList.toggle("on", s >= DEBUT_PETIT);
    const ds = Math.max(0, Math.min(60, s - (JOUR - 60))), as = ds / 60 * 2 * Math.PI;
    pZone.setAttribute("d", secteur(PX, PY, PR, as)); pBord.setAttribute("d", arc(PX, PY, PR, as));
    pAig.setAttribute("transform", `rotate(${(ds * 6).toFixed(2)} ${PX} ${PY})`);
  };
}

// La taille du cadran suit la hauteur de la fenêtre ; on mesure la barre et l'horloge pour placer le texte dessous.
function mesurer() {
  const barre = document.querySelector(".f-barre"), hBarre = barre && getComputedStyle(barre).display !== "none" ? barre.offsetHeight : 0;
  racine.style.setProperty("--barre", hBarre + "px");
  racine.style.setProperty("--d", Math.round(Math.max(160, Math.min(290, (innerHeight - hBarre) * 0.34))) + "px");
  racine.style.setProperty("--horloge", document.getElementById("horloge").offsetHeight + "px");
}

// ---- D'une étape à l'autre : par les flèches de l'horloge, ou celles du clavier (26/11/2026, à la place du
// défilement et de l'aiguille tirée à la main). Le texte de l'étape s'efface en montant un peu et le suivant arrive
// juste après (fiche.css) ; l'aiguille va de l'heure de l'une à celle de l'autre. ----
let ici = -1, sIci = 0, anim = 0;
function allerA(k, anime = true) {
  k = Math.max(0, Math.min(etapes.length - 1, k));
  if (k === ici) return;
  cacherBulle();
  fermerDetails();
  ici = k;
  etapes.forEach((e, j) => { e.classList.toggle("ici", j === k); e.classList.toggle("passe", j < k); e.classList.toggle("avenir", j > k); });
  fleches.arriere.disabled = k === 0;
  fleches.avant.disabled = k === etapes.length - 1;
  if (scrollY > 0) scrollTo({ top: 0, behavior: "instant" });  // une note ouverte avait pu faire défiler la page
  const depart = sIci, but = sec(ages[k]), t0 = performance.now();
  const duree = anime && !matchMedia("(prefers-reduced-motion: reduce)").matches ? 900 : 0;
  cancelAnimationFrame(anim);
  const pas = (t) => {
    const f = duree ? Math.min(1, (t - t0) / duree) : 1, e = f < .5 ? 2 * f * f : 1 - (-2 * f + 2) ** 2 / 2;
    sIci = depart + (but - depart) * e;
    peindre(sIci);
    if (f < 1) anim = requestAnimationFrame(pas);
  };
  if (!duree) return pas(t0);
  anim = requestAnimationFrame(pas);
  // si la page est en arrière-plan, les images ne se dessinent plus : l'aiguille arrive quand même à son heure
  setTimeout(() => { if (ici === k && sIci !== but) { cancelAnimationFrame(anim); sIci = but; peindre(but); } }, duree + 150);
}
addEventListener("keydown", (ev) => {
  if (!avecHorloge || ev.altKey || ev.ctrlKey || ev.metaKey || ev.shiftKey) return;
  if (ev.target instanceof Element && ev.target.closest("input, textarea, select, [contenteditable]")) return;
  if (ev.key === "ArrowRight" || ev.key === "ArrowLeft") { ev.preventDefault(); allerA(ici + (ev.key === "ArrowRight" ? 1 : -1)); }
});

// Une adresse qui vise une phrase (#p-N) : on montre son étape, et la phrase est surlignée 3 secondes.
function cibler() {
  const m = location.hash.match(/^#(p-\w+)$/), s = m && document.getElementById(m[1]);
  if (!s) return;
  const etape = s.closest(".f-etape");
  if (avecHorloge && etape) allerA(etapes.indexOf(etape), false);
  else s.scrollIntoView({ block: "center" });
  clearTimeout(s.minuteur);
  s.classList.remove("fin-cible");
  s.classList.add("cible");
  s.minuteur = setTimeout(() => { s.classList.add("fin-cible"); s.classList.remove("cible"); }, 3000);
}

if (avecHorloge) {
  construireHorloge();
  mesurer();
  addEventListener("resize", mesurer);
  if (document.fonts) document.fonts.ready.then(mesurer);
  if (!/^#p-/.test(location.hash)) allerA(0, false);
}
addEventListener("hashchange", cibler);
cibler();
if (avecHorloge && ici < 0) allerA(0, false);

// Ouverte dans le panneau de droite de l'accueil (?panneau) : Échap demande à l'accueil de fermer le panneau.
if (racine.classList.contains("en-panneau") && window.parent !== window) {
  addEventListener("keydown", (ev) => { if (ev.key === "Escape") window.parent.postMessage("monde:fermer-fiche", location.origin); });
}
