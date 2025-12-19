const { Regression } = require('ml-regression-multivariate-linear');

class IA_Trainer {
  // ============ CALCULS FONDAMENTAUX ============
  
  // 1. Calcul du BMI (Indice de Masse Corporelle)
  static calculateBMI(weight, height) {
    const heightInMeters = height / 100;
    const bmi = weight / (heightInMeters * heightInMeters);
    return Math.round(bmi * 10) / 10;
  }

  // 2. Détermination du type de corps
  static getBodyType(bmi) {
    if (bmi < 18.5) return 'ectomorphe';      // Maigre
    if (bmi >= 18.5 && bmi <= 24.9) return 'mésomorphe'; // Athlétique
    return 'endomorphe';                      // Corpulent
  }

  // 3. Calcul du métabolisme de base (BMR)
  static calculateBMR(weight, height, age, gender = 'homme') {
    // Formule de Mifflin-St Jeor
    if (gender === 'homme') {
      return 10 * weight + 6.25 * height - 5 * age + 5;
    } else {
      return 10 * weight + 6.25 * height - 5 * age - 161;
    }
  }

  // 4. Dépense énergétique quotidienne (TDEE)
  static calculateTDEE(user) {
    const bmr = this.calculateBMR(user.weight, user.height, user.age);
    
    // Facteur d'activité
    const activityFactors = {
      'débutant': 1.2,        // Sédentaire
      'intermédiaire': 1.55,   // Modérément actif
      'avancé': 1.9           // Très actif
    };
    
    const activityFactor = activityFactors[user.sportLevel] || 1.375;
    
    return Math.round(bmr * activityFactor);
  }

  // ============ GÉNÉRATION DE PROGRAMME ============

  static generateProgram(user) {
    console.log(`🏋️ Génération programme pour: ${user.email}`);
    console.log(`🎯 Objectif: ${user.goal}, Niveau: ${user.sportLevel}`);

    // Calculs de base
    const bmi = this.calculateBMI(user.weight, user.height);
    const bodyType = this.getBodyType(bmi);
    const tdee = this.calculateTDEE(user);
    
    // Configuration selon l'objectif
    const programConfig = this.getProgramConfig(user.goal, user.sportLevel, bodyType);
    
    // Générer les sessions
    const sessions = this.generateSessions(
      user.trainingDaysPerWeek,
      user.goal,
      user.sportLevel,
      programConfig
    );

    // Calcul nutrition
    const nutrition = this.calculateNutrition(user, tdee, programConfig);

    // Temps estimé pour atteindre l'objectif (en semaines)
    const estimatedTime = this.estimateGoalTime(user, bmi, programConfig);

    // Programme complet
    const program = {
      // Infos de base
      userId: user.id || user._id,
      goal: user.goal,
      sportLevel: user.sportLevel,
      bodyType: bodyType,
      bmi: bmi,
      
      // Durée
      durationWeeks: estimatedTime,
      trainingDays: user.trainingDaysPerWeek,
      
      // Sessions d'entraînement
      sessions: sessions,
      
      // Nutrition
      nutrition: nutrition,
      
      // Calculs
      tdee: tdee,
      bmr: this.calculateBMR(user.weight, user.height, user.age),
      
      // Recommandations
      recommendations: this.getRecommendations(user, bodyType, bmi),
      
      // Métadonnées
      generatedAt: new Date(),
      version: '2.0'
    };

    console.log(`✅ Programme généré: ${sessions.length} sessions, ${estimatedTime} semaines`);
    return program;
  }

  // ============ CONFIGURATION PAR OBJECTIF ============

