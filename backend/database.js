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
      is_banned BOOLEAN DEFAULT 0,
      location TEXT DEFAULT NULL,
      website TEXT DEFAULT NULL,
      bio TEXT DEFAULT NULL,
      reputation INTEGER DEFAULT 0,
      notification_settings TEXT DEFAULT '{"email_notifications": true, "push_notifications": true}',
      FOREIGN KEY (role_id) REFERENCES roles (id)
    )`);
    
    db.run(`CREATE TABLE IF NOT EXISTS thread_subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      thread_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id),
      FOREIGN KEY (thread_id) REFERENCES threads (id),
      UNIQUE(user_id, thread_id)
    )`);
    
    db.run(`CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL, -- 'new_reply', 'thread_update', 'mention', 'system'
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      related_thread_id INTEGER,
      related_post_id INTEGER,
      related_user_id INTEGER,
      is_read BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id),
      FOREIGN KEY (related_thread_id) REFERENCES threads (id),
      FOREIGN KEY (related_post_id) REFERENCES posts (id),
      FOREIGN KEY (related_user_id) REFERENCES users (id)
    )`);
    
    db.run(`CREATE TABLE IF NOT EXISTS user_notification_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      email_notifications BOOLEAN DEFAULT 1,
      push_notifications BOOLEAN DEFAULT 1,
      notify_on_reply BOOLEAN DEFAULT 1,
      notify_on_mention BOOLEAN DEFAULT 1,
      notify_on_thread_update BOOLEAN DEFAULT 1,
      FOREIGN KEY (user_id) REFERENCES users (id),
      UNIQUE(user_id)
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
      position INTEGER DEFAULT 0,
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
      is_closed INTEGER DEFAULT 0,
      is_sticky INTEGER DEFAULT 0,
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
      edited_at DATETIME,
      FOREIGN KEY (thread_id) REFERENCES threads (id),
      FOREIGN KEY (user_id) REFERENCES users (id)
    )`);
    
    db.run(`CREATE TABLE IF NOT EXISTS user_read_threads (
      user_id INTEGER,
      thread_id INTEGER,
      read_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, thread_id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (thread_id) REFERENCES threads(id)
    )`);
    
    db.run(`CREATE TABLE IF NOT EXISTS user_read_posts (
      user_id INTEGER,
      post_id INTEGER,
      read_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, post_id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (post_id) REFERENCES posts(id)
    )`);
    
    db.run(`CREATE TABLE IF NOT EXISTS user_category_visits (
      user_id INTEGER,
      category_id INTEGER,
      last_visit DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, category_id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (category_id) REFERENCES categories(id)
    )`);
    
    db.run(`CREATE TABLE IF NOT EXISTS private_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id TEXT NOT NULL,
      sender_id INTEGER NOT NULL,
      receiver_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      is_read BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sender_id) REFERENCES users (id),
      FOREIGN KEY (receiver_id) REFERENCES users (id)
    )`);
    
    // Dodaj indeksy dla lepszej wydajności
    db.run('CREATE INDEX IF NOT EXISTS idx_pm_conversation ON private_messages (conversation_id)');
    db.run('CREATE INDEX IF NOT EXISTS idx_pm_sender ON private_messages (sender_id)');
    db.run('CREATE INDEX IF NOT EXISTS idx_pm_receiver ON private_messages (receiver_id)');
    db.run('CREATE INDEX IF NOT EXISTS idx_pm_read ON private_messages (is_read)');
    
    db.run(`CREATE TABLE IF NOT EXISTS user_pm_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE NOT NULL,
      allow_private_messages BOOLEAN DEFAULT 1,
      notify_on_pm BOOLEAN DEFAULT 1,
      save_sent_messages BOOLEAN DEFAULT 1,
      FOREIGN KEY (user_id) REFERENCES users (id)
    )`);
    
    db.run(`CREATE TABLE IF NOT EXISTS reputation_votes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      target_type TEXT NOT NULL CHECK (target_type IN ('post', 'thread')),
      target_id INTEGER NOT NULL,
      vote_type TEXT NOT NULL CHECK (vote_type IN ('upvote', 'downvote')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id),
      UNIQUE(user_id, target_type, target_id)
    );`);
    
    db.run(`CREATE INDEX IF NOT EXISTS idx_reputation_votes_target ON reputation_votes (target_type, target_id);
      CREATE INDEX IF NOT EXISTS idx_reputation_votes_user ON reputation_votes (user_id);
      CREATE INDEX IF NOT EXISTS idx_reputation_votes_created ON reputation_votes (created_at);`);
      
	// System osiągnięć
	db.run(`CREATE TABLE IF NOT EXISTS achievements (
	  id INTEGER PRIMARY KEY AUTOINCREMENT,
	  name TEXT NOT NULL,
	  description TEXT NOT NULL,
	  icon TEXT NOT NULL,
	  category_id INTEGER NOT NULL,
	  rarity TEXT NOT NULL DEFAULT 'common',
	  points INTEGER NOT NULL DEFAULT 0,
	  requirement INTEGER NOT NULL DEFAULT 1,
	  requirements_text TEXT NOT NULL,
	  is_hidden BOOLEAN DEFAULT 0,
	  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
	  FOREIGN KEY (category_id) REFERENCES achievement_categories (id)
	)`);

	db.run(`CREATE TABLE IF NOT EXISTS achievement_categories (
	  id INTEGER PRIMARY KEY AUTOINCREMENT,
	  name TEXT NOT NULL,
	  icon TEXT NOT NULL,
	  description TEXT,
	  position INTEGER DEFAULT 0
	)`);

	db.run(`CREATE TABLE IF NOT EXISTS user_achievements (
	  id INTEGER PRIMARY KEY AUTOINCREMENT,
	  user_id INTEGER NOT NULL,
	  achievement_id INTEGER NOT NULL,
	  progress INTEGER DEFAULT 0,
	  unlocked BOOLEAN DEFAULT 0,
	  unlocked_at DATETIME,
	  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
	  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
	  FOREIGN KEY (user_id) REFERENCES users (id),
	  FOREIGN KEY (achievement_id) REFERENCES achievements (id),
	  UNIQUE(user_id, achievement_id)
	)`);

	db.run(`CREATE TABLE IF NOT EXISTS achievement_progress (
	  id INTEGER PRIMARY KEY AUTOINCREMENT,
	  user_id INTEGER NOT NULL,
	  achievement_id INTEGER NOT NULL,
	  progress_data TEXT,
	  last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
	  FOREIGN KEY (user_id) REFERENCES users (id),
	  FOREIGN KEY (achievement_id) REFERENCES achievements (id),
	  UNIQUE(user_id, achievement_id)
	)`);

	// Indeksy dla lepszej wydajności
	db.run('CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements (user_id)');
	db.run('CREATE INDEX IF NOT EXISTS idx_user_achievements_achievement ON user_achievements (achievement_id)');
	db.run('CREATE INDEX IF NOT EXISTS idx_achievement_progress_user ON achievement_progress (user_id)');
	
	db.run(`CREATE TABLE IF NOT EXISTS user_activities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    activity_type VARCHAR(100) NOT NULL,
    target_id INTEGER,
    target_type VARCHAR(50),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
)`);

       db.run(`CREATE INDEX IF NOT EXISTS idx_user_activities_user_id ON user_activities(user_id)`);
       db.run('CREATE INDEX IF NOT EXISTS idx_user_activities_type ON user_activities(activity_type)');
       db.run('CREATE INDEX IF NOT EXISTS idx_user_activities_created ON user_activities(created_at)');
       
       db.run(`CREATE TRIGGER IF NOT EXISTS after_post_insert
		AFTER INSERT ON posts
		FOR EACH ROW
		BEGIN
		    INSERT INTO user_activities (user_id, activity_type, target_id, target_type)
		    VALUES (NEW.user_id, 'post_created', NEW.id, 'post');
		END;`);
		
       db.run(`CREATE TRIGGER IF NOT EXISTS after_thread_insert
