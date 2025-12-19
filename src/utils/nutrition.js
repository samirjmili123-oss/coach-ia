const { Regression } = require('ml-regression-multivariate-linear');

class NutritionCoach {
  // ============ CALCULS NUTRITIONNELS ============

  // 1. Calcul des besoins caloriques quotidiens
  static calculateDailyCalories(user, goal) {
    // Formule de Mifflin-St Jeor pour BMR
    let bmr;
    if (user.gender === 'femme') {
      bmr = 10 * user.weight + 6.25 * user.height - 5 * user.age - 161;
    } else {
      // Par défaut homme
      bmr = 10 * user.weight + 6.25 * user.height - 5 * user.age + 5;
    }

    // Facteur d'activité
    const activityFactors = {
      'débutant': 1.2,        // Sédentaire
      'intermédiaire': 1.55,   // Modérément actif
      'avancé': 1.9           // Très actif
    };

    const activityFactor = activityFactors[user.sportLevel] || 1.375;
    const tdee = bmr * activityFactor;

    // Ajustement selon l'objectif
    const goalAdjustments = {
      'perte de poids': 0.85,    // Déficit de 15%
      'prise de masse': 1.15,    // Surplus de 15%
      'maintien': 1.0,
      'endurance': 1.05          // Léger surplus pour l'énergie
    };

    return Math.round(tdee * (goalAdjustments[goal] || 1.0));
  }

  // 2. Calcul des macronutriments
  static calculateMacros(user, calories, goal) {
    const macrosConfig = {
      'perte de poids': {
        protein: 2.2,    // g/kg - plus pour préserver les muscles
        fat: 0.25,       // 25% des calories
        carbs: null      // Le reste
      },
      'prise de masse': {
        protein: 2.0,
        fat: 0.25,
        carbs: null
      },
      'maintien': {
        protein: 1.8,
        fat: 0.30,
        carbs: null
      },
      'endurance': {
        protein: 1.6,
        fat: 0.20,
        carbs: null
      }
    };

    const config = macrosConfig[goal] || macrosConfig.maintien;

    // Protéines (1g = 4 calories)
    const proteinGrams = Math.round(user.weight * config.protein);
    const proteinCalories = proteinGrams * 4;

    // Lipides (1g = 9 calories)
    const fatCalories = Math.round(calories * config.fat);
    const fatGrams = Math.round(fatCalories / 9);

    // Glucides (le reste)
    const carbsCalories = calories - proteinCalories - fatCalories;
    const carbsGrams = Math.round(carbsCalories / 4);

    return {
      protein: proteinGrams,
      fat: fatGrams,
      carbs: carbsGrams,
      calories: {
        total: calories,
        fromProtein: proteinCalories,
        fromFat: fatCalories,
        fromCarbs: carbsCalories
      }
    };
  }

  // 3. Calcul de l'eau nécessaire
  static calculateWater(user, activityLevel) {
    // Base: 35ml par kg de poids corporel
    let baseWater = user.weight * 0.035;
    
    // Ajustement selon l'activité
    const activityAdjustment = {
      'débutant': 0.5,
      'intermédiaire': 0.75,
      'avancé': 1.0
    };
    
    const adjustment = activityAdjustment[activityLevel] || 0.5;
    const totalWater = baseWater + adjustment;
    
    return Math.round(totalWater * 10) / 10; // Arrondir à 1 décimale
  }

  // ============ GÉNÉRATION DE PLANS DE REPAS ============