  static getProgramConfig(goal, level, bodyType) {
    const configs = {
      'perte de poids': {
        focus: 'Cardio + Force endurance',
        intensity: level === 'débutant' ? 'modérée' : 'élevée',
        restBetweenSets: '60-90s',
        repsRange: '12-15',
        cardioMinutes: 30,
        calorieDeficit: 500, // déficit calorique quotidien
        proteinMultiplier: 2.0 // g/kg de poids
      },
      'prise de masse': {
        focus: 'Hypertrophie musculaire',
        intensity: 'élevée',
        restBetweenSets: '90-120s',
        repsRange: '8-12',
        cardioMinutes: 20,
        calorieSurplus: 300, // surplus calorique
        proteinMultiplier: 2.2
      },
      'maintien': {
        focus: 'Équilibre force/cardio',
        intensity: 'modérée',
        restBetweenSets: '75-90s',
        repsRange: '10-12',
        cardioMinutes: 25,
        calorieDeficit: 0,
        proteinMultiplier: 1.8
      },
      'endurance': {
        focus: 'Endurance musculaire/cardiovasculaire',
        intensity: 'modérée à élevée',
        restBetweenSets: '45-60s',
        repsRange: '15-20',
        cardioMinutes: 40,
        calorieDeficit: 200,
        proteinMultiplier: 1.6
      }
    };

    return configs[goal] || configs['maintien'];
  }

  // ============ GÉNÉRATION DES SESSIONS ============

  static generateSessions(daysPerWeek, goal, level, config) {
    const dayTemplates = this.getDayTemplates(daysPerWeek, goal);
    
    const sessions = dayTemplates.map((template, index) => {
      return {
        dayNumber: index + 1,
        dayName: template.day,
        focus: template.focus,
        duration: '60-75 minutes',
        intensity: config.intensity,
        exercises: this.generateExercises(template.muscleGroups, level, config),
        cardio: this.getCardioRecommendation(goal, level),
        tips: this.getSessionTips(template.focus, level)
      };
    });

    return sessions;
  }

  static getDayTemplates(days, goal) {
    // Templates pour différents nombres de jours
    const templates = {
      1: [ // 1 jour - Full Body
        { day: 'Mercredi', focus: 'Full Body', muscleGroups: ['fullbody'] }
      ],
      2: [ // 2 jours - Split Haut/Bas
        { day: 'Lundi', focus: 'Haut du corps', muscleGroups: ['pectoraux', 'dos', 'épaules', 'biceps', 'triceps'] },
        { day: 'Jeudi', focus: 'Bas du corps', muscleGroups: ['quadriceps', 'ischios', 'fessiers', 'mollets', 'abdominaux'] }
      ],
      3: [ // 3 jours - Classique
        { day: 'Lundi', focus: 'Pectoraux/Triceps', muscleGroups: ['pectoraux', 'triceps'] },
        { day: 'Mercredi', focus: 'Dos/Biceps', muscleGroups: ['dos', 'biceps'] },
        { day: 'Vendredi', focus: 'Jambes/Épaules', muscleGroups: ['quadriceps', 'ischios', 'fessiers', 'épaules'] }
      ],
      4: [ // 4 jours - Push/Pull/Legs/Upper
        { day: 'Lundi', focus: 'Push (Pectoraux/Épaules/Triceps)', muscleGroups: ['pectoraux', 'épaules', 'triceps'] },
        { day: 'Mardi', focus: 'Pull (Dos/Biceps)', muscleGroups: ['dos', 'biceps'] },
        { day: 'Jeudi', focus: 'Jambes', muscleGroups: ['quadriceps', 'ischios', 'fessiers', 'mollets'] },
        { day: 'Vendredi', focus: 'Upper Body (Combiné)', muscleGroups: ['pectoraux', 'dos', 'épaules'] }
      ],
      5: [ // 5 jours - Split avancé
        { day: 'Lundi', focus: 'Pectoraux', muscleGroups: ['pectoraux', 'triceps'] },
        { day: 'Mardi', focus: 'Dos', muscleGroups: ['dos', 'biceps'] },
        { day: 'Mercredi', focus: 'Jambes', muscleGroups: ['quadriceps', 'ischios', 'fessiers'] },
        { day: 'Jeudi', focus: 'Épaules', muscleGroups: ['épaules', 'abdominaux'] },
        { day: 'Vendredi', focus: 'Bras + Cardio', muscleGroups: ['biceps', 'triceps'] }
      ],
      6: [ // 6 jours - PPL double
        { day: 'Lundi', focus: 'Push 1', muscleGroups: ['pectoraux', 'épaules', 'triceps'] },
        { day: 'Mardi', focus: 'Pull 1', muscleGroups: ['dos', 'biceps'] },
        { day: 'Mercredi', focus: 'Legs 1', muscleGroups: ['quadriceps', 'ischios', 'fessiers'] },
        { day: 'Jeudi', focus: 'Push 2', muscleGroups: ['pectoraux', 'épaules', 'triceps'] },
        { day: 'Vendredi', focus: 'Pull 2', muscleGroups: ['dos', 'biceps'] },
        { day: 'Samedi', focus: 'Legs 2 + Cardio', muscleGroups: ['quadriceps', 'ischios', 'fessiers'] }
      ],
      7: [ // 7 jours - Intense (avec repos actif)
        { day: 'Lundi', focus: 'Pectoraux + Triceps', muscleGroups: ['pectoraux', 'triceps'] },
        { day: 'Mardi', focus: 'Dos + Biceps', muscleGroups: ['dos', 'biceps'] },
        { day: 'Mercredi', focus: 'Jambes Lourdes', muscleGroups: ['quadriceps', 'ischios', 'fessiers'] },
        { day: 'Jeudi', focus: 'Épaules + Cardio', muscleGroups: ['épaules'] },
        { day: 'Vendredi', focus: 'Full Body léger', muscleGroups: ['fullbody'] },
        { day: 'Samedi', focus: 'Cardio + Abdominaux', muscleGroups: ['abdominaux'] },
        { day: 'Dimanche', focus: 'Repos actif (étirements)' }
      ]
    };

    return templates[days] || templates[3]; // Défaut: 3 jours
  }

