const { db } = require('../../database');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

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

// Middleware do sprawdzania uprawnień (NOWY SYSTEM)
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Wymagane uwierzytelnienie' });
    }

    // Sprawdź czy użytkownik ma uprawnienie przez role
    db.get(`
      SELECT COUNT(*) as has_permission
      FROM user_roles ur
      JOIN permission_roles pr ON ur.role_id = pr.role_id
      JOIN permissions p ON pr.permission_id = p.id
      WHERE ur.user_id = ? AND p.name = ?
    `, [req.user.id, permission], (err, row) => {
      if (err) {
        console.error('Błąd przy sprawdzaniu uprawnień:', err);
        return res.status(500).json({ error: 'Błąd serwera przy sprawdzaniu uprawnień' });
      }

      if (!row || row.has_permission === 0) {
        return res.status(403).json({ error: 'Brak wymaganych uprawnień: ' + permission });
      }

      next();
    });
  };
};

// Middleware do sprawdzania czy użytkownik ma którąkolwiek z podanych ról
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Wymagane uwierzytelnienie' });
    }

    // Sprawdź czy użytkownik ma którąś z wymaganych ról
    db.get(`
      SELECT COUNT(*) as has_role
      FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = ? AND r.name IN (${roles.map(() => '?').join(',')})
    `, [req.user.id, ...roles], (err, row) => {
      if (err) {
        console.error('Błąd przy sprawdzaniu ról:', err);
        return res.status(500).json({ error: 'Błąd serwera przy sprawdzaniu ról' });
      }

      if (!row || row.has_role === 0) {
        return res.status(403).json({ error: 'Brak wymaganej roli' });
      }

      next();
    });
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
          // Sprawdź czy użytkownik ma uprawnienie do zarządzania cudzymi treściami
          db.get(`
            SELECT COUNT(*) as can_manage
            FROM user_roles ur
            JOIN permission_roles pr ON ur.role_id = pr.role_id
            JOIN permissions p ON pr.permission_id = p.id
            WHERE ur.user_id = ? AND p.name IN ('manage_posts', 'manage_threads', 'delete_any_content')
          `, [req.user.id], (err, permissionRow) => {
            if (err || !permissionRow || permissionRow.can_manage === 0) {
              return res.status(403).json({ error: 'Nie jesteś właścicielem tego zasobu' });
            }
            next();
          });
        } else {
          next();
        }
      }
    );
  };
};

// Funkcja do pobierania wszystkich uprawnień użytkownika
const getUserPermissions = (userId, callback) => {
  db.all(`
    SELECT DISTINCT p.name
    FROM user_roles ur
    JOIN permission_roles pr ON ur.role_id = pr.role_id
    JOIN permissions p ON pr.permission_id = p.id
    WHERE ur.user_id = ?
  `, [userId], (err, rows) => {
    if (err) {
      console.error('Błąd przy pobieraniu uprawnień użytkownika:', err);
      return callback(err, []);
    }
    
    const permissions = rows.map(row => row.name);
    callback(null, permissions);
  });
};

// Funkcja do pobierania wszystkich ról użytkownika
const getUserRoles = (userId, callback) => {
  db.all(`
    SELECT r.name
    FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = ?
  `, [userId], (err, rows) => {
    if (err) {
      console.error('Błąd przy pobieraniu ról użytkownika:', err);
      return callback(err, []);
    }
    
    const roles = rows.map(row => row.name);
    callback(null, roles);
  });
};

// Middleware do dodawania uprawnień użytkownika do req.user
const addUserPermissions = (req, res, next) => {
  if (!req.user) {
    return next();
  }

  getUserPermissions(req.user.id, (err, permissions) => {
    if (err) {
      console.error('Błąd przy pobieraniu uprawnień:', err);
      // Kontynuuj bez uprawnień zamiast blokować
      req.user.permissions = [];
      return next();
    }
    
    req.user.permissions = permissions;
    
    // Dodaj też role użytkownika
    getUserRoles(req.user.id, (err, roles) => {
      if (err) {
        console.error('Błąd przy pobieraniu ról:', err);
        req.user.roles = [];
      } else {
        req.user.roles = roles;
      }
      next();
    });
  });
};

module.exports = {
  authenticateToken,
  requirePermission,
  requireRole,
  checkOwnership,
  getUserPermissions,
  getUserRoles,
  addUserPermissions,
  JWT_SECRET
};
