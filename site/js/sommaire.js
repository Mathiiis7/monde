// Le sommaire, premier écran de Monde depuis le 26/11/2026 (choix de Mathis parmi trois pistes, maquettes
// outils/maquette/accueil/directions.html et sommaire.html) : « Monde », puis une case par partie, de l'histoire à la
// maison, et une case pour la carte. Une partie qui a des fiches est en clair ; les autres disent seulement leur nombre
// de sujets (choix de Mathis). La case de l'histoire porte le vieux livre en petit, le même dessin que le grand, sans
// titre (d'autres livres pourront venir) ; un clic mène au livre.
// Les sujets sont comptés dans index.html, cachés compris (ce qui est prévu) ; une fiche est un sujet qui porte un lien.
import { el } from "./outils.js";
import { dessinerLivre, masqueTexte } from "./dessin-livre.js";

const DESSINS = "site/dessins/livre/";

export class Sommaire {
  constructor(couche, cfg, donnees, appli) {
    const reglages = appli.reglages;
    const cases = reglages.ordre.filter((id) => reglages.paliers[id].type !== "sommaire").map((id) => {
      const section = document.querySelector(`#sommaire section[data-palier="${id}"]`);
      const sujets = section ? section.querySelectorAll("li").length : 0;
      const fiches = section ? [...section.querySelectorAll("li a[href]")].map((a) => a.textContent.trim()) : [];
      const p = reglages.paliers[id];
      const compte = fiches.length
        ? (fiches.length === 1 ? "1 fiche" : fiches.length + " fiches") + (sujets > fiches.length ? ` sur ${sujets} sujets` : "")
        : (sujets === 1 ? "1 sujet" : sujets + " sujets") + ", aucune fiche";
      const corps = fiches.length
        ? el("div", { class: "corps" }, p.type === "livre" ? petitLivre(p) : null,
            el("p", { class: "compte" }, fiches.map((f) => el("span", { texte: f })), compte))
        : el("p", { class: "compte", texte: compte });
      return el("a", { class: "partie" + (fiches.length ? " ecrite" : " vide"), href: "#" + id, "data-vers": id },
        el("h2", { texte: p.nom }), corps);
    });
    cases.push(el("a", { class: "partie carte", href: "#" + cfg.carte, "data-vers": cfg.carte },
      el("h2", { texte: "La carte" }), el("span", { class: "boule" }), el("p", { texte: "de la Terre à la maison, en zoomant" })));
    couche.append(el("div", { class: "sommaire-ecran" },
      el("h1", { texte: "Monde" }),
      el("nav", { class: "parties", "aria-label": "Les parties de Monde" }, cases)));
  }

  detruire() {}
}

// Le vieux livre du palier de l'histoire, en petit : même dessin, même tirage, la frise dorée sans le titre.
function petitLivre(p) {
  const d = dessinerLivre({ u: p.usure, graine: p.tirage });
  const t = document.createElement("template");
  t.innerHTML = d.couverture;
  const cadre = el("div", { class: "cadre" }, el("img", { class: "motif", src: DESSINS + "couverture.svg", alt: "", width: 210, height: 49 }));
  cadre.style.webkitMaskImage = cadre.style.maskImage = masqueTexte(p.tirage, p.usure);
  return el("span", { class: "petit-livre", "aria-hidden": "true" }, el("span", { class: "tout" }, t.content.firstElementChild, cadre));
}
