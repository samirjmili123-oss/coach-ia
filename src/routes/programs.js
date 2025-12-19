const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const IA_Trainer = require('../utils/trainer');
const Program = require('../models/program');
const { getUserModel } = require('../models/User');
const NutritionCoach = require('../utils/nutrition');

// ============ GÉNÉRER UN PROGRAMME ============
router.post('/generate', auth, async (req, res) => {
  try {
    console.log('🎯 Génération programme demandée');
    
    const { isMongoConnected, model: UserModel } = getUserModel();
    let user;

    if (isMongoConnected) {
      // ✅ MODE MONGODB
      user = await UserModel.findById(req.userId);
      if (!user) {
        return res.status(404).json({ 
          success: false, 
          message: 'Utilisateur non trouvé' 
        });
      }
    } else {
      // ⚠️ MODE INMEMORY
      const userData = global.database.users.find(u => u.id === req.userId);
      if (!userData) {
        return res.status(404).json({ 
          success: false, 
          message: 'Utilisateur non trouvé' 
        });
      }
      user = userData;
    }

    // Générer le programme avec IA
    const programData = IA_Trainer.generateProgram(user);

    // Sauvegarder selon le mode
    let savedProgram;
    
    if (isMongoConnected && Program) {
      // ✅ Sauvegarde MongoDB
      const program = new Program({
        userId: req.userId,
        ...programData
      });
      savedProgram = await program.save();
    } else {
      // ⚠️ Sauvegarde inMemory
      savedProgram = {
        id: Date.now(),
        userId: req.userId,
        ...programData,
        createdAt: new Date(),
        progress: []
      };
      global.database.programs.push(savedProgram);
    }

    console.log(`✅ Programme généré pour ${user.email}`);
    
    res.json({
      success: true,
      message: 'Programme généré avec succès !',
      program: savedProgram,
      database: isMongoConnected ? 'mongodb' : 'inmemory'
    });

  } catch (error) {
    console.error('❌ Erreur génération programme:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la génération',
      error: error.message 
    });
  }
});

// ============ RÉCUPÉRER MES PROGRAMMES ============
router.get('/my-programs', auth, async (req, res) => {
  try {
    const { isMongoConnected } = getUserModel();
    let programs;

    if (isMongoConnected && Program) {
      // ✅ MongoDB
      programs = await Program.find({ userId: req.userId })
        .sort({ createdAt: -1 })
        .select('-sessions.exercises');
    } else {
      // ⚠️ InMemory
      programs = global.database.programs
        .filter(p => p.userId === req.userId)
        .map(p => ({
          id: p.id,
          goal: p.goal,
          durationWeeks: p.durationWeeks,
          createdAt: p.createdAt,
          progress: p.progress.length
        }));
    }

    res.json({
      success: true,
      programs: programs || [],
      count: programs ? programs.length : 0
    });

  } catch (error) {
    console.error('Erreur récupération programmes:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur' 
    });
  }
});

// ============ RÉCUPÉRER UN PROGRAMME SPÉCIFIQUE ============
router.get('/:id', auth, async (req, res) => {
  try {
    const { isMongoConnected } = getUserModel();
    let program;

    if (isMongoConnected && Program) {
      // ✅ MongoDB
      program = await Program.findOne({ 
        _id: req.params.id, 
        userId: req.userId 
      });
    } else {
      // ⚠️ InMemory
      program = global.database.programs.find(
        p => p.id === parseInt(req.params.id) && p.userId === req.userId
      );
    }

    if (!program) {
      return res.status(404).json({ 
        success: false, 
        message: 'Programme non trouvé' 
      });
    }

    res.json({
      success: true,
      program: program
    });

  } catch (error) {
    console.error('Erreur récupération programme:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur' 
    });
  }
});

