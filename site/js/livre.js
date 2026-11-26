// Le livre, premier écran de Monde (choix du 25/11/2026 ; maquette outils/maquette/livre/index.html) : un grand
// livre « L'histoire de la Terre » (titre du 26/11/2026, avant « De la Terre jusqu'à nous »), un cran avant la Terre dans la réglette. Depuis le 26/11/2026, un vieux
// livre légèrement usé (dessin-livre.js, maquette vieux.html). Rien ne bouge tout seul (leçon de l'ancien « voyage dans le
// temps ») : un clic, ou Entrée, ouvre la couverture, puis la fiche arrive dans le panneau de droite de l'accueil
// (accueil.js, ouvrirLecteur) et le livre ouvert se range à gauche ; la croix et Échap referment.
// Depuis le 26/11/2026 (maquettes outils/maquette/livre/pages.html et croquis.html) : le titre seul sur la couverture
// (la frise dorée dessous retirée le même jour, demande de Mathis) ; ouvert, un dessin par étape de la fiche sur la page de droite (site/dessins/livre/,
// écrits par outils/site/faire-planches.mjs), de fausses lignes à gauche. Quand la fiche change d'étape, elle prévient
// l'accueil, qui le dit au livre (etape) : une feuille tourne vers l'avant ou vers l'arrière et montre le dessin de l'étape.
import { el, calme } from "./outils.js";
import { dessinerLivre, masqueTexte, LIGNES, hasard } from "./dessin-livre.js";

const LARGEUR = 300;          // le livre fermé, en pixels de la carte (300 x 400, centré dans le cadre de 1280 x 800)
const RANGE = 0.72;           // la taille du livre ouvert, rangé à gauche du panneau, au plus (maquette)
const AVANT_FICHE = 650;      // millisecondes : la couverture s'ouvre (0,8 s), la fiche arrive avant la fin (maquette)
const DESSINS = "site/dessins/livre/";
const OUVERT = -172;          // l'angle de la couverture ouverte (styles.css) : la feuille tournée s'y pose
// La Terre d'aujourd'hui, dernier dessin : son centre et son rayon dans le dessin (en fraction de sa largeur et de sa
// hauteur) et le point de vue d'où elle est vue (outils/maquette/livre/terre-aujourdhui.py : boule de rayon 82 centrée
// en 115, 150 sur 230 x 300, vue de 12° E, 12° N). Le globe du palier suivant part de là (etatVue).
const TERRE = { x: 115 / 230, y: 150 / 300, r: 82 / 230, lon: 12, lat: 12 };
const TOUR = 1300;            // millisecondes : une feuille qui tourne (styles.css, .livre .tourne ; 0,75 s jugé trop vite le 26/11/2026)

// Les fausses lignes de la page de gauche : celles d'avant à la première étape, d'autres ensuite (toujours les mêmes
// pour une étape donnée), pour qu'on voie la page changer.
function lignesDe(k) {
  if (k === 0) return LIGNES.gauche;
  const r = hasard(500 + k), l = [];
  while (l.length < 19) {
    const n = 3 + Math.floor(r() * 4);
    for (let i = 0; i < n && l.length < 19; i++) l.push(i === n - 1 ? 38 + Math.round(r() * 40) : 92 + Math.round(r() * 8));
    if (l.length < 18) l.push(0);
  }
  return l;
}
const remplir = (div, l) => div.replaceChildren(...l.map((w) => (w ? el("i", { style: `width:${w}%` }) : el("b"))));
const montrer = (imgs, k) => imgs.forEach((i, j) => { i.hidden = j !== k; });

