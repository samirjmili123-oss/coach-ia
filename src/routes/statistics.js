const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const mongoose = require('mongoose');
const { ProgressStats, ProgressStatsInMemory } = require('../models/ProgressStats');
const { getUserModel } = require('../models/User');
const Program = require('../models/program');

// ============ STATISTIQUES AVANCÉES AVEC ML ============
router.get('/advanced', auth, async (req, res) => {
    try {
        const { period = 'weekly' } = req.query;
        const { isMongoConnected } = getUserModel();
        
        // Dates pour la période
        const now = new Date();
        let startDate;
        switch(period) {
            case 'weekly':
                startDate = new Date(now.setDate(now.getDate() - 7));
                break;
            case 'monthly':
                startDate = new Date(now.setMonth(now.getMonth() - 1));
                break;
            case 'yearly':
                startDate = new Date(now.setFullYear(now.getFullYear() - 1));
                break;
            default:
                startDate = new Date(now.setDate(now.getDate() - 7));
        }
        
        // Récupérer les logs quotidiens
        let dailyLogs;
        if (isMongoConnected) {
            const DailyLog = require('../models/DailyLog').DailyLog;
            dailyLogs = await DailyLog.find({
                userId: req.userId,
                date: { $gte: startDate }
            }).sort({ date: 1 });
        } else {
            dailyLogs = (global.database.dailyLogs || [])
                .filter(log => log.userId === req.userId && new Date(log.date) >= startDate)
                .sort((a, b) => new Date(a.date) - new Date(b.date));
        }
        
        // Récupérer le programme actif
        let activeProgram;
        if (isMongoConnected && Program) {
            activeProgram = await Program.findOne({ userId: req.userId })
                .sort({ createdAt: -1 });
        } else {
            activeProgram = global.database.programs
                .filter(p => p.userId === req.userId)
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
        }
        
        // Préparer les données pour ML
        const rawData = prepareDataForML(dailyLogs);
        
        // Calculer les tendances avec ML
        const trends = await calculateTrendsWithML(rawData);
        
        // Calculer les scores
        const scores = calculateScores(dailyLogs, activeProgram);
        
        // Générer des prédictions
        const predictions = await generatePredictions(rawData, activeProgram);
        
        // Générer des comparaisons
        const comparisons = generateComparisons(dailyLogs, period);
        
        // Générer des insights IA
        const insights = generateAIInsights(trends, scores, comparisons, activeProgram);
        
        // Préparer les données pour les graphiques
        const chartData = prepareAdvancedChartData(dailyLogs, trends, predictions);
        
        // Créer l'objet de statistiques
        const stats = {
            period,
            startDate,
            endDate: new Date(),
            rawData,
            trends,
            scores,
            predictions,
            comparisons,
            insights,
            chartData,
            summary: generateSummary(trends, scores, insights)
        };
        
        res.json({
            success: true,
            stats,
            message: 'Statistiques avancées générées avec ML'
        });
        
    } catch (error) {
        console.error('❌ Erreur statistiques avancées:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors du calcul des statistiques'
        });
    }
});

// ============ PRÉPARATION DES DONNÉES POUR ML ============
function prepareDataForML(dailyLogs) {
    const dates = [];
    const weights = [];
    const calories = [];
    const achievements = [];
    const trainingDurations = [];
    const waterIntake = [];
    
    dailyLogs.forEach(log => {
        dates.push(new Date(log.date));
        
        if (log.bodyMetrics?.weight) {
            weights.push(log.bodyMetrics.weight);
        }
        
        if (log.nutrition?.caloriesConsumed) {
            calories.push(log.nutrition.caloriesConsumed);
        }
        
        if (log.programProgress?.achievementScore) {
            achievements.push(log.programProgress.achievementScore);
        }
        
        if (log.training?.duration) {
            trainingDurations.push(log.training.duration);
        }
        
        if (log.nutrition?.water) {
            waterIntake.push(log.nutrition.water);
        }
    });
    
    return {
        dates,
        weights: fillMissingValues(weights),
        calories: fillMissingValues(calories),
        achievements: fillMissingValues(achievements),
        trainingDurations: fillMissingValues(trainingDurations),
        waterIntake: fillMissingValues(waterIntake)
    };
}

