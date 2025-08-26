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
    `SELECT t.user_id, t.replies, t.category_id, r.permissions 
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
            
            // Aktualizuj statystyki kategorii
            db.run(
              'UPDATE categories SET threads = threads - 1, posts = posts - ? WHERE id = ?',
              [thread.replies + 1, thread.category_id] // +1 bo pierwszy post to wątek
            );
            
            res.json({ message: 'Wątek został usunięty' });
          });
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
	  SELECT t.*, u.last_login as author_last_login, u.created_at as author_created_at,
		 u.avatar as author_avatar,
		 (SELECT COUNT(*) FROM posts WHERE user_id = u.id) as author_posts_count
	  FROM threads t 
	  LEFT JOIN users u ON t.author = u.username
	  WHERE t.id = ?`;

const postsQuery = `
  SELECT p.*, u.id as author_id, u.last_login as author_last_login, 
         u.created_at as author_created_at, u.avatar as author_avatar,
         (SELECT COUNT(*) FROM posts WHERE user_id = u.id) as author_posts_count
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
          author_status: getUserStatus(thread.author_last_login),
          author_register_date: formatRegistrationDate(thread.author_created_at),
          author_last_activity: formatRelativeTime(thread.author_last_login),
          author_posts_count: thread.author_posts_count || 0
        },
        posts: posts.map(post => ({
          ...post,
          author_status: getUserStatus(post.author_last_login),
          author_register_date: formatRegistrationDate(post.author_created_at),
          author_last_activity: formatRelativeTime(post.author_last_login),
          author_posts_count: post.author_posts_count || 0
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
    `, [threadId], async (err, thread) => {
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
        async function(err) {
          if (err) {
            return res.status(500).json({ error: err.message });
          }
          
          const postId = this.lastID;
          
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
          
          // Wyślij powiadomienia do obserwujących wątek (oprócz autora)
          if (thread.user_id !== req.user.id) {
            try {
              await notifyThreadSubscribers(threadId, postId, user.username, content);
            } catch (error) {
              console.error('Błąd podczas wysyłania powiadomień:', error);
            }
          }
          
          // Sprawdź czy w poście są wzmianki (@username)
          const mentionRegex = /@([a-zA-Z0-9_]+)/g;
          let match;
          const mentionedUsers = new Set();
          
          while ((match = mentionRegex.exec(content)) !== null) {
            mentionedUsers.add(match[1]);
          }
          
          // Wyślij powiadomienia o wzmiankach
          if (mentionedUsers.size > 0) {
            try {
              for (const username of mentionedUsers) {
                // Znajdź użytkownika
                db.get(
                  'SELECT id FROM users WHERE username = ? AND id != ?',
                  [username, req.user.id],
                  async (err, mentionedUser) => {
                    if (!err && mentionedUser) {
                      // Sprawdź ustawienia powiadomień użytkownika
                      db.get(
                        'SELECT notify_on_mention FROM user_notification_settings WHERE user_id = ?',
                        [mentionedUser.id],
                        async (err, settings) => {
                          if (!err && settings && settings.notify_on_mention) {
                            const title = 'Wspomniano Cię w poście';
                            const message = `Użytkownik <strong>${user.username}</strong> wspomniał Cię w poście w wątku "<strong>${thread.title}</strong>": ${content.substring(0, 100)}...`;
                            
                            await createNotification(
                              mentionedUser.id,
                              'mention',
                              title,
                              message,
                              threadId,
                              postId,
                              req.user.id
                            );
                          }
                        }
                      );
                    }
                  }
                );
              }
            } catch (error) {
              console.error('Błąd podczas wysyłania powiadomień o wzmiankach:', error);
            }
          }
          
          res.json({ 
            id: postId, 
            message: 'Odpowiedź została dodana',
            author: user.username,
            date: date
          });
        }
      );
    });
  });
});

// Pobierz listę obserwowanych wątków
app.get('/api/watched-threads', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const { limit = 20, page = 1 } = req.query;
  const offset = (page - 1) * limit;

  const query = `
    SELECT t.*, 
           c.name as category_name,
           ts.created_at as subscribed_at,
           (SELECT COUNT(*) FROM posts p WHERE p.thread_id = t.id) as total_posts
    FROM thread_subscriptions ts
    JOIN threads t ON ts.thread_id = t.id
    JOIN categories c ON t.category_id = c.id
    WHERE ts.user_id = ?
    ORDER BY ts.created_at DESC
    LIMIT ? OFFSET ?
  `;

  const countQuery = 'SELECT COUNT(*) as total FROM thread_subscriptions WHERE user_id = ?';

  // Pobierz całkowitą liczbę obserwowanych wątków
  db.get(countQuery, [userId], (err, countResult) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    // Pobierz obserwowane wątki
    db.all(query, [userId, parseInt(limit), offset], (err, threads) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      res.json({
        items: threads,
        total: countResult.total,
        page: parseInt(page),
        totalPages: Math.ceil(countResult.total / limit)
      });
    });
  });
});


