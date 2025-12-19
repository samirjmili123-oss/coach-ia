const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { DailyLog, DailyLogInMemory, getDailyLogModel } = require('../models/DailyLog');
const { getUserModel } = require('../models/User');
const Program = require('../models/program');

// ============ ENREGISTRER UN LOG QUOTIDIEN ============
router.post('/', auth, async (req, res) => {
    try {
        const {
            training,
            nutrition,
            bodyMetrics
        } = req.body;

        const { isMongoConnected } = getDailyLogModel();
        const { model: UserModel } = getUserModel();
        
        let user;
        let activeProgram;

        // Récupérer l'utilisateur
        if (isMongoConnected) {
            user = await UserModel.findById(req.userId);
        } else {
            user = global.database.users.find(u => u.id === req.userId);
        }

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Utilisateur non trouvé'
            });
        }

        // Récupérer le programme actif (le plus récent)
        if (isMongoConnected && Program) {
            activeProgram = await Program.findOne({ userId: req.userId })
                .sort({ createdAt: -1 });
        } else {
            activeProgram = global.database.programs
                .filter(p => p.userId === req.userId)
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
        }

        // Calculer le score de réussite
        const achievementScore = calculateDailyScore(training, nutrition, activeProgram);
        
        // Calculer si on est sur la bonne voie
        const isOnTrack = achievementScore >= 70;
        
        // Calculer les écarts par rapport au plan
        const deviations = calculateDeviations(nutrition, training, activeProgram);

        const logData = {
            userId: req.userId,
            date: new Date(),
            training: training || {},
            nutrition: nutrition || {},
            bodyMetrics: bodyMetrics || {},
            programProgress: {
                programId: activeProgram?._id || activeProgram?.id,
                isOnTrack,
                deviationFromPlan: deviations,
                achievementScore
            }
        };

        let savedLog;

        if (isMongoConnected && DailyLog) {
            // Vérifier si un log existe déjà pour aujourd'hui
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            const existingLog = await DailyLog.findOne({
                userId: req.userId,
                date: { $gte: today, $lt: tomorrow }
            });

            if (existingLog) {
                // Mettre à jour le log existant
                savedLog = await DailyLog.findByIdAndUpdate(
                    existingLog._id,
                    logData,
                    { new: true }
                );
            } else {
                // Créer un nouveau log
                const log = new DailyLog(logData);
                savedLog = await log.save();
            }
        } else {
            // Mode In-Memory
            const today = new Date().toDateString();
            const existingIndex = global.database.dailyLogs?.findIndex(log => 
                log.userId === req.userId && 
                new Date(log.date).toDateString() === today
            );

            const newLog = new DailyLogInMemory({
                id: Date.now(),
                ...logData
            });

            if (!global.database.dailyLogs) {
                global.database.dailyLogs = [];
            }

            if (existingIndex !== -1 && existingIndex !== undefined) {
                global.database.dailyLogs[existingIndex] = newLog;
                savedLog = newLog;
            } else {
                global.database.dailyLogs.push(newLog);
                savedLog = newLog;
            }
        }

        // Générer des recommandations personnalisées
        const recommendations = generateRecommendations(savedLog, activeProgram, user);

        res.json({
            success: true,
            message: 'Journal quotidien enregistré !',
            log: savedLog,
            recommendations,
            isOnTrack,
            achievementScore,
            database: isMongoConnected ? 'mongodb' : 'inmemory'
        });

    } catch (error) {
        console.error('❌ Erreur enregistrement journal:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de l\'enregistrement',
            error: error.message
        });
    }
});

