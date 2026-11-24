// L'accueil de Monde : une carte de la Terre qu'on zoome, en six paliers, de la planète à la maison (choix du
// 19/11/2026). Ce fichier tient la scène, la réglette des échelles, le passage d'un palier à l'autre et les panneaux.
// Les sujets de chaque palier sont lus dans index.html ; les réglages des paliers dans site/donnees/paliers.json.
import { Globe } from "./globe.js";
import { Plan } from "./plan.js";
import { el, boutonFermer, calme } from "./outils.js";

const BASE = new URL("../", import.meta.url);
const memoire = new Map();
function charger(chemin, texte = false) {
  if (!memoire.has(chemin)) {
    memoire.set(chemin, fetch(new URL(chemin, BASE)).then((r) => {
      if (!r.ok) throw new Error(chemin + " : " + r.status);
      return texte ? r.text() : r.json();
    }));
  }
  return memoire.get(chemin);
}

class Accueil {
  async demarrer() {
    this.reglages = await charger("donnees/paliers.json");
    this.ordre = this.reglages.ordre;
    this.listes = {};
    for (const s of document.querySelectorAll("#sommaire section[data-palier]")) {
      this.listes[s.dataset.palier] = [...s.querySelectorAll("li")].map((li) => li.textContent.trim());
    }
    this.scene = document.getElementById("scene");
    document.documentElement.classList.add("carte");
    this.scene.hidden = false;
    this.construireCadre();
    this.ajuster();
    addEventListener("resize", () => this.ajuster());
    addEventListener("hashchange", () => this.suivreAdresse());
    addEventListener("keydown", (ev) => { if (ev.key === "Escape") this.echap(); });
    this.jeton = 0;
    this.suivreAdresse();
  }

  // La scène garde 1280 x 800 et s'agrandit ou se réduit pour tenir dans la fenêtre.
  ajuster() {
    this.s = Math.min(innerWidth / 1280, innerHeight / 800);
    this.scene.style.setProperty("--s", this.s);
  }

  // Un point de l'écran, en pixels de la scène.
  point(ev) {
    const r = this.scene.getBoundingClientRect(), k = 1280 / r.width;
    return { x: (ev.clientX - r.left) * k, y: (ev.clientY - r.top) * k };
  }

  construireCadre() {
    const S = this.scene;
    S.append(el("div", { class: "cap", style: "left:24px" }, el("a", { class: "logo", href: "#planete", texte: "Monde" })));
    const pages = ["Les grandes questions", "Les modèles et leurs noms", "Lexique"];
    S.append(el("nav", { class: "cap", "aria-label": "À toutes les échelles", style: "left:50%;transform:translateX(-50%)" },
      pages.map((p) => el("button", { texte: p, onclick: (ev) => this.ouvrirPage(p, ev.currentTarget) })),
      el("a", { href: "comment-monde-est-fait.html", texte: "Comment Monde est fait" })));
    S.append(el("a", { class: "pied", href: "mentions-legales.html", texte: "Mentions légales" }));
    this.bListe = el("button", { class: "capbtn", "aria-expanded": "false", onclick: () => (this.pan ? this.fermerPanneaux() : this.ouvrirListe()) });
    S.append(this.bListe);
    this.rail = this.ordre.map((id) => el("a", { class: "st", href: "#" + id }, el("span", { class: "o" }), this.reglages.paliers[id].nom));
    this.bPlus = el("button", { class: "zb", "aria-label": "Zoomer", texte: "+", onclick: () => this.pas(1) });
    this.bMoins = el("button", { class: "zb", "aria-label": "Dézoomer", texte: "−", onclick: () => this.pas(-1) });
    S.append(el("nav", { class: "ech", "aria-label": "Échelle de la carte" }, this.bPlus, el("div", { class: "rail" }, this.rail), this.bMoins));
  }

  pas(sens) {
    const i = this.ordre.indexOf(this.actuel) + sens;
    if (i >= 0 && i < this.ordre.length) this.aller(this.ordre[i]);
  }

