// Le livre, premier écran de Monde (choix du 25/11/2026 ; maquette outils/maquette/livre/index.html) : un grand
// livre « L'histoire de la Terre et du vivant », un cran avant la Terre dans la réglette. Depuis le 26/11/2026, un vieux
// livre légèrement usé, avec de fausses lignes quand il est ouvert (dessin-livre.js, maquette vieux.html). Rien ne bouge tout seul (leçon
// de l'ancien « voyage dans le temps ») : un clic, ou Entrée, ouvre la couverture, puis la fiche arrive dans le panneau
// de droite de l'accueil (accueil.js, ouvrirLecteur) et le livre ouvert se range à gauche ; la croix et Échap referment.
import { el, calme } from "./outils.js";
import { dessinerLivre, masqueTexte, LIGNES } from "./dessin-livre.js";

const LARGEUR = 300;          // le livre fermé, en pixels de la carte (300 x 400, centré dans le cadre de 1280 x 800)
const RANGE = 0.72;           // la taille du livre ouvert, rangé à gauche du panneau, au plus (maquette)
const AVANT_FICHE = 650;      // millisecondes : la couverture s'ouvre (0,8 s), la fiche arrive avant la fin (maquette)

export class Livre {
  constructor(couche, cfg, donnees, appli) {
    this.cfg = cfg;
    this.appli = appli;
    this.etat = "ferme";
    // la demi-largeur du livre ouvert à sa taille rangée : l'accueil la réduit si la place manque (placeLecteur)
    this.g = { r: LARGEUR * RANGE };
    // le vieux livre dessiné (dessin-livre.js), le texte de la couverture et les fausses lignes par-dessus
    const d = dessinerLivre({ u: cfg.usure, graine: cfg.tirage });
    const dessin = (code) => { const t = document.createElement("template"); t.innerHTML = code; return t.content.firstElementChild; };
    const lignes = (l) => el("div", { class: "lignes" }, l.map((w) => (w ? el("i", { style: `width:${w}%` }) : el("b"))));
    const cadre = el("div", { class: "cadre" }, el("span", { class: "titre", texte: cfg.sujet }));   // le titre seul : ni « MONDE » ni os (26/11/2026)
    cadre.style.webkitMaskImage = cadre.style.maskImage = masqueTexte(cfg.tirage, cfg.usure);   // la dorure un peu passée
    this.livre = el("div", { class: "livre", tabindex: "0", role: "button", "aria-label": "Ouvrir « " + cfg.sujet + " »",
      onclick: () => this.ouvrir(),
      onkeydown: (ev) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); this.ouvrir(); } } },
      el("div", { class: "feuille" }, dessin(d.bloc), lignes(LIGNES.droite)),
      el("div", { class: "couv" },
        el("div", { class: "dedans" }, dessin(d.interieur), lignes(LIGNES.gauche)),
        el("div", { class: "face" }, dessin(d.couverture), cadre)));
    couche.append(el("div", { class: "scene-livre" }, this.livre));
  }

  ouvrir() {
    if (this.etat !== "ferme") return;
    clearTimeout(this.fin);
    this.etat = "ouvre";
    this.livre.classList.add("ouvert");
    this.attente = setTimeout(() => { this.etat = "lu"; this.appli.ouvrirSujet(this.cfg.sujet); }, calme() ? 0 : AVANT_FICHE);
  }

  // L'accueil range le livre quand la fiche s'ouvre, et à chaque changement de taille de la fenêtre : le dos du livre
  // ouvert va au centre de la place libre (cx, en pixels de la carte), la largeur ouverte ne dépasse pas 2 r.
  glisserVers(cx, r) {
    const k = Math.min(RANGE, r / LARGEUR);
    this.livre.style.transform = `translateX(${cx - (640 - LARGEUR / 2)}px) scale(${k})`;
  }

  // La fiche se ferme (croix, Échap, ou la fiche elle-même) : le livre revient au centre, puis la couverture se referme.
  lecteurFerme() {
    clearTimeout(this.attente);
    this.etat = "ferme";
    this.livre.style.transform = "";
    this.fin = setTimeout(() => this.livre.classList.remove("ouvert"), calme() ? 0 : 300);
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
  }
}