// ============ RÉCUPÉRER LES LOGS D'UNE PÉRIODE ============
router.get('/', auth, async (req, res) => {
    try {
        const { startDate, endDate, limit = 30 } = req.query;
        const { isMongoConnected } = getDailyLogModel();

        let query = { userId: req.userId };
        
        // Filtrer par date si fourni
        if (startDate || endDate) {
            query.date = {};
            if (startDate) query.date.$gte = new Date(startDate);
            if (endDate) query.date.$lte = new Date(endDate);
        }

        let logs;

        if (isMongoConnected && DailyLog) {
            logs = await DailyLog.find(query)
                .sort({ date: -1 })
                .limit(parseInt(limit))
                .lean();
        } else {
            logs = (global.database.dailyLogs || [])
                .filter(log => log.userId === req.userId)
                .sort((a, b) => new Date(b.date) - new Date(a.date))
                .slice(0, parseInt(limit));
        }

        res.json({
            success: true,
            logs,
            count: logs.length
        });

    } catch (error) {
        console.error('Erreur récupération logs:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur'
        });
    }
});

// ============ STATISTIQUES DÉTAILLÉES ============
router.get('/statistics', auth, async (req, res) => {
    try {
        const { period = 'week' } = req.query; // week, month, year
        const { isMongoConnected } = getDailyLogModel();
        
        const periods = {
            week: 7,
            month: 30,
            year: 365
        };
        
        const days = periods[period] || 7;
        const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

        let statistics;

        if (isMongoConnected && DailyLog) {
            // Agrégation MongoDB pour les statistiques
            statistics = await DailyLog.aggregate([
                {
                    $match: {
                        userId: mongoose.Types.ObjectId(req.userId),
                        date: { $gte: startDate }
                    }
                },
                {
                    $group: {
                        _id: null,
                        // Moyennes
                        avgAchievement: { $avg: "$programProgress.achievementScore" },
                        avgCalories: { $avg: "$nutrition.caloriesConsumed" },
                        avgWater: { $avg: "$nutrition.water" },
                        avgProtein: { $avg: "$nutrition.protein" },
                        avgTrainingDuration: { $avg: "$training.duration" },
                        
                        // Totaux
                        totalTrainingDays: {
                            $sum: {
                                $cond: [{ $gt: ["$training.duration", 0] }, 1, 0]
                            }
                        },
                        totalDays: { $sum: 1 },
                        
                        // Tendances
                        bestDay: { $max: "$programProgress.achievementScore" },
                        worstDay: { $min: "$programProgress.achievementScore" },
                        
                        // Consistance
                        onTrackDays: {
                            $sum: {
                                $cond: [{ $gte: ["$programProgress.achievementScore", 70] }, 1, 0]
                            }
                        }
                    }
                },
                {
                    $project: {
                        _id: 0,
                        averages: {
                            achievement: { $round: ["$avgAchievement", 1] },
                            calories: { $round: ["$avgCalories", 0] },
                            water: { $round: ["$avgWater", 2] },
                            protein: { $round: ["$avgProtein", 1] },
                            trainingDuration: { $round: ["$avgTrainingDuration", 0] }
                        },
                        totals: {
                            trainingDays: "$totalTrainingDays",
                            totalDays: "$totalDays",
                            trainingFrequency: {
                                $round: [
                                    { $multiply: [
                                        { $divide: ["$totalTrainingDays", "$totalDays"] },
                                        100
                                    ]},
                                    1
                                ]
                            }
                        },
                        performance: {
                            bestDay: { $round: ["$bestDay", 1] },
                            worstDay: { $round: ["$worstDay", 1] },
                            consistency: {
                                $round: [
                                    { $multiply: [
                                        { $divide: ["$onTrackDays", "$totalDays"] },
                                        100
                                    ]},
                                    1
                                ]
                            }
                        }
                    }
                }
            ]);
        } else {
            // Mode In-Memory
            const logs = (global.database.dailyLogs || [])
                .filter(log => 
                    log.userId === req.userId && 
                    new Date(log.date) >= startDate
                );
            
            if (logs.length === 0) {
                statistics = [{
                    averages: {},
                    totals: {},
                    performance: {}
                }];
            } else {
                const totals = logs.reduce((acc, log) => {
                    acc.achievement += log.programProgress?.achievementScore || 0;
                    acc.calories += log.nutrition?.caloriesConsumed || 0;
                    acc.water += log.nutrition?.water || 0;
                    acc.protein += log.nutrition?.protein || 0;
                    acc.trainingDuration += log.training?.duration || 0;
                    acc.trainingDays += log.training?.duration > 0 ? 1 : 0;
                    acc.onTrackDays += (log.programProgress?.achievementScore || 0) >= 70 ? 1 : 0;
                    return acc;
                }, {
                    achievement: 0,
                    calories: 0,
                    water: 0,
                    protein: 0,
                    trainingDuration: 0,
                    trainingDays: 0,
                    onTrackDays: 0
                });
                
                const count = logs.length;
                statistics = [{
                    averages: {
                        achievement: Math.round((totals.achievement / count) * 10) / 10,
                        calories: Math.round(totals.calories / count),
                        water: Math.round((totals.water / count) * 100) / 100,
                        protein: Math.round((totals.protein / count) * 10) / 10,
                        trainingDuration: Math.round(totals.trainingDuration / count)
                    },
                    totals: {
                        trainingDays: totals.trainingDays,
                        totalDays: count,
                        trainingFrequency: Math.round((totals.trainingDays / count) * 1000) / 10
                    },
                    performance: {
                        bestDay: Math.max(...logs.map(l => l.programProgress?.achievementScore || 0)),
                        worstDay: Math.min(...logs.map(l => l.programProgress?.achievementScore || 0)),
                        consistency: Math.round((totals.onTrackDays / count) * 1000) / 10
                    }
                }];
            }
        }

        // Récupérer le programme actif pour les comparaisons
        let activeProgram;
        const { model: UserModel } = getUserModel();
        
        if (isMongoConnected && Program) {
            activeProgram = await Program.findOne({ userId: req.userId })
                .sort({ createdAt: -1 })
                .lean();
        } else {
            activeProgram = global.database.programs
                .filter(p => p.userId === req.userId)
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
        }

        // Générer les recommandations basées sur les statistiques
        const recommendations = generateStatisticalRecommendations(
            statistics[0], 
            activeProgram, 
            period
        );

        res.json({
            success: true,
            period,
            days,
            statistics: statistics[0] || {},
            comparisonWithPlan: compareWithPlan(statistics[0], activeProgram),
            recommendations,
            chartData: prepareChartData(logs || [], period)
        });

    } catch (error) {
        console.error('❌ Erreur statistiques:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors du calcul des statistiques',
            error: error.message
        });
    }
});