  // Le palier vient de l'adresse (#planete, #monde…) : le bouton « retour » du navigateur remonte d'un palier.
  suivreAdresse() {
    const h = decodeURIComponent(location.hash.slice(1));
    const id = this.ordre.includes(h) ? h : "planete";
    const depart = this.depart;
    this.depart = null;
    if (id !== this.actuel) this.montrer(id, depart);
  }

  aller(id, depart) {
    this.depart = depart || null;
    if (location.hash.slice(1) === id) this.suivreAdresse();
    else location.hash = id;
  }

  async montrer(id, depart) {
    const jeton = ++this.jeton, cfg = this.reglages.paliers[id];
    const avant = this.actuel;
    this.actuel = id;
    this.fermerPanneaux();
    this.majCadre();
    document.title = id === "planete" ? "Monde · Comment habiter la Terre ?" : "Monde · " + cfg.nom;
    let attente = setTimeout(() => { attente = el("p", { class: "chargement", texte: "Chargement…" }); this.scene.append(attente); }, 200);
    let donnees;
    try {
      donnees = cfg.type === "plan"
        ? { dessin: await charger("dessins/" + cfg.dessin, true), lieux: await charger("donnees/" + cfg.lieux) }
        : await charger("donnees/" + cfg.donnees);
      if (cfg.decoupage) {
        const [regions, departements] = await Promise.all([charger("donnees/" + cfg.decoupage.regions), charger("donnees/" + cfg.decoupage.departements)]);
        donnees = { ...donnees, decoupage: { regions, departements } };
      }
    } catch (err) {
      donnees = null;
      console.error(err);
    }
    if (typeof attente === "number") clearTimeout(attente); else attente.remove();
    if (jeton !== this.jeton) return;                     // un autre palier a été demandé entre-temps
    if (!donnees) {
      this.scene.append(el("p", { class: "chargement", texte: "Ce palier n'a pas pu être chargé." }));
      return;
    }
    const couche = el("div", { class: "couche", "data-palier": id });
    this.scene.prepend(couche);
    const appli = {
      depart, territoires: this.reglages.territoires,
      ouvrirSujet: (nom) => this.ouvrirSujet(nom), ouvrirListe: () => this.ouvrirListe(),
      aller: (vers, dep) => this.aller(vers, dep), point: (ev) => this.point(ev), k: () => 1280 / this.scene.getBoundingClientRect().width
    };
    const ancien = this.objet, ancienne = this.couche;
    // d'un globe à un globe : le nouveau part de l'image exacte de l'ancien et vole jusqu'à la sienne (un vrai zoom)
    const vol = cfg.type !== "plan" && !!ancien && !!ancien.etatVue && !calme();
    appli.depuis = vol ? ancien.etatVue() : null;
    const objet = new (cfg.type === "plan" ? Plan : Globe)(couche, cfg, donnees, appli);
    this.objet = objet; this.couche = couche;
    this.transition(ancienne, ancien, couche, this.ordre.indexOf(id) > this.ordre.indexOf(avant), vol);
  }