AFTER INSERT ON threads
FOR EACH ROW
BEGIN
    INSERT INTO user_activities (user_id, activity_type, target_id, target_type)
    VALUES (NEW.user_id, 'thread_created', NEW.id, 'thread');
END;`);

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
      
	// Przykładowe kategorie osiągnięć
	const achievementCategories = [
	  ['Aktywność', 'mdi:forum', 'Osiągnięcia związane z aktywnością na forum', 1],
	  ['Tworzenie treści', 'mdi:creation', 'Osiągnięcia za tworzenie treści', 2],
	  ['Społeczność', 'mdi:account-group', 'Osiągnięcia społecznościowe', 3],
	  ['Ekspert', 'mdi:star', 'Osiągnięcia eksperckie', 4]
	];

	// Przykładowe osiągnięcia
	const achievements = [
	  ['Pierwszy post', 'Napisz swój pierwszy post na forum', 'mdi:comment', 2, 'common', 10, 1, 'Napisz jeden post'],
	  ['Aktywny użytkownik', 'Napisz 10 postów', 'mdi:comment-multiple', 1, 'uncommon', 25, 10, 'Napisz 10 postów'],
	  ['Ekspert forum', 'Napisz 100 postów', 'mdi:comment-account', 1, 'rare', 50, 100, 'Napisz 100 postów'],
	  ['Pierwszy wątek', 'Utwórz swój pierwszy wątek', 'mdi:forum', 2, 'common', 15, 1, 'Utwórz jeden wątek']
	];

	// Wstaw kategorie osiągnięć
	const insertCategory_arch = db.prepare(`INSERT INTO achievement_categories (name, icon, description, position) VALUES (?, ?, ?, ?)`);
	achievementCategories.forEach(category => {
	  insertCategory_arch.run(category);
	});

	// Wstaw osiągnięcia
	const insertAchievement = db.prepare(`INSERT INTO achievements (name, description, icon, category_id, rarity, points, requirement, requirements_text) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
	achievements.forEach(achievement => {
	  insertAchievement.run(achievement);
	});
      
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
