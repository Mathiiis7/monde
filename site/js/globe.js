// Le globe des paliers « La planète » à « Le département » : la Terre vue de loin (projection orthographique),
// dessinée en SVG et recalculée à chaque mouvement. Seul le globe garde à la fois les vraies surfaces et les vraies formes.
// Repris des planches de la maquette (L-globe, M-globe et leurs dérivées Europe, France, région, département).
import { el, svg, boutonFermer, borne, calme } from "./outils.js";

const D = Math.PI / 180;

function repere(lon, lat) {
  const l = lon * D, p = lat * D;
  return {
    c: [Math.cos(p) * Math.cos(l), Math.cos(p) * Math.sin(l), Math.sin(p)],
    e: [-Math.sin(l), Math.cos(l), 0],
    n: [-Math.sin(p) * Math.cos(l), -Math.sin(p) * Math.sin(l), Math.cos(p)]
  };
}

// Un contour : [lon, lat, puis les écarts] en 1/u de degré, à partir de la case `debut`. On ajoute des points tous les
// `pas` degrés pour que les longs côtés suivent la courbure du globe. Renvoie les points sur la sphère, en 3D.
function contour(r, debut, u, pas) {
  let x = r[debut], y = r[debut + 1];
  const ll = [[x / u, y / u]];
  for (let i = debut + 2; i < r.length; i += 2) { x += r[i]; y += r[i + 1]; ll.push([x / u, y / u]); }
  const pts = [];
  for (let i = 0; i < ll.length; i++) {
    const a = ll[i], b = ll[(i + 1) % ll.length];
    pts.push(a);
    if (Math.abs(a[1]) > 89.9 && Math.abs(b[1]) > 89.9) continue;
    const n = Math.ceil(Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1])) / pas);
    for (let k = 1; k < n; k++) pts.push([a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n]);
  }
  const v = new Float64Array(pts.length * 3);
  for (let i = 0; i < pts.length; i++) {
    const l = pts[i][0] * D, p = pts[i][1] * D, c = Math.cos(p);
    v[3 * i] = c * Math.cos(l); v[3 * i + 1] = c * Math.sin(l); v[3 * i + 2] = Math.sin(p);
  }
  return v;
}

// Le tracé SVG d'un contour vu depuis (lon, lat). Un point caché derrière est ramené sur le bord du globe.
function trace(v, rp, g) {
  const { c, e, n } = rp, m = v.length / 3;
  let s = "", vus = 0, px = 0, py = 1;
  for (let k = 0; k < m; k++) {
    const X = v[3 * k], Y = v[3 * k + 1], Z = v[3 * k + 2];
    let x = X * e[0] + Y * e[1];
    let y = X * n[0] + Y * n[1] + Z * n[2];
    const z = X * c[0] + Y * c[1] + Z * c[2];
    if (z < 0) {
      const h = Math.hypot(x, y);
      if (h > 1e-9) { x /= h; y /= h; } else { x = px; y = py; }
    } else vus++;
    px = x; py = y;
    s += (k ? "L" : "M") + Math.round((g.cx + g.r * x) * 10) / 10 + " " + Math.round((g.cy - g.r * y) * 10) / 10;
  }
  return vus ? s + "Z" : "";
}

// Un contour en degrés [[lon, lat]…], et le test « ce point est-il dedans ? » (on compte les côtés traversés).
function enDegres(r, u) {
  let x = r[0], y = r[1];
  const ll = [[x / u, y / u]];
  for (let i = 2; i < r.length; i += 2) { x += r[i]; y += r[i + 1]; ll.push([x / u, y / u]); }
  return ll;
}
function dedans(lon, lat, ll) {
  let vrai = false;
  for (let i = 0, j = ll.length - 1; i < ll.length; j = i++) {
    const [xi, yi] = ll[i], [xj, yj] = ll[j];
    if ((yi > lat) !== (yj > lat) && lon < (xj - xi) * (lat - yi) / (yj - yi) + xi) vrai = !vrai;
  }
  return vrai;
}

function projeter(lon, lat, rp) {
  const p = lat * D, q = lon * D, { c, e, n } = rp;
  const X = Math.cos(p) * Math.cos(q), Y = Math.cos(p) * Math.sin(q), Z = Math.sin(p);
  return { x: X * e[0] + Y * e[1], y: X * n[0] + Y * n[1] + Z * n[2], z: X * c[0] + Y * c[1] + Z * c[2] };
}

const a = (item, f) => item.f.indexOf(f) >= 0;

