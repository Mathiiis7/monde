// L'accueil de Monde : une carte de la Terre qu'on zoome, en six paliers, de la planète à la maison (choix du
// 19/11/2026), précédée d'un livre, « De la Terre jusqu'à nous » (25/11/2026), et d'un sommaire, premier écran depuis
// le 26/11/2026 (sommaire.js).
// Ce fichier tient la scène, la réglette des échelles, le passage d'un palier à l'autre et les panneaux.
// Les sujets de chaque palier sont lus dans index.html ; les réglages des paliers dans site/donnees/paliers.json.
import { Globe } from "./globe.js";
import { Plan } from "./plan.js";
import { Livre } from "./livre.js";
import { Sommaire } from "./sommaire.js";
import { el, boutonFermer, calme } from "./outils.js";

const BASE = new URL("../", import.meta.url);
const PART_LECTEUR = 0.56;                            // la part de l'écran que prend le panneau d'une fiche (styles.css : 56vw)
const memoire = new Map();
function charger(chemin, texte = false) {
  if (!memoire.has(chemin)) {
    // « no-cache » : le navigateur redemande au serveur si le fichier a changé (sinon GitHub lui laisse garder
    // l'ancienne version 10 minutes, même après un rechargement) ; s'il n'a pas changé, rien n'est retéléchargé.
    memoire.set(chemin, fetch(new URL(chemin, BASE), { cache: "no-cache" }).then((r) => {
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
    // Les sujets montrés : ceux d'index.html qui ne sont pas marqués hidden (une fiche à la fois, demande du 24/11/2026) ;
    // index.html?tout les montre tous (pour les essais).
    this.tout = new URLSearchParams(location.search).has("tout");
    this.listes = {};
    this.pages = {};
    for (const s of document.querySelectorAll("#sommaire section[data-palier]")) {
      this.listes[s.dataset.palier] = [...s.querySelectorAll("li")].filter((li) => this.tout || !li.hidden).map((li) => li.textContent.trim());
      // un sujet dont la fiche est publiée porte, dans index.html, un lien vers sa page
      s.querySelectorAll("li a[href]").forEach((a) => { this.pages[a.textContent.trim()] = a.getAttribute("href"); });
    }
    this.visibles = new Set(Object.values(this.listes).flat());
    this.scene = document.getElementById("scene");
    document.documentElement.classList.add("carte");
    this.scene.hidden = false;
    this.construireCadre();
    this.ajuster();
    addEventListener("resize", () => this.ajuster());
    addEventListener("hashchange", () => this.suivreAdresse());
    addEventListener("keydown", (ev) => {
      if (ev.key === "Escape") this.echap();
      // la fiche ouverte depuis le livre : les flèches gauche et droite lui sont passées quand elle n'a pas la main
      // (juste après l'ouverture, la croix l'a) ; elle change d'étape et le livre tourne la page (26/11/2026)
      if ((ev.key === "ArrowLeft" || ev.key === "ArrowRight") && this.lecteur && this.objet && this.objet.etape && !ev.altKey && !ev.ctrlKey && !ev.metaKey && !ev.shiftKey) {
        ev.preventDefault();
        this.lecteur.querySelector("iframe").contentWindow.postMessage({ type: "monde:fleche", sens: ev.key === "ArrowRight" ? 1 : -1 }, location.origin);
      }
    });
    addEventListener("message", (ev) => {
      if (ev.origin !== location.origin) return;
      if (ev.data === "monde:fermer-fiche") this.fermerLecteur();
      // la fiche a changé d'étape : le livre ouvert tourne la page (livre.js)
      else if (ev.data && ev.data.type === "monde:etape" && this.lecteur && this.objet && this.objet.etape) this.objet.etape(ev.data.k, ev.data.anime);
    });
    this.jeton = 0;
    this.suivreAdresse();
  }

  // La carte est dessinée sur 1280 x 800 et s'agrandit ou se réduit pour tenir dans la fenêtre (échelle s). La scène,
  // elle, couvre toute la fenêtre (W x H en pixels de la carte) : les barres collent aux bords, et le cadre de la carte
  // est centré, à dx et dy des bords (demande du 24/11/2026 : plus de bandes vides en haut et en bas).
  ajuster() {
    this.s = Math.min(innerWidth / 1280, innerHeight / 800);
    this.W = innerWidth / this.s; this.H = innerHeight / this.s;
    this.dx = (this.W - 1280) / 2; this.dy = (this.H - 800) / 2;
    const st = this.scene.style;
    st.setProperty("--s", this.s);
    st.setProperty("--w", this.W + "px"); st.setProperty("--h", this.H + "px");
    st.setProperty("--dx", this.dx + "px"); st.setProperty("--dy", this.dy + "px");
    if (this.lecteur && this.objet && this.objet.glisserVers) this.objet.glisserVers(...this.placeLecteur());
  }

  // Un point de l'écran, en pixels de la carte (le cadre de 1280 x 800).
  point(ev) {
    const r = this.scene.getBoundingClientRect(), k = this.k();
    return { x: (ev.clientX - r.left) * k - this.dx, y: (ev.clientY - r.top) * k - this.dy };
  }

  // Combien de pixels de la carte pour un pixel de l'écran.
  k() {
    return this.W / this.scene.getBoundingClientRect().width;
  }

  construireCadre() {
    const S = this.scene;
    // ni logo « Monde » ni bouton de liste sur la carte (demande du 25/11/2026 : rien d'inutile à l'écran ; la réglette
    // ramène à la planète) ; la liste reste dans la page sans JavaScript, et ?tout garde le bouton pour les essais
    // les grandes questions et les modèles restent cachés tant qu'on écrit les fiches une à une (?tout les montre).
    // Plus de « ? » (26/11/2026, Mathis : le lexique était vide, « Comment Monde est fait » n'est plus tenu à jour) ; les
    // mentions légales sont en bas du sommaire.
    if (this.tout) S.append(el("nav", { class: "cap", "aria-label": "À toutes les échelles", style: "right:24px" },
      ["Les grandes questions", "Les modèles et leurs noms"].map((p) => el("button", { texte: p, onclick: (ev) => this.ouvrirPage(p, ev.currentTarget) }))));
    // « Sommaire » en haut à gauche de chaque écran, sauf du sommaire lui-même (demande du 26/11/2026)
    this.bSommaire = el("a", { class: "capbtn", href: "#" + this.ordre[0], texte: "Sommaire", style: "left:24px;right:auto" });
    this.bListe = el("button", { class: "capbtn", style: "left:150px;right:auto", "aria-expanded": "false", onclick: () => (this.pan ? this.fermerPanneaux() : this.ouvrirListe()) });
    S.append(this.bSommaire, this.bListe);
    // repliée, la réglette ne montre que le nom du palier : un clic dessus la déplie (pas le survol, qui déplaçait + et −
    // sous la souris, 26/11/2026) ; dépliée, un clic sur un palier y mène et la replie
    this.rail = this.ordre.map((id) => el("a", { class: "st", href: "#" + id, onclick: (ev) => {
      if (this.ech.classList.contains("deplie")) { this.deplier(false); return; }
      ev.preventDefault();
      this.deplier(true);
    } }, el("span", { class: "o" }), this.reglages.paliers[id].nom));
    this.bPlus = el("button", { class: "zb", "aria-label": "Zoomer", texte: "+", onclick: () => this.pas(1) });
    this.bMoins = el("button", { class: "zb", "aria-label": "Dézoomer", texte: "−", onclick: () => this.pas(-1) });
    this.ech = el("nav", { class: "ech", "aria-label": "Échelle de la carte" }, this.bPlus, el("div", { class: "rail" }, this.rail), this.bMoins);
    S.append(this.ech);
    addEventListener("pointerdown", (ev) => { if (!ev.target.closest(".ech")) this.deplier(false); });
  }

  // La réglette dépliée (tous les paliers) ou repliée (le palier où l'on est). Renvoie vrai si quelque chose a changé.
  deplier(ouvrir) {
    if (this.ech.classList.contains("deplie") === ouvrir) return false;
    this.ech.classList.toggle("deplie", ouvrir);
    this.rail.forEach((a) => { if (a.classList.contains("on")) a.setAttribute("aria-expanded", String(ouvrir)); });
    return true;
  }


  pas(sens) {
    const i = this.ordre.indexOf(this.actuel) + sens;
    if (i >= 0 && i < this.ordre.length) this.aller(this.ordre[i]);
  }

  // Le palier vient de l'adresse (#histoire, #planete…) : le bouton « retour » du navigateur remonte d'un palier ; sans
  // adresse, le premier palier (le livre).
  suivreAdresse() {
    const h = decodeURIComponent(location.hash.slice(1));
    const id = this.ordre.includes(h) ? h : this.ordre[0];
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
    if (this.lecteur) { this.lecteur.remove(); this.lecteur = null; }
    this.majCadre();
    document.title = id === this.ordre[0] ? "Monde" : "Monde · " + cfg.nom;
    let attente = setTimeout(() => { attente = el("p", { class: "chargement", texte: "Chargement…" }); this.scene.append(attente); }, 200);
    let donnees;
    try {
      donnees = cfg.type === "livre" || cfg.type === "sommaire" ? {}   // le livre et le sommaire n'ont rien à charger
        : cfg.type === "plan"
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
      depart, territoires: this.reglages.territoires, visible: (nom) => this.visibles.has(nom),
      ouvrirSujet: (nom) => this.ouvrirSujet(nom), ouvrirListe: () => this.ouvrirListe(), charger: (c) => charger(c),
      aller: (vers, dep) => this.aller(vers, dep), point: (ev) => this.point(ev), k: () => this.k(), reglages: this.reglages
    };
    const ancien = this.objet, ancienne = this.couche;
    // d'un globe à un globe : le nouveau part de l'image exacte de l'ancien et vole jusqu'à la sienne (un vrai zoom)
    const Classe = { plan: Plan, livre: Livre, sommaire: Sommaire }[cfg.type] || Globe;
    // (le livre ouvert sur sa dernière page, la Terre d'aujourd'hui, donne aussi un point de départ : le globe part du
    // dessin ; sinon il n'en donne pas, 26/11/2026)
    // (vers ou depuis la carte à plat des États, 26/11/2026 : pas de vol, on plonge)
    appli.depuis = Classe === Globe && !cfg.plat && ancien && ancien.etatVue && !calme() ? ancien.etatVue() : null;
    const vol = !!appli.depuis;
    const [cfgVu, donneesVues] = this.filtrer(id, cfg, donnees);
    const objet = new Classe(couche, cfgVu, donneesVues, appli);
    this.objet = objet; this.couche = couche;
    this.transition(ancienne, ancien, couche, this.ordre.indexOf(id) > this.ordre.indexOf(avant), vol);
  }

  // Les réglages d'un palier, sans ce qui mène à un sujet caché : sujets en orbite, repères, liens de « Ceux qui
  // décident », mots « Région » et « Département », lieux de la ville et objets de la maison. Rien n'est modifié
  // dans les réglages ni les données d'origine (elles servent encore au palier suivant).
  filtrer(id, cfg, donnees) {
    if (this.tout) return [cfg.type === "plan" ? { ...cfg, textes: [...cfg.textes, cfg.consigne] } : cfg, donnees];
    const vu = (nom) => this.visibles.has(nom);
    const c = structuredClone(cfg);
    if (c.orbite) c.orbite = c.orbite.filter((o) => vu(o.sujet));
    if (c.lieux && c.type !== "plan") c.lieux = c.lieux.filter((l) => vu(l.sujet));
    if (c.paris) {
      c.paris.liens = c.paris.liens.filter((l) => vu(l.sujet));
      if (!c.paris.liens.length) delete c.paris;
    }
    if (c.decoupage) for (const cle of ["region", "departement"]) {
      const e = c.decoupage[cle];
      e.liens = e.liens.filter((l) => !l.sujet || vu(l.sujet));
      if (!e.liens.some((l) => l.sujet)) e.masque = true;          // plus de fiche à porter : le mot disparaît
    }
    if (c.carte && c.carte.france && c.carte.france.liste && !this.listes[id].length) delete c.carte.france;
    if (c.type === "plan") {
      const sujets = donnees.lieux.sujets.map((s) => (typeof s === "string" ? s : s.nom));
      const lieux = donnees.lieux.lieux.filter((l) => vu(sujets[l.sujet]));
      if (!lieux.length) c.textes = c.textes.slice();                 // la consigne « Clique sur… » n'a plus d'objet
      else c.textes = [...c.textes, c.consigne];
      return [c, { ...donnees, lieux: { ...donnees.lieux, lieux } }];
    }
    return [c, donnees];
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
    this.ech.classList.remove("deplie");                              // un nouveau palier replie la réglette
    this.rail.forEach((a, k) => {
      a.className = "st" + (k === i ? " on" : "");
      if (k === i) { a.setAttribute("aria-current", "true"); a.setAttribute("aria-expanded", "false"); }
      else { a.removeAttribute("aria-current"); a.removeAttribute("aria-expanded"); }
    });
    this.bMoins.disabled = i === 0;
    // sur le sommaire, ses cases mènent partout : pas de réglette (26/11/2026)
    this.ech.hidden = this.bSommaire.hidden = this.reglages.paliers[this.actuel].type === "sommaire";
    this.bPlus.disabled = i === this.ordre.length - 1;
    const n = (this.listes[this.actuel] || []).length;   // le sommaire n'a pas de liste
    this.bListe.hidden = !this.tout || n === 0;                       // seulement pour les essais (?tout)
    this.bListe.textContent = n === 1 ? "1 sujet en liste" : `Les ${n} sujets en liste`;
  }

  // ---- Les panneaux : la liste des sujets d'une échelle, une fiche ----
  ouvrirListe() {
    this.fermerPanneaux();
    const cfg = this.reglages.paliers[this.actuel], sujets = this.listes[this.actuel];
    this.pan = el("aside", { class: "pan", "aria-label": "Les sujets à cette échelle" },
      boutonFermer("Fermer la liste", () => this.fermerPanneaux(), "top:8px;right:8px"),
      el("span", { class: "petit", texte: "À l'échelle " + cfg.echelle }),
      el("b", { class: "t", texte: sujets.length + (sujets.length === 1 ? " sujet" : " sujets") }),
      sujets.map((s) => el("button", { class: "lien", texte: s, onclick: () => this.ouvrirSujet(s, true) })));
    this.scene.append(this.pan);
    this.bListe.setAttribute("aria-expanded", "true");
    this.pan.querySelector(".lien").focus();
  }

  ouvrirSujet(nom, depuisListe = false) {
    const page = this.pages[nom];
    if (page) {
      // sur un globe ou le livre : la fiche dans le panneau de droite, la Terre ou le livre glisse à gauche ; ailleurs : sa page
      if (this.objet && this.objet.glisserVers) this.ouvrirLecteur(page);
      else location.href = page;
      return;
    }
    this.panneau(nom, "Fiche", "Cette fiche n'est pas encore écrite.", depuisListe);
  }

  // ---- Le panneau de lecture d'une fiche (demande du 25/11/2026) : à droite, sur une part de l'écran (PART_LECTEUR),
  // hors de la scène mise à l'échelle, pour que le texte garde sa taille ; la page de la fiche y est chargée en mode
  // « panneau » (sans sa barre du haut). La croix, Échap ou un changement de palier le ferment.
  ouvrirLecteur(page) {
    this.fermerPanneaux();
    const src = page + "?panneau";
    if (this.lecteur) {
      this.lecteur.querySelector("iframe").src = src;
    } else {
      this.lecteur = el("aside", { class: "lecteur", "aria-label": "Fiche" },
        boutonFermer("Fermer la fiche", () => this.fermerLecteur()),
        el("iframe", { title: "Fiche", src }));
      document.body.append(this.lecteur);
      // la croix à 12 px de la barre de défilement de la fiche, comme du haut (sa largeur change selon le navigateur)
      const cadre = this.lecteur.querySelector("iframe"), croix = this.lecteur.querySelector(".fermer");
      cadre.addEventListener("load", () => {
        try { croix.style.right = (cadre.offsetWidth - cadre.contentDocument.documentElement.clientWidth) + 12 + "px"; } catch (err) { /* page d'ailleurs */ }
      });
      setTimeout(() => this.lecteur && this.lecteur.classList.add("ouvert"), 20);
    }
    this.objet.glisserVers(...this.placeLecteur());
    this.lecteur.querySelector(".fermer").focus();
  }

  // la Terre au milieu de la place qui reste entre la réglette et le panneau, en pixels de la carte ; elle rapetisse si
  // elle n'y tient pas
  placeLecteur() {
    const k = this.k(), sc = this.scene.getBoundingClientRect();
    const gauche = (this.ech.getBoundingClientRect().right - sc.left) * k - this.dx + 24;
    const droite = this.W * (1 - PART_LECTEUR) - this.dx - 24;
    const r = Math.min(this.objet.g.r, ((droite - gauche) / 2 - 24) / (this.objet.etire || 1));   // à plat, la carte est plus large que haute
    return [(gauche + droite) / 2, Math.max(120, r)];
  }

  fermerLecteur() {
    if (!this.lecteur) return false;
    this.lecteur.remove();
    this.lecteur = null;
    // le livre se referme ; la Terre revient au centre
    if (this.objet && this.objet.lecteurFerme) this.objet.lecteurFerme();
    else if (this.objet && this.objet.glisserVers) this.objet.glisserVers(this.objet.g.cx);
    return true;
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
    if (this.deplier(false)) return;
    if (this.fermerLecteur()) return;
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
