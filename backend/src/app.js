const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { db, isFirstUser } = require('../database');
const { authenticateToken, requirePermission, checkOwnership, JWT_SECRET } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

// Rejestracja użytkownika
app.post('/api/register', async (req, res) => {
  const { username, email, password } = req.body;

  try {
    // Sprawdź czy użytkownik już istnieje
    db.get('SELECT id FROM users WHERE username = ? OR email = ?', [username, email], async (err, row) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      if (row) {
        return res.status(400).json({ error: 'Użytkownik już istnieje' });
      }

      // Sprawdź czy to pierwszy użytkownik (otrzyma rolę administratora)
      isFirstUser((firstUser) => {
        const roleId = firstUser ? 1 : 3; // 1 = Administrator, 3 = Użytkownik
        
        // Hash hasła
        bcrypt.hash(password, 10, (err, hashedPassword) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }
          
          // Utwórz użytkownika
          db.run(
            'INSERT INTO users (username, email, password, role_id) VALUES (?, ?, ?, ?)',
            [username, email, hashedPassword, roleId],
            function(err) {
              if (err) {
                return res.status(500).json({ error: err.message });
              }
              
              const message = firstUser 
                ? 'Pierwszy użytkownik został utworzony jako Administrator' 
                : 'Użytkownik został utworzony';
              
              res.status(201).json({ message, isFirstUser: firstUser });
            }
          );
        });
      });
    });
  } catch (error) {
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// Pobierz wszystkich użytkowników (tylko dla administratorów)
app.get('/api/users', authenticateToken, requirePermission('manage_users'), (req, res) => {
  db.all(
    `SELECT u.id, u.username, u.email, u.avatar, u.created_at, u.last_login, 
            r.id as role_id, r.name as role_name 
     FROM users u 
     JOIN roles r ON u.role_id = r.id 
     ORDER BY u.created_at DESC`,
    (err, users) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      res.json(users);
    }
  );
});

// Zmiana roli użytkownika (tylko dla administratorów)
app.put('/api/users/:id/role', authenticateToken, requirePermission('assign_roles'), (req, res) => {
  const userId = req.params.id;
  const { role_id } = req.body;

  db.run(
    'UPDATE users SET role_id = ? WHERE id = ?',
    [role_id, userId],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Użytkownik nie istnieje' });
      }
      
      res.json({ message: 'Rola użytkownika została zmieniona' });
    }
  );
});

// Pobierz wszystkie role (tylko dla administratorów)
app.get('/api/roles', authenticateToken, requirePermission('manage_users'), (req, res) => {
  db.all('SELECT * FROM roles ORDER BY id', (err, roles) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    res.json(roles);
  });
});

// Zarządzanie kategoriami - tworzenie (tylko dla administratorów)
app.post('/api/categories', authenticateToken, requirePermission('manage_categories'), (req, res) => {
  const { name, icon, description } = req.body;

  db.run(
    'INSERT INTO categories (name, icon, description) VALUES (?, ?, ?)',
    [name, icon, description],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      res.status(201).json({ 
        message: 'Kategoria została utworzona',
        id: this.lastID 
      });
    }
  );
});

// Zarządzanie kategoriami - edycja (tylko dla administratorów)
app.put('/api/categories/:id', authenticateToken, requirePermission('manage_categories'), (req, res) => {
  const categoryId = req.params.id;
  const { name, icon, description } = req.body;

  db.run(
    'UPDATE categories SET name = ?, icon = ?, description = ? WHERE id = ?',
    [name, icon, description, categoryId],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Kategoria nie istnieje' });
      }
      
      res.json({ message: 'Kategoria została zaktualizowana' });
    }
  );
});

// Zarządzanie kategoriami - usuwanie (tylko dla administratorów)
app.delete('/api/categories/:id', authenticateToken, requirePermission('manage_categories'), (req, res) => {
  const categoryId = req.params.id;

  db.run('DELETE FROM categories WHERE id = ?', [categoryId], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Kategoria nie istnieje' });
    }
    
    res.json({ message: 'Kategoria została usunięta' });
  });
});