  // 4. Générer un plan de repas complet
  static generateMealPlan(user, calories, macros, goal) {
    const mealStructure = this.getMealStructure(goal);
    const foodDatabase = this.getFoodDatabase();
    
    const meals = {
      petitDejeuner: this.generateMeal('petitDejeuner', calories * 0.25, macros, goal, foodDatabase),
      collationMatin: this.generateSnack(calories * 0.10, macros, goal, foodDatabase),
      dejeuner: this.generateMeal('dejeuner', calories * 0.30, macros, goal, foodDatabase),
      collationApresSport: this.generatePostWorkoutSnack(calories * 0.15, macros, goal, foodDatabase),
      diner: this.generateMeal('diner', calories * 0.20, macros, goal, foodDatabase)
    };

    return {
      dailySummary: {
        calories: calories,
        macros: macros,
        water: this.calculateWater(user, user.sportLevel),
        mealsPerDay: 5,
        timing: this.getMealTiming(goal)
      },
      meals: meals,
      groceryList: this.generateGroceryList(meals),
      tips: this.getNutritionTips(goal, user.sportLevel)
    };
  }

  // 5. Structure des repas selon l'objectif
  static getMealStructure(goal) {
    const structures = {
      'perte de poids': {
        mealsPerDay: 5,
        proteinPerMeal: 'élevée',
        carbsTiming: 'matin et post-entraînement',
        fatTiming: 'réparti'
      },
      'prise de masse': {
        mealsPerDay: 6,
        proteinPerMeal: 'très élevée',
        carbsTiming: 'toute la journée',
        fatTiming: 'éviter autour de l\'entraînement'
      },
      'maintien': {
        mealsPerDay: 5,
        proteinPerMeal: 'modérée',
        carbsTiming: 'équilibré',
        fatTiming: 'réparti'
      },
      'endurance': {
        mealsPerDay: 5,
        proteinPerMeal: 'modérée',
        carbsTiming: 'avant et après entraînement',
        fatTiming: 'réparti'
      }
    };
    
    return structures[goal] || structures.maintien;
  }

  // 6. Base de données d'aliments
  static getFoodDatabase() {
    return {
      // Protéines
      proteins: [
        { name: 'Poulet (100g)', calories: 165, protein: 31, carbs: 0, fat: 3.6 },
        { name: 'Dinde (100g)', calories: 135, protein: 29, carbs: 0, fat: 1 },
        { name: 'Bœuf maigre (100g)', calories: 250, protein: 26, carbs: 0, fat: 17 },
        { name: 'Saumon (100g)', calories: 208, protein: 20, carbs: 0, fat: 13 },
        { name: 'Thon en boîte (100g)', calories: 116, protein: 25, carbs: 0, fat: 1 },
        { name: 'Œufs (2 unités)', calories: 140, protein: 12, carbs: 1, fat: 10 },
        { name: 'Fromage blanc 0% (100g)', calories: 45, protein: 7, carbs: 4, fat: 0 },
        { name: 'Yaourt grec (100g)', calories: 59, protein: 10, carbs: 3, fat: 0 },
        { name: 'Lentilles (100g cuites)', calories: 116, protein: 9, carbs: 20, fat: 0.4 },
        { name: 'Pois chiches (100g cuits)', calories: 139, protein: 7, carbs: 22, fat: 2 }
      ],
      
      // Glucides
      carbs: [
        { name: 'Riz basmati (100g cuit)', calories: 130, protein: 2.7, carbs: 28, fat: 0.3 },
        { name: 'Pâtes complètes (100g cuites)', calories: 124, protein: 5, carbs: 25, fat: 0.5 },
        { name: 'Quinoa (100g cuit)', calories: 120, protein: 4.4, carbs: 21, fat: 1.9 },
        { name: 'Patate douce (100g)', calories: 86, protein: 1.6, carbs: 20, fat: 0.1 },
        { name: 'Avoine (50g sec)', calories: 194, protein: 6.7, carbs: 33, fat: 3.6 },
        { name: 'Pain complet (2 tranches)', calories: 138, protein: 6, carbs: 23, fat: 2 },
        { name: 'Banane (1 moyenne)', calories: 105, protein: 1.3, carbs: 27, fat: 0.4 },
        { name: 'Pomme de terre (100g)', calories: 77, protein: 2, carbs: 17, fat: 0.1 }
      ],
      
      // Lipides
      fats: [
        { name: 'Avocat (1/2)', calories: 160, protein: 2, carbs: 9, fat: 15 },
        { name: 'Amandes (30g)', calories: 174, protein: 6, carbs: 6, fat: 15 },
        { name: 'Noix (30g)', calories: 185, protein: 4.3, carbs: 3.9, fat: 18.5 },
        { name: 'Beurre de cacahuète (1 c.à.s)', calories: 94, protein: 4, carbs: 3, fat: 8 },
        { name: 'Huile d\'olive (1 c.à.s)', calories: 119, protein: 0, carbs: 0, fat: 14 },
        { name: 'Graines de chia (15g)', calories: 70, protein: 2.5, carbs: 6, fat: 4.5 }
      ],
      
      // Légumes
      vegetables: [
        { name: 'Brocoli (100g)', calories: 34, protein: 2.8, carbs: 7, fat: 0.4 },
        { name: 'Épinards (100g)', calories: 23, protein: 2.9, carbs: 3.6, fat: 0.4 },
        { name: 'Salade verte (100g)', calories: 15, protein: 1.4, carbs: 2.9, fat: 0.2 },
        { name: 'Carottes (100g)', calories: 41, protein: 0.9, carbs: 10, fat: 0.2 },
        { name: 'Tomates (100g)', calories: 18, protein: 0.9, carbs: 3.9, fat: 0.2 }
      ]
    };
  }