  static generateExercises(muscleGroups, level, config) {
    // Bibliothèque d'exercices par groupe musculaire
    const exerciseLibrary = {
      pectoraux: [
        { name: 'Développé couché barre', difficulty: 'intermédiaire' },
        { name: 'Développé couché haltères', difficulty: 'intermédiaire' },
        { name: 'Écarté avec haltères', difficulty: 'débutant' },
        { name: 'Pompes', difficulty: 'débutant' },
        { name: 'Dips', difficulty: 'avancé' },
        { name: 'Développé incliné', difficulty: 'intermédiaire' }
      ],
      dos: [
        { name: 'Tirage vertical', difficulty: 'débutant' },
        { name: 'Rowing barre', difficulty: 'intermédiaire' },
        { name: 'Tirage horizontal', difficulty: 'débutant' },
        { name: 'Tractions', difficulty: 'avancé' },
        { name: 'Pull-over', difficulty: 'intermédiaire' },
        { name: 'Shrugs', difficulty: 'débutant' }
      ],
      épaules: [
        { name: 'Développé militaire', difficulty: 'intermédiaire' },
        { name: 'Élévations latérales', difficulty: 'débutant' },
        { name: 'Élévations frontales', difficulty: 'débutant' },
        { name: 'Oiseau (face inclinée)', difficulty: 'intermédiaire' },
        { name: 'Développé Arnold', difficulty: 'avancé' }
      ],
      biceps: [
        { name: 'Curl barre droite', difficulty: 'débutant' },
        { name: 'Curl haltères', difficulty: 'débutant' },
        { name: 'Curl marteau', difficulty: 'intermédiaire' },
        { name: 'Curl concentration', difficulty: 'intermédiaire' },
        { name: 'Curl pupitre', difficulty: 'intermédiaire' }
      ],
      triceps: [
        { name: 'Extensions à la poulie', difficulty: 'débutant' },
        { name: 'Barre au front', difficulty: 'intermédiaire' },
        { name: 'Dips entre bancs', difficulty: 'intermédiaire' },
        { name: 'Kickback', difficulty: 'intermédiaire' },
        { name: 'Extensions haltère', difficulty: 'débutant' }
      ],
      quadriceps: [
        { name: 'Squat barre', difficulty: 'intermédiaire' },
        { name: 'Presse à cuisses', difficulty: 'débutant' },
        { name: 'Fentes marchées', difficulty: 'intermédiaire' },
        { name: 'Extensions de jambes', difficulty: 'débutant' },
        { name: 'Squat bulgare', difficulty: 'avancé' }
      ],
      ischios: [
        { name: 'Soulevé de terre', difficulty: 'intermédiaire' },
        { name: 'Leg curl assis', difficulty: 'débutant' },
        { name: 'Leg curl allongé', difficulty: 'débutant' },
        { name: 'Good morning', difficulty: 'avancé' }
      ],
      fessiers: [
        { name: 'Hip thrust', difficulty: 'intermédiaire' },
        { name: 'Squat sumo', difficulty: 'intermédiaire' },
        { name: 'Abductions à la machine', difficulty: 'débutant' },
        { name: 'Fentes latérales', difficulty: 'intermédiaire' },
        { name: 'Pont fessier', difficulty: 'débutant' }
      ],
      mollets: [
        { name: 'Mollets debout', difficulty: 'débutant' },
        { name: 'Mollets assis', difficulty: 'débutant' },
        { name: 'Mollets à la presse', difficulty: 'intermédiaire' }
      ],
      abdominaux: [
        { name: 'Crunch', difficulty: 'débutant' },
        { name: 'Planche', difficulty: 'intermédiaire' },
        { name: 'Relevé de jambes', difficulty: 'intermédiaire' },
        { name: 'Russian twist', difficulty: 'intermédiaire' },
        { name: 'Mountain climbers', difficulty: 'intermédiaire' },
        { name: 'Leg raises', difficulty: 'avancé' }
      ],
      fullbody: [
        { name: 'Squat', difficulty: 'intermédiaire' },
        { name: 'Développé couché', difficulty: 'intermédiaire' },
        { name: 'Rowing barre', difficulty: 'intermédiaire' },
        { name: 'Fentes', difficulty: 'intermédiaire' },
        { name: 'Planche', difficulty: 'débutant' }
      ]
    };

    // Sélectionner les exercices selon le niveau
    let exercises = [];
    
    muscleGroups.forEach(group => {
      const groupExercises = exerciseLibrary[group] || [];
      
      // Filtrer par niveau
      const filteredExercises = groupExercises.filter(ex => {
        if (level === 'débutant') return ex.difficulty === 'débutant';
        if (level === 'intermédiaire') return ex.difficulty !== 'avancé';
        return true; // 'avancé' prend tout
      });

      // Prendre 2-3 exercices par groupe
      const selected = filteredExercises.slice(0, level === 'débutant' ? 2 : 3);
      
      selected.forEach(ex => {
        exercises.push({
          name: ex.name,
          muscleGroup: group,
          sets: this.calculateSets(level),
          reps: config.repsRange,
          rest: config.restBetweenSets,
          difficulty: ex.difficulty
        });
      });
    });

    return exercises.slice(0, 8); // Limiter à 8 exercices max
  }

