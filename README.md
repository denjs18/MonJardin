# MonJardin 🌱

Application Progressive Web App (PWA) de gestion de jardin, mobile-first, construite avec Next.js 14.

![MonJardin](https://img.shields.io/badge/version-1.0.0-green)
![Next.js](https://img.shields.io/badge/Next.js-14-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38bdf8)

## Fonctionnalités

### 🌡️ Tableau de bord
- Widget météo en temps réel via Open-Meteo API
- Conseils de jardinage basés sur la météo
- Liste des plantes prêtes à récolter
- Alertes maladies

### 🗺️ Vue 3D du jardin
- Visualisation interactive avec React Three Fiber
- Marqueurs colorés selon le statut des plantes
- Contrôles tactiles (rotation, zoom, pan)
- Informations au clic sur chaque plante

### 🌿 Gestion des plantations
- Catalogue complet de 30+ plantes (légumes, herbes, fleurs)
- Suivi de croissance avec timeline
- Calcul automatique des dates de récolte
- Événements (arrosage, taille, récolte, maladies...)

### 🤝 Plantes compagnes
- Conseils d'associations bénéfiques
- Alertes pour les plantes incompatibles
- Score de compatibilité par position

### 📅 Calendrier
- Calendrier lunaire simplifié
- Recommandations saisonnières
- Jours favorables pour chaque type de plante

### ♻️ Suivi du compost
- Guide du compostage en 5 étapes
- Suivi des couches (verts/bruns)
- Rappels de retournement
- Estimation de maturité

### 📊 Historique
- Timeline année par année
- Statistiques de réussite par plante
- Comparaison des saisons

## Stack technique

- **Framework**: Next.js 14 (App Router)
- **Langage**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **3D**: React Three Fiber + Drei
- **State**: Zustand (persisté en localStorage)
- **Base de données**: Firebase Firestore (optionnel)
- **Météo**: Open-Meteo API (gratuit, sans clé)
- **PWA**: next-pwa

## Installation

### Prérequis
- Node.js 18+
- npm ou yarn

### Installation locale

```bash
# Cloner le repo
git clone https://github.com/votre-username/monjardin.git
cd monjardin

# Installer les dépendances
npm install

# Copier les variables d'environnement
cp .env.local.example .env.local

# Lancer en développement
npm run dev
```

L'application sera accessible sur http://localhost:3000

### Configuration Firebase (optionnel)

Pour activer la synchronisation cloud, créez un projet Firebase et remplissez les variables dans `.env.local`:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=votre_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=votre_projet.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=votre_projet_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=votre_projet.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef
```

Sans Firebase, l'application fonctionne en mode hors-ligne avec localStorage.

## Déploiement sur Vercel

### Via l'interface Vercel

1. Connectez votre repo GitHub à Vercel
2. Ajoutez les variables d'environnement
3. Déployez !

### Via CLI

```bash
npm i -g vercel
vercel
```

## Structure du projet

```
/app
  /dashboard         → Page d'accueil
  /garden            → Vue 3D interactive
  /plants            → Gestion des plantations
  /planting          → Calendrier lunaire
  /history           → Historique
  /compost           → Suivi compost
  /settings          → Paramètres

/components
  /3d                → Composants React Three Fiber
  /weather           → Widget météo
  /plants            → Cards, formulaires
  /garden            → Grille, légende
  /ui                → shadcn/ui components
  /layout            → Header, BottomNav

/lib
  /firebase.ts       → Config Firebase
  /openmeteo.ts      → Client météo
  /companion.ts      → Logique plantes compagnes
  /plantCatalog.ts   → Catalogue de plantes
  /growthEngine.ts   → Calculs de croissance
  /store.ts          → Zustand stores
  /types.ts          → Types TypeScript

/data
  /plant_catalog.json      → Catalogue complet
  /companion_planting.json → Relations entre plantes
```

## Scripts disponibles

```bash
npm run dev      # Développement
npm run build    # Build production
npm run start    # Serveur production
npm run lint     # Linter
```

## Personnalisation

### Ajouter une plante au catalogue

Éditez `/data/plant_catalog.json` :

```json
{
  "id": "ma-plante",
  "name": "Ma Plante",
  "emoji": "🌱",
  "type": "legume",
  "family": "Famille",
  "sowingMonths": [3, 4, 5],
  "plantingMonths": [5, 6],
  "harvestMonths": [7, 8, 9],
  "daysToMaturity": 60,
  "spacing": { "row": 40, "plant": 30 },
  "exposure": "full-sun",
  "waterNeeds": "medium",
  "soilType": ["riche", "drainé"],
  "companions": ["tomate", "basilic"],
  "enemies": ["fenouil"],
  "repels": [],
  "attracts": ["abeilles"],
  "tips": ["Conseil 1", "Conseil 2"],
  "description": "Description de la plante"
}
```

### Modifier les couleurs

Les couleurs sont définies dans `tailwind.config.ts` :

- `primary`: Vert forêt (#4A7C59)
- `secondary`: Terre (#8B6914)
- `accent`: Vert tendre (#C5E8C5)

## Licence

MIT

## Auteur

Créé avec ❤️ pour les jardiniers
