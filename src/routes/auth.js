const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { User, UserInMemory, getUserModel } = require('../models/User');

// INSCRIPTION avec support dual (MongoDB + inMemory)
router.post('/signup', async (req, res) => {
  console.log('📝 Tentative d\'inscription reçue:', req.body.email);
  try {
    const { email, password, age, height, weight, sportLevel, trainingDaysPerWeek, goal } = req.body;

    // Validation
    if (!email || !password || !age || !height || !weight) {
      return res.status(400).json({
        success: false,
        message: 'Tous les champs sont requis'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Le mot de passe doit avoir au moins 6 caractères'
      });
    }

    const { isMongoConnected, model } = getUserModel();

    if (isMongoConnected) {
      // ✅ MODE MONGODB
      // Vérifier si l'email existe déjà
      const existingUser = await model.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Cet email est déjà utilisé'
        });
      }

      // Créer l'utilisateur avec Mongoose
      const user = new model({
        email,
        password, // Sera hashé automatiquement par le pre-save
        age: parseInt(age),
        height: parseFloat(height),
        weight: parseFloat(weight),
        sportLevel,
        trainingDaysPerWeek: parseInt(trainingDaysPerWeek),
        goal
      });

      await user.save();

      // Créer le token JWT
      const token = jwt.sign(
        { userId: user._id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: '30d' }
      );

      res.status(201).json({
        success: true,
        token,
        user: user.toJSON(),
        database: 'mongodb'
      });

      console.log(`✅ [MongoDB] Nouvel utilisateur: ${email}`);

    } else {
      // ⚠️ MODE INMEMORY (fallback)
      // Vérifier si l'email existe déjà
      const existingUser = global.database.users.find(u => u.email === email);
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Cet email est déjà utilisé'
        });
      }

      // Hasher le mot de passe
      const hashedPassword = await bcrypt.hash(password, 10);

      // Créer l'utilisateur
      const user = new UserInMemory({
        id: global.database.nextUserId++,
        email,
        password: hashedPassword,
        age: parseInt(age),
        height: parseFloat(height),
        weight: parseFloat(weight),
        sportLevel,
        trainingDaysPerWeek: parseInt(trainingDaysPerWeek),
        goal
      });

      // Sauvegarder
      global.database.users.push(user);

      // Créer le token JWT
      const token = jwt.sign(
        { userId: user.id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: '30d' }
      );

      res.status(201).json({
        success: true,
        token,
        user: user.toJSON(),
        database: 'inmemory'
      });

      console.log(`⚠️ [InMemory] Nouvel utilisateur: ${email}`);
    }

  } catch (error) {
    console.error('Erreur inscription:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
});

// CONNEXION avec support dual
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const { isMongoConnected, model } = getUserModel();

    if (isMongoConnected) {
      // ✅ MODE MONGODB
      const user = await model.findOne({ email });
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Email ou mot de passe incorrect'
        });
      }

      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Email ou mot de passe incorrect'
        });
      }

      const token = jwt.sign(
        { userId: user._id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: '30d' }
      );

      res.json({
        success: true,
        token,
        user: user.toJSON(),
        database: 'mongodb'
      });

    } else {
      // ⚠️ MODE INMEMORY
      const userData = global.database.users.find(u => u.email === email);
      if (!userData) {
        return res.status(401).json({
          success: false,
          message: 'Email ou mot de passe incorrect'
        });
      }

      const user = new UserInMemory(userData);
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Email ou mot de passe incorrect'
        });
      }

      const token = jwt.sign(
        { userId: user.id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: '30d' }
      );

      res.json({
        success: true,
        token,
        user: user.toJSON(),
        database: 'inmemory'
      });
    }

  } catch (error) {
    console.error('Erreur connexion:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

module.exports = router;