// Logowanie użytkownika
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      if (!user) {
        return res.status(400).json({ error: 'Nieprawidłowa nazwa użytkownika lub hasło' });
      }

      // Sprawdź hasło
      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(400).json({ error: 'Nieprawidłowa nazwa użytkownika lub hasło' });
      }

      // Aktualizuj ostatnie logowanie
      db.run('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);

      // Generuj token JWT
      const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role_id },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role_id,
          avatar: user.avatar
        }
      });
    });
  } catch (error) {
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// Pobierz profil użytkownika
app.get('/api/profile', authenticateToken, (req, res) => {
  db.get(
    `SELECT u.*, r.name as role_name 
     FROM users u 
     JOIN roles r ON u.role_id = r.id 
     WHERE u.id = ?`,
    [req.user.id],
    (err, user) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      if (!user) {
        return res.status(404).json({ error: 'Użytkownik nie istnieje' });
      }

      // Usuń hasło z odpowiedzi
      delete user.password;
      
      res.json(user);
    }
  );
});

// Aktualizuj profil użytkownika
app.put('/api/profile', authenticateToken, (req, res) => {
  const { email, avatar, signature } = req.body;

  db.run(
    'UPDATE users SET email = ?, avatar = ?, signature = ? WHERE id = ?',
    [email, avatar, signature, req.user.id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      res.json({ message: 'Profil zaktualizowany pomyślnie' });
    }
  );
});

// Zmiana hasła
app.put('/api/change-password', authenticateToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  try {
    // Pobierz obecne hasło
    db.get('SELECT password FROM users WHERE id = ?', [req.user.id], async (err, user) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      // Sprawdź obecne hasło
      const validPassword = await bcrypt.compare(currentPassword, user.password);
      if (!validPassword) {
        return res.status(400).json({ error: 'Obecne hasło jest nieprawidłowe' });
      }

      // Hash nowego hasła
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      
      // Zaktualizuj hasło
      db.run(
        'UPDATE users SET password = ? WHERE id = ?',
        [hashedPassword, req.user.id],
        function(err) {
          if (err) {
            return res.status(500).json({ error: err.message });
          }
          
          res.json({ message: 'Hasło zostało zmienione' });
        }
      );
    });
  } catch (error) {
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// API do zarządzania wątkami z uwzględnieniem uprawnień
app.delete('/api/thread/:id', authenticateToken, (req, res) => {
  const threadId = req.params.id;

  // Sprawdź czy użytkownik może usunąć wątek
  db.get(
    `SELECT t.user_id, t.replies, r.permissions 
     FROM threads t 
     JOIN users u ON t.user_id = u.id 
     JOIN roles r ON u.role_id = r.id 
     WHERE t.id = ?`,
    [threadId],
    async (err, thread) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      if (!thread) {
        return res.status(404).json({ error: 'Wątek nie istnieje' });
      }

      const permissions = JSON.parse(thread.permissions);
      
      // Sprawdź uprawnienia
      const canDeleteAny = permissions.delete_any_content;
      const canDeleteOwn = permissions.delete_own_content && thread.user_id === req.user.id;
      const hasNoReplies = thread.replies === 0;

      if ((canDeleteAny || (canDeleteOwn && hasNoReplies))) {
        db.run('DELETE FROM threads WHERE id = ?', [threadId], function(err) {
          if (err) {
            return res.status(500).json({ error: err.message });
          }
          
          res.json({ message: 'Wątek został usunięty' });
        });
      } else {
        res.status(403).json({ error: 'Brak uprawnień do usunięcia wątku' });
      }
    }
  );
});


