// Le sommaire, premier écran de Monde depuis le 26/11/2026 (choix de Mathis parmi trois pistes, maquettes
// outils/maquette/accueil/directions.html et sommaire.html) : « Monde », puis une case par partie, de l'histoire à la
// maison. Une partie qui a des fiches est en clair ; les autres disent seulement leur nombre de sujets (choix de
// Mathis). La case de l'histoire porte le vieux livre en petit, le même dessin que le grand, sans titre ni frise
// (d'autres livres pourront venir) ; un clic mène au livre. La case « La carte » est retirée (Mathis : elle menait à la
// Terre, comme la case de la Terre).
// Les sujets sont comptés dans index.html, cachés compris (ce qui est prévu) ; une fiche est un sujet qui porte un lien.
import { el } from "./outils.js";
import { dessinerLivre } from "./dessin-livre.js";

const PETIT = { l: 81, h: 108 };   // le petit livre, en pixels de la carte (le grand fait 300 x 400)

export class Sommaire {
  constructor(couche, cfg, donnees, appli) {
    const reglages = appli.reglages;
    const cases = reglages.ordre.filter((id) => reglages.paliers[id].type !== "sommaire").map((id) => {
      const section = document.querySelector(`#sommaire section[data-palier="${id}"]`);
      const sujets = section ? section.querySelectorAll("li").length : 0;
      const fiches = section ? [...section.querySelectorAll("li a[href]")].map((a) => a.textContent.trim()) : [];
      const p = reglages.paliers[id];
      // une partie écrite dit juste son nombre de fiches, sans leurs titres, et son image au centre (Mathis, 26/11/2026)
      const compte = fiches.length
        ? (fiches.length === 1 ? "1 fiche" : fiches.length + " fiches")
        : (sujets === 1 ? "1 sujet" : sujets + " sujets") + ", aucune fiche";
      return el("a", { class: "partie" + (fiches.length ? " ecrite" : " vide"), href: "#" + id, "data-vers": id, "aria-label": p.nom + " : " + compte },
        el("h2", { texte: p.nom }),
        fiches.length && p.type === "livre" ? el("div", { class: "image" }, petitLivre(p, appli)) : null,
        el("p", { class: "compte", texte: compte }));
    });
    couche.append(el("div", { class: "sommaire-ecran" },
      el("h1", { texte: "Monde" }),
      // la phrase sous le titre (paliers.json ; choix de Mathis, 26/11/2026 : sa question) ; plus de lien vers les mentions
      // légales (retiré à sa demande le même jour, la page reste à son adresse)
      cfg.phrase ? el("p", { class: "phrase", texte: cfg.phrase }) : null,
      el("nav", { class: "parties", "aria-label": "Les parties de Monde" }, cases)));
  }

  detruire() {}
}

// Le vieux livre du palier de l'histoire, en petit : même dessin, même tirage, sans titre ni frise.
// Réduit tel quel, son grain de cuir (des filtres de bruit) tombe sous le pixel et fait du crépi (Mathis, 26/11/2026 :
// « très pixellisé ») : on le dessine donc en grand dans une image, puis on la réduit par moitiés, en lissant.
function petitLivre(p, appli) {
  const d = dessinerLivre({ u: p.usure, graine: p.tirage });
  const toile = el("canvas", { class: "petit-livre", "aria-hidden": "true" });
  const code = d.couverture.replace("<svg ", `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="400" `);
  const img = new Image();
  img.onload = () => {
    // la taille à l'écran, en pixels réels : celle de la carte, agrandie ou réduite à la fenêtre, fois la densité de l'écran
    const k = (devicePixelRatio || 1) / (appli.k ? appli.k() || 1 : 1);
    const L = Math.round(PETIT.l * k), H = Math.round(PETIT.h * k);
    let c = document.createElement("canvas");
    c.width = 600; c.height = 800;
    c.getContext("2d").drawImage(img, 0, 0, 600, 800);
    while (c.width / 2 >= L) {
      const n = document.createElement("canvas");
      n.width = Math.round(c.width / 2); n.height = Math.round(c.height / 2);
      const g = n.getContext("2d");
      g.imageSmoothingQuality = "high";
      g.drawImage(c, 0, 0, n.width, n.height);
      c = n;
    }
    toile.width = L; toile.height = H;
    const g = toile.getContext("2d");
    g.imageSmoothingQuality = "high";
    g.drawImage(c, 0, 0, L, H);
  };
  img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(code);
  return toile;
}
