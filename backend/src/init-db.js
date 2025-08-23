const { db } = require('../database');
const fs = require('fs');
const path = require('path');

// Usuń istniejącą bazę danych
const dbPath = path.join(__dirname, '..', 'database', 'forum.db');
if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath);
  console.log('Removed existing database');
}

// Utwórz folder database jeśli nie istnieje
const dir = path.join(__dirname, '..', 'database');
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

// Ponownie zainicjuj bazę danych
db.serialize(() => {
  // 1. Najpierw tworzymy tabelę ról
  db.run(`CREATE TABLE roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    permissions TEXT
  )`);

  // 2. Następnie tworzymy tabelę użytkowników z kluczem obcym do roles
  db.run(`CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role_id INTEGER DEFAULT 3,
    avatar TEXT,
    signature TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME,
    FOREIGN KEY (role_id) REFERENCES roles (id)
  )`);

  // 3. Teraz tworzymy pozostałe tabele
  db.run(`CREATE TABLE categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    icon TEXT,
    description TEXT,
    threads INTEGER DEFAULT 0,
    posts INTEGER DEFAULT 0,
    last_post_author TEXT,
    last_post_time TEXT
  )`);

  db.run(`CREATE TABLE threads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER,
    user_id INTEGER,
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    date TEXT,
    replies INTEGER DEFAULT 0,
    views INTEGER DEFAULT 0,
    last_post_author TEXT,
    last_post_time TEXT,
    FOREIGN KEY (category_id) REFERENCES categories (id),
    FOREIGN KEY (user_id) REFERENCES users (id)
  )`);

  db.run(`CREATE TABLE posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    thread_id INTEGER,
    user_id INTEGER,
    author TEXT NOT NULL,
    content TEXT,
    date TEXT,
    FOREIGN KEY (thread_id) REFERENCES threads (id),
    FOREIGN KEY (user_id) REFERENCES users (id)
  )`);

  db.run(`CREATE TABLE auth_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    token TEXT UNIQUE NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
  )`, () => {
    console.log('All tables created successfully');
    
    // Wstaw domyślne role
    const roles = [
      ['Administrator', '{"manage_users": true, "manage_categories": true, "manage_threads": true, "manage_posts": true, "delete_any_content": true, "assign_roles": true}'],
      ['Moderator', '{"manage_threads": true, "manage_posts": true, "delete_any_content": true}'],
      ['Użytkownik', '{"create_threads": true, "create_posts": true, "edit_own_content": true, "delete_own_content": true}'],
      ['Zbanowany', '{}'],
      ['VIP', '{"create_threads": true, "create_posts": true, "edit_own_content": true, "delete_own_content": true, "extended_signature": true, "custom_avatar": true}'],
      ['Redaktor', '{"create_threads": true, "create_posts": true, "edit_own_content": true, "delete_own_content": true, "create_announcements": true}']
    ];

    const insertRole = db.prepare(`INSERT INTO roles (name, permissions) VALUES (?, ?)`);
    
    roles.forEach(role => {
      insertRole.run(role);
    });
    
    insertRole.finalize(() => {
      console.log('Default roles inserted');
      db.close();
    });
  });
});