export class Globe {
  constructor(couche, cfg, donnees, appli) {
    this.couche = couche; this.cfg = cfg; this.g = cfg.globe; this.appli = appli;
    this.planete = cfg.type === "terres";
    const dep = appli.depart || {};
    this.etat = {
      lon: dep.lon ?? this.g.lon, lat: dep.lat ?? this.g.lat,
      auto: !!this.g.tourne && !calme(), calque: null, choix: null,
      institutions: !!cfg.paris, outremer: false
    };
    // le point de vue : centre et rayon du globe à l'écran (ceux du palier, sauf pendant le vol qui y mène)
    this.vue = { cx: this.g.cx, cy: this.g.cy, r: this.g.r };
    this.id = "g" + Math.random().toString(36).slice(2, 8);
    this.preparer(donnees);
    this.construire();
    if (appli.depuis && !calme()) this.voler(appli.depuis);
    else {
      this.rendre();                                 // le premier dessin tout de suite, sans attendre l'image suivante
      if (this.etat.auto) this.lancer();
    }
  }

  // Le point de vue actuel, pour que le palier suivant parte d'exactement la même image.
  etatVue() {
    return { lon: this.etat.lon, lat: this.etat.lat, ...this.vue };
  }

  // Le vrai zoom d'un palier à l'autre : on part de l'image du palier quitté (même globe, même projection) et on glisse
  // jusqu'à celle de ce palier. En descendant, on se déplace d'abord, puis on grossit ; en remontant, l'inverse.
  // Le rayon change sur une échelle logarithmique, pour que chaque doublement prenne le même temps.
  voler(d) {
    const g = this.g, but = { lon: this.etat.lon, lat: this.etat.lat };
    const dlon = ((but.lon - d.lon) % 360 + 540) % 360 - 180;
    const lr0 = Math.log(d.r), lr1 = Math.log(g.r), descend = lr1 > lr0;
    const duree = Math.min(1600, 500 + 300 * Math.abs(lr1 - lr0) / Math.LN2);
    const lisse = (k) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
    const pose = (k) => {
      const fp = lisse(borne(descend ? k / 0.7 : (k - 0.3) / 0.7, 0, 1));
      const fr = lisse(borne(descend ? (k - 0.3) / 0.7 : k / 0.7, 0, 1));
      this.etat.lon = d.lon + dlon * fp;
      this.etat.lat = d.lat + (but.lat - d.lat) * fp;
      this.vue = { cx: d.cx + (g.cx - d.cx) * fp, cy: d.cy + (g.cy - d.cy) * fp, r: Math.exp(lr0 + (lr1 - lr0) * fr) };
      this.majDisque();
      this.rendre();
    };
    // la fin arrive aussi par la minuterie, si l'onglet est caché et que les images ne viennent plus
    const finir = () => {
      if (!this.enVol) return;
      this.enVol = false;
      delete this.couche.dataset.vol;
      cancelAnimationFrame(this.vol);
      clearTimeout(this.secours);
      pose(1);
      this.etat.lon = but.lon;
      this.vue = { cx: g.cx, cy: g.cy, r: g.r };
      this.majDisque();
      this.rendre();
      if (this.etat.auto) this.lancer();
    };
    const t0 = performance.now();
    const pas = () => {
      const k = (performance.now() - t0) / duree;
      if (k >= 1) { finir(); return; }
      pose(k);
      this.vol = requestAnimationFrame(pas);
    };
    this.enVol = true;
    this.couche.dataset.vol = "1";                  // le palier est en train d'arriver (les clics attendent)
    pose(0);
    this.vol = requestAnimationFrame(pas);
    this.secours = setTimeout(finir, duree + 400);
  }

  // Le disque du globe (halo, mer, lumière, bord) suit le point de vue.
  majDisque() {
    const { cx, cy, r } = this.vue, halo = r + 24;
    for (const c of this.disque) {
      c.setAttribute("cx", cx); c.setAttribute("cy", cy);
      c.setAttribute("r", c.dataset.marge ? r + Number(c.dataset.marge) : r);
    }
    const h = this.carte.querySelector(`#${this.id}-halo`);
    h.setAttribute("cx", cx); h.setAttribute("cy", cy); h.setAttribute("r", halo);
    h.children[0].setAttribute("offset", (r / halo).toFixed(3));
    h.children[1].setAttribute("offset", ((r + 8) / halo).toFixed(3));
  }