// Routes
app.get('/api/categories', (req, res) => {
  const query = `
    SELECT 
      c.*,
      COUNT(DISTINCT t.id) as threads_count,
      COUNT(DISTINCT p.id) as posts_count,
      (SELECT author FROM threads WHERE category_id = c.id ORDER BY date DESC LIMIT 1) as last_author,
      (SELECT date FROM threads WHERE category_id = c.id ORDER BY date DESC LIMIT 1) as last_date
    FROM categories c
    LEFT JOIN threads t ON c.id = t.category_id
    LEFT JOIN posts p ON t.id = p.thread_id
    GROUP BY c.id
    ORDER BY c.name
  `;
  
  db.all(query, (err, categories) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: err.message });
    }
    
    // Formatuj dane
    const formattedCategories = categories.map(cat => ({
      ...cat,
      threads: parseInt(cat.threads_count) || 0,
      posts: parseInt(cat.posts_count) || 0,
      last_post_author: cat.last_author || 'Brak',
      last_post_time: cat.last_date ? formatRelativeTime(cat.last_date) : 'Brak'
    }));
    
    res.json(formattedCategories);
  });
});

app.get('/api/category/:id/threads', (req, res) => {
  const categoryId = req.params.id;
  db.all('SELECT * FROM threads WHERE category_id = ? ORDER BY id', [categoryId], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Pobierz wątek - dostępny dla wszystkich
app.get('/api/thread/:id', (req, res) => {
  const threadId = req.params.id;
  
  const threadQuery = `
    SELECT t.*, u.last_login as author_last_login
    FROM threads t 
    LEFT JOIN users u ON t.author = u.username
    WHERE t.id = ?
  `;
  
  const postsQuery = `
    SELECT p.*, u.last_login as author_last_login
    FROM posts p 
    LEFT JOIN users u ON p.author = u.username
    WHERE p.thread_id = ? 
    ORDER BY p.date ASC
  `;
  
  // Pobierz wątek
  db.get(threadQuery, [threadId], (err, thread) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (!thread) {
      return res.status(404).json({ error: 'Wątek nie istnieje' });
    }
    
    // Pobierz posty
    db.all(postsQuery, [threadId], (err, posts) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      res.json({
        thread: {
          ...thread,
          author_status: getUserStatus(thread.author_last_login)
        },
        posts: posts.map(post => ({
          ...post,
          author_status: getUserStatus(post.author_last_login)
        }))
      });
    });
  });
});


app.post('/api/threads', authenticateToken, (req, res) => {
  const { category_id, title, content, tag } = req.body;
  const date = new Date().toISOString();
  
  // Najpierw pobierz nazwę użytkownika
  db.get('SELECT username FROM users WHERE id = ?', [req.user.id], (err, user) => {
    if (err || !user) {
      return res.status(500).json({ error: 'Błąd pobierania danych użytkownika' });
    }
    
    // Sprawdź czy kategoria nie jest zablokowana
    db.get('SELECT is_locked FROM categories WHERE id = ?', [category_id], (err, category) => {
      if (err || !category) {
        return res.status(404).json({ error: 'Kategoria nie istnieje' });
      }
      
      if (category.is_locked && req.user.role !== 1 && req.user.role !== 2) {
        return res.status(403).json({ error: 'Kategoria jest zablokowana' });
      }
      
      // Utwórz wątek
      db.run(
        'INSERT INTO threads (category_id, user_id, title, author, date, tag) VALUES (?, ?, ?, ?, ?, ?)',
        [category_id, req.user.id, title, user.username, date, tag],
        function(err) {
          if (err) {
            return res.status(500).json({ error: err.message });
          }
          
          // Dodaj pierwszy post do wątku
          const threadId = this.lastID;
          db.run(
            'INSERT INTO posts (thread_id, user_id, author, content, date) VALUES (?, ?, ?, ?, ?)',
            [threadId, req.user.id, user.username, content, date],
            function(err) {
              if (err) {
                return res.status(500).json({ error: err.message });
              }
              
              // Zaktualizuj licznik wątków w kategorii
              db.run(
                'UPDATE categories SET threads = threads + 1, last_post_author = ?, last_post_time = ? WHERE id = ?',
                [user.username, date, category_id]
              );
              
              res.json({ id: threadId, message: 'Wątek został utworzony' });
            }
          );
        }
      );
    });
  });
});

app.post('/api/thread/:id/posts', authenticateToken, (req, res) => {
  const threadId = req.params.id;
  const { content } = req.body;
  const date = new Date().toISOString();
  
  // Najpierw pobierz nazwę użytkownika
  db.get('SELECT username FROM users WHERE id = ?', [req.user.id], (err, user) => {
    if (err || !user) {
      return res.status(500).json({ error: 'Błąd pobierania danych użytkownika' });
    }
    
    // Sprawdź czy wątek istnieje i nie jest zablokowany
    db.get(`
      SELECT t.*, c.is_locked 
      FROM threads t 
      JOIN categories c ON t.category_id = c.id 
      WHERE t.id = ?
    `, [threadId], (err, thread) => {
      if (err || !thread) {
        return res.status(404).json({ error: 'Wątek nie istnieje' });
      }
      
      if (thread.is_locked && req.user.role !== 1 && req.user.role !== 2) {
        return res.status(403).json({ error: 'Wątek jest zablokowany' });
      }
      
      // Dodaj post
      db.run(
        'INSERT INTO posts (thread_id, user_id, author, content, date) VALUES (?, ?, ?, ?, ?)',
        [threadId, req.user.id, user.username, content, date],
        function(err) {
          if (err) {
            return res.status(500).json({ error: err.message });
          }
          
          // Zaktualizuj licznik odpowiedzi i ostatni post
          db.run(
            'UPDATE threads SET replies = replies + 1, last_post_author = ?, last_post_time = ? WHERE id = ?',
            [user.username, date, threadId]
          );
          
          // Zaktualizuj kategorię
          db.run(
            'UPDATE categories SET posts = posts + 1, last_post_author = ?, last_post_time = ? WHERE id = ?',
            [user.username, date, thread.category_id]
          );
          
          res.json({ 
            id: this.lastID, 
            message: 'Odpowiedź została dodana',
            author: user.username,
            date: date
          });
        }
      );
    });
  });
});

// Pobierz posty wątku - dostępny dla wszystkich
app.get('/api/thread/:id/posts', (req, res) => {
  const threadId = req.params.id;
  db.all('SELECT * FROM posts WHERE thread_id = ? ORDER BY id', [threadId], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Aktywne wątki - dostępny dla wszystkich
app.get('/api/active-threads', (req, res) => {
  db.all('SELECT * FROM threads ORDER BY date DESC LIMIT 5', (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

app.get('/api/stats', (req, res) => {
  db.get('SELECT COUNT(*) as threads FROM threads', (err, threadsRow) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    db.get('SELECT COUNT(*) as posts FROM posts', (err, postsRow) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      
      db.get('SELECT COUNT(*) as users FROM users', (err, usersRow) => {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
        
        res.json({
          threads: threadsRow.threads,
          posts: postsRow.posts,
          users: usersRow.users
        });
      });
    });
  });
});

app.post('/api/thread', (req, res) => {
  const { category_id, title, author, content } = req.body;
  const date = new Date().toISOString();
  
  db.run(
    'INSERT INTO threads (category_id, title, author, date) VALUES (?, ?, ?, ?)',
    [category_id, title, author, date],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      
      // Dodaj pierwszy post do wątku
      const threadId = this.lastID;
      db.run(
        'INSERT INTO posts (thread_id, author, content, date) VALUES (?, ?, ?, ?)',
        [threadId, author, content, date],
        function(err) {
          if (err) {
            res.status(500).json({ error: err.message });
            return;
          }
          
          // Zaktualizuj licznik wątków w kategorii
          db.run(
            'UPDATE categories SET threads = threads + 1, last_post_author = ?, last_post_time = ? WHERE id = ?',
            [author, date, category_id]
          );
          
          res.json({ id: threadId, message: 'Thread created successfully' });
        }
      );
    }
  );
});

app.post('/api/post', (req, res) => {
  const { thread_id, author, content } = req.body;
  const date = new Date().toISOString();
  
  db.run(
    'INSERT INTO posts (thread_id, author, content, date) VALUES (?, ?, ?, ?)',
    [thread_id, author, content, date],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      
      // Zaktualizuj licznik odpowiedzi w wątku
      db.run(
        'UPDATE threads SET replies = replies + 1, last_post_author = ?, last_post_time = ? WHERE id = ?',
        [author, date, thread_id]
      );
      
      // Pobierz category_id wątku i zaktualizuj kategorię
      db.get('SELECT category_id FROM threads WHERE id = ?', [thread_id], (err, row) => {
        if (!err && row) {
          db.run(
            'UPDATE categories SET posts = posts + 1, last_post_author = ?, last_post_time = ? WHERE id = ?',
            [author, date, row.category_id]
          );
        }
      });
      
      res.json({ id: this.lastID, message: 'Post created successfully' });
    }
  );
});

app.get('/api/categories', authenticateToken, requirePermission('manage_categories'), (req, res) => {
  db.all('SELECT * FROM categories ORDER BY name', (err, categories) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(categories);
  });
});

// Zarządzanie kategoriami - pobierz pojedynczą
app.get('/api/admin/categories/:id', authenticateToken, requirePermission('manage_categories'), (req, res) => {
  const categoryId = req.params.id;
  
  db.get('SELECT * FROM categories WHERE id = ?', [categoryId], (err, category) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (!category) {
      return res.status(404).json({ error: 'Kategoria nie istnieje' });
    }
    
    res.json(category);
  });
});

// Zarządzanie kategoriami - tworzenie
app.post('/api/admin/categories', authenticateToken, requirePermission('manage_categories'), (req, res) => {
  const { name, icon, description, is_locked = false, required_role = 0 } = req.body;

  // Konwertuj 0 na null dla bazy danych
  const dbRequiredRole = required_role === 0 ? null : required_role;

  db.run(
    'INSERT INTO categories (name, icon, description, is_locked, required_role) VALUES (?, ?, ?, ?, ?)',
    [name, icon, description, is_locked, dbRequiredRole],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      res.status(201).json({ 
        message: 'Kategoria została utworzona',
        id: this.lastID 
      });
    }
  );
});

// Zarządzanie kategoriami - edycja
app.put('/api/admin/categories/:id', authenticateToken, requirePermission('manage_categories'), (req, res) => {
  const categoryId = req.params.id;
  const { name, icon, description, is_locked, required_role = 0 } = req.body;

  // Konwertuj 0 na null dla bazy danych
  const dbRequiredRole = required_role === 0 ? null : required_role;

  db.run(
    'UPDATE categories SET name = ?, icon = ?, description = ?, is_locked = ?, required_role = ? WHERE id = ?',
    [name, icon, description, is_locked, dbRequiredRole, categoryId],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Kategoria nie istnieje' });
      }
      
      res.json({ message: 'Kategoria została zaktualizowana' });
    }
  );
});