// ============ CALCUL DES TENDANCES AVEC ML ============
async function calculateTrendsWithML(rawData) {
    const trends = [];
    
    // Utiliser une régression linéaire simple
    const SimpleLinearRegression = require('ml-regression-simple-linear');
    
    // Tendances pour chaque métrique
    const metrics = [
        { key: 'weights', type: 'weight', unit: 'kg' },
        { key: 'calories', type: 'calories', unit: 'cal' },
        { key: 'achievements', type: 'achievement', unit: '%' },
        { key: 'trainingDurations', type: 'training', unit: 'min' },
        { key: 'waterIntake', type: 'water', unit: 'L' }
    ];
    
    metrics.forEach(metric => {
        const data = rawData[metric.key];
        if (data.length >= 2) {
            const x = Array.from({ length: data.length }, (_, i) => i);
            const regression = new SimpleLinearRegression(x, data);
            const slope = regression.slope;
            const rSquared = regression.score(x, data);
            
            // Déterminer la direction
            let direction = 'stable';
            if (slope > 0.1) direction = 'up';
            else if (slope < -0.1) direction = 'down';
            
            // Prédiction pour la semaine prochaine
            const predictedValue = regression.predict(data.length + 7);
            
            trends.push({
                type: metric.type,
                direction,
                slope: parseFloat(slope.toFixed(3)),
                rSquared: parseFloat(rSquared.toFixed(3)),
                confidence: Math.min(100, Math.abs(slope) * 1000),
                predictedValue: parseFloat(predictedValue.toFixed(2)),
                unit: metric.unit,
                currentValue: data[data.length - 1],
                startingValue: data[0],
                change: parseFloat((data[data.length - 1] - data[0]).toFixed(2))
            });
        }
    });
    
    return trends;
}

// ============ GÉNÉRATION DE PRÉDICTIONS ============
async function generatePredictions(rawData, program) {
    const predictions = {};
    
    // Prédiction du poids
    if (rawData.weights.length >= 3) {
        const SimpleLinearRegression = require('ml-regression-simple-linear');
        const x = Array.from({ length: rawData.weights.length }, (_, i) => i);
        const regression = new SimpleLinearRegression(x, rawData.weights);
        
        predictions.weightInTwoWeeks = parseFloat(regression.predict(x.length + 14).toFixed(1));
    }
    
    // Prédiction de la date d'objectif
    if (program?.goal && rawData.weights.length >= 5) {
        const currentWeight = rawData.weights[rawData.weights.length - 1];
        
        if (program.goal === 'perte de poids' && program.weight) {
            const targetWeight = program.weight * 0.9; // Perte de 10%
            const avgDailyLoss = calculateAverageDailyChange(rawData.weights);
            
            if (avgDailyLoss < 0) {
                const daysToGoal = Math.round((currentWeight - targetWeight) / Math.abs(avgDailyLoss));
                predictions.estimatedGoalDate = new Date(Date.now() + daysToGoal * 24 * 60 * 60 * 1000);
                predictions.probabilityOfSuccess = calculateSuccessProbability(rawData.weights, avgDailyLoss);
            }
        }
    }
    
    return predictions;
}

// ============ CALCUL DES SCORES ============
function calculateScores(dailyLogs, program) {
    if (dailyLogs.length === 0) {
        return {
            consistencyScore: 0,
            improvementScore: 0,
            adherenceScore: 0,
            overallProgress: 0
        };
    }
    
    // Score de consistance
    const consistencyScore = calculateConsistencyScore(dailyLogs);
    
    // Score d'amélioration
    const improvementScore = calculateImprovementScore(dailyLogs);
    
    // Score d'adhésion au programme
    const adherenceScore = calculateAdherenceScore(dailyLogs, program);
    
    // Progression globale
    const overallProgress = calculateOverallProgress(dailyLogs, program);
    
    return {
        consistencyScore: Math.round(consistencyScore),
        improvementScore: Math.round(improvementScore),
        adherenceScore: Math.round(adherenceScore),
        overallProgress: Math.round(overallProgress)
    };
}

