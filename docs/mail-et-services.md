# Ar Bol - Mail et services

## Boite mail

Adresse creee :

```text
contact@ar-bol.fr
```

Webmail :

```text
https://webmail.migadu.com
```

Le mot de passe temporaire doit etre transmis hors depot. Il doit etre change a la premiere connexion.

## Changer le mot de passe

1. Aller sur `https://webmail.migadu.com`.
2. Se connecter avec `contact@ar-bol.fr` et le mot de passe temporaire.
3. Ouvrir les reglages du compte.
4. Choisir la modification du mot de passe.
5. Definir un mot de passe long, unique, et le stocker dans un gestionnaire de mots de passe.
6. Deconnecter puis reconnecter le compte pour verifier que le nouveau mot de passe fonctionne.

Si le changement n'est pas disponible dans le webmail, le proprietaire du compte Migadu peut changer le mot de passe depuis l'admin Migadu :

```text
https://admin.migadu.com
```

Chemin : domaine `ar-bol.fr` -> mailboxes -> `contact` -> modifier le mot de passe.

## Configuration client mail

Identifiant :

```text
contact@ar-bol.fr
```

IMAP entrant :

```text
Serveur: imap.migadu.com
Port: 993
Securite: SSL/TLS
Authentification: mot de passe normal
```

SMTP sortant :

```text
Serveur: smtp.migadu.com
Port: 465
Securite: SSL/TLS
Authentification: mot de passe normal
```

Alternative SMTP si le client mail prefere STARTTLS :

```text
Serveur: smtp.migadu.com
Port: 587
Securite: STARTTLS
Authentification: mot de passe normal
```

## DNS mail

Les enregistrements Migadu sont geres dans Cloudflare DNS :

```text
MX     ar-bol.fr                aspmx1.migadu.com    priorite 10
MX     ar-bol.fr                aspmx2.migadu.com    priorite 20
TXT    ar-bol.fr                v=spf1 include:spf.migadu.com -all
TXT    ar-bol.fr                hosted-email-verify=...
TXT    _dmarc.ar-bol.fr         v=DMARC1; p=quarantine;
CNAME  key1._domainkey          key1.ar-bol.fr._domainkey.migadu.com
CNAME  key2._domainkey          key2.ar-bol.fr._domainkey.migadu.com
CNAME  key3._domainkey          key3.ar-bol.fr._domainkey.migadu.com
```

## Site

Hebergement :

```text
Cloudflare Pages
```

Projet Cloudflare Pages :

```text
ar-bol
```

URL technique :

```text
https://ar-bol.pages.dev
```

Domaines publics :

```text
https://ar-bol.fr
https://www.ar-bol.fr
```

La zone DNS autoritaire doit etre Cloudflare :

```text
amber.ns.cloudflare.com
quincy.ns.cloudflare.com
```

## CI/CD

Le deploiement est fait depuis GitHub Actions vers Cloudflare Pages avec Wrangler.

Secrets GitHub requis dans `Thrry/ar-bol` :

```text
CLOUDFLARE_ACCOUNT_ID
CLOUDFLARE_API_TOKEN
```

Permissions minimales du token Cloudflare pour le deploiement Pages :

```text
Account -> Pages Write
Account -> Account Read
```

Pour la gestion DNS automatisee depuis Codex ou l'application de monitoring, utiliser un token separe avec :

```text
Zone -> DNS Write
Zone -> Zone Read
Account -> Pages Write
```

## Brevo

Brevo doit rester un service agence/application pour les emails transactionnels :

- notifications de formulaire ;
- emails de confirmation e-shop ;
- emails systeme ;
- logs et suivi de delivrabilite.

Migadu reste reserve aux boites humaines, par exemple `contact@ar-bol.fr`.

Cette separation evite de faire envoyer des volumes applicatifs par une boite mail humaine et garde une meilleure delivrabilite.
