# Ar-bol — site vitrine (édition limitée)

Site one-page **bilingue FR/EN** pour *Ar-bol*, corbeille à fruits sculpturale
en édition limitée à 50 exemplaires (bois tourné + faïence de Quimper, Finistère).

> ⚠️ **Ces fichiers SONT le livrable.** Ce n'est pas une maquette à reconstruire
> dans un framework : c'est un site HTML/CSS/JS statique, autonome, prêt à servir
> tel quel. Le rôle de Claude Code ici = **déployer** puis **continuer à éditer**
> ce site existant, en gardant son langage visuel.

---

## 1. Lancer en local

Le site est 100 % statique mais charge du CSS/JS/images en relatif : il faut un
petit serveur HTTP (ne pas ouvrir `index.html` en `file://`, les `image-slot`
ne se rempliraient pas).

```bash
cd site-claude-design
python3 -m http.server 8000
# puis ouvrir http://localhost:8000
```

## 2. Déployer sur GitHub Pages

```bash
cd site-claude-design
git init -b main
git add .
git commit -m "Ar-bol — site"
gh repo create ar-bol --public --source=. --push

# activer Pages sur main / (root)
gh api -X POST repos/thrry/ar-bol/pages -f "source[branch]=main" -f "source[path]=/"

# récupérer l'URL publique (champ html_url)
gh api repos/thrry/ar-bol/pages
```

URL attendue : `https://thrry.github.io/ar-bol/`
Le `.nojekyll` (déjà présent) empêche Jekyll de filtrer des fichiers.

**Mises à jour ultérieures :** `git add . && git commit -m "maj" && git push`.

## 2 bis. Brancher Brevo

Le formulaire de commande et la liste d'attente appellent
`/api/brevo-contact`. Cet endpoint est dans `functions/api/brevo-contact.js` et
doit tourner côté serveur, par exemple via Cloudflare Pages Functions.

Ne jamais mettre la clé Brevo dans `index.html` ou `arbol-v2.js`.

Variables à configurer côté hébergeur :

```bash
BREVO_API_KEY=...
BREVO_LIST_IDS=...
ARBOL_OWNER_EMAIL=kevinguiricouderc@gmail.com
ARBOL_OWNER_NAME=Kevin Guiri Couderc
BREVO_SENDER_EMAIL=...
BREVO_SENDER_NAME=Ar-bol
```

`BREVO_LIST_IDS` est optionnel. S'il est vide, le contact est créé ou mis à jour
dans Brevo sans être ajouté à une liste précise. En local, copier
`.dev.vars.example` vers `.dev.vars` puis renseigner les valeurs ; `.dev.vars`
est ignoré par Git.

Après création ou mise à jour du contact, l'endpoint tente aussi d'envoyer un
email transactionnel au propriétaire Ar-bol. `ARBOL_OWNER_EMAIL` vaut
`kevinguiricouderc@gmail.com` par défaut. `BREVO_SENDER_EMAIL` doit correspondre
à un expéditeur vérifié dans Brevo, sinon le contact sera bien enregistré mais
la notification email ne partira pas.

GitHub Pages ne peut pas exécuter cet endpoint serverless. Si le site est servi
uniquement par GitHub Pages, la commande redirige quand même vers Stripe, mais la
liste d'attente peut afficher une erreur d'enregistrement. Il faut publier le
même dossier via Cloudflare Pages, Netlify, Vercel ou ajouter un autre proxy
serveur qui garde la clé Brevo privée.

## 2 ter. Paiement Stripe

La commande est branchée en mode test avec des Stripe Payment Links publics, un
lien par composition (`Unan`, `Daou`, `Tri`, `Pevar`). Le site tente d'abord
d'enregistrer le contact dans Brevo, puis redirige vers Stripe ; si Brevo est
indisponible, la redirection Stripe reste active.

Les clés secrètes Stripe ne doivent jamais être ajoutées au repo. Les liens de
test sont dans `arbol-v2.js` car ce sont des URL publiques Stripe. Pour passer
en production, créer les quatre Payment Links en mode live, puis remplacer
uniquement les URL dans `stripeLinks`.