  // 7. Générer un repas
  static generateMeal(mealType, targetCalories, macros, goal, foodDatabase) {
    let meal = {
      name: this.getMealName(mealType),
      items: [],
      totalCalories: 0,
      totalProtein: 0,
      totalCarbs: 0,
      totalFat: 0
    };

    // Sélectionner une protéine
    const proteinOptions = foodDatabase.proteins.filter(p => 
      p.calories <= targetCalories * 0.4
    );
    
    if (proteinOptions.length > 0) {
      const protein = proteinOptions[Math.floor(Math.random() * proteinOptions.length)];
      meal.items.push({
        ...protein,
        portion: this.getPortionSize(protein.name, goal)
      });
      meal.totalCalories += protein.calories;
      meal.totalProtein += protein.protein;
      meal.totalCarbs += protein.carbs;
      meal.totalFat += protein.fat;
    }

    // Sélectionner des glucides (sauf pour le dîner si perte de poids)
    if (!(goal === 'perte de poids' && mealType === 'diner')) {
      const carbOptions = foodDatabase.carbs.filter(c => 
        c.calories <= targetCalories * 0.4
      );
      
      if (carbOptions.length > 0) {
        const carb = carbOptions[Math.floor(Math.random() * carbOptions.length)];
        meal.items.push({
          ...carb,
          portion: this.getPortionSize(carb.name, goal)
        });
        meal.totalCalories += carb.calories;
        meal.totalProtein += carb.protein;
        meal.totalCarbs += carb.carbs;
        meal.totalFat += carb.fat;
      }
    }

    // Sélectionner des légumes
    const vegOptions = foodDatabase.vegetables;
    const vegetables = vegOptions.slice(0, 2); // Prendre 2 légumes différents
    
    vegetables.forEach(veg => {
      meal.items.push({
        ...veg,
        portion: '100g'
      });
      meal.totalCalories += veg.calories;
      meal.totalProtein += veg.protein;
      meal.totalCarbs += veg.carbs;
      meal.totalFat += veg.fat;
    });

    // Ajouter des lipides si nécessaire
    const remainingCalories = targetCalories - meal.totalCalories;
    if (remainingCalories > 50) {
      const fatOptions = foodDatabase.fats.filter(f => 
        f.calories <= remainingCalories
      );
      
      if (fatOptions.length > 0) {
        const fat = fatOptions[Math.floor(Math.random() * fatOptions.length)];
        meal.items.push({
          ...fat,
          portion: this.getPortionSize(fat.name, goal)
        });
        meal.totalCalories += fat.calories;
        meal.totalProtein += fat.protein;
        meal.totalCarbs += fat.carbs;
        meal.totalFat += fat.fat;
      }
    }

    return meal;
  }