// Pobierz posty wątku - dostępny dla wszystkich
app.get('/api/thread/:id/posts', (req, res) => {
  const threadId = req.params.id;
  
  const query = `
    SELECT p.*, u.last_login as author_last_login, u.created_at as author_created_at, u.avatar as author_avatar,
           (SELECT COUNT(*) FROM posts WHERE user_id = u.id) as author_posts_count
    FROM posts p 
    LEFT JOIN users u ON p.author = u.username
    WHERE p.thread_id = ? 
    ORDER BY p.id ASC
  `;
  
  db.all(query, [threadId], (err, posts) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    // Dodaj informacje o autorze do każdego posta
    const postsWithAuthorInfo = posts.map(post => ({
      ...post,
      author_status: getUserStatus(post.author_last_login),
      author_register_date: formatRegistrationDate(post.author_created_at),
      author_last_activity: formatRelativeTime(post.author_last_login),
      author_posts_count: post.author_posts_count || 0
    }));
    
    res.json(postsWithAuthorInfo);
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
  const { name, icon, description, is_locked = false, required_role = 0, position } = req.body;

  // Konwertuj 0 na null dla bazy danych
  const dbRequiredRole = required_role === 0 ? null : required_role;

  // Znajdź najwyższą pozycję
  db.get('SELECT MAX(position) as max_position FROM categories', (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    const newPosition = position !== undefined ? position : (row.max_position || 0) + 1;
    
    db.run(
      'INSERT INTO categories (name, icon, description, is_locked, required_role, position) VALUES (?, ?, ?, ?, ?, ?)',
      [name, icon, description, is_locked, dbRequiredRole, newPosition],
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
});

// Zarządzanie kategoriami - edycja
app.put('/api/admin/categories/:id', authenticateToken, requirePermission('manage_categories'), (req, res) => {
  const categoryId = req.params.id;
  const { name, icon, description, is_locked, required_role = 0, position } = req.body;

  // Konwertuj 0 na null dla bazy danych
  const dbRequiredRole = required_role === 0 ? null : required_role;

  db.run(
    'UPDATE categories SET name = ?, icon = ?, description = ?, is_locked = ?, required_role = ?, position = ? WHERE id = ?',
    [name, icon, description, is_locked, dbRequiredRole, position, categoryId],
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

// Endpoint do zmiany kolejności
app.post('/api/admin/categories/:id/move', authenticateToken, requirePermission('manage_categories'), (req, res) => {
  const categoryId = req.params.id;
  const { direction } = req.body; // 'up' or 'down'

  db.get('SELECT position FROM categories WHERE id = ?', [categoryId], (err, category) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (!category) {
      return res.status(404).json({ error: 'Kategoria nie istnieje' });
    }

    const currentPos = category.position;
    let newPos;
    
    if (direction === 'up') {
      newPos = currentPos - 1;
    } else if (direction === 'down') {
      newPos = currentPos + 1;
    } else {
      return res.status(400).json({ error: 'Nieprawidłowy kierunek' });
    }

    // Sprawdź czy nowa pozycja jest dostępna
    db.get('SELECT id FROM categories WHERE position = ?', [newPos], (err, targetCategory) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      if (!targetCategory) {
        return res.status(400).json({ error: 'Nie można przesunąć kategorii' });
      }

      // Zamień pozycje
      db.run('UPDATE categories SET position = ? WHERE id = ?', [newPos, categoryId], (err) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        
        db.run('UPDATE categories SET position = ? WHERE id = ?', [currentPos, targetCategory.id], (err) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }
          
          res.json({ message: 'Kolejność kategorii została zmieniona' });
        });
      });
    });
  });
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

// Edycja wątku przez administratora/moderatora
app.put('/api/admin/threads/:id', authenticateToken, requirePermission('manage_threads'), (req, res) => {
  const threadId = req.params.id;
  const { title, content, category_id, is_closed, is_sticky } = req.body;

  db.run(
    'UPDATE threads SET title = ?, category_id = ?, is_closed = ?, is_sticky = ? WHERE id = ?',
    [title, category_id, is_closed, is_sticky, threadId],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Wątek nie istnieje' });
      }
      
      // Jeśli podano content, zaktualizuj pierwszy post
      if (content) {
        db.run(
          'UPDATE posts SET content = ?, edited_at = CURRENT_TIMESTAMP WHERE thread_id = ? AND id = (SELECT MIN(id) FROM posts WHERE thread_id = ?)',
          [content, threadId, threadId],
          function(err) {
            if (err) {
              return res.status(500).json({ error: err.message });
            }
            
            res.json({ message: 'Wątek został zaktualizowany' });
          }
        );
      } else {
        res.json({ message: 'Wątek został zaktualizowany' });
      }
    }
  );
});

// Usuwanie wątku (tylko dla adminów/moderatorów)
app.delete('/api/admin/threads/:id', authenticateToken, requirePermission('manage_threads'), (req, res) => {
  const threadId = req.params.id;

  // Najpierw usuń wszystkie posty w wątku
  db.run('DELETE FROM posts WHERE thread_id = ?', [threadId], (err) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    // Pobierz informacje o wątku do aktualizacji statystyk kategorii
    db.get('SELECT category_id, replies FROM threads WHERE id = ?', [threadId], (err, threadInfo) => {
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
        
        // Aktualizuj statystyki kategorii
        if (threadInfo) {
          db.run(
            'UPDATE categories SET threads = threads - 1, posts = posts - ? WHERE id = ?',
            [threadInfo.replies + 1, threadInfo.category_id] // +1 bo pierwszy post to wątek
          );
        }
        
        res.json({ message: 'Temat i wszystkie posty zostały usunięte' });
      });
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

// Usuwanie posta przez użytkownika (własne posty)
app.delete('/api/post/:id', authenticateToken, (req, res) => {
  const postId = req.params.id;

  // Sprawdź czy użytkownik jest właścicielem posta
  db.get('SELECT user_id, thread_id FROM posts WHERE id = ?', [postId], (err, post) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (!post) {
      return res.status(404).json({ error: 'Post nie istnieje' });
    }

    if (post.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Możesz usuwać tylko swoje posty' });
    }

    // Sprawdź czy wątek nie jest zamknięty
    db.get('SELECT is_closed FROM threads WHERE id = ?', [post.thread_id], (err, thread) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      if (thread && thread.is_closed) {
        return res.status(403).json({ error: 'Nie możesz usuwać postów w zamkniętych wątkach' });
      }

      // Usuń post i zaktualizuj statystyki
      db.run('DELETE FROM posts WHERE id = ?', [postId], function(err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        
        // Aktualizuj licznik odpowiedzi
        db.run('UPDATE threads SET replies = replies - 1 WHERE id = ?', [post.thread_id]);
        
        // Aktualizuj kategorię
        db.get('SELECT category_id FROM threads WHERE id = ?', [post.thread_id], (err, threadInfo) => {
          if (!err && threadInfo) {
            db.run('UPDATE categories SET posts = posts - 1 WHERE id = ?', [threadInfo.category_id]);
          }
        });
        
        res.json({ message: 'Post został usunięty' });
      });
    });
  });
});

// Edycja posta
app.put('/api/post/:id', authenticateToken, (req, res) => {
  const postId = req.params.id;
  const { content } = req.body;

  // Sprawdź czy post istnieje i czy użytkownik jest właścicielem
  db.get('SELECT * FROM posts WHERE id = ?', [postId], (err, post) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (!post) {
      return res.status(404).json({ error: 'Post nie istnieje' });
    }

    // Sprawdź uprawnienia
    if (post.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Możesz edytować tylko swoje posty' });
    }

    // Sprawdź czy wątek nie jest zamknięty
    db.get('SELECT is_closed FROM threads WHERE id = ?', [post.thread_id], (err, thread) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      if (thread && thread.is_closed) {
        return res.status(403).json({ error: 'Nie możesz edytować postów w zamkniętych wątkach' });
      }

      // Aktualizuj post
      db.run(
        'UPDATE posts SET content = ?, edited_at = CURRENT_TIMESTAMP WHERE id = ?',
        [content, postId],
        function(err) {
          if (err) {
            return res.status(500).json({ error: err.message });
          }
          
          res.json({ message: 'Post został zaktualizowany' });
        }
      );
    });
  });
});

// Edycja posta przez administratora/moderatora
app.put('/api/admin/posts/:id', authenticateToken, requirePermission('manage_posts'), (req, res) => {
  const postId = req.params.id;
  const { content } = req.body;

  db.run(
    'UPDATE posts SET content = ?, edited_at = CURRENT_TIMESTAMP WHERE id = ?',
    [content, postId],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Post nie istnieje' });
      }
      
      res.json({ message: 'Post został zaktualizowany' });
    }
  );
});

