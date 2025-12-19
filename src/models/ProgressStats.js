const mongoose = require('mongoose');

const trendSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['weight', 'calories', 'achievement', 'training', 'water'],
        required: true
    },
    direction: {
        type: String,
        enum: ['up', 'down', 'stable'],
        required: true
    },
    slope: Number,
    rSquared: Number,
    confidence: Number,
    predictedValue: Number,
    predictionDate: Date
});

const milestoneSchema = new mongoose.Schema({
    name: String,
    date: Date,
    value: Number,
    type: String,
    achieved: {
        type: Boolean,
        default: false
    }
});

const comparisonSchema = new mongoose.Schema({
    metric: String,
    current: Number,
    previous: Number,
    percentageChange: Number,
    isImprovement: Boolean
});

const progressStatsSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    period: {
        type: String,
        enum: ['weekly', 'monthly', 'yearly'],
        required: true
    },
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
        required: true
    },
    
    // Données brutes pour ML
    rawData: {
        dates: [Date],
        weights: [Number],
        calories: [Number],
        achievements: [Number],
        trainingDurations: [Number],
        waterIntake: [Number]
    },
    
    // Tendances calculées par ML
    trends: [trendSchema],
    
    // Jalons et objectifs
    milestones: [milestoneSchema],
    nextMilestone: milestoneSchema,
    
    // Comparaisons
    comparisons: [comparisonSchema],
    
    // Insights générés par IA
    insights: [{
        type: String,
        category: {
            type: String,
            enum: ['success', 'warning', 'recommendation', 'prediction']
        },
        confidence: Number
    }],
    
    // Prédictions ML
    predictions: {
        weightInTwoWeeks: Number,
        achievementInTwoWeeks: Number,
        estimatedGoalDate: Date,
        probabilityOfSuccess: Number
    },
    
    // Scores et métriques
    scores: {
        consistencyScore: Number,
        improvementScore: Number,
        adherenceScore: Number,
        overallProgress: Number
    },
    
    // Métadonnées
    calculatedAt: {
        type: Date,
        default: Date.now
    },
    algorithmVersion: {
        type: String,
        default: 'v1.0'
    }
});

// Méthode pour mettre à jour les tendances avec régression linéaire
progressStatsSchema.methods.calculateTrends = function() {
    const SimpleLinearRegression = require('ml-regression-simple-linear');
    
    this.trends = [];
    
    // Tendances pour le poids
    if (this.rawData.weights.length >= 2) {
        const x = this.rawData.dates.map((d, i) => i);
        const y = this.rawData.weights;
        
        const regression = new SimpleLinearRegression(x, y);
        const slope = regression.slope;
        
        this.trends.push({
            type: 'weight',
            direction: slope < -0.1 ? 'down' : slope > 0.1 ? 'up' : 'stable',
            slope: slope,
            rSquared: regression.score(x, y),
            confidence: Math.abs(slope) * 100,
            predictedValue: regression.predict(x.length + 7) // Prédiction 7 jours
        });
    }
    
    // Ajoutez d'autres calculs de tendances ici...
    return this;
};

// Méthode pour générer des insights IA
progressStatsSchema.methods.generateInsights = function(user, program) {
    this.insights = [];
    
    // Insight sur la perte de poids
    if (this.trends.find(t => t.type === 'weight')?.direction === 'down' && 
        program?.goal === 'perte de poids') {
        this.insights.push({
            message: `🎯 Excellente nouvelle ! Vous avez perdu ${Math.abs(this.comparisons.find(c => c.metric === 'weight')?.percentageChange || 0)}% de poids cette semaine. Continuez comme ça !`,
            category: 'success',
            confidence: 85
        });
    }
    
    // Insight sur la consistance
    if (this.scores.consistencyScore > 80) {
        this.insights.push({
            message: '📊 Votre régularité est impressionnante ! Votre consistance de ' + 
                     this.scores.consistencyScore + '% montre une excellente discipline.',
            category: 'success',
            confidence: 90
        });
    } else if (this.scores.consistencyScore < 50) {
        this.insights.push({
            message: '⚠️ Votre consistance est faible (' + this.scores.consistencyScore + 
                     '%). Essayez de maintenir une routine plus régulière pour de meilleurs résultats.',
            category: 'warning',
            confidence: 75
        });
    }
    
    // Insight basé sur les prédictions ML
    if (this.predictions.probabilityOfSuccess > 70) {
        this.insights.push({
            message: `🎉 Selon nos analyses, vous avez ${this.predictions.probabilityOfSuccess}% de chances d'atteindre votre objectif d'ici ${new Date(this.predictions.estimatedGoalDate).toLocaleDateString()} !`,
            category: 'prediction',
            confidence: this.predictions.probabilityOfSuccess
        });
    }
    
    return this;
};

// Classe In-Memory
class ProgressStatsInMemory {
    constructor(data) {
        Object.assign(this, data);
    }
    
    calculateTrends() {
        // Implémentation simplifiée pour In-Memory
        return this;
    }
    
    generateInsights(user, program) {
        // Implémentation simplifiée
        return this;
    }
}

module.exports = {
    ProgressStats: mongoose.model('ProgressStats', progressStatsSchema),
    ProgressStatsInMemory
};