// Zarządzanie kategoriami - usuwanie
app.delete('/api/admin/categories/:id', authenticateToken, requirePermission('manage_categories'), (req, res) => {
  const categoryId = req.params.id;

  // Najpierw sprawdź czy kategoria nie zawiera wątków
  db.get('SELECT COUNT(*) as count FROM threads WHERE category_id = ?', [categoryId], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (row.count > 0) {
      return res.status(400).json({ error: 'Nie można usunąć kategorii zawierającej wątki' });
    }
    
    // Usuń kategorię
    db.run('DELETE FROM categories WHERE id = ?', [categoryId], function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Kategoria nie istnieje' });
      }
      
      res.json({ message: 'Kategoria została usunięta' });
    });
  });
});

// Zarządzanie kategoriami - pobierz wszystkie (dla administratora) z prawdziwymi statystykami
app.get('/api/admin/categories', authenticateToken, requirePermission('manage_categories'), (req, res) => {
  const query = `
    SELECT 
      c.*,
      COUNT(DISTINCT t.id) as threads_count,
      COUNT(DISTINCT p.id) as posts_count
    FROM categories c
    LEFT JOIN threads t ON c.id = t.category_id
    LEFT JOIN posts p ON t.id = p.thread_id
    GROUP BY c.id
    ORDER BY c.name
  `;
  
  db.all(query, (err, categories) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: err.message });
    }
    
    // Konwertuj liczby z powrotem na liczby (SQLite zwraca stringi)
    const formattedCategories = categories.map(cat => ({
      ...cat,
      threads: parseInt(cat.threads_count) || 0,
      posts: parseInt(cat.posts_count) || 0,
      threads_count: undefined, // Usuń tymczasowe pole
      posts_count: undefined    // Usuń tymczasowe pole
    }));
    
    res.json(formattedCategories);
  });
});

