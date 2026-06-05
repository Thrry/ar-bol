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
7. **La matière · La faïence** — texte + atelier + canvas « tour de potier » animé
8. **Finistère** — fond filigrane carte (crayon, multiply)
9. **Le designer** — portrait + bio, puis « Les mains d'Ar-bol » (tourneur + potière)
10. **Série limitée** (Chapitre V) — jauge des 50 (12 réservées s'allument)
11. **Réservation** (Chapitre VI) — parcours guidé 3 étapes : variation → acompte → confirmation, + bandeau confiance
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
- **Animations de fond** : `<canvas>` pilotés en JS (anneaux du bois = `#lathe`,
  tour de potier = `#wheel`). Respectent `prefers-reduced-motion`.

## 6. À finaliser avant publication réelle

- **Noms d'ateliers/artisans** : Gwenaël Tanguy (tourneur), Annaïg Le Goff (potière)
  sont **inventés** — à confirmer/remplacer (mention déjà présente sur le site).
- **Paiement** : l'étape « acompte » est une **démo** (pas de Stripe réel branché).
  Brancher un vrai prestataire (Stripe Checkout / lien de paiement) côté étape 2.
- **Liste d'attente** : le formulaire valide l'email côté client mais **n'envoie
  rien** — connecter à un service (Formspree, Buttondown, API maison…).
- **Images** : ce sont des visuels générés ; remplacer par les photos finales HD
  quand disponibles (mêmes noms de fichiers dans `assets/` = aucun changement de code).
- **Poids** : ~30 Mo d'images PNG. Pour accélérer le chargement, convertir en WebP.

## 7. Versions

Le projet de design contenait aussi `Ar-bol.html` (v1, plus sobre) et
`Ar-bol — Partage.html` (build autonome tout-en-un, pour envoi par mail/WeTransfer).
`index.html` ici correspond à la **v2** (version finale validée).