// ============ DONNÉES POUR GRAPHIQUES ============
router.get('/charts/:type', auth, async (req, res) => {
    try {
        const { type } = req.params; // achievement, calories, water, training
        const { period = 'week' } = req.query;
        const { isMongoConnected } = getDailyLogModel();
        
        const days = period === 'week' ? 7 : period === 'month' ? 30 : 365;
        const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

        let logs;

        if (isMongoConnected && DailyLog) {
            logs = await DailyLog.find({
                userId: req.userId,
                date: { $gte: startDate }
            })
            .sort({ date: 1 })
            .lean();
        } else {
            logs = (global.database.dailyLogs || [])
                .filter(log => 
                    log.userId === req.userId && 
                    new Date(log.date) >= startDate
                )
                .sort((a, b) => new Date(a.date) - new Date(b.date));
        }

        const chartData = prepareSpecificChartData(logs, type, period);

        res.json({
            success: true,
            type,
            period,
            chartData
        });

    } catch (error) {
        console.error('Erreur graphiques:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur'
        });
    }
});

// ============ FONCTIONS UTILITAIRES ============

function calculateDailyScore(training, nutrition, program) {
    let score = 0;
    const maxScore = 100;
    
    // Points pour l'entraînement (30 points max)
    if (training && training.duration > 0) {
        score += Math.min(30, (training.duration / 60) * 30);
        if (training.intensity === 'élevée') score += 5;
    }
    
    // Points pour l'eau (20 points max)
    if (nutrition && nutrition.water) {
        const targetWater = 2.5; // litres
        score += Math.min(20, (nutrition.water / targetWater) * 20);
    }
    
    // Points pour les calories (30 points max)
    if (nutrition && nutrition.caloriesConsumed && program?.nutrition?.dailyCalories) {
        const target = program.nutrition.dailyCalories;
        const diff = Math.abs(nutrition.caloriesConsumed - target);
        const accuracy = Math.max(0, 1 - (diff / target));
        score += accuracy * 30;
    }
    
    // Points pour les protéines (20 points max)
    if (nutrition && nutrition.protein && program?.nutrition?.macronutrients?.protein) {
        const target = program.nutrition.macronutrients.protein;
        const diff = Math.abs(nutrition.protein - target);
        const accuracy = Math.max(0, 1 - (diff / target));
        score += accuracy * 20;
    }
    
    return Math.round(Math.min(score, maxScore));
}