app.put('/api/thread/:id/view', (req, res) => {
  const threadId = req.params.id;
  
  db.run(
    'UPDATE threads SET views = views + 1 WHERE id = ?',
    [threadId],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ message: 'Licznik wyświetleń zaktualizowany' });
    }
  );
});

// Konfiguracja multer dla przesyłania avatarów
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = '../frontend/public/uploads/avatars';
    // Utwórz katalog jeśli nie istnieje
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Unikalna nazwa pliku: userID + timestamp + extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, 'avatar-' + req.user.userId + '-' + uniqueSuffix + extension);
  }
});

// Filtrowanie plików - tylko obrazy
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Tylko pliki obrazów są dozwolone!'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024 // 2MB limit
  }
});

app.post('/api/upload-avatar', authenticateToken, upload.single('avatar'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Brak pliku do przesłania' });
    }

    // Ścieżka względna do zapisania w bazie danych
    const avatarPath = '/uploads/avatars/' + req.file.filename;

    // Aktualizuj avatar użytkownika w bazie danych
    db.run(
      'UPDATE users SET avatar = ? WHERE id = ?',
      [avatarPath, req.user.id],
      function(err) {
        if (err) {
          // Usuń przesłany plik jeśli wystąpił błąd
          fs.unlinkSync(req.file.path);
          return res.status(500).json({ error: err.message });
        }

        res.json({
          success: true,
          message: 'Avatar został przesłany',
          avatarUrl: avatarPath
        });
      }
    );
  } catch (error) {
    res.status(500).json({ error: 'Błąd podczas przesyłania avatara' });
  }
});
app.use('/uploads', express.static('public/uploads'))