  preparer(donnees) {
    if (this.planete) {
      this.anneaux = donnees.map((r) => ({ glace: r[0] === 1, v: contour(r, 1, 20, 1.5) }));
      this.lieux = this.cfg.lieux.map((l) => ({ ...l }));
      return;
    }
    const u = donnees.u || 20;
    this.items = donnees.pays.map((p, i) => ({ i, code: p[0], nom: p[1], f: p[2], anneaux: p[4].map((r) => contour(r, 0, u, 1)) }));
    // Les étiquettes posées sur le globe : les lieux du palier, Paris, les outre-mer, le nom des régions ou des départements.
    const lieux = (this.cfg.lieux || []).map((l) => ({ ...l, sorte: "sujet" }));
    // Paris porte le mot « Capitale », comme les exemples portent « Région » et « Département » (demande du 24/11/2026)
    if (this.cfg.paris) lieux.push({ nom: this.cfg.paris.etiquette || "Paris", lon: this.cfg.paris.lon, lat: this.cfg.paris.lat, sorte: "paris", gauche: this.cfg.paris.gauche });
    if (this.cfg.outremer) for (const [nom, lon, lat] of this.appli.territoires) lieux.push({ nom, lon, lat, sorte: "territoire", gauche: nom === "Saint-Martin" });
    if (donnees.decoupage) this.preparerDecoupage(donnees.decoupage, lieux);
    this.lieux = lieux;
  }

  // ---- Les régions et les départements, tous ensemble sur la France (choix du 24/11/2026) ----
  // Une région et un département pris en exemple, comme la ville type, portent les fiches de leur échelle.
  preparerDecoupage(d, lieux) {
    const cfg = this.cfg.decoupage;
    // un exemple sans fiche montrée (cfg.*.masque, voir filtrer() dans accueil.js) n'est ni coloré ni étiqueté
    const avecRegion = !cfg.region.masque, avecDep = !cfg.departement.masque;
    const nouveau = (z, u, groupe) => {
      const it = { i: this.items.length, code: z[0], nom: z[1], f: z[2], groupe, anneaux: z[4].map((r) => contour(r, 0, u, 1)) };
      this.items.push(it);
      return it;
    };
    // les régions : leurs limites en trait épais, et leurs contours en degrés pour savoir où tombe chaque département
    const regions = d.regions.zones.map((z) => {
      const it = nouveau(z, d.regions.u || 20, "region");
      it.exemple = avecRegion && it.nom === cfg.region.nom;
      return { it, ll: z[4].map((r) => enDegres(r, d.regions.u || 20)) };
    });
    const etiq = new Map(d.departements.etiq.map((e) => [e[0], e]));
    for (const z of d.departements.zones) {
      const it = nouveau(z, d.departements.u || 20, "departement");
      const e = etiq.get(it.nom.replace(/ \(.*\)$/, ""));         // « Loiret (45) » a pour étiquette « Loiret »
      const reg = e && regions.find((rg) => rg.ll.some((an) => dedans(e[1], e[2], an)));
      it.region = reg ? reg.it.nom : null;
      it.exemple = avecDep && it.nom === cfg.departement.nom;
      it.dansExemple = avecRegion && it.region === cfg.region.nom;
      if (it.exemple) lieux.push({ nom: cfg.departement.etiquette, lon: e[1], lat: e[2], sorte: "exemple", cle: "departement" });
    }
    // pas de noms de régions sur la carte : seulement le mot « Région » sur l'exemple, placé dans la région, hors du département
    const r = d.regions.etiq.find((e) => e[0] === cfg.region.nom);
    const [lon, lat] = cfg.region.position || [r[1], r[2]];
    if (avecRegion) lieux.push({ nom: cfg.region.etiquette, lon, lat, sorte: "exemple", cle: "region" });
  }

