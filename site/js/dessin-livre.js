// Le vieux livre, légèrement usé (demandes du 26/11/2026 : « plutôt réaliste… un vieux livre légèrement usé » ; puis « les
// contours sont trop propres, et le blanc dessus c'est un peu bizarre, il y en a trop »). Dessiné en SVG, tiré au hasard
// mais toujours le même pour une graine donnée :
//   - contours jamais droits : le cuir et les pages ondulent un peu, les coins sont émoussés, les nervures du dos
//     dépassent à peine sur le bord gauche ;
//   - l'usure là où un livre s'use : bords frottés par plaques, coins râpés jusqu'au carton, pli du dos fendillé,
//     dorure du cadre effacée par endroits, quelques rayures fines ; le cuir n'a que des nuances plus sombres, pas de
//     taches claires ;
//   - pages jaunies, bords plus foncés, quelques rousseurs.
// u règle l'usure (1 : légère). Les fausses lignes et le texte de la couverture restent en HTML, par-dessus (livre.js).
// Choix retenu : usure 1, tirage 46 (paliers.json). Essais de réglages : outils/maquette/livre/vieux.html (qui utilise
// ce fichier).
let compteur = 0;

// Les longueurs des fausses lignes des deux pages, en % de la largeur ; 0 = saut de paragraphe.
export const LIGNES = {
  gauche: [100, 97, 100, 95, 100, 58, 0, 100, 98, 100, 93, 100, 96, 41, 0, 100, 97, 100, 72],
  droite: [100, 96, 100, 98, 100, 64, 0, 100, 95, 100, 99, 47, 0, 100, 98, 100, 94, 100, 66]
};

export function hasard(graine) {
  let a = graine >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Un bruit lisse et périodique sur une longueur L : une valeur au hasard tous les « pas » pixels, entre -a et a.
function bruit(r, L, pas, a) {
  const k = Math.max(3, Math.round(L / pas)), v = Array.from({ length: k }, () => (r() * 2 - 1) * a);
  return (s) => {
    const x = (s / L) * k, i = Math.floor(x), f = (1 - Math.cos((x - i) * Math.PI)) / 2;
    return v[((i % k) + k) % k] * (1 - f) + v[(((i + 1) % k) + k) % k] * f;
  };
}

// Le tour d'un rectangle aux coins arrondis (rayons haut gauche, haut droit, bas droit, bas gauche), un point tous les
// 2,5 px environ : [x, y, normale x, normale y, dans un coin, abscisse le long du tour].
function tour(x, y, w, h, [ra, rb, rc, rd]) {
  const pts = [];
  const seg = (x0, y0, x1, y1, nx, ny) => {
    const n = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0) / 2));
    for (let i = 0; i < n; i++) pts.push([x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, nx, ny, 0]);
  };
  const arc = (cx, cy, rr, a0, a1) => {
    const n = Math.max(2, Math.round((rr * Math.abs(a1 - a0)) / 2));
    for (let i = 0; i < n; i++) { const a = a0 + ((a1 - a0) * i) / n; pts.push([cx + rr * Math.cos(a), cy + rr * Math.sin(a), Math.cos(a), Math.sin(a), 1]); }
  };
  const P = Math.PI;
  seg(x + ra, y, x + w - rb, y, 0, -1);
  arc(x + w - rb, y + rb, rb, -P / 2, 0);
  seg(x + w, y + rb, x + w, y + h - rc, 1, 0);
  arc(x + w - rc, y + h - rc, rc, 0, P / 2);
  seg(x + w - rc, y + h, x + rd, y + h, 0, 1);
  arc(x + rd, y + h - rd, rd, P / 2, P);
  seg(x, y + h - rd, x, y + ra, -1, 0);
  arc(x + ra, y + ra, ra, P, P * 1.5);
  let s = 0;
  pts.forEach((p, i) => { if (i) s += Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]); p.push(s); });
  return pts;
}