function getLocalMySQLDateTime() {
  const now = new Date();
  const timezoneOffset = now.getTimezoneOffset() * 60000;
  const localTime = new Date(now - timezoneOffset);
  return localTime.toISOString().slice(0, 19).replace('T', ' ');
}

// Backend - endpoint do aktualizacji aktywności
app.post('/api/update-activity', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const currentTime = getLocalMySQLDateTime();
  
  // Aktualizuj last_login w bazie
  db.run(
    'UPDATE users SET last_login = ? WHERE id = ?',
    [currentTime, userId],
    (error) => {
      if (error) {
        return res.status(500).json({ error: 'Błąd aktualizacji aktywności' });
      }
      res.json({ success: true });
    }
  );
});

// Pobierz wszystkie tematy do zarządzania (dla adminów i moderatorów)
app.get('/api/admin/threads', authenticateToken, requirePermission('manage_threads'), (req, res) => {
  const query = `
    SELECT 
      t.*,
      c.name as category_name,
      u.username as author_name,
      COUNT(p.id) as post_count
    FROM threads t
    JOIN categories c ON t.category_id = c.id
    JOIN users u ON t.user_id = u.id
    LEFT JOIN posts p ON t.id = p.thread_id
    GROUP BY t.id
    ORDER BY t.date DESC
  `;
  
  db.all(query, (err, threads) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    res.json(threads);
  });
});

