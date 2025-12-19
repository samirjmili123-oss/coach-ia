# 🤖 Coach IA - Application de Coaching Fitness Intelligent

Application web de coaching fitness personnalisé avec intelligence artificielle, génération de programmes d'entraînement, plans nutritionnels et statistiques avancées basées sur le Machine Learning.

## 🚀 Démarrage Rapide

### Prérequis
- Node.js >= 18.0.0
- npm >= 9.0.0
- MongoDB (optionnel - fonctionne en mode in-memory)

### Installation

```bash
# Cloner le projet
git clone <votre-repo>
cd coach-ia-nouveau

# Installer les dépendances
npm install

# Configurer les variables d'environnement
cp .env.example .env
# Éditer .env avec vos valeurs

# Démarrer en mode développement
npm run dev

# Démarrer en mode production
npm start
```

L'application sera accessible sur `http://localhost:3000`

## 🔑 Variables d'Environnement

Créez un fichier `.env` à la racine avec les variables suivantes:

```env
# Port du serveur
PORT=3000

# Environnement (development ou production)
NODE_ENV=development

# Secret pour JWT (changez cette valeur!)
JWT_SECRET=votre_secret_super_securise_ici

# Clé API Groq pour le chat IA
GROQ_API_KEY=votre_cle_groq_api

# MongoDB (optionnel - utilise in-memory si absent)
MONGODB_URI=mongodb://127.0.0.1:27017/coach_ia

# URL du frontend en production (optionnel)
FRONTEND_URL=https://votre-domaine.com
```

## 📦 Fonctionnalités

- ✅ **Authentification sécurisée** avec JWT
- ✅ **Génération de programmes d'entraînement** personnalisés
- ✅ **Plans nutritionnels** avec calcul des macronutriments
- ✅ **Suivi quotidien** (entraînement, nutrition, sommeil, humeur)
- ✅ **Statistiques avancées** avec Machine Learning
- ✅ **Chat IA** avec coach virtuel (Llama 3.3-70b)
- ✅ **Prédictions** de progression et d'atteinte des objectifs
- ✅ **Mode hors-ligne** avec base de données in-memory

## 🏗️ Structure du Projet

```
coach-ia-nouveau/
├── public/              # Frontend (HTML/CSS/JS)
│   ├── index.html      # Page de connexion/inscription
│   ├── dashboard.html  # Tableau de bord principal
│   ├── chat.html       # Interface de chat IA
│   └── statistics.html # Statistiques détaillées
├── src/
│   ├── server.js       # Point d'entrée du serveur
│   ├── middleware/     # Middleware d'authentification
│   ├── models/         # Modèles MongoDB
│   ├── routes/         # Routes API
│   └── utils/          # Algorithmes IA (trainer, nutrition)
├── package.json
├── render.yaml         # Configuration Render
└── .env               # Variables d'environnement
```

## 🌐 Déploiement

### Déploiement sur Render (Gratuit)

1. Créez un compte sur [render.com](https://render.com)
2. Connectez votre dépôt GitHub
3. Render détectera automatiquement `render.yaml`
4. Ajoutez la variable d'environnement `GROQ_API_KEY`
5. Déployez!

**Note**: Le fichier `render.yaml` est déjà configuré.

### Variables d'environnement à configurer sur Render:

- `GROQ_API_KEY` - Votre clé API Groq (obligatoire)
- `MONGODB_URI` - Connection string MongoDB (optionnel)
- `FRONTEND_URL` - URL de votre application (optionnel)

Les autres variables (`PORT`, `NODE_ENV`, `JWT_SECRET`) sont générées automatiquement.

### Autres plateformes

Consultez le guide complet dans `deployment_guide.md` pour:
- Railway
- Vercel + MongoDB Atlas
- Heroku
- DigitalOcean

## 🔧 Scripts NPM

```bash
npm start       # Démarrer le serveur en production
npm run dev     # Démarrer en mode développement (avec nodemon)
```

## 📊 API Endpoints

### Authentication
- `POST /api/auth/signup` - Créer un compte
- `POST /api/auth/login` - Se connecter

### Programmes
- `POST /api/programs/generate` - Générer un programme
- `GET /api/programs/my-programs` - Mes programmes
- `GET /api/programs/:id` - Programme spécifique
- `POST /api/programs/:id/progress` - Mettre à jour la progression

### Nutrition
- `GET /api/programs/nutrition/detailed-plan` - Plan nutritionnel détaillé
- `GET /api/programs/nutrition/simple-plan` - Plan simple

### Suivi Quotidien
- `POST /api/daily-logs` - Créer un log quotidien
- `GET /api/daily-logs` - Récupérer les logs

### Statistiques
- `GET /api/statistics/advanced` - Statistiques ML avancées

### Chat IA
- `POST /api/chat` - Envoyer un message au coach IA

## 🧪 Tests

Testez l'API avec:

```bash
# Vérifier la santé de l'API
curl http://localhost:3000/api/health
```

## 🛡️ Sécurité

- Mots de passe hashés avec bcrypt
- Authentification JWT
- CORS configuré pour la production
- Variables d'environnement pour les secrets
- Validation des entrées utilisateur

## 📝 Technologies

- **Backend**: Node.js, Express.js
- **Base de données**: MongoDB (avec Mongoose)
- **IA/ML**: Groq API (Llama 3.3), Regression models
- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Charts**: Chart.js
- **Auth**: JWT, bcryptjs

## 🤝 Contribution

Les contributions sont les bienvenues! N'hésitez pas à ouvrir une issue ou une pull request.

## 📄 Licence

ISC

## 🆘 Support

Pour toute question ou problème:
1. Consultez le `deployment_guide.md`
2. Vérifiez les logs de votre serveur
3. Testez l'endpoint `/api/health`

---

**Développé avec ❤️ pour votre santé et votre forme physique**