  // 8. Générer une collation
  static generateSnack(targetCalories, macros, goal, foodDatabase) {
    const snackTypes = {
      'perte de poids': ['protéiné', 'fruits'],
      'prise de masse': ['protéine + glucides', 'énergétique'],
      'default': ['équilibré', 'fruits + protéines']
    };

    const type = snackTypes[goal] || snackTypes.default;
    const selectedType = type[Math.floor(Math.random() * type.length)];

    let snack = {
      name: `Collation ${selectedType}`,
      items: [],
      totalCalories: 0,
      totalProtein: 0
    };

    switch(selectedType) {
      case 'protéiné':
        snack.items.push({
          name: 'Yaourt grec',
          calories: 59,
          protein: 10,
          portion: '150g'
        });
        snack.items.push({
          name: 'Amandes',
          calories: 87,
          protein: 3,
          portion: '15g'
        });
        break;
        
      case 'fruits':
        snack.items.push({
          name: 'Pomme',
          calories: 95,
          protein: 0.5,
          portion: '1 moyenne'
        });
        snack.items.push({
          name: 'Beurre d\'amande',
          calories: 98,
          protein: 3.4,
          portion: '1 c.à.s'
        });
        break;
        
      case 'protéine + glucides':
        snack.items.push({
          name: 'Shake protéiné',
          calories: 120,
          protein: 25,
          portion: '1 scoop'
        });
        snack.items.push({
          name: 'Banane',
          calories: 105,
          protein: 1.3,
          portion: '1 moyenne'
        });
        break;
        
      default:
        snack.items.push({
          name: 'Fromage blanc',
          calories: 90,
          protein: 14,
          portion: '150g'
        });
        snack.items.push({
          name: 'Baies',
          calories: 50,
          protein: 1,
          portion: '100g'
        });
    }

    // Calculer les totaux
    snack.totalCalories = snack.items.reduce((sum, item) => sum + item.calories, 0);
    snack.totalProtein = snack.items.reduce((sum, item) => sum + item.protein, 0);

    return snack;
  }

  // 9. Collation post-entraînement
  static generatePostWorkoutSnack(targetCalories, macros, goal, foodDatabase) {
    let snack = {
      name: 'Post-entraînement',
      items: [],
      totalCalories: 0,
      totalProtein: 0,
      totalCarbs: 0
    };

    // Toujours inclure des protéines après l'entraînement
    const proteinItem = {
      name: 'Shake protéiné',
      calories: 120,
      protein: 25,
      carbs: 3,
      portion: '1 scoop dans l\'eau'
    };
    
    snack.items.push(proteinItem);
    snack.totalCalories += proteinItem.calories;
    snack.totalProtein += proteinItem.protein;
    snack.totalCarbs += proteinItem.carbs;

    // Ajouter des glucides rapides selon l'objectif
    if (goal === 'prise de masse' || goal === 'endurance') {
      const carbItem = {
        name: 'Jus de fruit',
        calories: 120,
        protein: 0,
        carbs: 30,
        portion: '250ml'
      };
      
      snack.items.push(carbItem);
      snack.totalCalories += carbItem.calories;
      snack.totalCarbs += carbItem.carbs;
    }

    return snack;
  }