// Zmień status tematu (zamknięcie/otwarcie)
app.put('/api/admin/threads/:id/status', authenticateToken, requirePermission('manage_threads'), (req, res) => {
  const threadId = req.params.id;
  const { is_closed } = req.body;

  db.run(
    'UPDATE threads SET is_closed = ? WHERE id = ?',
    [is_closed, threadId],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Temat nie istnieje' });
      }
      
      res.json({ message: `Temat ${is_closed ? 'zamknięty' : 'otwarty'}` });
    }
  );
});

// Zmień status przypięcia tematu
app.put('/api/admin/threads/:id/sticky', authenticateToken, requirePermission('manage_threads'), (req, res) => {
  const threadId = req.params.id;
  const { is_sticky } = req.body;

  db.run(
    'UPDATE threads SET is_sticky = ? WHERE id = ?',
    [is_sticky, threadId],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Temat nie istnieje' });
      }
      
      res.json({ message: `Temat ${is_sticky ? 'przypięty' : 'odpięty'}` });
    }
  );
});

// Edytuj temat (tytuł, kategoria)
app.put('/api/admin/threads/:id', authenticateToken, requirePermission('manage_threads'), (req, res) => {
  const threadId = req.params.id;
  const { title, category_id, is_closed, is_sticky } = req.body;

  db.run(
    'UPDATE threads SET title = ?, category_id = ?, is_closed = ?, is_sticky = ? WHERE id = ?',
    [title, category_id, is_closed, is_sticky, threadId],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Temat nie istnieje' });
      }
      
      res.json({ message: 'Temat zaktualizowany' });
    }
  );
});

// Usuń temat (dla adminów/moderatorów)
app.delete('/api/admin/threads/:id', authenticateToken, requirePermission('manage_threads'), (req, res) => {
  const threadId = req.params.id;

  // Najpierw usuń wszystkie posty w wątku
  db.run('DELETE FROM posts WHERE thread_id = ?', [threadId], (err) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    // Następnie usuń wątek
    db.run('DELETE FROM threads WHERE id = ?', [threadId], function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Temat nie istnieje' });
      }
      
      res.json({ message: 'Temat i wszystkie posty zostały usunięte' });
    });
  });
});

// Pobierz wszystkie posty do zarządzania (dla adminów i moderatorów)
app.get('/api/admin/posts', authenticateToken, requirePermission('manage_posts'), (req, res) => {
  const query = `
    SELECT 
      p.*,
      t.title as thread_title,
      u.username as author_name,
      c.name as category_name
    FROM posts p
    JOIN threads t ON p.thread_id = t.id
    JOIN categories c ON t.category_id = c.id
    JOIN users u ON p.user_id = u.id
    ORDER BY p.date DESC
  `;
  
  db.all(query, (err, posts) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    res.json(posts);
  });
});

