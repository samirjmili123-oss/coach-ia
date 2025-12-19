const mongoose = require('mongoose');

const dailyLogSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    date: {
        type: Date,
        required: true,
        default: Date.now,
        index: true
    },
    
    // ACTIVITÉ PHYSIQUE
    training: {
        type: {
            type: String,
            enum: ['cardio', 'force', 'hiit', 'yoga', 'repos', 'autre'],
            required: true
        },
        duration: { // en minutes
            type: Number,
            min: 0,
            max: 300
        },
        intensity: {
            type: String,
            enum: ['faible', 'modérée', 'élevée', 'extrême']
        },
        sessionCompleted: { // ID de session du programme
            type: String
        },
        caloriesBurned: {
            type: Number,
            min: 0
        },
        notes: String
    },
    
    // NUTRITION
    nutrition: {
        caloriesConsumed: {
            type: Number,
            min: 0,
            max: 10000
        },
        protein: { // en grammes
            type: Number,
            min: 0
        },
        carbs: { // en grammes
            type: Number,
            min: 0
        },
        fats: { // en grammes
            type: Number,
            min: 0
        },
        water: { // en litres
            type: Number,
            min: 0,
            max: 10
        },
        meals: [{
            name: String,
            time: String,
            calories: Number,
            description: String
        }],
        supplements: [String]
    },
    
    // MESURES CORPORELLES (optionnel)
    bodyMetrics: {
        weight: { // en kg
            type: Number,
            min: 30,
            max: 200
        },
        sleepHours: {
            type: Number,
            min: 0,
            max: 24
        },
        mood: {
            type: String,
            enum: ['excellent', 'bon', 'moyen', 'mauvais', 'terrible']
        },
        stressLevel: {
            type: Number,
            min: 1,
            max: 10
        },
        energyLevel: {
            type: Number,
            min: 1,
            max: 10
        }
    },
    
    // PROGRESSION PAR RAPPORT AU PROGRAMME
    programProgress: {
        programId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Program'
        },
        isOnTrack: Boolean,
        deviationFromPlan: {
            calories: Number,  // écart calorique
            protein: Number,   // écart protéines
            training: Number   // écart entraînement (%)
        },
        achievementScore: { // note sur 100
            type: Number,
            min: 0,
            max: 100
        }
    },
    
    // MÉTADONNÉES
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Index composé pour éviter les doublons jour/utiisateur
dailyLogSchema.index({ userId: 1, date: 1 }, { unique: true });

// Méthode pour calculer le score de réussite
dailyLogSchema.methods.calculateAchievementScore = function(program) {
    let score = 0;
    const maxScore = 100;
    
    // Points pour l'entraînement (30 points max)
    if (this.training && this.training.duration > 0) {
        score += Math.min(30, (this.training.duration / 60) * 30);
    }
    
    // Points pour l'eau (20 points max)
    if (this.nutrition && this.nutrition.water) {
        const targetWater = 2.5; // litres cible
        score += Math.min(20, (this.nutrition.water / targetWater) * 20);
    }
    
    // Points pour les calories (30 points max)
    if (this.nutrition && this.nutrition.caloriesConsumed && program?.nutrition?.dailyCalories) {
        const calorieTarget = program.nutrition.dailyCalories;
        const calorieDiff = Math.abs(this.nutrition.caloriesConsumed - calorieTarget);
        const accuracy = Math.max(0, 1 - (calorieDiff / calorieTarget));
        score += accuracy * 30;
    }
    
    // Points pour les protéines (20 points max)
    if (this.nutrition && this.nutrition.protein && program?.nutrition?.macronutrients?.protein) {
        const proteinTarget = program.nutrition.macronutrients.protein;
        const proteinDiff = Math.abs(this.nutrition.protein - proteinTarget);
        const accuracy = Math.max(0, 1 - (proteinDiff / proteinTarget));
        score += accuracy * 20;
    }
    
    return Math.round(score);
};

// Middleware pour mettre à jour updatedAt
dailyLogSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Méthode statique pour vérifier si l'utilisateur est sur la bonne voie
dailyLogSchema.statics.checkIfOnTrack = function(userId, programId, days = 7) {
    return this.aggregate([
        {
            $match: {
                userId: mongoose.Types.ObjectId(userId),
                date: { $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) }
            }
        },
        {
            $group: {
                _id: null,
                avgAchievement: { $avg: "$programProgress.achievementScore" },
                consistency: {
                    $avg: {
                        $cond: [
                            { $gte: ["$programProgress.achievementScore", 70] },
                            1,
                            0
                        ]
                    }
                },
                avgCalories: { $avg: "$nutrition.caloriesConsumed" },
                avgWater: { $avg: "$nutrition.water" },
                avgTrainingDays: {
                    $avg: {
                        $cond: [
                            { $gt: ["$training.duration", 0] },
                            1,
                            0
                        ]
                    }
                }
            }
        }
    ]);
};

const DailyLog = mongoose.model('DailyLog', dailyLogSchema);

// Classe pour le mode In-Memory
class DailyLogInMemory {
    constructor(data) {
        this.id = data.id;
        this.userId = data.userId;
        this.date = data.date || new Date();
        this.training = data.training || {};
        this.nutrition = data.nutrition || {};
        this.bodyMetrics = data.bodyMetrics || {};
        this.programProgress = data.programProgress || {};
        this.createdAt = data.createdAt || new Date();
        this.updatedAt = data.updatedAt || new Date();
    }

    calculateAchievementScore(program) {
        // Implémentation similaire à la version MongoDB
        let score = 0;
        
        if (this.training && this.training.duration > 0) {
            score += Math.min(30, (this.training.duration / 60) * 30);
        }
        
        if (this.nutrition && this.nutrition.water) {
            score += Math.min(20, (this.nutrition.water / 2.5) * 20);
        }
        
        if (this.nutrition && this.nutrition.caloriesConsumed && program?.nutrition?.dailyCalories) {
            const accuracy = Math.max(0, 1 - 
                Math.abs(this.nutrition.caloriesConsumed - program.nutrition.dailyCalories) / 
                program.nutrition.dailyCalories);
            score += accuracy * 30;
        }
        
        return Math.round(score);
    }
}

module.exports = {
    DailyLog,
    DailyLogInMemory,
    getDailyLogModel: () => {
        const isMongoConnected = mongoose.connection.readyState === 1;
        return {
            isMongoConnected,
            model: isMongoConnected ? DailyLog : null
        };
    }
};