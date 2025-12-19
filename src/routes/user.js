const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { User, UserInMemory, getUserModel } = require('../models/User');

// GET profil utilisateur
router.get('/me', auth, async (req, res) => {
  try {
    const { isMongoConnected, model } = getUserModel();

    if (isMongoConnected) {
      // ✅ MODE MONGODB
      const user = await model.findById(req.userId).select('-password');
      if (!user) {
        return res.status(404).json({ 
          success: false,
          message: 'Utilisateur non trouvé' 
        });
      }

      res.json({
        success: true,
        user: user.toJSON(),
        database: 'mongodb'
      });

    } else {
      // ⚠️ MODE INMEMORY
      const userData = global.database.users.find(u => u.id === req.userId);
      if (!userData) {
        return res.status(404).json({ 
          success: false,
          message: 'Utilisateur non trouvé' 
        });
      }

      const user = new UserInMemory(userData);
      res.json({
        success: true,
        user: user.toJSON(),
        database: 'inmemory'
      });
    }

  } catch (error) {
    console.error('Erreur récupération profil:', error);
    res.status(500).json({ 
      success: false,
      message: 'Erreur serveur' 
    });
  }
});

// UPDATE profil utilisateur
router.put('/me', auth, async (req, res) => {
  try {
    const { age, height, weight, sportLevel, trainingDaysPerWeek, goal } = req.body;
    const { isMongoConnected, model } = getUserModel();

    if (isMongoConnected) {
      // ✅ MODE MONGODB
      const user = await model.findById(req.userId);
      if (!user) {
        return res.status(404).json({ 
          success: false,
          message: 'Utilisateur non trouvé' 
        });
      }

      // Mettre à jour les champs
      if (age !== undefined) user.age = parseInt(age);
      if (height !== undefined) user.height = parseFloat(height);
      if (weight !== undefined) user.weight = parseFloat(weight);
      if (sportLevel !== undefined) user.sportLevel = sportLevel;
      if (trainingDaysPerWeek !== undefined) user.trainingDaysPerWeek = parseInt(trainingDaysPerWeek);
      if (goal !== undefined) user.goal = goal;

      await user.save();

      res.json({
        success: true,
        message: 'Profil mis à jour',
        user: user.toJSON(),
        database: 'mongodb'
      });

    } else {
      // ⚠️ MODE INMEMORY
      const userIndex = global.database.users.findIndex(u => u.id === req.userId);
      if (userIndex === -1) {
        return res.status(404).json({ 
          success: false,
          message: 'Utilisateur non trouvé' 
        });
      }

      // Mettre à jour
      if (age !== undefined) global.database.users[userIndex].age = parseInt(age);
      if (height !== undefined) global.database.users[userIndex].height = parseFloat(height);
      if (weight !== undefined) global.database.users[userIndex].weight = parseFloat(weight);
      if (sportLevel !== undefined) global.database.users[userIndex].sportLevel = sportLevel;
      if (trainingDaysPerWeek !== undefined) global.database.users[userIndex].trainingDaysPerWeek = parseInt(trainingDaysPerWeek);
      if (goal !== undefined) global.database.users[userIndex].goal = goal;

      const updatedUser = new UserInMemory(global.database.users[userIndex]);

      res.json({
        success: true,
        message: 'Profil mis à jour',
        user: updatedUser.toJSON(),
        database: 'inmemory'
      });
    }

  } catch (error) {
    console.error('Erreur mise à jour profil:', error);
    res.status(500).json({ 
      success: false,
      message: 'Erreur serveur' 
    });
  }
});

module.exports = router;