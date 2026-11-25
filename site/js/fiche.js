// Une fiche : un clic sur la note d'une phrase ouvre, sous son paragraphe, pourquoi cette note et les sources
// (copie du bloc de la partie « Fiabilité et sources », en bas de page). Sans JavaScript, le lien y mène.
document.addEventListener("click", (ev) => {
  const note = ev.target.closest(".f-note");
  if (!note) return;
  ev.preventDefault();
  const n = note.dataset.ligne, p = note.closest("p");
  const ouvert = p.nextElementSibling && p.nextElementSibling.classList.contains("f-detail") ? p.nextElementSibling : null;
  const memeNote = ouvert && ouvert.dataset.ligne === n;
  document.querySelectorAll(".f-detail").forEach((d) => d.remove());
  document.querySelectorAll(".f-note[aria-expanded='true']").forEach((b) => b.setAttribute("aria-expanded", "false"));
  document.querySelectorAll(".f-phrase.actif").forEach((s) => s.classList.remove("actif"));
  if (memeNote) return;
  const source = document.getElementById("n-" + n);
  const detail = document.createElement("div");
  detail.className = "f-detail";
  detail.dataset.ligne = n;
  detail.innerHTML = source.innerHTML;
  p.after(detail);
  note.setAttribute("aria-expanded", "true");
  document.getElementById("p-" + n).classList.add("actif");
});