## 3. Structure des fichiers

```
site-claude-design/
├── index.html        ← le site (toute la structure + le contenu bilingue)
├── arbol-v2.css      ← styles + design tokens (variables en :root)
├── arbol-v2.js       ← interactions (langue, reveals, parallaxe, réservation, canvas)
├── image-slot.js     ← composant <image-slot> (web component, fond image remplaçable)
├── assets/           ← 15 images (.png)
└── .nojekyll
```

## 4. Sections (dans l'ordre)

1. **Hero** plein cadre — titre Ar-bol, photo sur granit
2. **Manifeste** (Chapitre I) — fond filigrane cyprès (crayon, inversé)
3. **L'objet** (Chapitre II) — scène + specs (hauteur, diamètre, matières)
4. **Ar-bol à vivre** — triptyque cadré : Fruits · Nature morte & végétale · Parfum & choses précieuses
5. **Variations** (Chapitre III) — 4 modèles : Unan, Daou, Tri, Pevar (lignes alternées, grands chiffres)
6. **La matière · Le bois** (Chapitre IV) — texte + artisan tourneur + canvas « anneaux du bois » animé en fond
7. **La matière · La faïence** — texte + atelier
8. **Finistère** — fond filigrane carte (crayon, multiply)
9. **Le designer** — portrait + bio, puis « Les mains d'Ar-bol » (tourneur + potière)
10. **Série limitée** (Chapitre V) — jauge des 50 (12 réservées s'allument)
11. **Commande** (Chapitre VI) — parcours guidé 3 étapes : composition → paiement Stripe → confirmation, + bandeau confiance
12. **Liste d'attente** — formulaire email (validation front)
13. **Footer**

## 5. Conventions à respecter pour continuer

- **Bilingue** : chaque texte a deux `<span lang="fr">…</span><span lang="en">…</span>`.
  Le CSS masque la langue inactive via `[data-lang]` sur `<html>`. Toujours fournir
  les deux langues pour tout nouveau texte.
- **Design tokens** : couleurs / fontes / espacements sont des variables CSS dans
  `:root` (arbol-v2.css). Réutiliser ces variables, ne pas inventer de couleurs.
  Fontes : Cormorant Garamond (serif, titres) + Hanken Grotesk (sans, courant).
- **Animations d'apparition** : ajouter la classe `reveal` (+ `d1`/`d2`/`d3` pour
  décaler) à tout nouvel élément à révéler au scroll. Géré par `arbol-v2.js`.
- **Images** : composant `<image-slot id="…" src="assets/…" placeholder="…">`.
  Le `placeholder` sert de légende/brief si l'image manque. Formats portrait
  privilégiés (2:3 ou 4:5).
- **Animations de fond** : `<canvas>` pilotés en JS (anneaux du bois = `#lathe`).
  Respectent `prefers-reduced-motion`.

## 6. À finaliser avant publication réelle

- **Noms d'ateliers/artisans** : Gwenaël Tanguy (tourneur), Annaïg Le Goff (potière)
  sont **inventés** — à confirmer/remplacer (mention déjà présente sur le site).
- **Paiement** : Stripe est branché en mode test via Payment Links publics.
  Remplacer les liens test par les liens live avant ouverture commerciale.
- **Liste d'attente** : le formulaire enregistre le contact dans Brevo via
  `/api/brevo-contact` lorsque l'endpoint serverless est disponible.
- **Images** : ce sont des visuels générés ; remplacer par les photos finales HD
  quand disponibles (mêmes noms de fichiers dans `assets/` = aucun changement de code).
- **Poids** : ~30 Mo d'images PNG. Pour accélérer le chargement, convertir en WebP.

## 7. Versions

Le projet de design contenait aussi `Ar-bol.html` (v1, plus sobre) et
`Ar-bol — Partage.html` (build autonome tout-en-un, pour envoi par mail/WeTransfer).
`index.html` ici correspond à la **v2** (version finale validée).