  static calculateSets(level) {
    const sets = {
      'débutant': 3,
      'intermédiaire': 4,
      'avancé': 5
    };
    return sets[level] || 3;
  }

  // ============ CALCUL NUTRITION ============

  static calculateNutrition(user, tdee, config) {
    // Ajuster les calories selon l'objectif
    let dailyCalories = tdee;
    
    if (config.calorieDeficit) {
      dailyCalories -= config.calorieDeficit;
    } else if (config.calorieSurplus) {
      dailyCalories += config.calorieSurplus;
    }

    // Macronutriments
    const protein = Math.round(user.weight * config.proteinMultiplier);
    const fats = Math.round((dailyCalories * 0.25) / 9); // 25% des calories, 9 cal/g
    const carbs = Math.round((dailyCalories - (protein * 4) - (fats * 9)) / 4);

    return {
      dailyCalories: Math.round(dailyCalories),
      macronutrients: {
        protein: protein,
        carbs: carbs,
        fats: fats
      },
      water: Math.round(user.weight * 0.035), // en litres
      mealsPerDay: user.goal === 'perte de poids' ? 4 : 5,
      supplements: this.getSupplements(user.goal)
    };
  }

  static getSupplements(goal) {
    const supplements = {
      'prise de masse': ['Créatine (5g/jour)', 'BCAA', 'Protéine en poudre'],
      'perte de poids': ['Caféine avant cardio', 'Brûleur de graisse naturel (thé vert)'],
      'endurance': ['BCAA', 'Beta-alanine', 'Citrulline'],
      'default': ['Multivitamines', 'Oméga-3']
    };
    
    return supplements[goal] || supplements.default;
  }