// ============ GÉNÉRATION D'INSIGHTS IA ============
function generateAIInsights(trends, scores, comparisons, program) {
    const insights = [];
    
    // Insight basé sur la tendance du poids
    const weightTrend = trends.find(t => t.type === 'weight');
    if (weightTrend) {
        if (weightTrend.direction === 'down' && program?.goal === 'perte de poids') {
            insights.push({
                message: `🎉 Félicitations ! Vous avez perdu ${Math.abs(weightTrend.change).toFixed(1)}kg. Votre tendance est excellente pour votre objectif de perte de poids.`,
                type: 'success',
                icon: '🎯'
            });
        } else if (weightTrend.direction === 'up' && program?.goal === 'prise de masse') {
            insights.push({
                message: `💪 Prise de masse réussie ! +${weightTrend.change.toFixed(1)}kg. Continuez votre régime calorique et vos entraînements.`,
                type: 'success',
                icon: '💪'
            });
        }
    }
    
    // Insight sur la consistance
    if (scores.consistencyScore >= 80) {
        insights.push({
            message: `📊 Votre régularité est exceptionnelle (${scores.consistencyScore}%). Cette discipline vous mènera sûrement à vos objectifs !`,
            type: 'success',
            icon: '⭐'
        });
    } else if (scores.consistencyScore <= 50) {
        insights.push({
            message: `⚠️ Votre consistance est faible (${scores.consistencyScore}%). Essayez d'établir une routine plus régulière.`,
            type: 'warning',
            icon: '📅'
        });
    }
    
    // Insight sur l'adhésion au programme
    if (scores.adherenceScore >= 75) {
        insights.push({
            message: `✅ Excellente adhésion au programme (${scores.adherenceScore}%). Vous suivez parfaitement les recommandations !`,
            type: 'success',
            icon: '✅'
        });
    }
    
    // Insight basé sur les comparaisons
    const calorieComparison = comparisons.find(c => c.metric === 'calories');
    if (calorieComparison && Math.abs(calorieComparison.percentageChange) > 10) {
        insights.push({
            message: `🍽️ Votre apport calorique a ${calorieComparison.percentageChange > 0 ? 'augmenté' : 'diminué'} de ${Math.abs(calorieComparison.percentageChange)}%`,
            type: calorieComparison.isImprovement ? 'success' : 'warning',
            icon: '📈'
        });
    }
    
    return insights;
}

// ============ DONNÉES POUR GRAPHIQUES AVANCÉS ============
function prepareAdvancedChartData(dailyLogs, trends, predictions) {
    const achievementData = dailyLogs.map(log => ({
        x: new Date(log.date).toLocaleDateString(),
        y: log.programProgress?.achievementScore || 0,
        type: log.training?.type || 'repos'
    }));
    
    const weightData = dailyLogs
        .filter(log => log.bodyMetrics?.weight)
        .map(log => ({
            x: new Date(log.date).toLocaleDateString(),
            y: log.bodyMetrics.weight
        }));
    
    // Ajouter les prédictions aux données
    const predictionData = [];
    if (predictions.weightInTwoWeeks && weightData.length > 0) {
        const lastDate = new Date(dailyLogs[dailyLogs.length - 1].date);
        for (let i = 1; i <= 14; i++) {
            const date = new Date(lastDate);
            date.setDate(date.getDate() + i);
            predictionData.push({
                x: date.toLocaleDateString(),
                y: predictions.weightInTwoWeeks,
                type: 'prediction'
            });
        }
    }
    
    // Données pour le radar chart (scores)
    const radarData = {
        labels: ['Consistance', 'Amélioration', 'Adhésion', 'Progression'],
        datasets: [{
            label: 'Vos scores',
            data: [
                trends.find(t => t.type === 'achievement')?.confidence || 0,
                trends.find(t => t.type === 'training')?.confidence || 0,
                75, // Exemple
                60  // Exemple
            ],
            backgroundColor: 'rgba(54, 162, 235, 0.2)',
            borderColor: 'rgba(54, 162, 235, 1)',
            pointBackgroundColor: 'rgba(54, 162, 235, 1)'
        }]
    };
    
    return {
        achievement: achievementData.slice(-30),
        weight: {
            actual: weightData,
            predicted: predictionData
        },
        radar: radarData,
        trends: trends.map(trend => ({
            type: trend.type,
            direction: trend.direction,
            confidence: trend.confidence
        }))
    };
}