  // 10. Générer une liste de courses
  static generateGroceryList(meals) {
    const items = {};
    
    // Compter tous les ingrédients
    Object.values(meals).forEach(meal => {
      if (meal.items) {
        meal.items.forEach(item => {
          if (!items[item.name]) {
            items[item.name] = {
              quantity: 1,
              portion: item.portion
            };
          } else {
            items[item.name].quantity += 1;
          }
        });
      }
    });

    // Convertir en tableau et ajouter des quantités pour la semaine
    const groceryList = Object.keys(items).map(itemName => {
      const item = items[itemName];
      return {
        name: itemName,
        quantity: item.quantity * 7, // Pour une semaine
        portion: item.portion,
        category: this.getFoodCategory(itemName)
      };
    });

    // Grouper par catégorie
    const categorized = {};
    groceryList.forEach(item => {
      if (!categorized[item.category]) {
        categorized[item.category] = [];
      }
      categorized[item.category].push(item);
    });

    return categorized;
  }

  // 11. Conseils nutritionnels personnalisés
  static getNutritionTips(goal, level) {
    const tips = {
      'perte de poids': [
        'Buvez 500ml d\'eau 30 minutes avant chaque repas',
        'Mangez lentement et mastiquez bien chaque bouchée',
        'Priorisez les protéines à chaque repas',
        'Évitez les boissons sucrées et l\'alcool',
        'Utilisez des assiettes plus petites',
        'Dormez 7-8 heures par nuit pour réguler l\'appétit'
      ],
      
      'prise de masse': [
        'Prenez un repas toutes les 3-4 heures',
        'Consommez des glucides autour de l\'entraînement',
        'Buvez un shake protéiné dans les 30 minutes post-entraînement',
        'Augmentez progressivement les calories (+200-300/semaine)',
        'Incluez des aliments caloriques mais nutritifs (noix, avocat)',
        'Ne sautez pas le petit-déjeuner'
      ],
      
      'maintien': [
        'Écoutez vos signaux de faim et de satiété',
        'Variez les sources de protéines',
        'Mangez des légumes de différentes couleurs',
        'Planifiez vos repas à l\'avance',
        'Buvez au moins 2L d\'eau par jour',
        'Pratiquez l\'alimentation consciente'
      ],
      
      'endurance': [
        'Chargez en glucides la veille d\'un long entraînement',
        'Consommez des glucides pendant les séances de plus d\'1h',
        'Remplacez les électrolytes perdus par la transpiration',
        'Priorisez les glucides complexes en dehors de l\'entraînement',
        'Hydratez-vous régulièrement tout au long de la journée',
        'Incluez des antioxydants (baies, thé vert)'
      ]
    };

    // Ajouter des conseils selon le niveau
    const levelTips = {
      'débutant': [
        'Commencez par de petits changements',
        'Pesez et mesurez vos aliments au début',
        'Tenez un journal alimentaire',
        'Ne vous privez pas complètement'
      ],
      'intermédiaire': [
        'Expérimentez avec le timing des nutriments',
        'Ajustez selon vos progrès',
        'Incorporez des jours de "repos" alimentaire'
      ],
      'avancé': [
        'Affinez votre timing nutritionnel',
        'Expérimentez avec le jeûne intermittent si souhaité',
        'Considérez des compléments spécifiques'
      ]
    };

    return {
      general: tips[goal] || tips.maintien,
      levelSpecific: levelTips[level] || levelTips.débutant
    };
  }

  // ============ FONCTIONS UTILITAIRES ============

  static getMealName(mealType) {
    const names = {
      petitDejeuner: 'Petit-déjeuner',
      collationMatin: 'Collation du matin',
      dejeuner: 'Déjeuner',
      collationApresSport: 'Post-entraînement',
      diner: 'Dîner'
    };
    return names[mealType] || 'Repas';
  }