// Edycja wątku
app.put('/api/thread/:id', authenticateToken, (req, res) => {
  const threadId = req.params.id;
  const { title, content } = req.body;

  // Sprawdź czy wątek istnieje i czy użytkownik jest właścicielem
  db.get('SELECT * FROM threads WHERE id = ?', [threadId], (err, thread) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (!thread) {
      return res.status(404).json({ error: 'Wątek nie istnieje' });
    }

    // Sprawdź uprawnienia
    if (thread.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Możesz edytować tylko swoje wątki' });
    }

    // Sprawdź czy kategoria nie jest zablokowana
    db.get('SELECT is_locked FROM categories WHERE id = ?', [thread.category_id], (err, category) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      if (category && category.is_locked) {
        return res.status(403).json({ error: 'Nie możesz edytować wątków w zablokowanych kategoriach' });
      }

      // Sprawdź czy wątek nie jest zamknięty
      if (thread.is_closed) {
        return res.status(403).json({ error: 'Nie możesz edytować zamkniętych wątków' });
      }

      // Aktualizuj wątek
      db.run(
        'UPDATE threads SET title = ? WHERE id = ?',
        [title, threadId],
        function(err) {
          if (err) {
            return res.status(500).json({ error: err.message });
          }
          
          // Aktualizuj pierwszy post (zawartość wątku)
          db.run(
            'UPDATE posts SET content = ?, edited_at = CURRENT_TIMESTAMP WHERE thread_id = ? AND id = (SELECT MIN(id) FROM posts WHERE thread_id = ?)',
            [content, threadId, threadId],
            function(err) {
              if (err) {
                return res.status(500).json({ error: err.message });
              }
              
              res.json({ message: 'Wątek został zaktualizowany' });
            }
          );
        }
      );
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

// Endpoint do pobierania użytkowników na aktualnej stronie
app.get('/api/page-users', (req, res) => {
  const pageUsers = [];
  
  for (const session of activeSessions.values()) {
    if (session.type === 'user') {
      pageUsers.push({
        id: session.userId,
        username: session.username,
        status: getUserStatus(session.lastActivity)
      });
    }
  }
  
  res.json({ users: pageUsers });
});

// Sprawdź czy użytkownik obserwuje wątek
app.get('/api/thread/:id/watch-status', authenticateToken, (req, res) => {
  const threadId = req.params.id;
  const userId = req.user.id;

  db.get(
    'SELECT id FROM thread_subscriptions WHERE user_id = ? AND thread_id = ?',
    [userId, threadId],
    (err, row) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      res.json({ watching: !!row });
    }
  );
});

// Obserwuj wątek
app.post('/api/thread/:id/watch', authenticateToken, (req, res) => {
  const threadId = req.params.id;
  const userId = req.user.id;

  // Sprawdź czy wątek istnieje
  db.get('SELECT id FROM threads WHERE id = ?', [threadId], (err, thread) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (!thread) {
      return res.status(404).json({ error: 'Wątek nie istnieje' });
    }

    // Dodaj subskrypcję
    db.run(
      'INSERT INTO thread_subscriptions (user_id, thread_id) VALUES (?, ?)',
      [userId, threadId],
      function(err) {
        if (err) {
          // Jeśli już obserwuje, to zwróć sukces
          if (err.message.includes('UNIQUE constraint failed')) {
            return res.json({ message: 'Już obserwujesz ten wątek' });
          }
          return res.status(500).json({ error: err.message });
        }
        
        res.json({ message: 'Rozpoczęto obserwowanie wątku' });
      }
    );
  });
});

// Przestań obserwować wątek
app.delete('/api/thread/:id/watch', authenticateToken, (req, res) => {
  const threadId = req.params.id;
  const userId = req.user.id;

  db.run(
    'DELETE FROM thread_subscriptions WHERE user_id = ? AND thread_id = ?',
    [userId, threadId],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Nie obserwujesz tego wątku' });
      }
      
      res.json({ message: 'Zaprzestano obserwowania wątku' });
    }
  );
});