// Usuń post (dla adminów/moderatorów)
app.delete('/api/admin/posts/:id', authenticateToken, requirePermission('manage_posts'), (req, res) => {
  const postId = req.params.id;

  // Najpierw pobierz informacje o poście do aktualizacji statystyk
  db.get(`
    SELECT p.thread_id, t.category_id, t.replies 
    FROM posts p 
    JOIN threads t ON p.thread_id = t.id 
    WHERE p.id = ?
  `, [postId], (err, postInfo) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (!postInfo) {
      return res.status(404).json({ error: 'Post nie istnieje' });
    }

    // Usuń post
    db.run('DELETE FROM posts WHERE id = ?', [postId], function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Post nie istnieje' });
      }

      // Aktualizuj licznik odpowiedzi w wątku
      db.run(
        'UPDATE threads SET replies = replies - 1 WHERE id = ?',
        [postInfo.thread_id]
      );

      // Aktualizuj licznik postów w kategorii
      db.run(
        'UPDATE categories SET posts = posts - 1 WHERE id = ?',
        [postInfo.category_id]
      );

      // Jeśli to był jedyny post w wątku, usuń też wątek
      if (postInfo.replies === 1) {
        db.run('DELETE FROM threads WHERE id = ?', [postInfo.thread_id]);
      }

      res.json({ message: 'Post został usunięty' });
    });
  });
});

// Globalny obiekt do śledzenia aktywności
const activeUsers = new Map();
const activeSessions = new Map();
const activeGuests = new Map();

// Middleware do śledzenia aktywności
app.use((req, res, next) => {
  if (req.headers.authorization) {
    const token = req.headers.authorization.split(' ')[1];
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        
        activeSessions.set(decoded.id, {
          userId: decoded.id,
          username: decoded.username,
          lastActivity: Date.now(),
          type: 'user'
        });
      } catch (error) {
        // Token nieprawidłowy - traktuj jako gościa
        const guestId = req.ip + req.get('User-Agent');
        activeSessions.set(guestId, {
          guestId: guestId,
          lastActivity: Date.now(),
          type: 'guest'
        });
      }
    } else {
      // Brak tokenu - gość
      const guestId = req.ip + req.get('User-Agent');
      activeSessions.set(guestId, {
        guestId: guestId,
        lastActivity: Date.now(),
        type: 'guest'
      });
    }
  } else {
    // Brak autoryzacji - gość
    const guestId = req.ip + req.get('User-Agent');
    activeSessions.set(guestId, {
      guestId: guestId,
      lastActivity: Date.now(),
      type: 'guest'
    });
  }
  
  // Czyść nieaktywne sesje (15 minut bez aktywności)
  const now = Date.now();
  const inactiveTime = 15 * 60 * 1000;
  
  for (const [sessionId, session] of activeSessions.entries()) {
    if (now - session.lastActivity > inactiveTime) {
      activeSessions.delete(sessionId);
    }
  }
  
  next();
});
// Poprawiony endpoint online users
app.get('/api/online-users', (req, res) => {
  let onlineUsers = 0;
  let onlineGuests = 0;
  const usersList = [];

  for (const session of activeSessions.values()) {
    if (session.type === 'user') {
      onlineUsers++;
      usersList.push({
        id: session.userId,
        username: session.username
      });
    } else if (session.type === 'guest') {
      onlineGuests++;
    }
  }

  res.json({
    online_users: onlineUsers,
    online_guests: onlineGuests,
    total_online: onlineUsers + onlineGuests,
    users: usersList
  });
});


function getUserStatus(lastLogin, isCurrentUser = false) {
  if (!lastLogin) return 'offline';
  
  // Jeśli to obecnie zalogowany użytkownik, zawsze pokazuj "online"
  if (isCurrentUser) {
    return 'online';
  }
  
  const lastActive = new Date(lastLogin);
  if (isNaN(lastActive.getTime())) return 'offline';
  
  const now = new Date();
  const diffMinutes = (now - lastActive) / (1000 * 60);
  
  if (diffMinutes < 5) return 'online';
  if (diffMinutes < 1440) return 'recent';
  return 'offline';
}

function formatRelativeTime(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) {
    return `${diffMins} minut temu`;
  } else if (diffHours < 24) {
    return `${diffHours} godzin temu`;
  } else if (diffDays < 7) {
    return `${diffDays} dni temu`;
  } else {
    return date.toLocaleDateString('pl-PL');
  }
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