  static getPortionSize(foodName, goal) {
    const portions = {
      'perte de poids': {
        'Poulet (100g)': '120g',
        'Riz basmati (100g cuit)': '80g',
        'Patate douce (100g)': '150g',
        'Avocat (1/2)': '1/4',
        'Amandes (30g)': '20g'
      },
      'prise de masse': {
        'Poulet (100g)': '180g',
        'Riz basmati (100g cuit)': '150g',
        'Patate douce (100g)': '200g',
        'Avocat (1/2)': '1/2',
        'Amandes (30g)': '40g'
      },
      'default': {
        'Poulet (100g)': '150g',
        'Riz basmati (100g cuit)': '100g',
        'Patate douce (100g)': '180g',
        'Avocat (1/2)': '1/3',
        'Amandes (30g)': '30g'
      }
    };

    const config = portions[goal] || portions.default;
    return config[foodName] || 'portion standard';
  }

  static getMealTiming(goal) {
    const timing = {
      'perte de poids': {
        petitDejeuner: '7h-8h',
        collationMatin: '10h30',
        dejeuner: '12h30-13h',
        collationApresSport: 'Immediatement après l\'entraînement',
        diner: '19h-20h'
      },
      'prise de masse': {
        petitDejeuner: '6h30-7h30',
        collationMatin: '10h',
        dejeuner: '12h',
        collationApresSport: 'Dans les 30min post-entraînement',
        diner: '20h-21h',
        collationSoir: '22h (si nécessaire)'
      },
      'default': {
        petitDejeuner: '7h-8h',
        collationMatin: '10h30',
        dejeuner: '12h30-13h',
        collationApresSport: 'Après l\'entraînement',
        diner: '19h30-20h30'
      }
    };

    return timing[goal] || timing.default;
  }

  static getFoodCategory(foodName) {
    const categories = {
      'Poulet': 'Viandes & Volailles',
      'Dinde': 'Viandes & Volailles',
      'Bœuf': 'Viandes & Volailles',
      'Saumon': 'Poissons',
      'Thon': 'Poissons',
      'Œufs': 'Œufs & Produits Laitiers',
      'Fromage blanc': 'Œufs & Produits Laitiers',
      'Yaourt grec': 'Œufs & Produits Laitiers',
      'Lentilles': 'Légumineuses',
      'Pois chiches': 'Légumineuses',
      'Riz': 'Céréales & Féculents',
      'Pâtes': 'Céréales & Féculents',
      'Quinoa': 'Céréales & Féculents',
      'Patate douce': 'Légumes',
      'Avoine': 'Céréales & Féculents',
      'Pain': 'Céréales & Féculents',
      'Banane': 'Fruits',
      'Pomme': 'Fruits',
      'Avocat': 'Fruits & Graisses',
      'Amandes': 'Noix & Graines',
      'Noix': 'Noix & Graines',
      'Beurre de cacahuète': 'Noix & Graines',
      'Huile d\'olive': 'Huiles & Condiments',
      'Graines de chia': 'Noix & Graines',
      'Brocoli': 'Légumes',
      'Épinards': 'Légumes',
      'Salade': 'Légumes',
      'Carottes': 'Légumes',
      'Tomates': 'Légumes',
      'Shake protéiné': 'Compléments',
      'Jus de fruit': 'Boissons'
    };

    for (const [key, category] of Object.entries(categories)) {
      if (foodName.includes(key)) {
        return category;
      }
    }
    
    return 'Divers';
  }

  // ============ FONCTION PRINCIPALE ============

  static generateNutritionPlan(user) {
    console.log(`🍽️ Génération plan nutrition pour: ${user.email}`);
    
    // Calculs de base
    const dailyCalories = this.calculateDailyCalories(user, user.goal);
    const macros = this.calculateMacros(user, dailyCalories, user.goal);
    
    // Générer le plan complet
    const plan = this.generateMealPlan(user, dailyCalories, macros, user.goal);
    
    // Ajouter des suppléments recommandés
    plan.supplements = this.getRecommendedSupplements(user.goal, user.sportLevel);
    
    // Ajouter des recettes simples
    plan.recipes = this.getSimpleRecipes(user.goal);
    
    console.log(`✅ Plan nutrition généré: ${dailyCalories} calories, ${macros.protein}g protéines`);
    
    return plan;
  }