// Pobierz powiadomienia użytkownika
app.get('/api/notifications', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const { limit = 20, page = 1, unread_only = false } = req.query;
  const offset = (page - 1) * limit;

  let query = `
    SELECT n.*, 
           t.title as thread_title,
           u.username as related_username
    FROM notifications n
    LEFT JOIN threads t ON n.related_thread_id = t.id
    LEFT JOIN users u ON n.related_user_id = u.id
    WHERE n.user_id = ?
  `;
  
  let countQuery = 'SELECT COUNT(*) as total FROM notifications WHERE user_id = ?';
  const params = [userId];
  const countParams = [userId];

  if (unread_only === 'true') {
    query += ' AND n.is_read = 0';
    countQuery += ' AND is_read = 0';
  }

  query += ' ORDER BY n.created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), offset);

  // Pobierz całkowitą liczbę powiadomień
  db.get(countQuery, countParams, (err, countResult) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    // Pobierz powiadomienia
    db.all(query, params, (err, notifications) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      res.json({
        items: notifications,
        total: countResult.total,
        page: parseInt(page),
        totalPages: Math.ceil(countResult.total / limit)
      });
    });
  });
});

// Oznacz powiadomienie jako przeczytane
app.put('/api/notifications/:id/read', authenticateToken, (req, res) => {
  const notificationId = req.params.id;
  const userId = req.user.id;

  db.run(
    'UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?',
    [notificationId, userId],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Powiadomienie nie istnieje' });
      }
      
      res.json({ message: 'Powiadomienie oznaczone jako przeczytane' });
    }
  );
});

