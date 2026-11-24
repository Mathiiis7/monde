// Petits outils communs : créer des éléments, des icônes, borner un nombre.

export function el(tag, attrs = {}, ...enfants) {
  return remplir(document.createElement(tag), attrs, enfants);
}

export function svg(tag, attrs = {}, ...enfants) {
  return remplir(document.createElementNS("http://www.w3.org/2000/svg", tag), attrs, enfants);
}

function remplir(e, attrs, enfants) {
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === "class") e.setAttribute("class", v);
    else if (k === "texte") e.textContent = v;
    else if (k === "html") e.innerHTML = v;
    else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v === true ? "" : v);
  }
  for (const c of enfants.flat()) if (c != null && c !== false) e.append(c);
  return e;
}

const TRAITS = {
  fermer: '<path d="M4 4l10 10M14 4 4 14"></path>',
  ouest: '<path d="M12.5 4.5 7 10l5.5 5.5"></path>',
  nord: '<path d="M4.5 12.5 10 7l5.5 5.5"></path>',
  sud: '<path d="M4.5 7.5 10 13l5.5-5.5"></path>',
  est: '<path d="M7.5 4.5 13 10l-5.5 5.5"></path>',
  pause: '<path d="M7.5 5v10M12.5 5v10"></path>',
  lecture: '<path d="M7 5l8 5-8 5z"></path>'
};

// Une icône en traits, de la couleur du texte (décorative : le bouton porte son nom).
export function icone(nom) {
  const t = nom === "fermer" ? 18 : 20;
  const s = svg("svg", { "aria-hidden": "true", width: t, height: t, viewBox: `0 0 ${t} ${t}`, fill: "none", stroke: "currentColor", "stroke-width": 2, "stroke-linecap": "round", "stroke-linejoin": "round" });
  s.innerHTML = TRAITS[nom];
  return s;
}

export function boutonFermer(nom, action, style) {
  return el("button", { class: "fermer", "aria-label": nom, style, onclick: action }, icone("fermer"));
}

export const borne = (v, a, b) => Math.max(a, Math.min(b, v));

export const calme = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