function calculateDeviations(nutrition, training, program) {
    const deviations = {
        calories: 0,
        protein: 0,
        training: 0
    };
    
    if (program?.nutrition) {
        if (nutrition?.caloriesConsumed) {
            deviations.calories = nutrition.caloriesConsumed - program.nutrition.dailyCalories;
        }
        
        if (nutrition?.protein) {
            deviations.protein = nutrition.protein - program.nutrition.macronutrients.protein;
        }
    }
    
    if (program?.trainingDays && training?.duration) {
        const targetMinutes = program.trainingDays * 60; // 60 minutes par session
        deviations.training = (training.duration / targetMinutes) * 100 - 100;
    }
    
    return deviations;
}

function generateRecommendations(log, program, user) {
    const recommendations = [];
    const score = log.programProgress?.achievementScore || 0;
    
    if (score < 70) {
        recommendations.push("⚠️ Vous êtes en dessous de votre objectif quotidien. Essayez de faire mieux demain !");
        
        if (log.nutrition?.water < 2) {
            recommendations.push("💧 Buvez plus d'eau ! Ciblez 2-3 litres par jour.");
        }
        
        if (log.training?.duration < 30) {
            recommendations.push("🏃 Essayez d'atteindre au moins 30 minutes d'activité physique.");
        }
    } else if (score >= 85) {
        recommendations.push("🎉 Excellent travail ! Vous êtes sur la bonne voie !");
    }
    
    // Recommandations spécifiques au programme
    if (program?.goal === 'perte de poids' && log.nutrition?.caloriesConsumed > program.nutrition?.dailyCalories) {
        recommendations.push("📉 Pour la perte de poids, essayez de rester sous votre objectif calorique.");
    }
    
    if (program?.goal === 'prise de masse' && log.nutrition?.protein < program.nutrition?.macronutrients?.protein) {
        recommendations.push("💪 Augmentez votre apport en protéines pour soutenir la prise de masse.");
    }
    
    return recommendations;
}

function generateStatisticalRecommendations(statistics, program, period) {
    const recommendations = [];
    
    if (!statistics.averages) return recommendations;
    
    // Recommandations basées sur la consistance
    if (statistics.performance?.consistency < 70) {
        recommendations.push({
            type: 'warning',
            message: `Votre consistance sur ${period} est de ${statistics.performance.consistency}%. Essayez d'être plus régulier !`,
            action: 'Essayez de planifier vos séances à l\'avance.'
        });
    }
    
    // Recommandations basées sur l'entraînement
    if (statistics.totals?.trainingFrequency < 50) {
        recommendations.push({
            type: 'training',
            message: `Vous vous êtes entraîné seulement ${statistics.totals.trainingDays} jours sur ${statistics.totals.totalDays}.`,
            action: 'Visitez au moins 3 séances par semaine.'
        });
    }
    
    // Comparaison avec le programme
    if (program?.nutrition) {
        const calorieDiff = statistics.averages.calories - program.nutrition.dailyCalories;
        if (Math.abs(calorieDiff) > 200) {
            recommendations.push({
                type: 'nutrition',
                message: `Votre apport calorique moyen est ${calorieDiff > 0 ? 'au-dessus' : 'en dessous'} de votre objectif de ${program.nutrition.dailyCalories} calories.`,
                action: calorieDiff > 0 ? 'Réduisez légèrement vos portions.' : 'Ajoutez une collation saine.'
            });
        }
    }
    
    return recommendations;
}

