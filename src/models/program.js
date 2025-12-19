const mongoose = require('mongoose');

const exerciseSchema = new mongoose.Schema({
  name: { type: String, required: true },
  muscleGroup: { type: String, required: true },
  sets: { type: Number, required: true },
  reps: { type: String, required: true },
  rest: { type: String, required: true },
  difficulty: { type: String, enum: ['débutant', 'intermédiaire', 'avancé'] }
});

const sessionSchema = new mongoose.Schema({
  dayNumber: { type: Number, required: true },
  dayName: { type: String, required: true },
  focus: { type: String, required: true },
  duration: { type: String },
  intensity: { type: String },
  exercises: [exerciseSchema],
  cardio: { type: Object },
  tips: [String]
});

const progressSchema = new mongoose.Schema({
  date: { type: Date, default: Date.now },
  sessionCompleted: { type: String, required: true },
  weight: { type: Number },
  notes: { type: String },
  rating: { type: Number, min: 0, max: 5 }
});

const nutritionSchema = new mongoose.Schema({
  dailyCalories: { type: Number, required: true },
  macronutrients: {
    protein: { type: Number, required: true },
    carbs: { type: Number, required: true },
    fats: { type: Number, required: true }
  },
  water: { type: Number, required: true },
  mealsPerDay: { type: Number },
  supplements: [String]
});

const programSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Informations de base
  goal: { type: String, required: true },
  sportLevel: { type: String, required: true },
  bodyType: { type: String },
  bmi: { type: Number },
  
  // Durée
  durationWeeks: { type: Number, required: true },
  trainingDays: { type: Number, required: true },
  
  // Entraînement
  sessions: [sessionSchema],
  
  // Nutrition
  nutrition: nutritionSchema,
  
  // Calculs
  tdee: { type: Number },
  bmr: { type: Number },
  
  // Recommandations
  recommendations: [String],
  
  // Progression
  progress: [progressSchema],
  
  // Métadonnées
  generatedAt: { type: Date, default: Date.now },
  version: { type: String },
  
  // Statistiques
  completedSessions: { type: Number, default: 0 },
  averageRating: { type: Number, default: 0 },
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Middleware pour mettre à jour updatedAt
programSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index pour les performances
programSchema.index({ userId: 1, createdAt: -1 });
programSchema.index({ goal: 1, sportLevel: 1 });

// Méthode pour calculer la progression
programSchema.methods.calculateProgress = function() {
  const totalSessions = this.sessions.length * this.durationWeeks;
  const completed = this.progress.length;
  return totalSessions > 0 ? (completed / totalSessions) * 100 : 0;
};

// Méthode pour mettre à jour la note moyenne
programSchema.methods.updateAverageRating = function() {
  if (this.progress.length === 0) {
    this.averageRating = 0;
    return;
  }
  
  const sum = this.progress.reduce((acc, curr) => acc + (curr.rating || 0), 0);
  this.averageRating = sum / this.progress.length;
};

const Program = mongoose.model('Program', programSchema);

module.exports = Program;