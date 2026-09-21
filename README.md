# HAPHAK

**« transforme »**
Thème : **« Marche devant ma face »** — Genèse 17:1

Site d'inscription à la retraite HAPHAK : présentation de l'événement, enregistrement
des participants, et espace d'administration pour consulter, gérer et exporter les inscriptions.

---

## Sommaire

1. [Présentation](#1-présentation)
2. [Technologies](#2-technologies)
3. [Prérequis](#3-prérequis)
4. [Installation](#4-installation)
5. [Configuration `.env`](#5-configuration-env)
6. [Base de données](#6-base-de-données)
7. [Lancement local](#7-lancement-local)
8. [Déploiement sur Render](#8-déploiement-sur-render)
9. [Sécurité](#9-sécurité)
10. [Administration](#10-administration)
11. [Export CSV](#11-export-csv)
12. [E-mails](#12-e-mails)
13. [API](#13-api)
14. [Tests](#14-tests)
15. [Maintenance](#15-maintenance)

---

## 1. Présentation

### Informations officielles

| | |
|---|---|
| Nom | HAPHAK |
| Signification | transforme |
| Thème | Marche devant ma face |
| Verset | Genèse 17:1 |
| Dates | du 27 au 30 septembre 2026 |
| Début | dimanche 27 septembre 2026 à 17h00 |
| Lieu | Q. Kyeshero, Av. Topographe N°1, réf. Entrée Tshengerero |
| Contact | +243 816 366 894 |
| E-mail | kahandakahwajoel@gmail.com |

### Sessions quotidiennes

| Session | Horaire | Contenu |
|---|---|---|
| Matin | 09h00 – 11h30 | Enseignement et adoration |
| Midi | 14h00 – 16h00 | Étude biblique approfondie — Centre Bérée |
| Soir | 20h30 – 01h00 | Intercession, adoration et ateliers |

Ces informations sont centralisées dans `server/haphak.js` et servent à la fois la page
d'accueil, la page de confirmation et les e-mails. Pour les modifier, un seul fichier à éditer.

### Parcours

```
VISITEUR → HAPHAK → S'INSCRIRE → FORMULAIRE → VALIDATION
   → PostgreSQL → HAP-XXXXXX → CONFIRMATION → E-MAIL

ADMIN → CONNEXION → INSCRIPTIONS → RECHERCHE
   → CONSULTATION → MODIFICATION → EXPORT CSV
```

---

## 2. Technologies

**Frontend** — HTML5, CSS3, JavaScript vanilla, Fetch API. Aucun framework, aucun build.
Seule ressource externe : les polices Google Fonts.

**Backend** — Node.js, Express.js.

**Base de données** — PostgreSQL via le package `pg`, avec des requêtes SQL paramétrées.
Pas d'ORM.

**Dépendances** : `express`, `pg`, `dotenv`, `nodemailer`, `bcrypt`, `express-session`,
`helmet`, `express-rate-limit`. Rien d'autre.

---

## 3. Prérequis

- Node.js 18 ou plus (`node -v`)
- npm
- Un compte [GitHub](https://github.com)
- Un compte [Render](https://render.com)
- Un accès SMTP pour l'envoi des confirmations

---

## 4. Installation

```bash
git clone <URL_DU_DEPOT>
cd haphaK
npm install
cp .env.example .env
```

---

## 5. Configuration `.env`

| Variable | Rôle |
|---|---|
| `NODE_ENV` | `development` en local, `production` sur Render |
| `PORT` | Port d'écoute (Render le fournit automatiquement) |
| `APP_URL` | URL publique du site |
| `DATABASE_URL` | Chaîne de connexion PostgreSQL |
| `SESSION_SECRET` | Secret des sessions — `openssl rand -hex 32` |
| `ADMIN_EMAIL` | Identifiant de connexion à l'administration |
| `ADMIN_PASSWORD` | Mot de passe initial (haché avec bcrypt au premier démarrage) |
| `SMTP_HOST` `SMTP_PORT` `SMTP_USER` `SMTP_PASSWORD` | Serveur d'envoi |
| `EMAIL_FROM` | Expéditeur affiché |

`.env` est dans `.gitignore`. Ne committez jamais de valeur réelle : seul `.env.example`
est versionné, et il est vide.

### À propos du compte administrateur

Le compte est créé au **premier démarrage** à partir de `ADMIN_EMAIL` et `ADMIN_PASSWORD`.
Le mot de passe est immédiatement haché avec bcrypt (12 tours) et n'est jamais stocké en clair.

Si le compte existe déjà, les variables sont ignorées : changer `ADMIN_PASSWORD` après coup
ne modifie pas le mot de passe. Pour le changer :

```bash
psql "$DATABASE_URL" -c "DELETE FROM admins WHERE email = 'votre@email';"
```

puis redémarrez l'application avec la nouvelle valeur.

> **Note** — le prompt de départ indiquait deux identifiants différents (`admin` d'un côté,
> `kahandakahwajoel@gmail.com` de l'autre). Le choix est laissé libre : renseignez celui que
> vous voulez dans `ADMIN_EMAIL`. Choisissez surtout un mot de passe différent de celui écrit
> dans le prompt, qui a circulé en clair.

---

## 6. Base de données

Le schéma se trouve dans `database/schema.sql`. Il est **appliqué automatiquement au
démarrage** du serveur : aucune commande de migration à lancer. Le script est idempotent
(`CREATE TABLE IF NOT EXISTS`), il peut donc tourner à chaque redémarrage sans risque.

Pour l'appliquer manuellement :

```bash
psql "$DATABASE_URL" -f database/schema.sql
```

Tables créées : `admins` et `registrations`, plus la séquence `registration_number_seq`
qui garantit l'unicité des numéros HAP.

### En local

Avec PostgreSQL installé sur votre machine :

```bash
createdb haphak
# dans .env :
DATABASE_URL=postgresql://localhost/haphak
```

---

## 7. Lancement local

```bash
npm install
npm run dev
```

| | |
|---|---|
| Site | http://localhost:3000 |
| Inscription | http://localhost:3000/inscription.html |
| Administration | http://localhost:3000/admin/<token> (connexion via URL unique) |

En production : `npm start`.

---

## 8. Déploiement sur Render

```
GitHub → Render Web Service → PostgreSQL Render
```

### 8.1 Créer le dépôt GitHub

```bash
git init
git add .
git commit -m "HAPHAK — première version"
git branch -M main
git remote add origin https://github.com/VOTRE-COMPTE/haphak.git
git push -u origin main
```

Vérifiez avant de pousser que `.env` n'est **pas** inclus :

```bash
git status --ignored | grep .env
```

### 8.2 Créer la base PostgreSQL

1. Sur [render.com](https://render.com) → **New** → **PostgreSQL**
2. Nom : `haphak-db`, région la plus proche, plan *Free*
3. Une fois créée, copiez l'**Internal Database URL**

> Le plan gratuit de Render expire après 30 jours. Prévoyez un plan payant ou une
> sauvegarde régulière si la retraite est encore loin.

### 8.3 Créer le Web Service

1. **New** → **Web Service** → connectez votre dépôt GitHub
2. Runtime **Node**
3. Build command : `npm install`
4. Start command : `npm start`
5. Health check path : `/api/health`

### 8.4 Variables d'environnement

Dans l'onglet **Environment** du Web Service :

| Variable | Valeur |
|---|---|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | l'Internal Database URL de l'étape 8.2 |
| `SESSION_SECRET` | une valeur aléatoire longue |
| `APP_URL` | l'URL fournie par Render |
| `ADMIN_EMAIL` | votre identifiant |
| `ADMIN_PASSWORD` | un mot de passe solide |
| `SMTP_HOST` `SMTP_PORT` `SMTP_USER` `SMTP_PASSWORD` `EMAIL_FROM` | votre configuration SMTP |

Le fichier `render.yaml` fourni décrit déjà cette configuration : si vous utilisez
**New → Blueprint**, Render crée la base et le service ensemble, génère `SESSION_SECRET`
et relie `DATABASE_URL` automatiquement. Il reste à renseigner les valeurs marquées
`sync: false` (identifiants admin et SMTP).

### 8.5 Vérifier

1. Ouvrez `https://votre-app.onrender.com/api/health` → doit répondre `{"success":true,...}`
2. Ouvrez le site, faites une inscription de test
3. Connectez-vous à l'administration et vérifiez qu'elle apparaît
4. Supprimez l'inscription de test

> Le plan gratuit met le service en veille après inactivité : la première visite peut
> prendre une trentaine de secondes.

---

## 9. Sécurité

- **Helmet** avec politique de sécurité de contenu stricte
- **Rate limiting** : 15 inscriptions par heure et par IP, 10 tentatives de connexion
  par quart d'heure (anti brute-force)
- **Validation serveur systématique** : les données du navigateur ne sont jamais
  considérées comme fiables
- **Sanitation** : suppression des caractères de contrôle, troncature aux longueurs maximales
- **Requêtes paramétrées** partout : aucune valeur n'est concaténée dans du SQL
- **Contraintes `CHECK`** en base sur les champs à valeurs fixes
- **bcrypt** pour le mot de passe administrateur
- **Sessions** : cookie `HttpOnly`, `SameSite=lax`, `Secure` en production, 8 heures
- **Routes et pages `/admin` protégées** — le dashboard n'est pas servi sans session valide
- **Échappement systématique** avant insertion dans le DOM (protection XSS)
- **Erreurs génériques** côté client : ni stack trace, ni SQL, ni secret
- **Message de connexion identique** que le compte existe ou non
- **Protection CSV** contre l'injection de formules dans Excel

---

## 10. Administration

`/admin/login.html` puis `/admin/dashboard.html`.

**Statistiques** — total inscrits, hommes, femmes, avec hébergement, sans hébergement,
et le nombre d'e-mails en échec s'il y en a. Tous les chiffres viennent de PostgreSQL.

**Liste** — numéro HAP, nom, postnom, prénom, téléphone, e-mail, ville, hébergement,
date d'inscription, statut e-mail. Tableau sur ordinateur, cartes sur téléphone.
Pagination côté serveur : la liste complète n'est jamais chargée d'un bloc.

**Recherche** — nom, postnom, prénom, téléphone, e-mail, numéro HAP, ville.
La requête est exécutée par PostgreSQL.

**Filtres** — sexe, ville, hébergement, participation complète, statut e-mail.

**Fiche participant** — ouvre un panneau latéral avec toutes les informations, et permet
de modifier, supprimer (avec confirmation), renvoyer l'e-mail et imprimer.

---

## 11. Export CSV

Bouton **Exporter les inscriptions (CSV)** sur le dashboard.

L'export respecte les filtres appliqués à l'écran : filtrer sur Ville = Goma et
Hébergement = Oui n'exporte que ces participants. Le fichier contient un BOM UTF-8
pour que les accents s'affichent correctement dans Excel.

---

## 12. E-mails

L'e-mail de confirmation contient le nom du participant, son numéro HAP, le thème,
les dates, le lieu, le contact et le programme des sessions.

Chaque inscription porte un statut, visible dans l'administration :

| Statut | Signification |
|---|---|
| `pending` | en attente d'envoi |
| `sent` | envoyé (avec la date dans `email_sent_at`) |
| `failed` | échec (raison dans `email_error`) |

**L'inscription est enregistrée avant l'envoi.** Un échec SMTP ne fait jamais perdre
une inscription : elle apparaît dans l'administration avec le statut `failed`, et le
bouton **Renvoyer l'e-mail** permet de réessayer. Si SMTP n'est pas configuré du tout,
le site fonctionne normalement et toutes les inscriptions sont marquées `failed`.

---

## 13. API

**Public**

| Méthode | Route | Rôle |
|---|---|---|
| GET | `/api/haphak` | Informations officielles |
| POST | `/api/registrations` | Créer une inscription |
| GET | `/api/registrations/:numero` | Consulter une confirmation |
| GET | `/api/health` | État du service |

**Administration** — toutes protégées par session

| Méthode | Route |
|---|---|
| POST | `/api/admin/login` · `/api/admin/logout` |
| GET | `/api/admin/me` · `/api/admin/stats` · `/api/admin/cities` |
| GET | `/api/admin/registrations` · `/api/admin/registrations/:id` |
| PUT · DELETE | `/api/admin/registrations/:id` |
| POST | `/api/admin/registrations/:id/resend` |
| GET | `/api/admin/export.csv` |

---

## 14. Tests

La logique serveur a été vérifiée sur 69 contrôles automatisés couvrant :

- inscription valide, et rejet de 10 formes de données invalides
- détection de doublon sur l'e-mail et le téléphone (aucun INSERT effectué)
- inscription conservée malgré un échec d'envoi d'e-mail
- format et unicité des numéros HAP
- refus d'accès à chaque route d'administration sans session
- connexion : bon mot de passe, mauvais mot de passe, compte inexistant
- recherche et filtres : valeurs passées en paramètres, apostrophes et tentatives
  d'injection neutralisées, pagination bornée
- export CSV : guillemets doublés, formules Excel neutralisées, BOM, sauts de ligne
- nettoyage des entrées : espaces, caractères de contrôle, troncature

À vérifier à la main après le déploiement, avec la base réelle :

- [ ] inscription complète depuis un téléphone
- [ ] réception de l'e-mail de confirmation
- [ ] tentative de réinscription avec le même e-mail → message de doublon
- [ ] connexion admin, recherche, filtres
- [ ] modification puis suppression d'une inscription de test
- [ ] renvoi d'e-mail
- [ ] téléchargement du CSV et ouverture dans Excel

---

## 15. Maintenance

**Avant l'événement**

- Faites une inscription de test complète, puis supprimez-la
- Vérifiez la réception de l'e-mail dans plusieurs boîtes (Gmail, Outlook)
- Testez le formulaire sur un vrai téléphone Android
- Exportez le CSV pour vérifier le format

**Pendant les inscriptions**

- Surveillez le compteur d'e-mails en échec sur le dashboard
- Utilisez **Renvoyer l'e-mail** pour les participants concernés

**Sauvegardes**

```bash
pg_dump "$DATABASE_URL" > sauvegarde-$(date +%F).sql
```

Faites-en une avant l'événement, et exportez également le CSV comme copie lisible.

**Structure du projet**

```
haphaK/
├── public/
│   ├── index.html            Accueil
│   ├── inscription.html      Formulaire (5 étapes)
│   ├── confirmation.html     Confirmation imprimable
│   ├── privacy.html          Protection des données
│   ├── admin/
│   │   ├── login.html
│   │   └── dashboard.html
│   ├── css/style.css
│   └── js/
│       ├── main.js           Utilitaires partagés
│       ├── inscription.js
│       ├── confirmation.js
│       └── admin.js
├── server/
│   ├── server.js             Express, API, validation
│   ├── db.js                 Pool PostgreSQL
│   ├── auth.js               bcrypt, sessions
│   ├── email.js              Nodemailer
│   └── haphak.js             Informations officielles
├── database/schema.sql
├── render.yaml
├── .env.example
└── package.json
```

---

## Protection des données

Seules les informations nécessaires à l'organisation sont collectées. La liste des
participants n'est jamais accessible publiquement et n'est pas communiquée à des tiers.
La page `/privacy.html` explique au participant ce qui est collecté, pourquoi, qui y a
accès et comment demander une correction ou une suppression.