  // ---- La scène : le dessin, les étiquettes, les commandes ----
  construire() {
    const { cx, cy, r } = this.g, id = this.id, C = this.couche;
    const halo = r + 24;
    this.carte = svg("svg", { class: "carte glisse", viewBox: "0 0 1280 800", role: "img", "aria-label": this.cfg.aria });
    const defs = svg("defs");
    defs.innerHTML =
      `<radialGradient id="${id}-halo" cx="${cx}" cy="${cy}" r="${halo}" gradientUnits="userSpaceOnUse"><stop offset="${(r / halo).toFixed(3)}" stop-color="#7fb6d9" stop-opacity=".55"></stop><stop offset="${((r + 8) / halo).toFixed(3)}" stop-color="#7fb6d9" stop-opacity=".16"></stop><stop offset="1" stop-color="#7fb6d9" stop-opacity="0"></stop></radialGradient>` +
      `<radialGradient id="${id}-mer" cx="40%" cy="35%" r="70%"><stop offset="0%" stop-color="#356582"></stop><stop offset="60%" stop-color="#26495f"></stop><stop offset="100%" stop-color="#162f40"></stop></radialGradient>` +
      `<radialGradient id="${id}-lumiere" cx="35%" cy="29%" r="80%"><stop offset="0%" stop-color="#fff" stop-opacity=".19"></stop><stop offset="30%" stop-color="#fff" stop-opacity=".045"></stop><stop offset="60%" stop-color="#000" stop-opacity="0"></stop><stop offset="86%" stop-color="#000" stop-opacity=".2"></stop><stop offset="100%" stop-color="#000" stop-opacity=".5"></stop></radialGradient>`;
    this.carte.append(defs);
    // le disque : halo, mer, lumière, bord (majDisque les déplace pendant le vol d'un palier à l'autre)
    this.disque = [
      svg("circle", { cx, cy, r: halo, fill: `url(#${id}-halo)`, "data-marge": 24 }),
      svg("circle", { cx, cy, r, fill: `url(#${id}-mer)` }),
      svg("circle", { cx, cy, r, fill: `url(#${id}-lumiere)`, "pointer-events": "none" }),
      svg("circle", { cx, cy, r: r + .4, fill: "none", stroke: "#a9d3ee", "stroke-opacity": .45, "stroke-width": 1.2, "pointer-events": "none", "data-marge": .4 })
    ];
    this.carte.append(this.disque[0], this.disque[1]);

    if (this.planete) {
      this.pTerre = svg("path", { fill: "#a9b08c", stroke: "#a9b08c", "stroke-width": .5, "stroke-linejoin": "round" });
      this.pGlace = svg("path", { fill: "#e3e7ea", stroke: "#e3e7ea", "stroke-width": .5, "stroke-linejoin": "round" });
      this.carte.append(this.pTerre, this.pGlace);
    } else {
      // Le socle : sous les pays voisins, un trait épais de leur couleur bouche les fentes entre leurs côtes (Natural Earth)
      // et celles des régions ou des départements (Etalab), qui ne tombent pas exactement au même endroit.
      // Avec les départements, la France de Natural Earth n'est pas dessinée : ses départements la remplacent.
      // Les territoires disputés ne sont pas marqués tant que la fiche « Territoires et frontières » n'est pas écrite
      // (choix du 24/11/2026) : la seule liste disponible, celle de Natural Earth, est incomplète.
      const gSocle = svg("g"), gPays = svg("g"), gDep = svg("g"), gReg = svg("g");
      const decoupe = !!this.cfg.decoupage;
      for (const it of this.items) {
        it.classe = "";
        if (it.groupe === "departement") { it.el = gDep.appendChild(svg("path", { "data-i": it.i })); continue; }
        if (it.groupe === "region") { it.el = gReg.appendChild(svg("path")); continue; }
        if (decoupe && it.code === "FRA") { this.france = it; continue; }
        if (decoupe) it.socle = gSocle.appendChild(svg("path", { class: "pays socle" }));
        it.el = gPays.appendChild(svg("path", { "data-i": it.i }));
      }
      this.carte.append(gSocle, gPays, gDep, gReg);
    }
    this.carte.append(this.disque[2], this.disque[3]);
    this.pChoisi = this.carte.appendChild(svg("path", { class: "trait-choisi" }));
    C.append(this.carte);
    this.gestes();

    // les étiquettes posées sur le globe
    for (const l of this.lieux) {
      if (l.sorte === "exemple") {
        // la région et le département pris en exemple : un mot dans la couleur de la zone, sans point
        l.el = el("button", { class: "marque marque-" + l.cle, texte: l.nom, onclick: () => this.ouvrirExemple(l.cle, { x: l.x, y: l.y }) });
      } else {
        const action = l.sorte === "paris" ? () => this.basculer("institutions")
          : l.sorte === "territoire" ? () => this.allerVers(l.lon, l.lat)
          : () => this.appli.ouvrirSujet(l.sujet);
        l.el = el("button", { class: "pin", onclick: action }, el("span", { class: "pt" }), el("span", { class: "lb", texte: l.nom }));
      }
      C.append(l.el);
    }
    // la planète : les sujets en orbite, le titre
    if (this.planete) {
      for (const o of this.cfg.orbite) {
        const b = el("button", { class: "orb" + (o.droite != null ? " droite" : ""), style: `left:${o.droite ?? o.gauche}px;top:${o.y}px`, onclick: () => this.appli.ouvrirSujet(o.sujet) },
          el("span", { class: "pt" }), el("span", { class: "lb", texte: o.nom || o.sujet }));
        C.append(b);
      }
      C.append(el("div", { class: "titre-scene" }, el("h1", { texte: this.cfg.titre }), this.cfg.sousTitre ? el("p", { texte: this.cfg.sousTitre }) : null));
    } else {
      C.append(el("h1", { class: "cache-ecran", texte: "Monde : " + this.cfg.nom.toLowerCase() }));
      this.boites();
    }
    this.bulle = el("div", { class: "bulle", hidden: true });
    C.append(this.bulle);
    this.commandes();
  }