// Le tour déformé : chaque point poussé le long de sa normale de decal(point) pixels.
const deformer = (pts, decal) => pts.map((p) => { const d = decal(p); return [p[0] + p[2] * d, p[1] + p[3] * d]; });
const trace = (xy) => "M" + xy.map(([x, y]) => x.toFixed(1) + " " + y.toFixed(1)).join("L") + "Z";
const ligne = (xy) => "M" + xy.map(([x, y]) => x.toFixed(1) + " " + y.toFixed(1)).join("L");
// un contour un peu irrégulier : une grande ondulation, un fin tremblé, les coins qui s'émoussent, et quelques petites
// entailles (le bord abîmé sur quelques millimètres)
function irregulier(r, pts, grand, fin, coins = 0, entailles = 0, u = 1) {
  const L = pts.at(-1)[5], b1 = bruit(r, L, 40, grand), b2 = bruit(r, L, 5, fin), b3 = bruit(r, L, 11, coins);
  const e = Array.from({ length: entailles }, () => [r() * L, (0.8 + r() * 1.4) * u, 2 + r() * 4]);
  const creux = (s) => e.reduce((t, [c, p, l]) => { const d = Math.min(Math.abs(s - c), L - Math.abs(s - c)); return t + p * Math.exp(-((d / l) ** 2)); }, 0);
  return (p) => b1(p[5]) + b2(p[5]) + (p[4] && coins ? b3(p[5]) - coins : 0) - creux(p[5]);
}

const o = (v) => Math.max(0, Math.min(1, v)).toFixed(2);
const s2 = 'color-interpolation-filters="sRGB"';
// du bruit changé en une couleur (r, g, b) d'opacité k × bruit + c
const filtre = (id, freq, oct, graine, [r, g, b], k, c) =>
  `<filter id="${id}" x="0" y="0" width="1" height="1" ${s2}><feTurbulence type="fractalNoise" baseFrequency="${freq}" numOctaves="${oct}" seed="${graine}"/>` +
  `<feColorMatrix values="0 0 0 0 ${r} 0 0 0 0 ${g} 0 0 0 0 ${b} 0 0 0 ${k} ${c}"/></filter>`;
// un masque par plaques : visible où le bruit dépasse un seuil
const masque = (id, freq, oct, graine, k, c, w, h) =>
  `<filter id="${id}-b" x="0" y="0" width="1" height="1" ${s2}><feTurbulence type="fractalNoise" baseFrequency="${freq}" numOctaves="${oct}" seed="${graine}"/>` +
  `<feColorMatrix values="0 0 0 ${k} ${c} 0 0 0 ${k} ${c} 0 0 0 ${k} ${c} 0 0 0 0 1"/></filter>` +
  `<mask id="${id}" maskUnits="userSpaceOnUse" x="-30" y="-30" width="${w + 60}" height="${h + 60}">` +
  `<rect x="-30" y="-30" width="${w + 60}" height="${h + 60}" filter="url(#${id}-b)"/></mask>`;
const flou = (id, sd, marge = "-20%") => `<filter id="${id}" x="${marge}" y="${marge}" width="140%" height="140%"><feGaussianBlur stdDeviation="${sd}"/></filter>`;

// Le papier vieilli d'une page (forme xy), avec l'ombre de la reliure du côté « pli » (gauche ou droite).
function papier(id, r, graine, u, xy, cadre, pli) {
  const [x, y, w, h] = cadre, d = trace(xy);
  const g0 = pli === "gauche" ? 0 : 1, g1 = 1 - g0;
  return `<defs>
  <clipPath id="${id}-p"><path d="${d}"/></clipPath>
  <linearGradient id="${id}-papier" x1="0" y1="0" x2=".4" y2="1"><stop offset="0" stop-color="#efe2c4"/><stop offset="1" stop-color="#e6d5b2"/></linearGradient>
  <radialGradient id="${id}-jauni" cx=".5" cy=".5" r=".72"><stop offset=".55" stop-color="#9a6a32" stop-opacity="0"/><stop offset="1" stop-color="#9a6a32" stop-opacity="${o(0.2 * u)}"/></radialGradient>
  <linearGradient id="${id}-reliure" x1="${g0}" x2="${g1}"><stop offset="0" stop-color="#3a2614" stop-opacity=".3"/><stop offset="1" stop-color="#3a2614" stop-opacity="0"/></linearGradient>
  ${filtre(`${id}-rousseurs`, 0.045, 3, graine, [0.55, 0.35, 0.16], 10, -7.2)}
  ${filtre(`${id}-points`, 0.5, 2, graine + 1, [0.5, 0.3, 0.14], 12, -9)}
  ${flou(`${id}-flou`, 2.2)}
  </defs>
  <g clip-path="url(#${id}-p)">
    <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#${id}-papier)"/>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" filter="url(#${id}-rousseurs)" opacity="${o(0.22 * u)}"/>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" filter="url(#${id}-points)" opacity="${o(0.3 * u)}"/>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#${id}-jauni)"/>
    <rect x="${pli === "gauche" ? x : x + w - 30}" y="${y}" width="30" height="${h}" fill="url(#${id}-reliure)"/>
    <path d="${d}" fill="none" stroke="#a88456" stroke-width="5" opacity="${o(0.4 * u)}" filter="url(#${id}-flou)"/>
  </g>`;
}

