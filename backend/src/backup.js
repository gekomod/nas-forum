// =============================================================================
// SYSTEM BACKUPU I EKSPORTU DANYCH - ENDPOINTY API
// =============================================================================

const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// Konfiguracja katalogu backupów
const BACKUP_DIR = path.join(__dirname, '../backups');
const EXPORT_DIR = path.join(__dirname, '../exports');

module.exports = function(app, authenticateToken, requirePermission, checkOwnership, JWT_SECRET, db) {
// Utwórz katalogi jeśli nie istnieją
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}
if (!fs.existsSync(EXPORT_DIR)) {
  fs.mkdirSync(EXPORT_DIR, { recursive: true });
}

// Pobierz listę dostępnych backupów
app.get('/api/admin/backups', authenticateToken, requirePermission('manage_backups'), async (req, res) => {

  try {
    const files = await fs.promises.readdir(BACKUP_DIR);
    const backups = [];

    for (const file of files) {
      if (file.endsWith('.sql') || file.endsWith('.gz')) {
        const filePath = path.join(BACKUP_DIR, file);
        const stats = await fs.promises.stat(filePath);
        const fileType = file.includes('full') ? 'full' : 'incremental';

        backups.push({
          id: file,
          name: file,
          createdAt: stats.mtime,
          size: stats.size,
          type: fileType
        });
      }
    }

    res.json(backups.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
  } catch (error) {
    console.error('Błąd pobierania listy backupów:', error);
    res.status(500).json({ error: 'Błąd serwera podczas pobierania listy backupów' });
  }
});

// Utwórz nowy backup
app.post('/api/admin/backup/create', authenticateToken, requirePermission('manage_backups'), async (req, res) => {
  try {
    const { type = 'full' } = req.body;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `backup_${timestamp}_${type}.sql`;
    const backupPath = path.join(BACKUP_DIR, backupName);
    
    // Polecenie do eksportu bazy SQLite
    const dbPath = path.join(__dirname, '../database/forum.db'); // Ścieżka do bazy SQLite
    const command = `sqlite3 ${dbPath} .dump > ${backupPath}`;
    
    await execPromise(command);
    
    // Kompresja backupu
    const compressedBackupName = `${backupName}.gz`;
    const compressedBackupPath = path.join(BACKUP_DIR, compressedBackupName);
    const compressCommand = `gzip -c ${backupPath} > ${compressedBackupPath}`;
    
    await execPromise(compressCommand);
    
    // Usuń niekompresowany plik
    await fs.promises.unlink(backupPath);
    
    res.json({ 
      message: 'Backup utworzony pomyślnie', 
      backup: {
        id: compressedBackupName,
        name: compressedBackupName,
        path: compressedBackupPath,
        type
      }
    });
  } catch (error) {
    console.error('Błąd tworzenia backupu:', error);
    res.status(500).json({ error: 'Błąd serwera podczas tworzenia backupu' });
  }
});

// Pobierz backup
app.get('/api/admin/backup/download/:id', authenticateToken, requirePermission('manage_backups'), async (req, res) => {
  try {
    const { id } = req.params;
    const backupPath = path.join(BACKUP_DIR, id);
    
    try {
      await fs.promises.access(backupPath);
    } catch (error) {
      return res.status(404).json({ error: 'Backup nie znaleziony' });
    }
    
    res.download(backupPath, (err) => {
      if (err) {
        console.error('Błąd pobierania backupu:', err);
        res.status(500).json({ error: 'Błąd podczas pobierania backupu' });
      }
    });
  } catch (error) {
    console.error('Błąd pobierania backupu:', error);
    res.status(500).json({ error: 'Błąd serwera podczas pobierania backupu' });
  }
});

// Usuń backup
app.delete('/api/admin/backup/:id', authenticateToken, requirePermission('manage_backups'), async (req, res) => {
  try {
    const { id } = req.params;
    const backupPath = path.join(BACKUP_DIR, id);
    
    try {
      await fs.promises.unlink(backupPath);
      res.json({ message: 'Backup usunięty pomyślnie' });
    } catch (error) {
      if (error.code === 'ENOENT') {
        return res.status(404).json({ error: 'Backup nie istnieje' });
      }
      throw error;
    }
  } catch (error) {
    console.error('Błąd usuwania backupu:', error);
    res.status(500).json({ error: 'Błąd serwera podczas usuwania backupu' });
  }
});

// Przywróć backup
app.post('/api/admin/backup/restore/:id', authenticateToken, requirePermission('manage_backups'), async (req, res) => {
  try {
    const { id } = req.params;
    const { mode = 'full', items = [] } = req.body;
    const backupPath = path.join(BACKUP_DIR, id);
    const dbPath = path.join(__dirname, '../database/forum.db');
    
    try {
      await fs.promises.access(backupPath);
    } catch (error) {
      return res.status(404).json({ error: 'Backup nie znaleziony' });
    }
    
    // Tymczasowa kopia bazy danych
    const tempDbPath = path.join(BACKUP_DIR, 'temp_restore.db');
    
    // Stwórz tymczasową bazę danych
    await execPromise(`sqlite3 ${tempDbPath} "VACUUM;"`);
    
    // Dekompresja i przywrócenie backupu
    if (backupPath.endsWith('.gz')) {
      // Dekompresuj backup
      const decompressedPath = backupPath.replace('.gz', '');
      await execPromise(`gzip -d -c ${backupPath} > ${decompressedPath}`);
      
      // Przywróć backup do tymczasowej bazy
      await execPromise(`sqlite3 ${tempDbPath} < ${decompressedPath}`);
      
      // Usuń zdekompresowany plik
      await fs.promises.unlink(decompressedPath);
    } else {
      // Przywróć bezpośrednio z pliku SQL
      await execPromise(`sqlite3 ${tempDbPath} < ${backupPath}`);
    }
    
    // Dla uproszczenia przywracamy całą bazę
    // W rzeczywistości należałoby zaimplementować bardziej zaawansowaną logikę
    // dla częściowego przywracania
    
    // Zamień oryginalną bazę z tymczasową
    await fs.promises.rename(tempDbPath, dbPath);
    
    res.json({ message: 'Backup przywrócony pomyślnie' });
  } catch (error) {
    console.error('Błąd przywracania backupu:', error);
    res.status(500).json({ error: 'Błąd serwera podczas przywracania backupu' });
  }
});

// Eksportuj dane
app.post('/api/admin/export', authenticateToken, requirePermission('manage_backups'), async (req, res) => {
  try {
    const { dataTypes, format, compression, sqlStructure } = req.body;
    
    let exportData;
    let filename = `export_${new Date().toISOString().slice(0, 10)}`;
    let contentType = 'application/octet-stream';

    // Eksportuj wybrane typy danych
    const data = {};
    
    if (dataTypes.includes('users')) {
      data.users = await exportTable('users');
    }
    
    if (dataTypes.includes('categories')) {
      data.categories = await exportTable('categories');
    }
    
    if (dataTypes.includes('threads')) {
      data.threads = await exportTable('threads');
    }
    
    if (dataTypes.includes('posts')) {
      data.posts = await exportTable('posts');
    }
    
    if (dataTypes.includes('settings')) {
      data.settings = await exportTable('settings');
    }

    // Konwertuj do wybranego formatu
    switch (format) {
      case 'json':
        exportData = JSON.stringify(data, null, 2);
        filename += '.json';
        contentType = 'application/json';
        break;
        
      case 'csv':
        exportData = convertToCSV(data);
        filename += '.csv';
        contentType = 'text/csv';
        break;
        
      case 'xml':
        exportData = convertToXML(data);
        filename += '.xml';
        contentType = 'application/xml';
        break;
        
      case 'sql':
        exportData = await generateSQL(data, sqlStructure);
        filename += '.sql';
        contentType = 'application/sql';
        break;
    }

    // Kompresuj jeśli wymagane
    if (compression) {
      const compressed = await compressData(exportData);
      exportData = compressed;
      filename += '.gz';
      contentType = 'application/gzip';
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    if (compression) {
      res.setHeader('Content-Encoding', 'gzip');
    }
    
    res.send(exportData);
  } catch (error) {
    console.error('Błąd eksportu danych:', error);
    res.status(500).json({ error: 'Błąd serwera podczas eksportu danych' });
  }
});

// Pobierz listę harmonogramów backupów
app.get('/api/admin/backup/schedules', authenticateToken, requirePermission('manage_backups'), async (req, res) => {
  try {
    // W rzeczywistości pobierz z bazy danych
    const schedules = await getSchedulesFromDB();
    res.json(schedules);
  } catch (error) {
    console.error('Błąd pobierania harmonogramów:', error);
    res.status(500).json({ error: 'Błąd serwera podczas pobierania harmonogramów' });
  }
});

// Zapisz harmonogram backupu
app.post('/api/admin/backup/schedule', authenticateToken, requirePermission('manage_backups'), async (req, res) => {
  try {
    const scheduleData = req.body;
    const schedule = await saveScheduleToDB(scheduleData);
    
    res.json({ 
      message: 'Harmonogram zapisany pomyślnie', 
      schedule 
    });
  } catch (error) {
    console.error('Błąd zapisywania harmonogramu:', error);
    res.status(500).json({ error: 'Błąd serwera podczas zapisywania harmonogramu' });
  }
});

// Usuń harmonogram backupu
app.delete('/api/admin/backup/schedule/:id', authenticateToken, requirePermission('manage_backups'), async (req, res) => {
  try {
    const { id } = req.params;
    await deleteScheduleFromDB(id);
    
    res.json({ message: 'Harmonogram usunięty pomyślnie' });
  } catch (error) {
    console.error('Błąd usuwania harmonogramu:', error);
    res.status(500).json({ error: 'Błąd serwera podczas usuwania harmonogramu' });
  }
});

// =============================================================================
// FUNKCJE POMOCNICZE
// =============================================================================

// Eksportuj pojedynczą tabelę
async function exportTable(tableName) {
  return new Promise((resolve, reject) => {
    const query = `SELECT * FROM ${tableName}`;
    db.all(query, (err, rows) => {
      if (err) {
        reject(new Error(`Błąd eksportu tabeli ${tableName}: ${err.message}`));
      } else {
        resolve(rows);
      }
    });
  });
}

// Konwertuj dane do CSV
function convertToCSV(data) {
  let csv = '';
  
  for (const [tableName, rows] of Object.entries(data)) {
    csv += `# ${tableName}\n`;
    
    if (rows.length > 0) {
      // Nagłówki
      const headers = Object.keys(rows[0]);
      csv += headers.join(',') + '\n';
      
      // Dane
      rows.forEach(row => {
        const values = headers.map(header => {
          let value = row[header];
          if (typeof value === 'string' && value.includes(',')) {
            value = `"${value}"`;
          }
          return value;
        });
        csv += values.join(',') + '\n';
      });
    }
    
    csv += '\n';
  }
  
  return csv;
}

// Konwertuj dane do XML
function convertToXML(data) {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<forumExport>\n';
  
  for (const [tableName, rows] of Object.entries(data)) {
    xml += `  <${tableName}>\n`;
    
    rows.forEach(row => {
      xml += `    <record>\n`;
      for (const [key, value] of Object.entries(row)) {
        xml += `      <${key}>${escapeXML(value)}</${key}>\n`;
      }
      xml += `    </record>\n`;
    });
    
    xml += `  </${tableName}>\n`;
  }
  
  xml += '</forumExport>';
  return xml;
}

// Escape specjalnych znaków XML
function escapeXML(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Generuj SQL
async function generateSQL(data, structureType = 'both') {
  return new Promise((resolve, reject) => {
    let sql = '';
    
    // Dla SQLite nie mamy łatwego sposobu na pobranie struktury tabel,
    // więc zakładamy że struktura już istnieje i eksportujemy tylko dane
    if (structureType !== 'structure') {
      // Dane
      for (const [tableName, rows] of Object.entries(data)) {
        if (rows.length > 0) {
          const columns = Object.keys(rows[0]);
          sql += `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES\n`;
          
          const values = rows.map(row => {
            const rowValues = columns.map(col => {
              const value = row[col];
              if (value === null || value === undefined) return 'NULL';
              if (typeof value === 'number') return value;
              return `'${String(value).replace(/'/g, "''")}'`;
            });
            return `(${rowValues.join(', ')})`;
          });
          
          sql += values.join(',\n') + ';\n\n';
        }
      }
    }
    
    resolve(sql);
  });
}

// Kompresuj dane
function compressData(data) {
  return new Promise((resolve, reject) => {
    const zlib = require('zlib');
    
    zlib.gzip(data, (err, compressed) => {
      if (err) {
        reject(err);
      } else {
        resolve(compressed);
      }
    });
  });
}

// Pobierz harmonogramy z bazy danych
async function getSchedulesFromDB() {
  return new Promise((resolve, reject) => {
    const query = 'SELECT * FROM backup_schedules ORDER BY name';
    db.all(query, (err, schedules) => {
      if (err) {
        reject(err);
      } else {
        resolve(schedules || []);
      }
    });
  });
}

// Zapisz harmonogram do bazy danych
async function saveScheduleToDB(scheduleData) {
  return new Promise((resolve, reject) => {
    const { id, name, type, frequency, time, retention, enabled } = scheduleData;
    
    if (id) {
      // Aktualizuj istniejący harmonogram
      const query = `
        UPDATE backup_schedules 
        SET name = ?, type = ?, frequency = ?, time = ?, retention = ?, enabled = ?
        WHERE id = ?
      `;
      
      db.run(query, [name, type, frequency, time, retention, enabled, id], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id, name, type, frequency, time, retention, enabled });
        }
      });
    } else {
      // Utwórz nowy harmonogram
      const query = `
        INSERT INTO backup_schedules (name, type, frequency, time, retention, enabled)
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      
      db.run(query, [name, type, frequency, time, retention, enabled], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ 
            id: this.lastID, 
            name, type, frequency, time, retention, enabled 
          });
        }
      });
    }
  });
}

// Usuń harmonogram z bazy danych
async function deleteScheduleFromDB(id) {
  return new Promise((resolve, reject) => {
    const query = 'DELETE FROM backup_schedules WHERE id = ?';
    db.run(query, [id], function(err) {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

// =============================================================================
// INICJALIZACJA TABEL DLA SYSTEMU BACKUPU
// =============================================================================

// Utwórz tabele jeśli nie istnieją
const initBackupTables = () => {
  const createSchedulesTable = `
    CREATE TABLE IF NOT EXISTS backup_schedules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'full',
      frequency TEXT NOT NULL DEFAULT 'daily',
      time TEXT NOT NULL DEFAULT '02:00',
      retention INTEGER NOT NULL DEFAULT 7,
      enabled BOOLEAN NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `;
  
  db.run(createSchedulesTable, (err) => {
    if (err) {
      console.error('Błąd tworzenia tabeli backup_schedules:', err);
    } else {
      console.log('Tabela backup_schedules gotowa');
    }
  });
};

// Wywołaj inicjalizację przy starcie serwera
initBackupTables();

};
