// Une fiche : un clic sur la note d'une phrase ouvre, sous son paragraphe, pourquoi cette note et les sources
// (copie du bloc de la partie « Fiabilité et sources », en bas de page). Sans JavaScript, le lien y mène.
document.addEventListener("click", (ev) => {
  const note = ev.target.closest(".f-note");
  if (!note) return;
  ev.preventDefault();
  cacherBulle();
  const n = note.dataset.ligne, p = note.closest("p");
  const ouvert = p.nextElementSibling && p.nextElementSibling.classList.contains("f-detail") ? p.nextElementSibling : null;
  const memeNote = ouvert && ouvert.dataset.ligne === n;
  document.querySelectorAll(".f-detail").forEach((d) => d.remove());
  document.querySelectorAll(".f-note[aria-expanded='true']").forEach((b) => b.setAttribute("aria-expanded", "false"));
  document.querySelectorAll(".f-phrase.actif").forEach((s) => s.classList.remove("actif"));
  if (memeNote) return montrerBulle(note);  // le détail se ferme : la bulle revient tout de suite (demande du 25/11/2026)
  const source = document.getElementById("n-" + n);
  const detail = document.createElement("div");
  detail.className = "f-detail";
  detail.dataset.ligne = n;
  detail.innerHTML = source.innerHTML;
  p.after(detail);
  note.setAttribute("aria-expanded", "true");
  document.getElementById("p-" + n).classList.add("actif");
});