  // 12. Suppléments recommandés
  static getRecommendedSupplements(goal, level) {
    const supplements = {
      'débutant': [
        { name: 'Multivitamines', purpose: 'Combler les carences', timing: 'Matin avec repas' },
        { name: 'Oméga-3', purpose: 'Santé cardiovasculaire', timing: 'Repas principal' }
      ],
      'intermédiaire': [
        { name: 'Protéine en poudre', purpose: 'Atteindre les besoins protéiques', timing: 'Post-entraînement ou collation' },
        { name: 'Créatine monohydrate', purpose: 'Performance et récupération', timing: '5g par jour, n\'importe quand' },
        { name: 'Vitamine D', purpose: 'Santé osseuse et immunité', timing: 'Matin avec un repas gras' }
      ],
      'avancé': [
        { name: 'BCAA', purpose: 'Récupération musculaire', timing: 'Pendant ou après l\'entraînement' },
        { name: 'Beta-Alanine', purpose: 'Endurance musculaire', timing: 'Réparti dans la journée' },
        { name: 'Citrulline Malate', purpose: 'Pompe musculaire', timing: '30min avant l\'entraînement' },
        { name: 'Caféine', purpose: 'Énergie et concentration', timing: '30min avant l\'entraînement' }
      ]
    };

    const goalSpecific = {
      'perte de poids': [
        { name: 'Thé vert (EGCG)', purpose: 'Brûleur de graisse naturel', timing: 'Entre les repas' },
        { name: 'Caféine', purpose: 'Métabolisme et énergie', timing: 'Matin ou avant cardio' }
      ],
      'prise de masse': [
        { name: 'Créatine', purpose: 'Force et volume musculaire', timing: '5g/jour tous les jours' },
        { name: 'HMB', purpose: 'Prévention du catabolisme', timing: 'Réparti dans la journée' }
      ],
      'endurance': [
        { name: 'BCAA', purpose: 'Récupération', timing: 'Pendant l\'effort' },
        { name: 'Électrolytes', purpose: 'Hydratation', timing: 'Pendant et après l\'effort' },
        { name: 'Beta-Alanine', purpose: 'Réduction de la fatigue', timing: 'Réparti dans la journée' }
      ]
    };

    return {
      levelBased: supplements[level] || supplements.débutant,
      goalBased: goalSpecific[goal] || [],
      important: '⚠️ Consultez un professionnel de santé avant de prendre des suppléments'
    };
  }

  // 13. Recettes simples
  static getSimpleRecipes(goal) {
    const recipes = {
      'petitDejeuner': [
        {
          name: 'Omelette aux légumes',
          ingredients: ['3 œufs', '50g épinards', '1 tomate', '30g fromage râpé'],
          instructions: 'Battre les œufs, ajouter les légumes, cuire à feu moyen',
          calories: 320,
          protein: 25
        },
        {
          name: 'Porridge protéiné',
          ingredients: ['50g flocons d\'avoine', '1 scoop protéine', '150ml lait', '1/2 banane'],
          instructions: 'Cuire l\'avoine, mélanger avec la protéine, ajouter la banane',
          calories: 380,
          protein: 35
        }
      ],
      'dejeuner': [
        {
          name: 'Salade de poulet',
          ingredients: ['150g poulet grillé', '100g quinoa', 'Légumes variés', 'Vinaigrette légère'],
          instructions: 'Mélanger tous les ingrédients',
          calories: 450,
          protein: 40
        }
      ],
      'diner': [
        {
          name: 'Saumon et légumes rôtis',
          ingredients: ['200g saumon', 'Brocoli', 'Carottes', 'Huile d\'olive'],
          instructions: 'Cuire le saumon au four avec les légumes',
          calories: 420,
          protein: 35
        }
      ]
    };

    return recipes;
  }
}

module.exports = NutritionCoach;