const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database', 'forum.db');

// Utwórz folder database jeśli nie istnieje
const fs = require('fs');
const dir = path.join(__dirname, 'database');
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log('Connected to SQLite database');
    initDatabase();
  }
});

function initDatabase() {
  // Używamy serialize aby zapewnić kolejność wykonywania operacji
  db.serialize(() => {
    // 1. Najpierw tworzymy tabelę ról
    db.run(`CREATE TABLE IF NOT EXISTS roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      permissions TEXT
    )`);

    // 2. Następnie tworzymy tabelę użytkowników z kluczem obcym do roles
    db.run(`CREATE TABLE IF NOT EXISTS users (
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
    db.run(`CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      icon TEXT,
      description TEXT,
      threads INTEGER DEFAULT 0,
      posts INTEGER DEFAULT 0,
      last_post_author TEXT,
      last_post_time TEXT,
      is_locked BOOLEAN DEFAULT 0,
      required_role INTEGER DEFAULT NULL
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS threads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER,
      user_id INTEGER,
      title TEXT NOT NULL,
      tag TEXT,
      author TEXT NOT NULL,
      date TEXT,
      replies INTEGER DEFAULT 0,
      views INTEGER DEFAULT 0,
      last_post_author TEXT,
      last_post_time TEXT,
      FOREIGN KEY (category_id) REFERENCES categories (id),
      FOREIGN KEY (user_id) REFERENCES users (id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      thread_id INTEGER,
      user_id INTEGER,
      author TEXT NOT NULL,
      content TEXT,
      date TEXT,
      FOREIGN KEY (thread_id) REFERENCES threads (id),
      FOREIGN KEY (user_id) REFERENCES users (id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS auth_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      token TEXT UNIQUE NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    )`, () => {
      // Po utworzeniu tabel, wstaw domyślne role
      insertDefaultRoles();
    });
  });
}

// Funkcja do wstawiania domyślnych ról
function insertDefaultRoles() {
  // Sprawdź czy role już istnieją
  db.get("SELECT COUNT(*) as count FROM roles", (err, row) => {
    if (err) {
      console.error("Error checking roles:", err);
      return;
    }

    if (row.count === 0) {
      console.log("Inserting default roles...");
      
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
        console.log("Default roles inserted successfully");
        // Po wstawieniu ról, wstaw przykładowe dane
        insertSampleData();
      });
    } else {
      console.log("Roles already exist, skipping insertion");
      insertSampleData();
    }
  });
}

// Funkcja do sprawdzania czy to pierwszy użytkownik
function isFirstUser(callback) {
  db.get("SELECT COUNT(*) as count FROM users", (err, row) => {
    if (err) {
      console.error("Error checking user count:", err);
      callback(false);
      return;
    }
    callback(row.count === 0);
  });
}

// Funkcja do wstawiania przykładowych danych
function insertSampleData() {
  // Sprawdź czy dane już istnieją
  db.get("SELECT COUNT(*) as count FROM categories", (err, row) => {
    if (err) {
      console.error("Error checking data:", err);
      return;
    }

    if (row.count === 0) {
      console.log("Inserting sample data...");
      
      // Wstaw kategorie
      const categories = [
        ['Ogłoszenia', 'mdi:bullhorn', 'Ogłoszenia administracji i ważne informacje', 45, 210, 'Admin', '2 godziny temu'],
        ['Problemy techniczne', 'mdi:tools', 'Problemy z konfiguracją, instalacją i działaniem NAS', 328, 1542, 'Jan Kowalski', '15 minut temu'],
        ['Dyskusje ogólne', 'mdi:forum', 'Ogólne dyskusje dotyczące NAS i nie tylko', 567, 2890, 'Anna Nowak', '5 minut temu'],
        ['Propozycje', 'mdi:lightbulb', 'Propozycje nowych funkcji i usprawnień', 192, 874, 'Tomasz Wiśniewski', '1 godzinę temu'],
        ['Off-top', 'mdi:chat', 'Dyskusje na dowolne tematy niezwiązane z NAS', 111, 376, 'KinoMan', '28 minut temu']
      ];

      const insertCategory = db.prepare(`INSERT INTO categories (name, icon, description, threads, posts, last_post_author, last_post_time) VALUES (?, ?, ?, ?, ?, ?, ?)`);
      
      categories.forEach(category => {
        insertCategory.run(category);
      });
      
      insertCategory.finalize();
      console.log("Sample data inserted successfully");
    } else {
      console.log("Database already contains data, skipping sample data insertion");
    }
  });
}

// Eksportuj bazę danych i funkcje
module.exports = {
  db,
  isFirstUser
};
