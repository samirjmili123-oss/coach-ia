const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Schéma Mongoose pour MongoDB
const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  age: {
    type: Number,
    required: true,
    min: 15,
    max: 100
  },
  height: {
    type: Number, // en cm
    required: true,
    min: 100,
    max: 250
  },
  weight: {
    type: Number, // en kg
    required: true,
    min: 30,
    max: 200
  },
  sportLevel: {
    type: String,
    enum: ['débutant', 'intermédiaire', 'avancé'],
    required: true,
    default: 'débutant'
  },
  trainingDaysPerWeek: {
    type: Number,
    required: true,
    min: 1,
    max: 7,
    default: 3
  },
  goal: {
    type: String,
    enum: ['perte de poids', 'prise de masse', 'maintien', 'endurance'],
    required: true,
    default: 'maintien'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Middleware pour hacher le mot de passe avant sauvegarde
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    this.updatedAt = Date.now();
    return next();
  }
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    this.updatedAt = Date.now();
    next();
  } catch (error) {
    next(error);
  }
});

// Méthode pour comparer les mots de passe
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Méthode pour obtenir les données publiques
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  delete user.__v;
  return user;
};

// Création du modèle
const User = mongoose.model('User', userSchema);

// Classe pour le mode inMemory (compatibilité)
class UserInMemory {
  constructor(data) {
    this.id = data.id;
    this.email = data.email;
    this.password = data.password;
    this.age = data.age;
    this.height = data.height;
    this.weight = data.weight;
    this.sportLevel = data.sportLevel;
    this.trainingDaysPerWeek = data.trainingDaysPerWeek;
    this.goal = data.goal;
    this.createdAt = data.createdAt || new Date();
  }

  async comparePassword(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
  }

  toJSON() {
    return {
      id: this.id,
      email: this.email,
      age: this.age,
      height: this.height,
      weight: this.weight,
      sportLevel: this.sportLevel,
      trainingDaysPerWeek: this.trainingDaysPerWeek,
      goal: this.goal,
      createdAt: this.createdAt
    };
  }
}

// Export dual : MongoDB + inMemory
module.exports = {
  // Pour MongoDB
  User,
  
  // Pour inMemory (rétrocompatibilité)
  UserInMemory,
  
  // Fonction utilitaire pour choisir la source
  getUserModel: () => {
    const isMongoConnected = mongoose.connection.readyState === 1;
    return {
      isMongoConnected,
      model: isMongoConnected ? User : null
    };
  }
};