// ============ METTRE À JOUR LA PROGRESSION ============
router.post('/:id/progress', auth, async (req, res) => {
  try {
    const { sessionCompleted, weight, notes, rating } = req.body;
    
    const progressEntry = {
      date: new Date(),
      sessionCompleted,
      weight: weight || null,
      notes: notes || '',
      rating: rating || 0
    };

    const { isMongoConnected } = getUserModel();
    
    if (isMongoConnected && Program) {
      // ✅ MongoDB
      await Program.findOneAndUpdate(
        { _id: req.params.id, userId: req.userId },
        { $push: { progress: progressEntry } }
      );
    } else {
      // ⚠️ InMemory
      const programIndex = global.database.programs.findIndex(
        p => p.id === parseInt(req.params.id) && p.userId === req.userId
      );
      
      if (programIndex !== -1) {
        global.database.programs[programIndex].progress.push(progressEntry);
      }
    }

    res.json({
      success: true,
      message: 'Progression enregistrée !',
      progress: progressEntry
    });

  } catch (error) {
    console.error('Erreur enregistrement progression:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur' 
    });
  }
});

// ============ GÉNÉRER PLAN NUTRITION DÉTAILLÉ ============
router.get('/nutrition/detailed-plan', auth, async (req, res) => {
  try {
    console.log('🍽️ Génération plan nutrition détaillé demandée');
    
    const { isMongoConnected, model: UserModel } = getUserModel();
    let user;

    if (isMongoConnected) {
      // ✅ MODE MONGODB
      user = await UserModel.findById(req.userId);
      if (!user) {
        return res.status(404).json({ 
          success: false, 
          message: 'Utilisateur non trouvé' 
        });
      }
    } else {
      // ⚠️ MODE INMEMORY
      const userData = global.database.users.find(u => u.id === req.userId);
      if (!userData) {
        return res.status(404).json({ 
          success: false, 
          message: 'Utilisateur non trouvé' 
        });
      }
      user = userData;
    }

    // Générer le plan nutrition avec IA
    const nutritionPlan = NutritionCoach.generateNutritionPlan(user);

    res.json({
      success: true,
      message: 'Plan nutrition généré avec succès !',
      nutrition: nutritionPlan,
      database: isMongoConnected ? 'mongodb' : 'inmemory'
    });

  } catch (error) {
    console.error('❌ Erreur génération nutrition:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la génération',
      error: error.message 
    });
  }
});

// ============ PLAN NUTRITION SIMPLE ============
router.get('/nutrition/simple-plan', auth, async (req, res) => {
  try {
    const { isMongoConnected, model: UserModel } = getUserModel();
    let user;

    if (isMongoConnected) {
      user = await UserModel.findById(req.userId);
    } else {
      const userData = global.database.users.find(u => u.id === req.userId);
      user = userData;
    }

    if (!user) {
      return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
    }

    // Plan simplifié pour affichage rapide
    const dailyCalories = NutritionCoach.calculateDailyCalories(user, user.goal);
    const macros = NutritionCoach.calculateMacros(user, dailyCalories, user.goal);
    const water = NutritionCoach.calculateWater(user, user.sportLevel);

    res.json({
      success: true,
      plan: {
        calories: dailyCalories,
        macros: macros,
        water: water + ' L/jour',
        mealsPerDay: 5,
        goal: user.goal
      }
    });

  } catch (error) {
    console.error('Erreur plan simple:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// ============ NUTRITION D'UN PROGRAMME SPÉCIFIQUE ============
router.get('/:id/nutrition', auth, async (req, res) => {
  try {
    const { isMongoConnected } = getUserModel();
    let program;

    if (isMongoConnected && Program) {
      program = await Program.findOne({ 
        _id: req.params.id, 
        userId: req.userId 
      });
    } else {
      program = global.database.programs.find(
        p => p.id === parseInt(req.params.id) && p.userId === req.userId
      );
    }

    if (!program || !program.nutrition) {
      return res.status(404).json({ 
        success: false, 
        message: 'Plan nutrition non trouvé pour ce programme' 
      });
    }

    // Utiliser la nutrition déjà générée du programme
    res.json({
      success: true,
      nutrition: program.nutrition,
      programGoal: program.goal,
      programId: program._id || program.id
    });

  } catch (error) {
    console.error('Erreur nutrition programme:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur' 
    });
  }
});

module.exports = router;