// La couverture vue de face : 300 x 400.
function couverture(id, r, graine, u, forme) {
  const d = trace(forme), NERV = [62, 138, 262, 338];
  // le pli du dos, un peu tremblé
  const bp = bruit(r, 400, 30, 0.5);
  const pli = ligne(Array.from({ length: 81 }, (_, i) => { const y = 2 + i * 4.95; return [29 + bp(y), y]; }));
  // les filets dorés, tracés à la main
  const filet = (x, y, w, h) => { const t = tour(x, y, w, h, [1, 1, 1, 1]); return trace(deformer(t, irregulier(r, t, 0.25, 0.12))); };
  const f1 = filet(47, 20, 235, 360), f2 = filet(41, 14, 247, 372);
  const fleurons = [[55, 28], [274, 28], [274, 372], [55, 372]].map(([x, y]) => `<path d="M${x} ${y - 3.2}L${x + 3.2} ${y}L${x} ${y + 3.2}L${x - 3.2} ${y}Z"/>`).join("");
  // quelques rayures fines, claires (le cuir mis à nu) ou sombres
  let rayures = "";
  for (let i = 0; i < 6; i++) {
    const x = 50 + r() * 220, y = 30 + r() * 340, a = r() * Math.PI, l = 12 + r() * 26, c = (r() - 0.5) * 10;
    const x2 = x + Math.cos(a) * l, y2 = y + Math.sin(a) * l, mx = (x + x2) / 2 - Math.sin(a) * c, my = (y + y2) / 2 + Math.cos(a) * c;
    const clair = i < 4;
    rayures += `<path d="M${x.toFixed(1)} ${y.toFixed(1)}Q${mx.toFixed(1)} ${my.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}" stroke="${clair ? "#c9a77c" : "#1a1009"}" stroke-width="${(0.4 + r() * 0.5).toFixed(2)}" opacity="${o(((clair ? 0.2 : 0.25) + r() * 0.15) * u)}"/>`;
  }
  const nervures = NERV.map((y) => `<rect y="${y - 2}" width="30" height="3" fill="#000" opacity=".3"/><rect y="${y + 1}" width="30" height="1.6" fill="#dcb48a" opacity="${o(0.14 + 0.08 * u)}"/>`).join("");
  return `<svg class="dessin" viewBox="0 0 300 400" overflow="visible" aria-hidden="true"><defs>
  <clipPath id="${id}-f"><path d="${d}"/></clipPath>
  <radialGradient id="${id}-cuir" cx=".38" cy=".28" r=".9"><stop offset="0" stop-color="#71523a"/><stop offset=".55" stop-color="#5c412c"/><stop offset="1" stop-color="#432e1e"/></radialGradient>
  <linearGradient id="${id}-dos" x1="0" x2="1"><stop offset="0" stop-color="#000" stop-opacity=".45"/><stop offset=".45" stop-color="#ffe9c8" stop-opacity=".07"/><stop offset="1" stop-color="#000" stop-opacity=".25"/></linearGradient>
  ${filtre(`${id}-nuances`, 0.016, 3, graine, [0.12, 0.07, 0.035], 1.6, -0.78)}
  ${filtre(`${id}-grain`, 0.85, 2, graine + 1, [0.08, 0.05, 0.03], 1.5, -0.55)}
  ${flou(`${id}-flou`, 1.6)}${flou(`${id}-flou1`, 0.9)}
  <filter id="${id}-ombre" x="-30%" y="-20%" width="160%" height="150%"><feGaussianBlur stdDeviation="15"/></filter>
  ${masque(`${id}-plaques`, 0.045, 2, graine + 2, 3.2, -1.25, 300, 400)}
  ${masque(`${id}-fibres`, 0.35, 3, graine + 3, 3.5, -1.3, 300, 400)}
  ${masque(`${id}-dorure`, 0.09, 2, graine + 4, 4, -(0.55 + 0.4 * u), 300, 400)}
  </defs>
  <path d="${d}" fill="#000" opacity=".55" transform="translate(0 14)" filter="url(#${id}-ombre)"/>
  <g clip-path="url(#${id}-f)">
    <rect width="300" height="400" fill="url(#${id}-cuir)"/>
    <rect width="300" height="400" filter="url(#${id}-nuances)" opacity="${o(0.45 * u)}"/>
    <rect width="300" height="400" filter="url(#${id}-grain)" opacity=".7"/>
    <rect width="30" height="400" fill="url(#${id}-dos)"/>
    ${nervures}
    <path d="${pli}" fill="none" stroke="#1b1109" stroke-width="1.4" opacity=".6"/>
    <path d="${pli}" fill="none" stroke="#c49a6c" stroke-width="1" opacity="${o(0.4 * u)}" transform="translate(1.4 0)" mask="url(#${id}-plaques)"/>
    <path d="${d}" fill="none" stroke="#b68d62" stroke-width="${(6 * u).toFixed(1)}" opacity=".6" filter="url(#${id}-flou)" mask="url(#${id}-plaques)"/>
    <g fill="#8f6d4d" filter="url(#${id}-flou1)" mask="url(#${id}-fibres)" opacity="${o(0.8 * u)}">
      <circle cx="300" cy="0" r="${(11 * u).toFixed(1)}"/><circle cx="300" cy="400" r="${(12 * u).toFixed(1)}"/>
      <circle cx="0" cy="0" r="${(6 * u).toFixed(1)}"/><circle cx="0" cy="400" r="${(6 * u).toFixed(1)}"/></g>
    <g fill="none" stroke-linecap="round">${rayures}</g>
  </g>
  <g fill="none" mask="url(#${id}-dorure)">
    <path d="${f1}" stroke="#1d1209" stroke-width="1.5" opacity=".45" transform="translate(.5 .8)"/>
    <path d="${f1}" stroke="#d6b272" stroke-width="1" opacity=".8"/>
    <path d="${f2}" stroke="#1d1209" stroke-width="1.3" opacity=".35" transform="translate(.5 .8)"/>
    <path d="${f2}" stroke="#d6b272" stroke-width=".9" opacity=".5"/>
    <g fill="#d6b272" opacity=".7" stroke="none">${fleurons}</g>
  </g></svg>`;
}