// ============ FONCTIONS UTILITAIRES ============
function fillMissingValues(array) {
    if (array.length === 0) return array;
    
    const filled = [...array];
    for (let i = 1; i < filled.length; i++) {
        if (filled[i] === undefined || filled[i] === null) {
            filled[i] = filled[i - 1];
        }
    }
    return filled;
}

function calculateAverageDailyChange(values) {
    if (values.length < 2) return 0;
    
    let totalChange = 0;
    for (let i = 1; i < values.length; i++) {
        totalChange += values[i] - values[i - 1];
    }
    
    return totalChange / (values.length - 1);
}

function calculateSuccessProbability(weights, avgDailyLoss) {
    if (weights.length < 3) return 50;
    
    // Calculer la variance
    const mean = weights.reduce((a, b) => a + b) / weights.length;
    const variance = weights.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / weights.length;
    
    // Plus la variance est faible, plus la probabilité est élevée
    const consistencyFactor = Math.max(0, 100 - (variance * 10));
    
    // Facteur basé sur la tendance
    const trendFactor = avgDailyLoss < 0 ? 70 : 30;
    
    return Math.round((consistencyFactor + trendFactor) / 2);
}

function calculateConsistencyScore(dailyLogs) {
    if (dailyLogs.length < 2) return 0;
    
    let consistentDays = 0;
    for (let i = 1; i < dailyLogs.length; i++) {
        const prev = dailyLogs[i - 1];
        const curr = dailyLogs[i];
        
        // Vérifier la consistance dans l'entraînement
        if (prev.training?.duration && curr.training?.duration) {
            if (Math.abs(prev.training.duration - curr.training.duration) < 20) {
                consistentDays++;
            }
        }
        
        // Vérifier la consistance dans la nutrition
        if (prev.nutrition?.caloriesConsumed && curr.nutrition?.caloriesConsumed) {
            const diff = Math.abs(prev.nutrition.caloriesConsumed - curr.nutrition.caloriesConsumed);
            if (diff < 300) {
                consistentDays++;
            }
        }
    }
    
    const maxPossible = (dailyLogs.length - 1) * 2;
    return maxPossible > 0 ? (consistentDays / maxPossible) * 100 : 0;
}

function calculateImprovementScore(dailyLogs) {
    if (dailyLogs.length < 2) return 0;
    
    let improvements = 0;
    let totalComparisons = 0;
    
    // Comparer chaque jour avec le précédent
    for (let i = 1; i < dailyLogs.length; i++) {
        const prev = dailyLogs[i - 1];
        const curr = dailyLogs[i];
        
        // Amélioration dans l'achievement score
        if (prev.programProgress?.achievementScore && curr.programProgress?.achievementScore) {
            totalComparisons++;
            if (curr.programProgress.achievementScore > prev.programProgress.achievementScore) {
                improvements++;
            }
        }
        
        // Amélioration dans la durée d'entraînement
        if (prev.training?.duration && curr.training?.duration) {
            totalComparisons++;
            if (curr.training.duration > prev.training.duration) {
                improvements++;
            }
        }
    }
    
    return totalComparisons > 0 ? (improvements / totalComparisons) * 100 : 0;
}

function calculateAdherenceScore(dailyLogs, program) {
    if (!program || dailyLogs.length === 0) return 0;
    
    let adherenceDays = 0;
    
    dailyLogs.forEach(log => {
        let dayScore = 0;
        let maxScore = 0;
        
        // Adhérence aux calories
        if (log.nutrition?.caloriesConsumed && program.nutrition?.dailyCalories) {
            maxScore++;
            const diff = Math.abs(log.nutrition.caloriesConsumed - program.nutrition.dailyCalories);
            if (diff < 200) {
                dayScore++;
            }
        }
        
        // Adhérence à l'entraînement
        if (log.training?.duration && program.trainingDays) {
            maxScore++;
            if (log.training.duration >= 30) { // Au moins 30 minutes
                dayScore++;
            }
        }
        
        if (maxScore > 0) {
            adherenceDays += (dayScore / maxScore) * 100;
        }
    });
    
    return dailyLogs.length > 0 ? adherenceDays / dailyLogs.length : 0;
}