  boites() {
    const cfg = this.cfg, C = this.couche, id = this.id;
    const calques = el("div", { class: "calques", role: "group", "aria-label": "Montrer sur le globe" });
    this.boutonsCalques = (cfg.calques || []).map((c) => {
      const b = el("button", { "aria-pressed": "false", texte: c.nom, onclick: () => { this.etat.calque = this.etat.calque === c.repere ? null : c.repere; this.majCommandes(); this.rendre(); } });
      b.repere = c.repere;
      calques.append(b);
      return b;
    });
    if (cfg.paris) {
      this.bInst = calques.appendChild(el("button", { "aria-pressed": "true", texte: "Les institutions", onclick: () => this.basculer("institutions") }));
    }
    if (cfg.outremer) {
      this.bOm = calques.appendChild(el("button", { "aria-expanded": "false", texte: "Les outre-mer", onclick: () => this.basculer("outremer") }));
    }
    calques.append(el("span", { class: "ensuite", texte: cfg.ensuite }));
    const echantillon = (fill, stroke, tiret) => {
      const s = svg("svg", { "aria-hidden": "true", width: 28, height: 14 });
      s.append(svg("rect", { x: 1, y: 1, width: 26, height: 12, fill, stroke, "stroke-dasharray": tiret }));
      return s;
    };
    const trait = () => {
      const s = svg("svg", { "aria-hidden": "true", width: 28, height: 14 });
      s.append(svg("line", { x1: 1, y1: 7, x2: 27, y2: 7, stroke: "#3d4230", "stroke-width": 2.6 }));
      return s;
    };
    const lignes = cfg.decoupage
      ? [el("span", {}, echantillon("#c9cdab", "#596046"), "un département : survole pour son nom"),
        el("span", {}, trait(), "la limite d'une région"),
        cfg.decoupage.region.masque ? null : el("span", {}, echantillon("#b9c8cf", "#3d4230"), "une région prise en exemple"),
        cfg.decoupage.departement.masque ? null : el("span", {}, echantillon("#e2d39f", "#596046"), "un département pris en exemple")]
      : [el("span", {}, echantillon("#a9b08c", "#6c7355"), cfg.zone + " : survole pour son nom, clique pour l'ouvrir")];
    // la légende va avec les boutons en haut, ou (France) dans la boîte du bas à droite, pour laisser la carte visible
    const legende = el("div", { class: "legende" }, lignes);
    C.append(el("div", { class: "bas" + (cfg.cadre === "haut" ? " haut" : "") }, calques, cfg.legendeEnBas ? null : legende));
    // L'encadré « Ce que cette vue respecte » est retiré (choix du 24/11/2026) : l'explication est sur « Comment Monde
    // est fait ». Reste, sur la France, la source des contours, que leur licence (ODbL) demande près de la carte.
    if (cfg.legendeEnBas || cfg.source) {
      C.append(el("div", { class: "vue" + (cfg.cadre === "haut" ? " boite" : "") }, cfg.legendeEnBas ? legende : null,
        cfg.source ? el("p", { class: "source", texte: cfg.source }) : null));
    }
    if (cfg.paris) {
      this.inst = el("div", { class: "fiche", hidden: true }, el("b", { class: "t", texte: cfg.paris.titre, style: "font-size:19px;padding-right:0;margin-bottom:4px" }),
        cfg.paris.liens.map((l) => el("button", { class: "lien", texte: l.texte, onclick: () => this.appli.ouvrirSujet(l.sujet) })));
      C.append(this.inst);
    }
    if (cfg.outremer) {
      this.om = el("div", { class: "om", role: "group", "aria-label": "Aller dans les outre-mer", hidden: true },
        el("b", { class: "t", texte: "Les outre-mer" }),
        el("span", { class: "petit", style: "font-size:13px;color:var(--encre-2)", texte: "Le globe tourne jusqu'à chacun, à sa vraie taille et à sa vraie distance." }),
        el("div", { class: "om-grille" }, this.appli.territoires.map(([nom, lon, lat]) => el("button", { texte: nom, onclick: () => this.allerVers(lon, lat) }))),
        el("button", { texte: "Revenir à la métropole", style: "font-weight:600", onclick: () => this.allerVers(this.g.lon, this.g.lat) }));
      C.append(this.om);
    }
  }