// Oznacz wszystkie powiadomienia jako przeczytane
app.put('/api/notifications/mark-all-read', authenticateToken, (req, res) => {
  const userId = req.user.id;

  db.run(
    'UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0',
    [userId],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      res.json({ 
        message: 'Wszystkie powiadomienia oznaczone jako przeczytane',
        marked: this.changes
      });
    }
  );
});

// Usuń powiadomienie
app.delete('/api/notifications/:id', authenticateToken, (req, res) => {
  const notificationId = req.params.id;
  const userId = req.user.id;

  db.run(
    'DELETE FROM notifications WHERE id = ? AND user_id = ?',
    [notificationId, userId],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Powiadomienie nie istnieje' });
      }
      
      res.json({ message: 'Powiadomienie zostało usunięte' });
    }
  );
});

// Pobierz ustawienia powiadomień użytkownika
app.get('/api/notification-settings', authenticateToken, (req, res) => {
  const userId = req.user.id;

  db.get(
    `SELECT * FROM user_notification_settings WHERE user_id = ?`,
    [userId],
    (err, settings) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      // Jeśli użytkownik nie ma jeszcze ustawień, utwórz domyślne
      if (!settings) {
        const defaultSettings = {
          user_id: userId,
          email_notifications: 1,
          push_notifications: 1,
          notify_on_reply: 1,
          notify_on_mention: 1,
          notify_on_thread_update: 1
        };
        
        db.run(
          `INSERT INTO user_notification_settings 
           (user_id, email_notifications, push_notifications, notify_on_reply, notify_on_mention, notify_on_thread_update)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [userId, 1, 1, 1, 1, 1],
          function(err) {
            if (err) {
              return res.status(500).json({ error: err.message });
            }
            
            res.json(defaultSettings);
          }
        );
      } else {
        res.json(settings);
      }
    }
  );
});

// Zaktualizuj ustawienia powiadomień użytkownika
app.put('/api/notification-settings', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const {
    email_notifications,
    push_notifications,
    notify_on_reply,
    notify_on_mention,
    notify_on_thread_update
  } = req.body;

  db.run(
    `INSERT OR REPLACE INTO user_notification_settings 
     (user_id, email_notifications, push_notifications, notify_on_reply, notify_on_mention, notify_on_thread_update)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [userId, email_notifications, push_notifications, notify_on_reply, notify_on_mention, notify_on_thread_update],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      res.json({ message: 'Ustawienia powiadomień zostały zaktualizowane' });
    }
  );
});

// Funkcja pomocnicza do tworzenia powiadomień
function createNotification(userId, type, title, message, threadId = null, postId = null, relatedUserId = null) {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO notifications 
       (user_id, type, title, message, related_thread_id, related_post_id, related_user_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, type, title, message, threadId, postId, relatedUserId],
      function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.lastID);
        }
      }
    );
  });
}

