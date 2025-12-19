const jwt = require('jsonwebtoken');

module.exports = function(req, res, next) {
  // Récupérer le token
  const token = req.header('x-auth-token') || req.query.token;
  
  if (!token) {
    return res.status(401).json({ 
      success: false,
      message: 'Accès non autorisé. Token manquant.' 
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Support pour MongoDB (_id) et inMemory (id)
    req.userId = decoded.userId || decoded._id || decoded.id;
    
    if (!req.userId) {
      return res.status(401).json({ 
        success: false,
        message: 'Token invalide: ID utilisateur manquant.' 
      });
    }
    
    next();
  } catch (err) {
    res.status(401).json({ 
      success: false,
      message: 'Token invalide ou expiré.' 
    });
  }
};