  // Plus de boutons fléchés à l'écran (demande du 24/11/2026) : on fait tourner le globe en le glissant, ou avec les
  // flèches du clavier ; la planète se remet à tourner seule 3 secondes après le dernier geste (voir reprendre()).
  commandes() {
    const [pl, pn] = this.g.pas;
    const sens = { ArrowLeft: [-pl, 0], ArrowRight: [pl, 0], ArrowUp: [0, pn], ArrowDown: [0, -pn] };
    this.touches = (ev) => {
      const d = sens[ev.key];
      if (!d || this.detruit || ev.altKey || ev.ctrlKey || ev.metaKey) return;
      if (ev.target && ev.target.closest && ev.target.closest(".pan, .panneau, .menu-aide, input, textarea")) return;
      ev.preventDefault();
      this.aller(d[0], d[1]);
    };
    addEventListener("keydown", this.touches);
    this.majCommandes();
  }

  majCommandes() {
    const e = this.etat;
    for (const b of this.boutonsCalques || []) { const on = e.calque === b.repere; b.className = on ? "on" : ""; b.setAttribute("aria-pressed", on); }
    if (this.bInst) { this.bInst.className = e.institutions ? "on" : ""; this.bInst.setAttribute("aria-pressed", e.institutions); }
    if (this.bOm) { this.bOm.className = e.outremer ? "on" : ""; this.bOm.setAttribute("aria-expanded", e.outremer); this.om.hidden = !e.outremer; }
  }

  basculer(cle) {
    this.etat[cle] = !this.etat[cle];
    this.majCommandes();
    this.rendre();
  }

  // ---- Le dessin : aussitôt après un clic ; pendant qu'on glisse, une fois par image au plus ----
  dessiner() {
    if (this.prevu) return;
    this.prevu = requestAnimationFrame(() => { this.prevu = 0; this.rendre(); });
  }

  rendre() {
    const e = this.etat, rp = repere(e.lon, e.lat), g = this.vue;
    const cle = [e.lon.toFixed(2), e.lat.toFixed(2), g.r.toFixed(1), g.cx.toFixed(1), g.cy.toFixed(1)].join(), neuf = cle !== this.cle;
    this.cle = cle;
    if (this.planete) {
      if (neuf) {
        const terre = [], glace = [];
        for (const an of this.anneaux) { const t = trace(an.v, rp, g); if (t) (an.glace ? glace : terre).push(t); }
        this.pTerre.setAttribute("d", terre.join(""));
        this.pGlace.setAttribute("d", glace.join(""));
      }
    } else {
      for (const it of this.items) {
        if (!it.el) continue;                                         // la France, remplacée par ses départements
        if (neuf || it.d == null) {
          it.d = it.anneaux.map((v) => trace(v, rp, g)).join("");
          it.el.setAttribute("d", it.d);
          if (it.socle) it.socle.setAttribute("d", it.d);
        }
        const choisi = e.choix === it.i ? " choisi" : "";
        const classe = it.groupe === "departement" ? "zone" + (it.exemple ? " exemple" : it.dansExemple ? " dans-exemple" : "") + choisi
          : it.groupe === "region" ? "region" + (it.exemple ? " exemple" : "")
          : "pays" + (a(it, "i") ? " glace" : "") + (e.calque && a(it, e.calque) ? " membre" : "") + choisi;
        if (classe !== it.classe) { it.el.setAttribute("class", classe); it.classe = classe; }
      }
      this.pChoisi.setAttribute("d", e.choix != null ? this.items[e.choix].d || "" : "");
    }
    this.poser(rp);
  }

  poser(rp) {
    const g = this.vue, vus = this.lieux.map((l) => ({ l, ...projeter(l.lon, l.lat, rp) }));
    // un même nom posé à plusieurs endroits ne s'affiche qu'une fois : là où il est le plus face à nous
    const meilleur = {};
    for (const v of vus) if (!(v.l.nom in meilleur) || v.z > meilleur[v.l.nom].z) meilleur[v.l.nom] = v;
    for (const v of vus) {
      const { l, x, y, z } = v;
      const op = meilleur[l.nom] === v ? borne((z - 0.12) / 0.15, 0, 1) : 0;
      const px = Math.round(g.cx + g.r * x), py = Math.round(g.cy - g.r * y);
      l.x = px; l.y = py; l.vu = op > 0;
      const s = l.el.style;
      s.left = px + "px"; s.top = py + "px"; s.opacity = op.toFixed(2); s.visibility = op > 0 ? "visible" : "hidden";
      if (l.sorte !== "exemple") {
        const gauche = l.gauche ?? (this.planete ? x > 0.3 : this.cfg.coteAuto != null && x > this.cfg.coteAuto);
        const classe = "pin" + (gauche ? " gauche" : "");
        if (l.el.className !== classe) l.el.className = classe;
      }
    }
    if (this.inst) {
      const paris = this.lieux.find((l) => l.sorte === "paris");
      this.inst.hidden = !(this.etat.institutions && paris.vu);
      const [dx, dy] = this.cfg.paris.decalage || [18, 26];
      this.inst.style.left = paris.x + dx + "px";
      this.inst.style.top = paris.y + dy + "px";
    }
  }

