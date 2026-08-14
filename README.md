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

URL publique : `https://ar-bol.fr/`
Le `.nojekyll` (déjà présent) empêche Jekyll de filtrer des fichiers.

**Mises à jour ultérieures :** `git add . && git commit -m "maj" && git push`.

## 2 bis. Services Brevo historiques

La commande et la liste d'attente publiques passent désormais par Chatweb.
L'endpoint `/api/brevo-contact`, son dashboard et les variables ci-dessous sont
conservés pour les anciens flux Brevo et l'administration, mais ne pilotent plus
le parcours principal du site.

Ne jamais mettre la clé Brevo dans `index.html` ou `arbol-v2.js`.

Variables à configurer côté hébergeur :

```bash
BREVO_API_KEY=...
BREVO_LIST_IDS=...
ARBOL_OWNER_EMAIL=contact@ar-bol.fr
ARBOL_OWNER_NAME=Kevin Guiri Couderc
BREVO_SENDER_EMAIL=...
BREVO_SENDER_NAME=Ar-bol
ARBOL_ADMIN_TOKEN=...
```

`BREVO_LIST_IDS` est optionnel. S'il est vide, le contact est créé ou mis à jour
dans Brevo sans être ajouté à une liste précise. En local, copier
`.dev.vars.example` vers `.dev.vars` puis renseigner les valeurs ; `.dev.vars`
est ignoré par Git.

Après création ou mise à jour du contact, l'endpoint tente aussi d'envoyer un
email transactionnel au propriétaire Ar-bol. `ARBOL_OWNER_EMAIL` vaut
`contact@ar-bol.fr` par défaut. `BREVO_SENDER_EMAIL` doit correspondre
à un expéditeur vérifié dans Brevo : actuellement
`kevinguiricouderc@gmail.com`. Ne pas utiliser `contact@ar-bol.fr` comme sender
tant que le domaine `ar-bol.fr` n'est pas authentifié dans Brevo ; le contact
sera bien enregistré mais la notification email risque de ne pas arriver.

Le dashboard admin est disponible sur `/dashboard.html`. Il lit les contacts et
les événements email Brevo via `/api/admin/brevo-dashboard`, protégé par
`ARBOL_ADMIN_TOKEN`.

Le double opt-in Brevo n'est pas encore activé. Pour une simple demande de
commande, ce n'est pas nécessaire. Pour une vraie newsletter/liste marketing,
créer une liste Brevo, un template de confirmation double opt-in, puis brancher
le formulaire d'attente sur ce flux avant d'envoyer des campagnes. Les campagnes
Brevo devront aussi contenir leur lien de désinscription natif.

GitHub Pages ne peut pas exécuter cet endpoint serverless. Les fonctions Brevo
historiques nécessitent donc toujours un hébergement compatible, mais le parcours
public actuel n'en dépend pas.

## 2 ter. Paiement Stripe

La commande lit le catalogue, le prix, les variantes, le retrait et l'état du
paiement depuis le Shop Chatweb. Le checkout est créé par Chatweb puis ouvert
sur Stripe.

La jauge de série limitée lit le stock du produit Ar-bol dans ce même Shop. Le
produit porte le stock partagé de la première édition. Les identifiants stables
des quatre compositions sont `unan`, `daou`, `tri` et `pevar` ; leurs noms et
leurs images affichés viennent du Shop Chatweb. Une commande payée décrémente
donc le même stock, quelle que soit la composition choisie. Le site ne maintient
plus de compteur Stripe ou de valeur manuelle en parallèle.

## 3. Structure des fichiers

```
site-carnet-rivage/
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
6. **La matière · Le bois** (Chapitre IV) — texte + photographie de l'atelier de tournage
7. **La matière · La faïence** — texte + atelier
8. **Finistère** — fond filigrane carte (crayon, multiply)
9. **Le designer** — portrait + bio, puis « Les mains d'Ar-bol » (tourneur + potière)
10. **Série limitée** (Chapitre V) — jauge des 50 synchronisée avec Stripe + socle manuel
11. **Commande** (Chapitre VI) — parcours guidé 4 étapes : composition → livraison → paiement Stripe → confirmation, + bandeau confiance
12. **Liste d'attente** — inscription avec consentement via Chatweb
13. **Footer**

## 5. Conventions à respecter pour continuer

- **Bilingue** : chaque texte a deux `<span lang="fr">…</span><span lang="en">…</span>`.
  Le CSS masque la langue inactive via `[data-lang]` sur `<html>`. Toujours fournir
  les deux langues pour tout nouveau texte.
- **Design tokens** : couleurs / fontes / espacements sont des variables CSS dans
  `:root` (arbol-v2.css). Réutiliser ces variables, ne pas inventer de couleurs.
  Fontes : Cormorant Garamond (serif, titres) + Hanken Grotesk (sans, courant).
- **Images** : composant `<image-slot static id="…" src="assets/…" srcset="…" sizes="…" alt="…">`.
  Les images du site public sont non éditables, responsives et chargées paresseusement
  hors du hero. Formats portrait privilégiés (2:3 ou 4:5).

## 6. À finaliser avant publication réelle

- **Noms d'ateliers/artisans** : Gwenaël Tanguy (tourneur), Annaïg Le Goff (potière)
  sont **inventés** — à confirmer/remplacer (mention déjà présente sur le site).
- **Paiement** : le checkout Stripe est créé par la boutique Chatweb avec la
  composition, la quantité et le mode de livraison choisis.
- **Liste d'attente** : le formulaire public enregistre le contact via Chatweb.
- **SEO et performance** : audit Lighthouse du 14 août 2026 — mobile 95/100,
  desktop 100/100, SEO 100/100, accessibilité 100/100. Les illustrations lourdes
  sont servies en AVIF, les photos en WebP responsive et les polices sont locales.

## 7. Versions

Le projet de design contenait aussi `Ar-bol.html` (v1, plus sobre) et
`Ar-bol — Partage.html` (build autonome tout-en-un, pour envoi par mail/WeTransfer).
`index.html` ici correspond à la **v2** (version finale validée).