function calculateOverallProgress(dailyLogs, program) {
    if (dailyLogs.length === 0) return 0;
    
    const latestLog = dailyLogs[dailyLogs.length - 1];
    const firstLog = dailyLogs[0];
    
    let progress = 0;
    let factors = 0;
    
    // Progression dans le score d'achievement
    if (latestLog.programProgress?.achievementScore && firstLog.programProgress?.achievementScore) {
        progress += latestLog.programProgress.achievementScore - firstLog.programProgress.achievementScore;
        factors++;
    }
    
    // Progression dans le poids (si objectif défini)
    if (program?.goal === 'perte de poids' && latestLog.bodyMetrics?.weight && firstLog.bodyMetrics?.weight) {
        const weightLoss = firstLog.bodyMetrics.weight - latestLog.bodyMetrics.weight;
        if (weightLoss > 0) {
            progress += weightLoss * 10; // Multiplicateur pour l'importance
            factors++;
        }
    }
    
    return factors > 0 ? Math.min(100, Math.max(0, progress / factors)) : 0;
}

function generateComparisons(dailyLogs, period) {
    if (dailyLogs.length < 2) return [];
    
    const comparisons = [];
    const halfIndex = Math.floor(dailyLogs.length / 2);
    const firstHalf = dailyLogs.slice(0, halfIndex);
    const secondHalf = dailyLogs.slice(halfIndex);
    
    // Comparer les moyennes
    const metrics = ['achievementScore', 'caloriesConsumed', 'trainingDuration', 'water'];
    
    metrics.forEach(metric => {
        const firstAvg = calculateAverage(firstHalf, metric);
        const secondAvg = calculateAverage(secondHalf, metric);
        
        if (firstAvg && secondAvg) {
            const percentageChange = ((secondAvg - firstAvg) / firstAvg) * 100;
            
            comparisons.push({
                metric,
                current: secondAvg,
                previous: firstAvg,
                percentageChange: parseFloat(percentageChange.toFixed(1)),
                isImprovement: determineIfImprovement(metric, percentageChange)
            });
        }
    });
    
    return comparisons;
}

function calculateAverage(logs, metric) {
    let sum = 0;
    let count = 0;
    
    logs.forEach(log => {
        let value;
        
        switch(metric) {
            case 'achievementScore':
                value = log.programProgress?.achievementScore;
                break;
            case 'caloriesConsumed':
                value = log.nutrition?.caloriesConsumed;
                break;
            case 'trainingDuration':
                value = log.training?.duration;
                break;
            case 'water':
                value = log.nutrition?.water;
                break;
        }
        
        if (value !== undefined && value !== null) {
            sum += value;
            count++;
        }
    });
    
    return count > 0 ? sum / count : null;
}

function determineIfImprovement(metric, percentageChange) {
    switch(metric) {
        case 'achievementScore':
            return percentageChange > 0;
        case 'caloriesConsumed':
            return Math.abs(percentageChange) < 10; // Stable est bon
        case 'trainingDuration':
            return percentageChange > 0;
        case 'water':
            return percentageChange > 0;
        default:
            return true;
    }
}

function generateSummary(trends, scores, insights) {
    const positiveTrends = trends.filter(t => 
        (t.type === 'weight' && t.direction === 'down') || 
        (t.type !== 'weight' && t.direction === 'up')
    ).length;
    
    const totalTrends = trends.length;
    const trendPercentage = totalTrends > 0 ? (positiveTrends / totalTrends) * 100 : 0;
    
    let status = 'excellent';
    if (scores.overallProgress < 40) status = 'needs_improvement';
    else if (scores.overallProgress < 70) status = 'good';
    else if (scores.overallProgress < 90) status = 'very_good';
    
    return {
        status,
        overallProgress: scores.overallProgress,
        positiveTrends: trendPercentage,
        keyInsight: insights.length > 0 ? insights[0].message : 'Continuez à suivre vos progrès !',
        recommendation: generateRecommendation(scores, trends)
    };
}

function generateRecommendation(scores, trends) {
    if (scores.consistencyScore < 60) {
        return "Concentrez-vous sur l'établissement d'une routine régulière.";
    }
    
    const weightTrend = trends.find(t => t.type === 'weight');
    if (weightTrend && weightTrend.direction === 'up') {
        return "Votre poids augmente. Vérifiez votre apport calorique si vous visez la perte de poids.";
    }
    
    return "Continuez votre excellent travail ! Vos efforts portent leurs fruits.";
}

module.exports = router;