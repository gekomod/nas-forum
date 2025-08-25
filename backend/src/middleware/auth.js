const { db } = require('../../database'); // Poprawny import
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

const PERMISSIONS = {
  manage_users: ['Administrator'],
  manage_categories: ['Administrator'],
  manage_threads: ['Administrator', 'Moderator'],
  manage_posts: ['Administrator', 'Moderator'],
  delete_any_content: ['Administrator', 'Moderator'],
  assign_roles: ['Administrator'],
  create_threads: ['Administrator', 'Moderator', 'Użytkownik', 'VIP', 'Redaktor'],
  create_posts: ['Administrator', 'Moderator', 'Użytkownik', 'VIP', 'Redaktor'],
  edit_own_content: ['Administrator', 'Moderator', 'Użytkownik', 'VIP', 'Redaktor'],
  delete_own_content: ['Administrator', 'Moderator', 'Użytkownik', 'VIP', 'Redaktor'],
  // Nowe uprawnienia dla powiadomień
  manage_notifications: ['Administrator', 'Moderator', 'Użytkownik', 'VIP', 'Redaktor'],
  subscribe_threads: ['Administrator', 'Moderator', 'Użytkownik', 'VIP', 'Redaktor']
};

// Middleware do weryfikacji JWT tokena
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Token dostępu wymagany' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Nieprawidłowy token' });
    }
    req.user = user;
    next();
  });
};

// Middleware do sprawdzania uprawnień
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Wymagane uwierzytelnienie' });
    }

    db.get(
      `SELECT r.permissions FROM users u 
       JOIN roles r ON u.role_id = r.id 
       WHERE u.id = ?`,
      [req.user.id],
      (err, row) => {
        if (err || !row) {
          return res.status(403).json({ error: 'Brak uprawnień' });
        }

        try {
          const permissions = JSON.parse(row.permissions);
          if (!permissions[permission]) {
            return res.status(403).json({ error: 'Brak wymaganych uprawnień' });
          }

          next();
        } catch (parseError) {
          return res.status(500).json({ error: 'Błąd parsowania uprawnień' });
        }
      }
    );
  };
};

// Middleware do sprawdzania własności contentu
const checkOwnership = (table, idParam = 'id') => {
  return (req, res, next) => {
    const resourceId = req.params[idParam];
    
    db.get(
      `SELECT user_id FROM ${table} WHERE id = ?`,
      [resourceId],
      (err, row) => {
        if (err || !row) {
          return res.status(404).json({ error: 'Zasób nie istnieje' });
        }

        if (row.user_id !== req.user.id) {
          return res.status(403).json({ error: 'Nie jesteś właścicielem tego zasobu' });
        }

        next();
      }
    );
  };
};

module.exports = {
  authenticateToken,
  requirePermission,
  checkOwnership,
  JWT_SECRET
};
