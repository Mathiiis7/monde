// Les paliers « Une ville » et « Une maison » : un dessin type, inventé (site/dessins), et ses lieux ou ses objets,
// chacun porteur d'un sujet (site/donnees/lieux-*.json). Repris des planches V-ville et W-maison de la maquette.
import { el, svg, boutonFermer, borne } from "./outils.js";

export class Plan {
  constructor(couche, cfg, donnees, appli) {
    this.couche = couche; this.cfg = cfg; this.appli = appli;
    const sujets = donnees.lieux.sujets.map((s) => (typeof s === "string" ? { nom: s } : s));
    this.lieux = donnees.lieux.lieux.map((l, i) => ({ ...l, i, sujet: sujets[l.sujet] }));
    this.choix = null;
    this.construire(donnees.dessin);
  }

  construire(texte) {
    const C = this.couche, cfg = this.cfg;
    const doc = new DOMParser().parseFromString(texte, "image/svg+xml");
    this.carte = document.importNode(doc.documentElement, true);
    this.carte.setAttribute("class", "carte");
    this.carte.setAttribute("role", "img");
    this.carte.setAttribute("aria-label", cfg.aria);
    this.carte.addEventListener("click", (ev) => { if (!ev.target.classList.contains("lieu")) this.fermer(); });
    for (const l of this.lieux) {
      const [x, y, w, h] = l.r;
      l.zone = svg("rect", { class: "lieu" + (cfg.zonesVisibles ? " batiment" : ""), x: x - (cfg.zonesVisibles ? 0 : 4), y: y - (cfg.zonesVisibles ? 0 : 4),
        width: w + (cfg.zonesVisibles ? 0 : 8), height: h + (cfg.zonesVisibles ? 0 : 8), rx: cfg.zonesVisibles ? 3 : 4, onclick: () => this.choisir(l.i) });
      this.carte.append(l.zone);
    }
    C.append(this.carte);
    for (const l of this.lieux) {
      const [x, y, w, h] = l.r, p = l.p || [Math.round(x + w / 2), Math.round(y + h / 2)];
      l.pin = el("button", { class: "pin petit" + (l.cote ? " gauche" : ""), style: `left:${p[0]}px;top:${p[1]}px`, onclick: () => this.choisir(l.i) },
        el("span", { class: "pt" }), el("span", { class: "lb", texte: l.nom }));
      C.append(l.pin);
    }
    const b = cfg.boite;
    C.append(el("div", { class: "boite-plan", style: `left:${b.x}px;top:${b.y}px;width:${b.l}px` }, cfg.textes.map((t) => el("span", { html: t }))));
    C.append(el("h1", { class: "cache-ecran", texte: "Monde : " + cfg.nom.toLowerCase() }));
  }

  choisir(i) {
    if (this.choix === i) { this.fermer(); return; }
    this.fermer();
    const l = this.lieux[i], cfg = this.cfg, [x, y, w, h] = l.r;
    this.choix = i;
    l.zone.classList.add("choisi");
    l.pin.classList.add("actif");
    // la carte s'ouvre à côté de l'objet, du côté où il y a de la place
    const cx = borne(x + w / 2 > 640 ? x - 16 - 270 : x + w + 16, 214, 986), cy = borne(y - 12, 84, 586);
    this.fiche = el("div", { class: "fiche", style: `left:${cx}px;top:${cy}px` },
      el("b", { class: "t", texte: l.nom }), boutonFermer("Fermer", () => this.fermer()),
      el("span", { class: "petit", texte: "Le sujet" }),
      el("button", { class: "lien", texte: l.sujet.nom, onclick: () => this.appli.ouvrirSujet(l.sujet.nom) }),
      l.sujet.desc ? el("span", { class: "petit", texte: "Dans la fiche : " + l.sujet.desc }) : null,
      l.descendre && cfg.descendre ? el("button", { class: "lien", texte: cfg.descendre.texte, onclick: () => this.appli.aller(cfg.descendre.aller) }) : null);
    this.couche.append(this.fiche);
  }

  fermer() {
    if (this.choix == null) return;
    const l = this.lieux[this.choix];
    l.zone.classList.remove("choisi");
    l.pin.classList.remove("actif");
    this.fiche.remove();
    this.fiche = null;
    this.choix = null;
  }

  echap() {
    if (this.choix == null) return false;
    this.fermer();
    return true;
  }

  detruire() {}
}