  // ---- Les mouvements ----
  aller(dlon, dlat, ms = 420) {
    if (this.enVol) return;
    this.arreter();
    this.fermerCarte();
    const lon0 = this.etat.lon, lat0 = this.etat.lat, lat1 = borne(lat0 + dlat, -70, 70);
    cancelAnimationFrame(this.anim);
    if (calme()) { this.etat.lon = lon0 + dlon; this.etat.lat = lat1; this.rendre(); return; }
    const t0 = performance.now();
    const pas = () => {
      const k = Math.min(1, (performance.now() - t0) / ms), f = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      this.etat.lon = lon0 + dlon * f; this.etat.lat = lat0 + (lat1 - lat0) * f;
      this.rendre();
      if (k < 1) this.anim = requestAnimationFrame(pas);
    };
    this.anim = requestAnimationFrame(pas);
  }

  // jusqu'à un point précis, par le plus court chemin
  allerVers(lon, lat) {
    const dlon = ((lon - this.etat.lon) % 360 + 540) % 360 - 180;
    this.aller(dlon, lat - this.etat.lat, 900);
  }

  lancer() {
    this.etat.auto = true;
    this.majCommandes();
    let t0 = 0;
    const pas = (t) => {
      if (!this.etat.auto) return;
      const dt = t0 ? Math.min(0.1, (t - t0) / 1000) : 0;
      t0 = t;
      this.etat.lon -= 5 * dt;
      this.rendre();
      this.tourne = requestAnimationFrame(pas);
    };
    cancelAnimationFrame(this.tourne);
    this.tourne = requestAnimationFrame(pas);
  }

  arreter() {
    cancelAnimationFrame(this.tourne);
    if (this.etat.auto) { this.etat.auto = false; this.majCommandes(); }
    this.reprendre();
  }

  // La planète se remet à tourner seule 3 secondes après le dernier geste (demande du 24/11/2026), sauf si l'ordinateur
  // demande moins d'animations ; tant qu'on la tient (glisser), on attend encore.
  reprendre() {
    clearTimeout(this.reprise);
    if (!this.planete || !this.g.tourne || calme() || this.detruit) return;
    this.reprise = setTimeout(() => {
      if (this.detruit || this.etat.auto) return;
      if (this.glisse || this.enVol) { this.reprendre(); return; }
      this.lancer();
    }, 3000);
  }

  // ---- Glisser, survoler, cliquer ----
  gestes() {
    const S = this.carte;
    const indice = (ev) => { const v = ev.target && ev.target.getAttribute ? ev.target.getAttribute("data-i") : null; return v == null ? null : Number(v); };
    S.addEventListener("pointerdown", (ev) => {
      const p = this.appli.point(ev);
      const g = this.vue;
      if (this.enVol || Math.hypot(p.x - g.cx, p.y - g.cy) > g.r + 24) return;
      this.arreter();
      cancelAnimationFrame(this.anim);
      this.glisse = { x: ev.clientX, y: ev.clientY, lon: this.etat.lon, lat: this.etat.lat, k: this.appli.k(), i: this.planete ? null : indice(ev), bouge: false, p };
      try { S.setPointerCapture(ev.pointerId); } catch (err) { /* pointeur simulé par un essai : rien à capturer */ }
    });
    S.addEventListener("pointermove", (ev) => {
      const gl = this.glisse;
      if (!gl) {
        if (this.planete) return;
        const i = indice(ev);
        if (i == null) { this.bulle.hidden = true; return; }
        const p = this.appli.point(ev);
        this.bulle.textContent = this.items[i].nom;
        this.bulle.style.left = Math.round(Math.min(1140, p.x + 14)) + "px";
        this.bulle.style.top = Math.round(p.y - 44) + "px";
        this.bulle.hidden = false;
        return;
      }
      const dx = (ev.clientX - gl.x) * gl.k, dy = (ev.clientY - gl.y) * gl.k;
      if (!gl.bouge && Math.hypot(dx, dy) < 4) return;
      if (!gl.bouge) { gl.bouge = true; this.fermerCarte(); this.bulle.hidden = true; }
      const deg = 180 / Math.PI / this.vue.r;
      this.etat.lon = gl.lon - dx * deg;
      this.etat.lat = borne(gl.lat + dy * deg, -70, 70);
      this.dessiner();
    });
    S.addEventListener("pointerup", () => {
      const gl = this.glisse;
      this.glisse = null;
      if (!gl || gl.bouge || this.planete) return;
      if (gl.i == null) this.fermerCarte();
      else this.ouvrirCarte(gl.i, gl.p);
    });
    S.addEventListener("pointercancel", () => { this.glisse = null; });
    S.addEventListener("pointerleave", () => { if (!this.glisse) this.bulle.hidden = true; });
  }