  // ============ ESTIMATION TEMPS OBJECTIF ============

  static estimateGoalTime(user, bmi, config) {
    // Estimation en semaines
    
    const baseTime = {
      'perte de poids': 12,
      'prise de masse': 16,
      'maintien': 8,
      'endurance': 10
    }[user.goal] || 12;

    // Ajustements
    let adjustments = 0;
    
    // Ajustement selon le niveau
    adjustments += user.sportLevel === 'débutant' ? 4 : 0;
    adjustments += user.sportLevel === 'avancé' ? -2 : 0;
    
    // Ajustement selon le BMI
    if (user.goal === 'perte de poids') {
      if (bmi > 30) adjustments += 8; // Obésité
      else if (bmi > 25) adjustments += 4; // Surpoids
    }

    return Math.max(4, baseTime + adjustments); // Minimum 4 semaines
  }

  // ============ RECOMMANDATIONS PERSONNALISÉES ============

  static getRecommendations(user, bodyType, bmi) {
    const recommendations = [];
    
    // Selon le type de corps
    if (bodyType === 'ectomorphe') {
      recommendations.push('Priorisez les calories et les glucides complexes');
      recommendations.push('Entraînez-vous moins longtemps mais plus intensément');
    } else if (bodyType === 'endomorphe') {
      recommendations.push('Augmentez le cardio à faible intensité');
      recommendations.push('Contrôlez votre apport en glucides');
    }

    // Selon l'objectif
    if (user.goal === 'perte de poids') {
      recommendations.push('Marchez 30 minutes supplémentaires par jour');
      recommendations.push('Buvez 500ml d\'eau avant chaque repas');
    } else if (user.goal === 'prise de masse') {
      recommendations.push('Prenez un shake protéiné dans les 30min post-entraînement');
      recommendations.push('Dormez au moins 8 heures par nuit');
    }

    // Selon le BMI
    if (bmi > 25) {
      recommendations.push('Consultez un professionnel de santé avant de commencer');
    }

    return recommendations;
  }

  static getSessionTips(focus, level) {
    const tips = {
      'Pectoraux': ['Gardez les omoplates serrées', 'Ne verrouillez pas les coudes'],
      'Dos': ['Tirez avec les coudes, pas avec les bras', 'Maintenez le dos droit'],
      'Jambes': ['Gardez les genoux alignés avec les pieds', 'Descendez jusqu\'à 90°'],
      'Full Body': ['Commencez par les exercices composés', 'Écoutez votre corps']
    };

    return tips[focus] || [
      'Échauffez-vous 10 minutes avant',
      'Maintenez une bonne forme d\'exécution',
      level === 'débutant' ? 'Utilisez des poids légers pour apprendre la technique' : 'Augmentez progressivement les charges'
    ];
  }

  static getCardioRecommendation(goal, level) {
    const cardio = {
      'perte de poids': {
        type: 'HIIT ou Cardio steady-state',
        frequency: '3-4 fois/semaine',
        duration: level === 'débutant' ? '20-30min' : '30-45min'
      },
      'prise de masse': {
        type: 'Cardio léger',
        frequency: '2 fois/semaine',
        duration: '20min'
      },
      'endurance': {
        type: 'Cardio varié (course, vélo, natation)',
        frequency: '4-5 fois/semaine',
        duration: '30-60min'
      },
      'default': {
        type: 'Cardio modéré',
        frequency: '3 fois/semaine',
        duration: '25-35min'
      }
    };

    return cardio[goal] || cardio.default;
  }
}

module.exports = IA_Trainer;