// Funkcja pomocnicza do wysyłania powiadomień o nowej odpowiedzi
async function notifyThreadSubscribers(threadId, postId, replyAuthor, replyContent) {
  try {
    // Pobierz informacje o wątku
    const thread = await new Promise((resolve, reject) => {
      db.get('SELECT title, author FROM threads WHERE id = ?', [threadId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    // Pobierz subskrybentów wątku (oprócz autora odpowiedzi)
    const subscribers = await new Promise((resolve, reject) => {
      db.all(
        `SELECT DISTINCT ts.user_id, uns.notify_on_reply 
         FROM thread_subscriptions ts
         JOIN user_notification_settings uns ON ts.user_id = uns.user_id
         WHERE ts.thread_id = ? AND ts.user_id != (
           SELECT user_id FROM posts WHERE id = ?
         ) AND uns.notify_on_reply = 1`,
        [threadId, postId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    // Utwórz powiadomienia dla każdego subskrybenta
    for (const subscriber of subscribers) {
      const title = 'Nowa odpowiedź w obserwowanym wątku';
      const message = `Użytkownik <strong>${replyAuthor}</strong> odpowiedział w wątku "<strong>${thread.title}</strong>": ${replyContent.substring(0, 100)}...`;
      
      await createNotification(
        subscriber.user_id,
        'new_reply',
        title,
        message,
        threadId,
        postId
      );
    }

    console.log(`Wysłano powiadomienia do ${subscribers.length} subskrybentów wątku ${threadId}`);
  } catch (error) {
    console.error('Błąd podczas wysyłania powiadomień:', error);
  }
}

// Wiadomości prywatne - pobierz konwersacje
app.get('/api/private-messages/conversations', authenticateToken, (req, res) => {
  const userId = req.user.id;
  
  const query = `
    SELECT 
      pm.*,
      u1.username as sender_username,
      u1.avatar as sender_avatar,
      u2.username as receiver_username,
      u2.avatar as receiver_avatar,
      (SELECT COUNT(*) FROM private_messages WHERE conversation_id = pm.conversation_id AND is_read = 0 AND receiver_id = ?) as unread_count
    FROM (
      SELECT 
        conversation_id,
        MAX(created_at) as last_message_time,
        MAX(id) as last_message_id
      FROM private_messages
      WHERE sender_id = ? OR receiver_id = ?
      GROUP BY conversation_id
    ) latest
    JOIN private_messages pm ON latest.last_message_id = pm.id
    JOIN users u1 ON pm.sender_id = u1.id
    JOIN users u2 ON pm.receiver_id = u2.id
    ORDER BY latest.last_message_time DESC
  `;
  
  db.all(query, [userId, userId, userId], (err, conversations) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    res.json(conversations);
  });
});

// Wiadomości prywatne - pobierz wiadomości w konwersacji
app.get('/api/private-messages/conversation/:userId', authenticateToken, (req, res) => {
  const currentUserId = req.user.id;
  const otherUserId = req.params.userId;
  
  // Utwórz unikalne ID konwersacji
  const conversationId = [currentUserId, otherUserId].sort().join('_');
  
  // Oznacz wiadomości jako przeczytane
  db.run(
    'UPDATE private_messages SET is_read = 1 WHERE conversation_id = ? AND receiver_id = ? AND is_read = 0',
    [conversationId, currentUserId],
    (err) => {
      if (err) {
        console.error('Error marking messages as read:', err);
      }
      
      // Pobierz wiadomości
      const query = `
        SELECT pm.*, u.username as sender_username, u.avatar as sender_avatar
        FROM private_messages pm
        JOIN users u ON pm.sender_id = u.id
        WHERE pm.conversation_id = ?
        ORDER BY pm.created_at ASC
      `;
      
      db.all(query, [conversationId], (err, messages) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        
        res.json(messages);
      });
    }
  );
});

// Wiadomości prywatne - wyślij wiadomość
app.post('/api/private-messages/send', authenticateToken, (req, res) => {
  const { receiver_id, content } = req.body;
  const sender_id = req.user.id;
  
  // Utwórz unikalne ID konwersacji
  const conversationId = [sender_id, receiver_id].sort().join('_');
  
  db.run(
    `INSERT INTO private_messages (conversation_id, sender_id, receiver_id, content)
     VALUES (?, ?, ?, ?)`,
    [conversationId, sender_id, receiver_id, content],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      res.json({ 
        message: 'Wiadomość została wysłana',
        message_id: this.lastID 
      });
    }
  );
});

// Wiadomości prywatne - pobierz liczbę nieprzeczytanych wiadomości
app.get('/api/private-messages/unread-count', authenticateToken, (req, res) => {
  const userId = req.user.id;
  
  db.get(
    'SELECT COUNT(*) as count FROM private_messages WHERE receiver_id = ? AND is_read = 0',
    [userId],
    (err, row) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      res.json({ count: row.count });
    }
  );
});

// Wiadomości prywatne - usuń konwersację
app.delete('/api/private-messages/conversation/:userId', authenticateToken, (req, res) => {
  const currentUserId = req.user.id;
  const otherUserId = req.params.userId;
  const conversationId = [currentUserId, otherUserId].sort().join('_');
  
  db.run(
    'DELETE FROM private_messages WHERE conversation_id = ?',
    [conversationId],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      res.json({ message: 'Konwersacja została usunięta' });
    }
  );
});

// Wyszukiwanie użytkowników
app.get('/api/users/search', authenticateToken, (req, res) => {
  const query = req.query.q;
  
  if (!query || query.length < 2) {
    return res.json([]);
  }
  
  db.all(
    `SELECT id, username, email, avatar 
     FROM users 
     WHERE username LIKE ? OR email LIKE ?
     ORDER BY username
     LIMIT 10`,
    [`%${query}%`, `%${query}%`],
    (err, users) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      res.json(users);
    }
  );
});

// Wiadomości prywatne - pobierz statystyki
app.get('/api/pm-stats', authenticateToken, (req, res) => {
  const userId = req.user.id;
  
  const query = `
    SELECT 
      COUNT(*) as total_count,
      SUM(CASE WHEN is_read = 0 AND receiver_id = ? THEN 1 ELSE 0 END) as unread_count,
      SUM(CASE WHEN sender_id = ? THEN 1 ELSE 0 END) as sent_count,
      SUM(CASE WHEN receiver_id = ? THEN 1 ELSE 0 END) as received_count
    FROM private_messages
  `;
  
  db.get(query, [userId, userId, userId], (err, stats) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    res.json({
      received_count: stats.received_count || 0,
      sent_count: stats.sent_count || 0,
      unread_count: stats.unread_count || 0,
      saved_count: 0 // Możesz dodać logikę zapisywania wiadomości później
    });
  });
});

// Wiadomości prywatne - pobierz ustawienia
app.get('/api/pm-settings', authenticateToken, (req, res) => {
  const userId = req.user.id;
  
  // Sprawdź czy użytkownik ma już ustawienia
  db.get(
    'SELECT * FROM user_pm_settings WHERE user_id = ?',
    [userId],
    (err, settings) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      // Jeśli nie ma ustawień, utwórz domyślne
      if (!settings) {
        const defaultSettings = {
          allow_private_messages: 1,
          notify_on_pm: 1,
          save_sent_messages: 1
        };
        
        db.run(
          'INSERT INTO user_pm_settings (user_id, allow_private_messages, notify_on_pm, save_sent_messages) VALUES (?, ?, ?, ?)',
          [userId, 1, 1, 1],
          function(err) {
            if (err) {
              return res.status(500).json({ error: err.message });
            }
            
            res.json(defaultSettings);
          }
        );
      } else {
        res.json(settings);
      }
    }
  );
});

