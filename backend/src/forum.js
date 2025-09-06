module.exports = function(app, authenticateToken, requirePermission, checkOwnership, JWT_SECRET, db) {

// Pobierz kategorię po nazwie (slug)
app.get('/api/category/:slug', (req, res) => {
  const slug = req.params.slug;
  
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
    WHERE c.slug = ?
    GROUP BY c.id
  `;
  
  db.get(query, [slug], (err, category) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: err.message });
    }
    
    if (!category) {
      return res.status(404).json({ error: 'Kategoria nie istnieje' });
    }

    // Formatuj dane
    const formattedCategory = {
      ...category,
      threads: parseInt(category.threads_count) || 0,
      posts: parseInt(category.posts_count) || 0,
      last_post_author: category.last_author || 'Brak',
      last_post_time: category.last_date ? formatRelativeTime(category.last_date) : 'Brak'
    };
    
    res.json(formattedCategory);
  });
});

// Pobierz wątek po ID - z obsługą slug w URL
app.get('/api/thread/:id/:slug?', (req, res) => {
  const threadId = req.params.id;
  // Pomijamy slug w zapytaniu, używamy tylko ID
  // Pozostała część kodu bez zmian
  // ...
});

app.get('/api/category/id/:id', (req, res) => {
  const categoryId = req.params.id;
  db.get('SELECT * FROM categories WHERE id = ?', [categoryId], (err, category) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    res.json(category);
  });
});

// Modyfikacja endpointu tworzenia kategorii - dodajemy slug
app.post('/api/admin/categories', authenticateToken, requirePermission('manage_categories'), (req, res) => {
  const { name, icon, description, is_locked = false, required_role = 0, position } = req.body;

  // Generuj slug z nazwy
  const slug = generateSlug(name);

  // Konwertuj 0 na null dla bazy danych
  const dbRequiredRole = required_role === 0 ? null : required_role;

  // Znajdź najwyższą pozycję
  db.get('SELECT MAX(position) as max_position FROM categories', (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    const newPosition = position !== undefined ? position : (row.max_position || 0) + 1;
    
    db.run(
      'INSERT INTO categories (name, slug, icon, description, is_locked, required_role, position) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, slug, icon, description, is_locked, dbRequiredRole, newPosition],
      function(err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        
        res.status(201).json({ 
          message: 'Kategoria została utworzona',
          id: this.lastID,
          slug: slug
        });
      }
    );
  });
});

// Funkcja pomocnicza do generowania slug
function generateSlug(text) {
  return text
    .toString()
    .toLowerCase()
    .replace(/\s+/g, '-')           // Zamień spacje na myślniki
    .replace(/[^\w\-]+/g, '')       // Usuń wszystkie znaki niebędące słowami
    .replace(/\-\-+/g, '-')         // Zamień podwójne myślniki na pojedyncze
    .replace(/^-+/, '')             // Usuń myślniki z początku
    .replace(/-+$/, '');            // Usuń myślniki z końca
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

}