export class Livre {
  constructor(couche, cfg, donnees, appli) {
    this.cfg = cfg;
    this.appli = appli;
    this.etat = "ferme";
    this.page = 0;   // l'étape de la fiche que montre le livre ouvert
    // la demi-largeur du livre ouvert à sa taille rangée : l'accueil la réduit si la place manque (placeLecteur)
    this.g = { r: LARGEUR * RANGE };
    // le vieux livre dessiné (dessin-livre.js), le titre de la couverture, les pages par-dessus
    const d = dessinerLivre({ u: cfg.usure, graine: cfg.tirage });
    const dessin = (code) => { const t = document.createElement("template"); t.innerHTML = code; return t.content.firstElementChild; };
    const lignes = () => { const div = el("div", { class: "lignes" }); remplir(div, LIGNES.gauche); return div; };
    // une image par étape, une seule visible ; leur adresse n'est posée qu'à la première ouverture (le premier écran
    // ne les télécharge pas)
    const planches = () => Array.from({ length: cfg.planches }, (_, k) => el("img", { class: "planche", alt: "", hidden: k !== 0, decoding: "sync" }));
    const cadre = el("div", { class: "cadre" }, el("span", { class: "titre", texte: cfg.sujet }));
    cadre.style.webkitMaskImage = cadre.style.maskImage = masqueTexte(cfg.tirage, cfg.usure);   // la dorure un peu passée
    this.droite = planches();
    this.surRecto = planches();
    this.gauche = lignes();
    this.surVerso = lignes();
    // sur la dernière page, la Terre dessinée mène à la Terre (demande du 26/11/2026 : « une bonne transition ») ; rien
    // ne bouge au survol, seule la main du pointeur le dit
    this.versTerre = el("button", { class: "vers-terre", type: "button", hidden: true, "aria-label": "Aller à la Terre", title: "Aller à la Terre",
      onclick: (ev) => { ev.stopPropagation(); this.appli.aller(cfg.sortie); },
      onkeydown: (ev) => ev.stopPropagation() });
    // la feuille qui tourne : à côté de la couverture (jamais dedans), un recto au même endroit que la page de droite et
    // un verso au même endroit que la page de gauche, chacun avec une copie exacte de son papier (dessin-livre.js)
    this.tourne = el("div", { class: "tourne", hidden: true },
      el("div", { class: "recto" }, dessin(d.recto), this.surRecto),
      el("div", { class: "verso" }, dessin(d.verso), this.surVerso));
    this.livre = el("div", { class: "livre", tabindex: "0", role: "button", "aria-label": "Ouvrir « " + cfg.sujet + " »",
      onclick: () => this.ouvrir(),
      onkeydown: (ev) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); this.ouvrir(); } } },
      el("div", { class: "feuille" }, dessin(d.bloc), this.droite, this.versTerre),
      el("div", { class: "couv" },
        el("div", { class: "dedans" }, dessin(d.interieur), this.gauche),
        el("div", { class: "face" }, dessin(d.couverture), cadre)),
      this.tourne);
    couche.append(el("div", { class: "scene-livre" }, this.livre));
  }

  ouvrir() {
    if (this.etat !== "ferme") return;
    clearTimeout(this.fin);
    if (!this.droite[0].src) [this.droite, this.surRecto].forEach((imgs) => imgs.forEach((i, k) => { i.src = `${DESSINS}etape-${k + 1}.svg`; }));
    this.etat = "ouvre";
    this.livre.classList.add("ouvert");
    this.attente = setTimeout(() => { this.etat = "lu"; this.appli.ouvrirSujet(this.cfg.sujet); }, calme() ? 0 : AVANT_FICHE);
  }

  // La fiche a changé d'étape (k, à partir de 0). anime : faux quand la fiche se pose sur son étape sans qu'on ait rien
  // fait (à son ouverture, ou par une adresse) ; avec « moins d'animations », la page change sans tourner.
  etape(k, anime = true) {
    k = Math.max(0, Math.min(this.cfg.planches - 1, k | 0));
    this.finirTour();
    if (k === this.page) return;
    const de = this.page, avant = k > de;
    this.page = k;
    this.versTerre.hidden = true;   // revient quand la feuille est posée
    if (!anime || calme() || !this.livre.classList.contains("ouvert")) return this.poser();
    // la feuille : au recto, le dessin qui part (en avant) ou qui revient (en arrière) ; au verso, les lignes de gauche qui
    // arrivent (en avant) ou qui partent (en arrière) ; dessous, la page d'arrivée est déjà en place
    montrer(this.surRecto, avant ? de : k);
    remplir(this.surVerso, lignesDe(avant ? k : de));
    if (avant) montrer(this.droite, k); else remplir(this.gauche, lignesDe(k));
    const t = this.tourne;
    t.style.transition = "none";
    t.style.transform = `rotateY(${avant ? 0 : OUVERT}deg)`;
    t.hidden = false;
    void t.offsetWidth;   // la feuille est posée à son départ avant de tourner
    t.style.transition = "";
    t.style.transform = `rotateY(${avant ? OUVERT : 0}deg)`;
    this.tour = setTimeout(() => this.finirTour(), TOUR + 40);
  }

  // une feuille en train de tourner se pose tout de suite (une autre étape arrive, ou le tour est fini)
  finirTour() {
    if (!this.tour) return;
    clearTimeout(this.tour);
    this.tour = 0;
    this.poser();
  }

  // les deux pages montrent l'étape en cours, sans feuille qui tourne
  poser() {
    montrer(this.droite, this.page);
    remplir(this.gauche, lignesDe(this.page));
    this.tourne.hidden = true;
    this.versTerre.hidden = this.page !== this.cfg.planches - 1;
  }

  // Le point de vue de la Terre dessinée sur la dernière page, en pixels de la carte : le globe du palier suivant en
  // part et vole jusqu'à sa place (accueil.js, montrer ; globe.js, voler). Rien ailleurs.
  etatVue() {
    if (this.etat === "ferme" || this.tour || this.page !== this.cfg.planches - 1) return null;
    const b = this.droite[this.page].getBoundingClientRect();
    if (!b.width) return null;
    const c = this.appli.point({ clientX: b.left + b.width * TERRE.x, clientY: b.top + b.height * TERRE.y });
    return { lon: TERRE.lon, lat: TERRE.lat, cx: c.x, cy: c.y, r: b.width * TERRE.r * this.appli.k() };
  }

  // L'accueil range le livre quand la fiche s'ouvre, et à chaque changement de taille de la fenêtre : le dos du livre
  // ouvert va au centre de la place libre (cx, en pixels de la carte), la largeur ouverte ne dépasse pas 2 r.
  glisserVers(cx, r) {
    const k = Math.min(RANGE, r / LARGEUR);
    this.livre.style.transform = `translateX(${cx - (640 - LARGEUR / 2)}px) scale(${k})`;
  }

  // La fiche se ferme (croix, Échap, ou la fiche elle-même) : le livre revient au centre, puis la couverture se referme ;
  // il reviendra à la première étape, comme la fiche qu'on rouvrira.
  lecteurFerme() {
    clearTimeout(this.attente);
    this.etat = "ferme";
    this.livre.style.transform = "";
    this.fin = setTimeout(() => {
      this.livre.classList.remove("ouvert");
      clearTimeout(this.tour);
      this.tour = 0;
      this.page = 0;
      this.poser();
    }, calme() ? 0 : 300);
    this.livre.focus({ preventScroll: true });
  }

  // Échap pendant que la couverture s'ouvre, avant que la fiche n'arrive
  echap() {
    if (this.etat === "ferme") return false;
    this.lecteurFerme();
    return true;
  }

  detruire() {
    clearTimeout(this.attente);
    clearTimeout(this.fin);
    clearTimeout(this.tour);
  }
}