// Un clic sur un moment de la frise (ou sur « Revenir à la phrase ») mène à la phrase : elle est surlignée 3 secondes,
// puis le surlignage s'efface (demande du 25/11/2026 ; avant, il restait tant que l'adresse finissait par #p-N).
function cibler() {
  const m = location.hash.match(/^#(p-\w+)$/), s = m && document.getElementById(m[1]);
  if (!s) return;
  clearTimeout(s.minuteur);
  s.classList.remove("fin-cible");
  s.classList.add("cible");
  s.minuteur = setTimeout(() => { s.classList.add("fin-cible"); s.classList.remove("cible"); }, 3000);
}
document.addEventListener("click", (ev) => { if (ev.target.closest('a[href^="#p-"]')) setTimeout(cibler, 0); });
cibler();

// Au survol d'une note (ou au clavier) : une bulle avec la note, son mot et pourquoi (demande du 25/11/2026).
let bulle = null;
function montrerBulle(note) {
  // pas de bulle quand le détail de cette note est déjà ouvert : il dit la même chose (demande du 25/11/2026)
  if (note.getAttribute("aria-expanded") === "true") return cacherBulle();
  if (!bulle) { bulle = document.createElement("div"); bulle.className = "f-bulle"; bulle.setAttribute("role", "tooltip"); document.body.append(bulle); }
  bulle.innerHTML = "";
  const b = document.createElement("b"); b.textContent = note.dataset.note; b.style.color = note.dataset.couleur || "";
  const s = document.createElement("span"); s.textContent = note.dataset.pourquoi;
  bulle.append(b, s);
  bulle.hidden = false;
  const r = note.getBoundingClientRect(), w = bulle.offsetWidth, h = bulle.offsetHeight;
  bulle.style.left = Math.max(8, Math.min(innerWidth - w - 8, r.left + r.width / 2 - w / 2)) + "px";
  bulle.style.top = (r.bottom + 8 + h < innerHeight ? r.bottom + 8 : r.top - h - 8) + "px";
}
function cacherBulle() { if (bulle) bulle.hidden = true; }
// au survol, la phrase de la note est surlignée aussi (comme au clic)
const surligner = (note, oui) => { const p = document.getElementById("p-" + note.dataset.ligne); if (p) p.classList.toggle("survol", oui); };
document.addEventListener("mouseover", (ev) => { const n = ev.target.closest(".f-note"); if (n) { montrerBulle(n); surligner(n, true); } });
document.addEventListener("mouseout", (ev) => { const n = ev.target.closest(".f-note"); if (n) { cacherBulle(); surligner(n, false); } });
document.addEventListener("focusin", (ev) => { const n = ev.target.closest(".f-note"); if (n) montrerBulle(n); });
document.addEventListener("focusout", cacherBulle);
addEventListener("scroll", cacherBulle, { passive: true });

// La frise (demandes du 25/11/2026) : elle occupe toute la hauteur de la fenêtre et ne bouge pas quand on fait défiler.
// Elle s'accroche exactement à sa place de départ (sinon elle sautait de quelques pixels), puis chaque point est placé à
// l'échelle du temps sur la hauteur disponible ; les noms des derniers moments, serrés en bas, sont écartés vers le haut
// selon leur hauteur réelle, et un trait relie chacun à son point.
const fil = document.querySelector(".f-fil"), frise = fil && fil.querySelector(".f-frise");
function placerFrise() {
  if (!frise) return;
  const page = fil.parentElement, cs = getComputedStyle(page);
  const depart = page.getBoundingClientRect().top + scrollY + parseFloat(cs.paddingTop);
  fil.style.top = depart + "px";
  const autres = fil.offsetHeight - frise.offsetHeight;
  const H = Math.max(320, innerHeight - depart - autres - 20);
  const lis = [...frise.querySelectorAll("li")], debut = Number(lis[0].dataset.age);
  const hauteurs = lis.map((li) => li.offsetHeight + 6);
  const bas = H - hauteurs[hauteurs.length - 1];               // le dernier nom tient en bas de la frise
  const vrais = lis.map((li) => ((debut - Number(li.dataset.age)) / debut) * bas);
  const noms = vrais.slice();
  for (let i = noms.length - 2; i >= 0; i--) noms[i] = Math.min(noms[i], noms[i + 1] - hauteurs[i]);
  const decalage = Math.max(0, -Math.min(...noms));
  lis.forEach((li, i) => { li.style.top = Math.round(noms[i] + decalage) + "px"; });
  const v = vrais.map((y) => y + decalage);
  let traits = `<line x1="2" y1="${v[0].toFixed(1)}" x2="2" y2="${v[v.length - 1].toFixed(1)}" class="f-axe"></line>`;
  v.forEach((y, i) => { traits += `<path d="M2 ${y.toFixed(1)} L 26 ${(noms[i] + decalage + 9).toFixed(1)}" class="f-lien"></path><circle cx="2" cy="${y.toFixed(1)}" r="3.5"></circle>`; });
  const svg = frise.querySelector(".f-traits");
  svg.innerHTML = traits;
  const total = Math.ceil(Math.max(H + decalage, ...noms.map((y, i) => y + decalage + hauteurs[i])));
  svg.setAttribute("height", total);
  frise.style.height = total + "px";
  suivre();
}

// La frise suit la lecture (demande du 25/11/2026) : l'étape dont la phrase est passée sous la ligne de lecture (un tiers
// de la fenêtre) est mise en avant, les autres pâlissent ; tout en bas de la page, c'est « Aujourd'hui ».
function suivre() {
  if (!frise) return;
  const lis = [...frise.querySelectorAll("li")], ligne = innerHeight * 0.35;
  let ici = 0;
  lis.forEach((li, i) => {
    const a = li.querySelector('a[href^="#p-"]'), p = a && document.getElementById(a.getAttribute("href").slice(1));
    if (p && p.getBoundingClientRect().top <= ligne) ici = i;
  });
  const se = document.scrollingElement;
  if (se.scrollTop >= se.scrollHeight - innerHeight - 2 && lis[lis.length - 1].classList.contains("f-maintenant")) ici = lis.length - 1;
  const ronds = frise.querySelectorAll(".f-traits circle");
  lis.forEach((li, i) => { li.classList.toggle("ici", i === ici); if (ronds[i]) ronds[i].classList.toggle("ici", i === ici); });
  frise.classList.add("suivi");
}
let suiviPrevu = false;
addEventListener("scroll", () => { if (!suiviPrevu) { suiviPrevu = true; requestAnimationFrame(() => { suiviPrevu = false; suivre(); }); } }, { passive: true });
placerFrise();
addEventListener("resize", placerFrise);
if (document.fonts) document.fonts.ready.then(placerFrise);

// Ouverte dans le panneau de droite de l'accueil (?panneau) : Échap demande à l'accueil de fermer le panneau.
if (document.documentElement.classList.contains("en-panneau") && window.parent !== window) {
  addEventListener("keydown", (ev) => { if (ev.key === "Escape") window.parent.postMessage("monde:fermer-fiche", location.origin); });
}