// Le bloc des pages, sous la couverture : 301 x 401, décalé de (6, 5) ; sa tranche dépasse à droite et en bas
// (l'épaisseur du livre), la page de droite du livre ouvert couvre (0, 0) à (295, 396).
function bloc(id, r, graine, u) {
  const tb = tour(0, 0, 301, 401, [2, 5, 6, 2]), formeBloc = trace(deformer(tb, irregulier(r, tb, 0.7 * u, 0.3 * u, 0, 5, u)));
  const tp = tour(0, 0, 295, 396, [1, 3, 3, 1]), page = deformer(tp, irregulier(r, tp, 0.5 * u, 0.2 * u));
  let tranche = "";
  for (let i = 0; i < 6; i++) {
    const b = bruit(r, 401, 25, 0.35);
    tranche += `<path d="${ligne(Array.from({ length: 41 }, (_, k) => [295.6 + i + b(k * 10), 2 + k * 9.9]))}" stroke="${i % 2 ? "#b49a6f" : "#e6d6b2"}"/>`;
  }
  for (let i = 0; i < 5; i++) {
    const b = bruit(r, 301, 25, 0.3);
    tranche += `<path d="${ligne(Array.from({ length: 31 }, (_, k) => [2 + k * 9.9, 396.6 + i * 0.95 + b(k * 10)]))}" stroke="${i % 2 ? "#b49a6f" : "#e6d6b2"}"/>`;
  }
  return `<svg class="dessin" viewBox="0 0 301 401" overflow="visible" aria-hidden="true"><defs>
  <clipPath id="${id}-b"><path d="${formeBloc}"/></clipPath>
  <filter id="${id}-ombre" x="-30%" y="-20%" width="160%" height="150%"><feGaussianBlur stdDeviation="14"/></filter>
  </defs>
  <path d="${formeBloc}" fill="#000" opacity=".5" transform="translate(0 12)" filter="url(#${id}-ombre)"/>
  <g clip-path="url(#${id}-b)"><rect width="301" height="401" fill="#cdb68c"/><g fill="none" stroke-width=".7">${tranche}</g></g>
  ${papier(id, r, graine + 5, u, page, [0, 0, 295, 396], "gauche")}</svg>`;
}