  // ---- La carte d'un pays, ou de la région et du département pris en exemple ----
  ouvrirCarte(i, p) {
    let it = this.items[i];
    if (it.groupe === "departement") {
      // le département exemple et sa région ouvrent leur carte ; les autres départements, celle de la France
      if (it.exemple) return this.ouvrirExemple("departement", p);
      if (it.dansExemple) return this.ouvrirExemple("region", p);
      it = this.france;
    }
    this.fermerCarte(false);
    const cfg = this.cfg, carte = cfg.carte || {};
    const lignes = [];
    const lien = (texte, f) => el("button", { class: "lien", texte, onclick: f });
    const puissance = a(it, "g") && this.appli.visible("Les grandes puissances"), france = it.code === "FRA" && carte.france;
    if (carte.ue && a(it, "u")) lignes.push(el("span", { texte: "Membre de l'Union européenne." }));
    if (carte.euro && a(it, "e")) lignes.push(el("span", { texte: "Dans la zone euro." }));
    if (a(it, "o")) lignes.push(el("span", { texte: "Membre de l'OTAN." }));
    if (france) lignes.push(lien(france.texte, () => (france.liste ? this.appli.ouvrirListe() : this.appli.aller(france.aller))));
    if (puissance) lignes.push(lien("Comment ce pays est gouverné", () => this.appli.ouvrirSujet("Les grandes puissances")));
    // « pays » n'est pas écrit : certaines zones de Natural Earth sont des territoires dont le statut est disputé
    if (!puissance && !france) lignes.push(el("span", { class: "petit", texte: "Pas encore de fiche à son nom." }));
    this.montrerCarte(it.nom, lignes, p, it.el ? it.i : null);
  }

  ouvrirExemple(cle, p) {
    this.fermerCarte(false);
    const c = this.cfg.decoupage[cle], it = this.items.find((x) => x.groupe === cle && x.exemple);
    const lignes = [el("span", { class: "petit", texte: c.petit })];
    for (const l of c.liens) {
      lignes.push(el("button", { class: "lien", texte: l.sujet || l.texte, onclick: () => (l.sujet ? this.appli.ouvrirSujet(l.sujet) : this.appli.aller(l.aller)) }));
    }
    this.montrerCarte(c.etiquette || c.nom, lignes, p, it.i);
  }

  montrerCarte(titre, lignes, p, choix) {
    this.fiche = el("div", { class: "fiche", style: `left:${Math.round(borne(p.x + 16, 200, 966))}px;top:${Math.round(borne(p.y - 30, 84, 470))}px` },
      el("b", { class: "t", texte: titre }), boutonFermer("Fermer", () => this.fermerCarte()), lignes);
    this.couche.append(this.fiche);
    this.etat.choix = choix;
    this.rendre();
  }

  fermerCarte(redessiner = true) {
    if (this.fiche) { this.fiche.remove(); this.fiche = null; }
    if (this.etat.choix != null) { this.etat.choix = null; if (redessiner) this.rendre(); }
  }

  // Échap : fermer ce qui est ouvert dans le palier. Renvoie vrai si quelque chose a été fermé.
  echap() {
    if (this.fiche) { this.fermerCarte(); return true; }
    if (this.etat.outremer) { this.basculer("outremer"); return true; }
    return false;
  }

  detruire() {
    this.detruit = true;
    this.etat.auto = false;
    clearTimeout(this.reprise);
    if (this.touches) removeEventListener("keydown", this.touches);
    this.enVol = false;
    cancelAnimationFrame(this.vol);
    clearTimeout(this.secours);
    cancelAnimationFrame(this.tourne);
    cancelAnimationFrame(this.anim);
    cancelAnimationFrame(this.prevu);
  }
}
