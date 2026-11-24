# D'où viennent les données des cartes

- `terres.json`, `monde.json`, `europe.json` et `france.json` : contours simplifiés tirés de **Natural Earth** (`ne_50m_admin_0_countries`), domaine public (naturalearthdata.com, « Terms of Use », vérifié le 19/11/2026). Ses frontières sont celles « de fait », selon qui contrôle le territoire.
- Les régions dans `regions.json` et les départements dans `departements.json` : contours simplifiés tirés des fichiers 2025 (`regions-1000m.geojson`, `departements-1000m.geojson`) du jeu « Contours administratifs » publié par data.gouv.fr (Etalab) d'après Admin Express de l'IGN, sous **licence ODbL** (Open Database License, https://opendatacommons.org/licenses/odbl/1-0/). Ces versions simplifiées sont des bases dérivées : elles restent sous la même licence ODbL, la source est citée sur le site (« Comment Monde est fait ») et elles s'y téléchargent.
- Les polices de `site/polices/` : Newsreader et Public Sans, licence SIL Open Font License 1.1 (texte joint : `OFL-newsreader.txt`, `OFL-public-sans.txt`).
- `lieux-ville.json`, `lieux-maison.json` et les dessins de `site/dessins/` : une ville et une maison inventées pour Monde.
