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
    // 1. Najpierw tworzymy tabelę ról (BEZ kolumny permissions)
    db.run(`CREATE TABLE IF NOT EXISTS roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      description TEXT,
      icon TEXT DEFAULT 'mdi:account',
      priority INTEGER DEFAULT 500,
      color TEXT DEFAULT '#409EFF',
      is_default BOOLEAN DEFAULT 0,
      is_system BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // 2. Tabele dla systemu uprawnień (najpierw permissions, potem powiązania)
    db.run(`CREATE TABLE IF NOT EXISTS permissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      description TEXT,
      category TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS permission_roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      permission_id INTEGER NOT NULL,
      role_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (permission_id) REFERENCES permissions (id) ON DELETE CASCADE,
      FOREIGN KEY (role_id) REFERENCES roles (id) ON DELETE CASCADE,
      UNIQUE(permission_id, role_id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS user_roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      role_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
      FOREIGN KEY (role_id) REFERENCES roles (id) ON DELETE CASCADE,
      UNIQUE(user_id, role_id)
    )`);

    // 3. Teraz tworzymy tabelę użytkowników (bez role_id, bo używamy user_roles)
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      avatar TEXT,
      signature TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_login DATETIME,
      is_banned BOOLEAN DEFAULT 0,
      location TEXT DEFAULT NULL,
      website TEXT DEFAULT NULL,
      bio TEXT DEFAULT NULL,
      reputation INTEGER DEFAULT 0,
      notification_settings TEXT DEFAULT '{"email_notifications": true, "push_notifications": true}'
    )`);

    // 4. Pozostałe tabele
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

    db.run(`CREATE TABLE IF NOT EXISTS category_permissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER NOT NULL,
      permission_id INTEGER NOT NULL,
      permission_type TEXT DEFAULT 'read',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (permission_id) REFERENCES permissions (id) ON DELETE CASCADE,
      UNIQUE(category_id, permission_id, permission_type)
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

    // 5. Pozostałe tabele pomocnicze
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
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      related_thread_id INTEGER,
      related_post_id INTEGER,
      related_user_id INTEGER,
      is_read BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
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

    db.run(`CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      action TEXT NOT NULL,
      target_type TEXT,
      target_id INTEGER,
      details TEXT,
      ip_address TEXT,
      user_agent TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
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
    )`);
    
    db.run(`CREATE INDEX IF NOT EXISTS idx_reputation_votes_target ON reputation_votes (target_type, target_id);
      CREATE INDEX IF NOT EXISTS idx_reputation_votes_user ON reputation_votes (user_id);
      CREATE INDEX IF NOT EXISTS idx_reputation_votes_created ON reputation_votes (created_at);`);
      
    // Seo
    
    db.run(`
CREATE TABLE "seo_settings" (
	"id"	INTEGER DEFAULT 1,
	"home_title"	TEXT,
	"home_description"	TEXT,
	"global_keywords"	TEXT,
	"schema_enabled"	INTEGER DEFAULT 1,
	"open_graph_enabled"	INTEGER DEFAULT 1,
	"twitter_cards_enabled"	INTEGER DEFAULT 1,
	"robots_txt"	TEXT,
	"sitemap_url"	TEXT,
	"updated_at"	DATETIME DEFAULT CURRENT_TIMESTAMP,
	"GA_VIEW_ID"	TEXT,
	"GOOGLE_APPLICATION_CREDENTIALS"	TEXT,
	PRIMARY KEY("id")
);`);

db.run(`CREATE TABLE IF NOT EXISTS category_seo (
  category_id INTEGER PRIMARY KEY,
  seo_title TEXT,
  seo_description TEXT,
  keywords TEXT,
  FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE CASCADE
);`);

db.run(`CREATE TABLE "seo_audits" (
	"id"	INTEGER,
	"audit_date"	DATETIME DEFAULT CURRENT_TIMESTAMP,
	"results"	TEXT,
	"audited_url"	TEXT,
	PRIMARY KEY("id" AUTOINCREMENT)
);`);
      
    // System osiągnięć
    db.run(`CREATE TABLE IF NOT EXISTS achievements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name VARCHAR(100) NOT NULL,
      description TEXT,
      icon VARCHAR(100),
      category_id INTEGER,
      rarity VARCHAR(20) DEFAULT 'common',
      points INTEGER DEFAULT 0,
      requirement INTEGER DEFAULT 1,
      requirements_text TEXT,
      is_hidden BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES achievement_categories(id)
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
      // Po utworzeniu tabel, wstaw domyślne role i uprawnienia
      insertDefaultData();
    });
  });
}