function compareWithPlan(statistics, program) {
    if (!program || !statistics.averages) return null;
    
    return {
        calories: {
            actual: statistics.averages.calories,
            target: program.nutrition?.dailyCalories || 0,
            difference: statistics.averages.calories - (program.nutrition?.dailyCalories || 0),
            onTrack: Math.abs(statistics.averages.calories - (program.nutrition?.dailyCalories || 0)) < 200
        },
        training: {
            actualFrequency: statistics.totals?.trainingFrequency || 0,
            targetFrequency: (program.trainingDays / 7) * 100,
            onTrack: (statistics.totals?.trainingFrequency || 0) >= (program.trainingDays / 7) * 100 * 0.8
        },
        overall: {
            achievement: statistics.averages?.achievement || 0,
            target: 70,
            onTrack: (statistics.averages?.achievement || 0) >= 70
        }
    };
}

function prepareChartData(logs, period) {
    // Préparer les données pour différents graphiques
    const achievementData = logs.map(log => ({
        date: new Date(log.date).toLocaleDateString(),
        score: log.programProgress?.achievementScore || 0
    }));
    
    const nutritionData = logs.map(log => ({
        date: new Date(log.date).toLocaleDateString(),
        calories: log.nutrition?.caloriesConsumed || 0,
        protein: log.nutrition?.protein || 0,
        water: log.nutrition?.water || 0
    }));
    
    const trainingData = logs.map(log => ({
        date: new Date(log.date).toLocaleDateString(),
        duration: log.training?.duration || 0,
        type: log.training?.type || 'repos'
    }));
    
    return {
        achievement: achievementData.slice(-10), // 10 derniers jours
        nutrition: nutritionData.slice(-7), // 7 derniers jours
        training: trainingData.slice(-14), // 14 derniers jours
        trends: calculateTrends(logs)
    };
}

function prepareSpecificChartData(logs, type, period) {
    switch(type) {
        case 'achievement':
            return logs.map(log => ({
                x: new Date(log.date),
                y: log.programProgress?.achievementScore || 0
            }));
        case 'calories':
            return logs.map(log => ({
                x: new Date(log.date),
                y: log.nutrition?.caloriesConsumed || 0,
                protein: log.nutrition?.protein || 0
            }));
        case 'water':
            return logs.map(log => ({
                x: new Date(log.date),
                y: log.nutrition?.water || 0
            }));
        case 'training':
            return logs.map(log => ({
                x: new Date(log.date),
                y: log.training?.duration || 0,
                type: log.training?.type
            }));
        default:
            return [];
    }
}

function calculateTrends(logs) {
    if (logs.length < 2) return { direction: 'stable', value: 0 };
    
    const recentScores = logs.slice(-7).map(l => l.programProgress?.achievementScore || 0);
    const olderScores = logs.slice(0, -7).map(l => l.programProgress?.achievementScore || 0);
    
    const recentAvg = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
    const olderAvg = olderScores.length > 0 ? 
        olderScores.reduce((a, b) => a + b, 0) / olderScores.length : recentAvg;
    
    const trend = ((recentAvg - olderAvg) / olderAvg) * 100;
    
    return {
        direction: trend > 5 ? 'up' : trend < -5 ? 'down' : 'stable',
        value: Math.round(trend * 10) / 10,
        description: trend > 5 ? 'Amélioration' : trend < -5 ? 'Régression' : 'Stable'
    };
}

module.exports = router;