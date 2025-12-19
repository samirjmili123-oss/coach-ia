const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dailyLogRoutes = require('./routes/dailyLogs');
const statisticsRoutes = require('./routes/statistics');
require('dotenv').config();

const app = express();

// Middleware
const corsOptions = {
  origin: process.env.NODE_ENV === 'production'
    ? process.env.FRONTEND_URL || '*'
    : '*',
  credentials: true
};
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.static('public'));
app.use('/api/daily-logs', dailyLogRoutes);
app.use('/api/statistics', statisticsRoutes);
app.use(express.static('public'));

// Base de données en mémoire (fallback si MongoDB échoue)
const database = {
  users: [],
  programs: [],
  dailyLogs: [],
  nextUserId: 1
};

// Stockage global
global.database = database;

// Import des routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const programRoutes = require('./routes/programs');

// Routes API
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/programs', programRoutes);
app.use('/api/chat', require('./routes/chat'));

// Route de test
app.get('/statistics', (req, res) => {
  res.sendFile(__dirname + '/public/statistics.html');
})
app.get('/api/health', async (req, res) => {
  try {
    const mongoStatus = mongoose.connection.readyState === 1 ? 'connecté' : 'non connecté';

    res.json({
      status: 'OK',
      message: 'Coach IA API fonctionnelle',
      database: {
        mongo: mongoStatus,
        inMemory: {
          users: database.users.length,
          programs: database.programs.length
        }
      }
    });
  } catch (error) {
    res.json({
      status: 'OK (mode inMemory)',
      message: 'API fonctionnelle sans MongoDB'
    });
  }
});

// Route racine
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/../public/index.html');
});

// Connexion MongoDB avec fallback
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/coach_ia';

async function connectToMongoDB() {
  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ MongoDB connecté avec succès');
    console.log(`📊 Base de données: ${mongoose.connection.db.databaseName}`);

    // Créer les index pour les performances
    await mongoose.model('User').createIndexes();

  } catch (error) {
    console.log('⚠️ MongoDB non disponible - Mode inMemory activé');
    console.log('💡 Pour activer MongoDB:');
    console.log('   1. Assurez-vous que le service MongoDB est démarré');
    console.log('   2. Vérifiez la connexion: mongodb://127.0.0.1:27017');
    console.log('   3. Redémarrez le serveur');
  }
}

const PORT = process.env.PORT || 3000;

// Démarrer le serveur
async function startServer() {
  await connectToMongoDB();

  app.listen(PORT, () => {
    console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`);
    console.log(`🔗 API Test: http://localhost:${PORT}/api/health`);
    console.log(`📱 Dashboard: http://localhost:${PORT}/dashboard.html`);
  });
}

startServer().catch(console.error);