// Wiadomości prywatne - aktualizuj ustawienia
app.put('/api/pm-settings', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const { allow_private_messages, notify_on_pm, save_sent_messages } = req.body;
  
  db.run(
    `INSERT OR REPLACE INTO user_pm_settings 
     (user_id, allow_private_messages, notify_on_pm, save_sent_messages)
     VALUES (?, ?, ?, ?)`,
    [userId, allow_private_messages, notify_on_pm, save_sent_messages],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      res.json({ message: 'Ustawienia wiadomości prywatnych zostały zaktualizowane' });
    }
  );
});

app.post('/api/mark-read', authenticateToken, (req, res) => {
  const { threadId, postIds, categoryId } = req.body;
  const userId = req.user.id;

  try {
    if (threadId) {
      // Zapisz przeczytany wątek w bazie danych
      db.run(
        'INSERT OR REPLACE INTO user_read_threads (user_id, thread_id, read_at) VALUES (?, ?, CURRENT_TIMESTAMP)',
        [userId, threadId]
      );
    }

    if (postIds && postIds.length > 0) {
      // Zapisz przeczytane posty
      const stmt = db.prepare(
        'INSERT OR REPLACE INTO user_read_posts (user_id, post_id, read_at) VALUES (?, ?, CURRENT_TIMESTAMP)'
      );
      
      postIds.forEach(postId => {
        stmt.run([userId, postId]);
      });
      
      stmt.finalize();
    }

    if (categoryId) {
      // Zapisz czas ostatniej wizyty w kategorii
      db.run(
        'INSERT OR REPLACE INTO user_category_visits (user_id, category_id, last_visit) VALUES (?, ?, CURRENT_TIMESTAMP)',
        [userId, categoryId]
      );
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error marking read:', error);
    res.status(500).json({ error: 'Błąd podczas zapisywania statusu przeczytania' });
  }
});

// Endpoint do sprawdzania nieprzeczytanych treści w kategorii
app.get('/api/category/:id/unread-status', authenticateToken, (req, res) => {
  const categoryId = req.params.id;
  const userId = req.user.id;

  // Najpierw sprawdź czy użytkownik w ogóle odwiedził już tę kategorię
  db.get(
    'SELECT last_visit FROM user_category_visits WHERE user_id = ? AND category_id = ?',
    [userId, categoryId],
    (err, visit) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: err.message });
      }
      
      // Jeśli użytkownik nigdy nie odwiedził kategorii, to wszystkie treści są nieprzeczytane
      if (!visit) {
        return res.json({ hasUnread: true });
      }
      
      // Sprawdź czy są nowe wątki lub posty od ostatniej wizyty
      const query = `
        SELECT 
          (SELECT COUNT(*) FROM threads 
           WHERE category_id = ? AND last_post_time > ?) as new_threads,
          (SELECT COUNT(*) FROM posts p 
           JOIN threads t ON p.thread_id = t.id 
           WHERE t.category_id = ? AND p.date > ?) as new_posts
      `;
      
      db.get(query, [categoryId, visit.last_visit, categoryId, visit.last_visit], (err, row) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: err.message });
        }
        
        const hasUnread = (row.new_threads > 0) || (row.new_posts > 0);
        res.json({ hasUnread });
      });
    }
  );
});