// Funkcja do wstawiania domyślnych danych
function insertDefaultData() {
  // Sprawdź czy role już istnieją
  db.get("SELECT COUNT(*) as count FROM roles", (err, row) => {
    if (err) {
      console.error("Error checking roles:", err);
      return;
    }

    if (row.count === 0) {
      console.log("Inserting default roles and permissions...");
      
      // 1. Wstaw domyślne role
      const roles = [
        ['Administrator', 'Pełne uprawnienia administracyjne', 'mdi:shield-account', 1, '#F56C6C', 1, 1],
        ['Moderator', 'Uprawnienia moderatorskie', 'mdi:moderator', 10, '#E6A23C', 0, 1],
        ['Użytkownik', 'Podstawowy użytkownik', 'mdi:account', 500, '#909399', 1, 1],
        ['Zbanowany', 'Zablokowany użytkownik', 'mdi:block-helper', 1000, '#000000', 0, 1],
        ['VIP', 'Użytkownik z dodatkowymi przywilejami', 'mdi:crown', 100, '#67C23A', 0, 0],
        ['Redaktor', 'Tworzenie i edycja treści', 'mdi:pencil', 50, '#409EFF', 0, 0]
      ];

      const insertRole = db.prepare(`INSERT INTO roles (name, description, icon, priority, color, is_default, is_system) VALUES (?, ?, ?, ?, ?, ?, ?)`);
      
      roles.forEach(role => {
        insertRole.run(role);
      });
      
      insertRole.finalize(() => {
        console.log("Default roles inserted");
        
        // 2. Wstaw domyślne uprawnienia
        insertDefaultPermissions();
      });
    } else {
      console.log("Roles already exist, checking permissions...");
      insertDefaultPermissions();
    }
  });
}

// Funkcja do wstawiania domyślnych uprawnień
function insertDefaultPermissions() {
  db.get("SELECT COUNT(*) as count FROM permissions", (err, row) => {
    if (err) {
      console.error("Error checking permissions:", err);
      return;
    }

    if (row.count === 0) {
      console.log("Inserting default permissions...");
      
      const permissions = [
        ['manage_users', 'Zarządzanie użytkownikami', 'Administracja'],
        ['manage_categories', 'Zarządzanie kategoriami', 'Administracja'],
        ['manage_threads', 'Zarządzanie wątkami', 'Moderacja'],
        ['manage_posts', 'Zarządzanie postami', 'Moderacja'],
        ['delete_any_content', 'Usuwanie dowolnych treści', 'Moderacja'],
        ['assign_roles', 'Przypisywanie ról', 'Administracja'],
        ['manage_backups', 'Zarządzanie backupami', 'System'],
        ['view_roles', 'Przeglądanie ról', 'Administracja'],
        ['create_role', 'Tworzenie ról', 'Administracja'],
        ['edit_role', 'Edycja ról', 'Administracja'],
        ['delete_role', 'Usuwanie ról', 'Administracja'],
        ['view_role_users', 'Przeglądanie użytkowników roli', 'Administracja'],
        ['add_user_to_role', 'Dodawanie użytkownika do roli', 'Administracja'],
        ['remove_user_from_role', 'Usuwanie użytkownika z roli', 'Administracja'],
        ['view_permissions', 'Przeglądanie uprawnień', 'Administracja'],
        ['edit_permission_roles', 'Edycja ról uprawnienia', 'Administracja'],
        ['view_category_permissions', 'Przeglądanie uprawnień kategorii', 'Kategorie'],
        ['edit_category_permissions', 'Edycja uprawnień kategorii', 'Kategorie'],
        ['view_audit_logs', 'Przeglądanie logów audytu', 'System'],
        ['view_stats', 'Przeglądanie statystyk', 'System'],
        ['search_users', 'Wyszukiwanie użytkowników', 'Użytkownicy'],
        ['create_posts', 'Tworzenie postów', 'Forum'],
        ['create_threads', 'Tworzenie wątków', 'Forum'],
        ['edit_own_content', 'Edycja własnych treści', 'Forum'],
        ['delete_own_content', 'Usuwanie własnych treści', 'Forum'],
        ['extended_signature', 'Rozszerzony podpis', 'Użytkownicy'],
        ['custom_avatar', 'Niestandardowy avatar', 'Użytkownicy'],
        ['create_announcements', 'Tworzenie ogłoszeń', 'Forum']
      ];

      const insertPermission = db.prepare(`INSERT INTO permissions (name, description, category) VALUES (?, ?, ?)`);
      
      permissions.forEach(permission => {
        insertPermission.run(permission);
      });
      
      insertPermission.finalize(() => {
        console.log("Default permissions inserted");
        
        // 3. Przypisz uprawnienia do ról
        assignDefaultPermissions();
      });
    } else {
      console.log("Permissions already exist");
      insertSampleData();
    }
  });
}