  // Le passage d'un palier à l'autre. D'un globe à un globe, le globe vole d'un point de vue à l'autre (globe.js) et
  // l'ancien palier s'efface seulement. Vers la ville ou la maison, et pour en sortir : on plonge en descendant,
  // on recule en remontant.
  transition(ancienne, ancien, nouvelle, descend, vol) {
    if (!ancienne) return;
    let a1 = null, a2 = null, fait = false;
    // La fin du passage : l'ancien palier s'en va. Elle arrive aussi par la minuterie si l'animation ne se termine pas
    // (onglet caché, navigateur sans fenêtre), pour ne jamais laisser l'ancien palier par-dessus le nouveau.
    const fin = () => {
      if (fait) return;
      fait = true;
      if (a2) a2.cancel();
      if (ancien) ancien.detruire();
      ancienne.remove();
    };
    ancienne.style.pointerEvents = "none";
    if (calme() || !ancienne.animate) { fin(); return; }
    if (vol) {
      a1 = ancienne.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 320, easing: "ease-out", fill: "both" });
      a1.finished.then(fin, fin);
      setTimeout(fin, 500);
      return;
    }
    const t = { duration: 520, easing: "cubic-bezier(.45,0,.25,1)", fill: "both" };
    a1 = ancienne.animate([{ transform: "scale(1)", opacity: 1 }, { transform: `scale(${descend ? 1.7 : 0.6})`, opacity: 0 }], t);
    a2 = nouvelle.animate([{ transform: `scale(${descend ? 0.6 : 1.7})`, opacity: 0 }, { transform: "scale(1)", opacity: 1 }], t);
    a1.finished.then(fin, fin);
    setTimeout(fin, 700);
  }

  majCadre() {
    const i = this.ordre.indexOf(this.actuel);
    this.rail.forEach((a, k) => {
      a.className = "st" + (k === i ? " on" : "");
      if (k === i) a.setAttribute("aria-current", "true"); else a.removeAttribute("aria-current");
    });
    this.bMoins.disabled = i === 0;
    this.bPlus.disabled = i === this.ordre.length - 1;
    const n = this.listes[this.actuel].length;
    this.bListe.textContent = `Les ${n} sujets en liste`;
  }

  // ---- Les panneaux : la liste des sujets d'une échelle, une fiche ----
  ouvrirListe() {
    this.fermerPanneaux();
    const cfg = this.reglages.paliers[this.actuel], sujets = this.listes[this.actuel];
    this.pan = el("aside", { class: "pan", "aria-label": "Les sujets à cette échelle" },
      boutonFermer("Fermer la liste", () => this.fermerPanneaux(), "top:8px;right:8px"),
      el("span", { class: "petit", texte: "À l'échelle " + cfg.echelle }),
      el("b", { class: "t", texte: sujets.length + " sujets" }),
      sujets.map((s) => el("button", { class: "lien", texte: s, onclick: () => this.ouvrirSujet(s, true) })));
    this.scene.append(this.pan);
    this.bListe.setAttribute("aria-expanded", "true");
    this.pan.querySelector(".lien").focus();
  }

  ouvrirSujet(nom, depuisListe = false) {
    this.panneau(nom, "Fiche", "Cette fiche n'est pas encore écrite.", depuisListe);
  }

  ouvrirPage(nom) {
    this.panneau(nom, "À toutes les échelles", "Cette partie n'est pas encore écrite.", false);
  }

  panneau(titre, sur, texte, depuisListe) {
    this.fermerPanneaux();
    const h = el("h2", { texte: titre, tabindex: "-1" });
    this.fiche = el("aside", { class: "panneau", "aria-label": titre },
      boutonFermer("Fermer", () => this.fermerPanneaux(), "top:12px;right:12px"),
      el("span", { class: "petit", texte: sur }), h, el("p", { texte }),
      depuisListe ? el("button", { class: "retour", texte: "Revenir à la liste", onclick: () => this.ouvrirListe() }) : null);
    this.scene.append(this.fiche);
    h.focus();
  }

  fermerPanneaux() {
    const ouvert = !!(this.pan || this.fiche);
    if (this.pan) { this.pan.remove(); this.pan = null; }
    if (this.fiche) { this.fiche.remove(); this.fiche = null; }
    if (this.bListe) this.bListe.setAttribute("aria-expanded", "false");
    return ouvert;
  }

  echap() {
    if (this.fermerPanneaux()) return;
    if (this.objet && this.objet.echap) this.objet.echap();
  }
}

new Accueil().demarrer().catch((err) => {
  // sans la carte, la liste des sujets reste lisible
  console.error(err);
  document.documentElement.classList.remove("carte");
  const scene = document.getElementById("scene");
  if (scene) scene.hidden = true;
});
