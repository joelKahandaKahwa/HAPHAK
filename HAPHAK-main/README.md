# Retraite Spirituelle HAPHAK 2026 — Application Web d'Inscription & Gestion

Application web Full-Stack moderne, sécurisée et responsive conçue sur mesure pour gérer les inscriptions des participants à la retraite chrétienne **HAPHAK 2026**.

L'application fonctionne de manière autonome avec une base de données **SQLite** hébergée et contrôlée localement sur le serveur de l'organisation, **sans aucune dépendance envers des services tiers cloud** (pas de Google Forms, Firebase, ou Supabase).

---

## 📋 Table des Matières

1. [Présentation du Projet](#1-présentation-du-projet)
2. [Fonctionnalités Principales](#2-fonctionnalités-principales)
3. [Prérequis](#3-prérequis)
4. [Installation des Dépendances](#4-installation-des-dépendances)
5. [Configuration du Fichier .env](#5-configuration-du-fichier-env)
6. [Lancement en Développement](#6-lancement-en-développement)
7. [Lancement en Production](#7-lancement-en-production)
8. [Accès à l'Espace Administrateur](#8-accès-à-lespace-administrateur)
9. [Sauvegardes de la Base de Données](#9-sauvegardes-de-la-base-de-données)
10. [Exportation des Données](#10-exportation-des-données)
11. [Sécurité & Confidentialité](#11-sécurité--confidentialité)
12. [Déploiement sur Internet (Serveur Public)](#12-déploiement-sur-internet-serveur-public)
13. [Configuration HTTPS](#13-configuration-https)
14. [Maintenance](#14-maintenance)

---

## 1. Présentation du Projet

La retraite chrétienne **HAPHAK 2026** se déroulera du **26 au 29 septembre 2026**.

L'application offre :
- Une **Page d'Accueil moderne** (mobile-first, palette Blanc & Doré) présentant les informations pratiques, le thème et le compte à rebours.
- Un **Formulaire Multi-étapes (Wizard)** en 6 étapes fluides + 1 étape de récapitulatif interactif avant validation.
- La génération automatique d'un **Ticket Officiel avec QR Code** unique (ex: `RET-2026-0001`) et l'envoi d'un e-mail de confirmation via SMTP.
- Un **Tableau de Bord Administrateur** complet avec statistiques, recherche en temps réel, filtres multi-critères, modification/suppression, export CSV, gestion des paramètres et système de sauvegarde.
- Un **Outil Scanner QR Code** permettant à l'équipe d'accueil de scanner le passe des participants à l'entrée du site pour valider leur présence.

---

## 2. Fonctionnalités Principales

- **Frontend Vanilla HTML5 / CSS3 / JS** : Interface réactive ultra-rapide, animations CSS sobres, aucune lourdeur de framework.
- **Backend Node.js & Express** : API REST structurée et sécurisée.
- **Base de Données SQLite** : Stockage local avec requêtes préparées paramétrées. Architecture abstraite permettant une migration vers **PostgreSQL** si le volume augmente.
- **Envoi d'Emails & QR Codes** : Intégration `Nodemailer` + `qrcode` (avec fallback gracieux en cas de non-configuration SMTP).
- **Scanner QR d'Entrée** : Interface dédiée aux hôtes d'accueil pour valider les accès en temps réel.
- **Sécurité Améliorée** : Protection HTTP Helmet, rate-limiting contre les abus, hachage `bcrypt` des mots de passe, sessions JWT HTTP-only.

---

## 3. Prérequis

Avant de démarrer l'application, assurez-vous d'avoir installé sur votre machine :
- **Node.js** (Version 18.0.0 ou supérieure recommandée) : [Télécharger Node.js](https://nodejs.org/)
- **npm** (inclus automatiquement avec Node.js)

Vérifiez les versions dans votre terminal :
```bash
node -v
npm -v
```

---

## 4. Installation des Dépendances

1. Ouvrez un terminal dans le dossier du projet `HAPHAK` :
```bash
cd path/to/HAPHAK
```

2. Installez toutes les dépendances définies dans `package.json` :
```bash
npm install
```

---

## 5. Configuration du Fichier `.env`

Le projet utilise un fichier `.env` pour stocker les variables d'environnement confidentielles.

Un modèle est disponible sous le nom `.env.example`. Si le fichier `.env` n'existe pas encore, il sera créé avec les paramètres par défaut :

```env
PORT=3000
NODE_ENV=development

# Clé secrète JWT Admin (Changez cette clé en production !)
JWT_SECRET=haphak_2026_super_secret_jwt_key_987654321

# Compte Administrateur Initial
ADMIN_USERNAME=admin
ADMIN_PASSWORD=AdminHaphak2026!

# Configuration SMTP pour l'envoi des mails (Optionnel en local)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=votre-email@gmail.com
SMTP_PASS=votre-mot-de-passe-application
SMTP_FROM="Retraite HAPHAK 2026 <no-reply@haphak.org>"

# Emplacement de la base SQLite
DB_PATH=database/retreat.db
```

---

## 6. Lancement en Développement

Pour lancer le serveur en mode développement avec rechargement automatique :

```bash
npm run dev
```

L'application est immédiatement accessible à l'adresse :
👉 **Public** : `http://localhost:3000`
👉 **Espace Admin** : `http://localhost:3000/admin/login.html`

---

## 7. Lancement en Production

Pour exécuter le serveur en environnement de production :

```bash
npm start
```

Il est recommandé d'utiliser **PM2** pour garantir que le serveur reste constamment en ligne :
```bash
npm install -g pm2
pm2 start server/server.js --name "haphak-2026"
pm2 save
```

---

## 8. Accès à l'Espace Administrateur

1. Accédez à la page d'authentification : `http://localhost:3000/admin/login.html`
2. Connectez-vous avec les identifiants par défaut :
   - **Nom d'utilisateur** : `admin`
   - **Mot de passe** : `AdminHaphak2026!`

*(Le compte d'administration est automatiquement créé dans SQLite lors de la première initialisation du serveur).*

---

## 9. Sauvegardes de la Base de Données

Les données des participants sont précieuses. Pour effectuer une sauvegarde :
1. Connectez-vous au **Tableau de Bord Admin**.
2. Allez dans l'onglet **Sauvegardes BD**.
3. Cliquez sur **"Créer une Sauvegarde Maintenant"**.

Une copie complète de la base SQLite est instantanément générée dans le dossier `exports/` sous la forme `haphak_backup_AAAA-MM-JJ...db`.

---

## 10. Exportation des Données

Depuis l'onglet **Participants** de l'espace administration, vous pouvez :
- Exporter la liste des inscrits filtrée sous format **CSV** compatible Excel (bouton *Exporter CSV*).
- Imprimer directement les fiches individuelles avec le bouton *Imprimer Fiche*.

---

## 11. Sécurité & Confidentialité

- **Ne jamais exposer le fichier `.db`** publiquement : La base SQLite se trouve dans le dossier `database/` et n'est pas desservie dans le répertoire public.
- **Requêtes paramétrées** : Toutes les interactions SQL utilisent des requêtes paramétrées pour éliminer tout risque d'injection SQL.
- **Validation serveur** : Toutes les entrées utilisateurs sont nettoyées et validées côté serveur (`validateRegistration.js`).
- **Mots de passe hachés** : Les mots de passe administrateur sont hachés avec le protocole sécurisé `bcrypt`.

---

## 12. Déploiement sur Internet (Serveur Public)

> [!IMPORTANT]
> **Remarque Importante** : Une instance s'exécutant sur `localhost` n'est accessible que depuis votre machine locale. Pour que les participants puissent s'inscrire depuis leur smartphone chez eux via Internet, l'application doit être hébergée sur un serveur public possédant une adresse IP publique ou un nom de domaine.

### Architecture de Déploiement Recommandée :

```
 Participants (Smartphones / PC)
               ↓
            Internet
               ↓
    Serveur Web HTTPS (Nginx / Caddy)
               ↓
    Node.js + Express (Port 3000)
               ↓
        Base de données SQLite
```

### Étapes de déploiement sur un VPS (Ubuntu / Debian) :
1. Installez Node.js et Git sur votre VPS.
2. Clonez le dépôt du projet sur le serveur.
3. Exécutez `npm install`.
4. Configurez les variables d'environnement dans le fichier `.env`.
5. Démarrez l'application avec PM2 (`pm2 start server/server.js`).
6. Configurez **Nginx** comme Reverse Proxy vers `http://127.0.0.1:3000`.

---

## 13. Configuration HTTPS

Il est indispensable de sécuriser l'application en **HTTPS** sur le serveur public.

Exemple de configuration Nginx avec **Certbot (Let's Encrypt)** :

```nginx
server {
    server_name inscription.haphak.org;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

Activez le certificat SSL gratuitement avec :
```bash
sudo certbot --nginx -d inscription.haphak.org
```

---

## 14. Maintenance

- **Journalisation des erreurs** : Le serveur affiche les détails d'exécution dans la console Node.js.
- **Migration future vers PostgreSQL** : Les fonctions d'accès aux données dans `server/database.js` et `controllers/` utilisent une couche d'abstraction (fonctions `get`, `all`, `run`) facilitant la bascule vers PostgreSQL via la bibliothèque `pg` si le nombre de participants dépasse 50 000.

---

© 2026 Retraite HAPHAK. Tous droits réservés.