// Endpoint do pobierania czasu ostatniej wizyty w kategorii
app.get('/api/category/:id/last-visit', authenticateToken, (req, res) => {
  const categoryId = req.params.id;
  const userId = req.user.id;

  db.get(
    'SELECT last_visit FROM user_category_visits WHERE user_id = ? AND category_id = ?',
    [userId, categoryId],
    (err, row) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      res.json({ lastVisit: row ? row.last_visit : null });
    }
  );
});

// Aktualizacja danych użytkownika (dla administratora)
app.put('/api/users/:id', authenticateToken, requirePermission('manage_users'), (req, res) => {
  const userId = req.params.id;
  const { username, email, role_id, is_banned, signature } = req.body;

  db.run(
    'UPDATE users SET username = ?, email = ?, role_id = ?, is_banned = ?, signature = ? WHERE id = ?',
    [username, email, role_id, is_banned ? 1 : 0, signature, userId],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Użytkownik nie istnieje' });
      }
      
      res.json({ message: 'Dane użytkownika zostały zaktualizowane' });
    }
  );
});

// Blokowanie/odblokowywanie użytkownika
app.put('/api/users/:id/ban', authenticateToken, requirePermission('manage_users'), (req, res) => {
  const userId = req.params.id;
  const { is_banned } = req.body;

  db.run(
    'UPDATE users SET is_banned = ? WHERE id = ?',
    [is_banned ? 1 : 0, userId],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Użytkownik nie istnieje' });
      }
      
      const message = is_banned ? 'Użytkownik został zablokowany' : 'Użytkownik został odblokowany';
      res.json({ message });
    }
  );
});

// Wysyłanie wiadomości systemowej
app.post('/api/admin/system-message', authenticateToken, requirePermission('manage_users'), async (req, res) => {
  const { recipients, title, message } = req.body;

  try {
    let userIds = [];
    
    if (recipients.includes('all')) {
      // Pobierz wszystkich użytkowników
      const users = await new Promise((resolve, reject) => {
        db.all('SELECT id FROM users', (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });
      userIds = users.map(user => user.id);
    } else {
      userIds = recipients;
    }

    // Wyślij powiadomienia do każdego użytkownika
    for (const userId of userIds) {
      await createNotification(
        userId,
        'system',
        title,
        message,
        null,
        null,
        req.user.id
      );
    }

    res.json({ message: `Wiadomość systemowa została wysłana do ${userIds.length} użytkowników` });
  } catch (error) {
    res.status(500).json({ error: 'Błąd podczas wysyłania wiadomości systemowej' });
  }
});

// Wysyłanie wiadomości do konkretnego użytkownika
app.post('/api/admin/user-message', authenticateToken, requirePermission('manage_users'), async (req, res) => {
  const { user_id, title, message } = req.body;

  try {
    await createNotification(
      user_id,
      'system',
      title,
      message,
      null,
      null,
      req.user.id
    );

    res.json({ message: 'Wiadomość została wysłana' });
  } catch (error) {
    res.status(500).json({ error: 'Błąd podczas wysyłania wiadomości' });
  }
});

function formatRegistrationDate(registerDate) {
  const register = new Date(registerDate);
  const now = new Date();
  const diffMs = now - register;
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffDays === 0) return 'Dziś';
  if (diffDays === 1) return 'Wczoraj';
  if (diffDays < 7) return `${diffDays} dni`;
  if (diffDays < 30) return `${Math.floor(diffDays/7)} tyg`;
  return register.toLocaleDateString('pl-PL');
}

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