// L'intérieur de la couverture, vu quand le livre est ouvert (le dos est à droite) : le cuir, retourné, autour d'une page.
function interieur(id, r, graine, u, forme) {
  const d = trace(forme.map(([x, y]) => [300 - x, y]));
  const tp = tour(7, 6, 293, 388, [3, 1, 1, 3]), page = deformer(tp, irregulier(r, tp, 0.5 * u, 0.2 * u));
  return `<svg class="dessin" viewBox="0 0 300 400" overflow="visible" aria-hidden="true"><defs>
  <clipPath id="${id}-f"><path d="${d}"/></clipPath>
  ${filtre(`${id}-grain`, 0.85, 2, graine + 1, [0.06, 0.04, 0.02], 1.5, -0.55)}
  <filter id="${id}-ombre" x="-30%" y="-20%" width="160%" height="150%"><feGaussianBlur stdDeviation="14"/></filter>
  </defs>
  <path d="${d}" fill="#000" opacity=".45" transform="translate(0 12)" filter="url(#${id}-ombre)"/>
  <g clip-path="url(#${id}-f)"><rect width="300" height="400" fill="#46311f"/><rect width="300" height="400" filter="url(#${id}-grain)" opacity=".7"/></g>
  ${papier(id + "-p", r, graine + 7, u, page, [7, 6, 293, 388], "droite")}</svg>`;
}

// Un masque pour le titre : la dorure un peu passée par endroits (image à poser en mask-image).
export function masqueTexte(graine, u = 1) {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='240' height='360'><filter id='m' x='0' y='0' width='1' height='1' color-interpolation-filters='sRGB'>` +
    `<feTurbulence type='fractalNoise' baseFrequency='.035' numOctaves='1' seed='${graine}'/><feColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 2.5 ${-(0.05 + 0.2 * u).toFixed(2)}'/></filter>` +
    `<rect width='240' height='360' filter='url(#m)'/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

// Les trois dessins d'un livre : la couverture, le bloc des pages, l'intérieur de la couverture.
export function dessinerLivre({ u = 1, graine = 7 } = {}) {
  const id = "vl" + ++compteur, r = hasard(graine);
  const NERV = [62, 138, 262, 338];
  const tc = tour(0, 0, 300, 400, [3, 8, 10, 3]), base = irregulier(r, tc, 1.1 * u, 0.35 * u, 1.1 * u, 8, u);
  // les nervures du dos dépassent à peine sur le bord gauche
  const forme = deformer(tc, (p) => base(p) + (p[2] < -0.9 ? NERV.reduce((t, y) => t + 1.1 * Math.exp(-(((p[1] - y) / 3.5) ** 2)), 0) : 0));
  return {
    couverture: couverture(id + "c", r, graine, u, forme),
    bloc: bloc(id + "b", r, graine + 10, u),
    interieur: interieur(id + "i", r, graine + 20, u, forme)
  };
}