// Funkcja do przypisywania domyślnych uprawnień do ról
function assignDefaultPermissions() {
  console.log("Assigning default permissions to roles...");
  
  // Pobierz wszystkie uprawnienia i role
  db.all("SELECT id, name FROM permissions", (err, permissions) => {
    if (err) {
      console.error("Error getting permissions:", err);
      return;
    }
    
    db.all("SELECT id, name FROM roles", (err, roles) => {
      if (err) {
        console.error("Error getting roles:", err);
        return;
      }
      
      const permissionMap = {};
      permissions.forEach(p => permissionMap[p.name] = p.id);
      
      const roleMap = {};
      roles.forEach(r => roleMap[r.name] = r.id);
      
      const insertPermissionRole = db.prepare(`INSERT OR IGNORE INTO permission_roles (permission_id, role_id) VALUES (?, ?)`);
      
      // Administrator - wszystkie uprawnienia
      Object.values(permissionMap).forEach(permId => {
        insertPermissionRole.run(permId, roleMap['Administrator']);
      });
      
      // Moderator - uprawnienia moderatorskie
      const moderatorPerms = ['manage_threads', 'manage_posts', 'delete_any_content', 'create_posts', 'create_threads', 'edit_own_content', 'delete_own_content'];
      moderatorPerms.forEach(permName => {
        if (permissionMap[permName]) {
          insertPermissionRole.run(permissionMap[permName], roleMap['Moderator']);
        }
      });
      
      // Użytkownik - podstawowe uprawnienia
      const userPerms = ['create_posts', 'create_threads', 'edit_own_content', 'delete_own_content'];
      userPerms.forEach(permName => {
        if (permissionMap[permName]) {
          insertPermissionRole.run(permissionMap[permName], roleMap['Użytkownik']);
        }
      });
      
      // VIP - dodatkowe uprawnienia
      const vipPerms = ['create_posts', 'create_threads', 'edit_own_content', 'delete_own_content', 'extended_signature', 'custom_avatar'];
      vipPerms.forEach(permName => {
        if (permissionMap[permName]) {
          insertPermissionRole.run(permissionMap[permName], roleMap['VIP']);
        }
      });
      
      // Redaktor - uprawnienia do tworzenia treści
      const editorPerms = ['create_posts', 'create_threads', 'edit_own_content', 'delete_own_content', 'create_announcements'];
      editorPerms.forEach(permName => {
        if (permissionMap[permName]) {
          insertPermissionRole.run(permissionMap[permName], roleMap['Redaktor']);
        }
      });
      
      insertPermissionRole.finalize(() => {
        console.log("Default permissions assigned to roles");
        insertSampleData();
      });
    });
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
  // ... (pozostała część funkcji bez zmian)
}

// Eksportuj bazę danych i funkcje
module.exports = {
  db,
  isFirstUser
};
