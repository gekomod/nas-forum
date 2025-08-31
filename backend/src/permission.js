module.exports = function(app, authenticateToken, requirePermission, checkOwnership, JWT_SECRET, db) {

    // Role - GET /api/admin/roles - Lista ról
    app.get('/api/admin/roles', authenticateToken, requirePermission('view_roles'), (req, res) => {
        db.all('SELECT * FROM roles ORDER BY name', (err, roles) => {
            if (err) {
                console.error('Błąd przy pobieraniu ról:', err);
                return res.status(500).json({ error: err.message });
            }
            res.json(roles);
        });
    });

    // Role - POST /api/admin/roles - Tworzenie roli
    app.post('/api/admin/roles', authenticateToken, requirePermission('create_role'), (req, res) => {
        const { name, description } = req.body;
        
        if (!name) {
            return res.status(400).json({ error: 'Nazwa roli jest wymagana' });
        }
        
        db.run('INSERT INTO roles (name, description) VALUES (?, ?)', [name, description || ''], function(err) {
            if (err) {
                console.error('Błąd przy tworzeniu roli:', err);
                return res.status(500).json({ error: 'Wewnętrzny błąd serwera' });
            }
            
            db.get('SELECT * FROM roles WHERE id = ?', [this.lastID], (err, newRole) => {
                if (err) {
                    console.error('Błąd przy pobieraniu nowej roli:', err);
                    return res.status(500).json({ error: 'Wewnętrzny błąd serwera' });
                }
                res.status(201).json(newRole);
            });
        });
    });

    // Role - PUT /api/admin/roles/{id} - Edycja roli
    app.put('/api/admin/roles/:id', authenticateToken, requirePermission('edit_role'), (req, res) => {
        const { id } = req.params;
        const { name, description } = req.body;
        
        if (!name) {
            return res.status(400).json({ error: 'Nazwa roli jest wymagana' });
        }
        
        db.run('UPDATE roles SET name = ?, description = ? WHERE id = ?', [name, description || '', id], function(err) {
            if (err) {
                console.error('Błąd przy aktualizacji roli:', err);
                return res.status(500).json({ error: 'Wewnętrzny błąd serwera' });
            }
            
            db.get('SELECT * FROM roles WHERE id = ?', [id], (err, updatedRole) => {
                if (err) {
                    console.error('Błąd przy pobieraniu zaktualizowanej roli:', err);
                    return res.status(500).json({ error: 'Wewnętrzny błąd serwera' });
                }
                res.json(updatedRole);
            });
        });
    });

    // Role - DELETE /api/admin/roles/{id} - Usuwanie roli
    app.delete('/api/admin/roles/:id', authenticateToken, requirePermission('delete_role'), (req, res) => {
        const { id } = req.params;
        
        // Sprawdź, czy rola jest używana przez jakichkolwiek użytkowników
        db.get('SELECT COUNT(*) as count FROM user_roles WHERE role_id = ?', [id], (err, usersWithRole) => {
            if (err) {
                console.error('Błąd przy sprawdzaniu użytkowników roli:', err);
                return res.status(500).json({ error: 'Wewnętrzny błąd serwera' });
            }
            
            if (usersWithRole.count > 0) {
                return res.status(400).json({ 
                    error: 'Nie można usunąć roli, ponieważ jest przypisana do użytkowników' 
                });
            }
            
            db.run('DELETE FROM roles WHERE id = ?', [id], function(err) {
                if (err) {
                    console.error('Błąd przy usuwaniu roli:', err);
                    return res.status(500).json({ error: 'Wewnętrzny błąd serwera' });
                }
                res.status(204).send();
            });
        });
    });

    // Role - GET /api/admin/roles/{id}/users - Użytkownicy roli
    app.get('/api/admin/roles/:id/users', authenticateToken, requirePermission('view_role_users'), (req, res) => {
        const { id } = req.params;
        
        db.all(`
            SELECT u.id, u.username, u.email, u.created_at, u.avatar 
            FROM users u 
            INNER JOIN user_roles ur ON u.id = ur.user_id 
            WHERE ur.role_id = ?
        `, [id], (err, users) => {
            if (err) {
                console.error('Błąd przy pobieraniu użytkowników roli:', err);
                return res.status(500).json({ error: 'Wewnętrzny błąd serwera' });
            }
            res.json(users);
        });
    });

    // Role - POST /api/admin/roles/{id}/users - Dodawanie użytkownika
    app.post('/api/admin/roles/:id/users', authenticateToken, requirePermission('add_user_to_role'), (req, res) => {
        const { id } = req.params;
        const { user_id } = req.body;
        
        if (!user_id) {
            return res.status(400).json({ error: 'ID użytkownika jest wymagane' });
        }
        
        // Sprawdź, czy użytkownik już ma tę rolę
        db.get('SELECT * FROM user_roles WHERE user_id = ? AND role_id = ?', [user_id, id], (err, existing) => {
            if (err) {
                console.error('Błąd przy sprawdzaniu roli użytkownika:', err);
                return res.status(500).json({ error: 'Wewnętrzny błąd serwera' });
            }
            
            if (existing) {
                return res.status(400).json({ error: 'Użytkownik już ma tę rolę' });
            }
            
            db.run('INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)', [user_id, id], function(err) {
                if (err) {
                    console.error('Błąd przy dodawaniu użytkownika do roli:', err);
                    return res.status(500).json({ error: 'Wewnętrzny błąd serwera' });
                }
                res.status(201).json({ message: 'Użytkownik dodany do roli' });
            });
        });
    });

    // Role - DELETE /api/admin/roles/{id}/users/{userId} - Usuwanie użytkownika
    app.delete('/api/admin/roles/:id/users/:userId', authenticateToken, requirePermission('remove_user_from_role'), (req, res) => {
        const { id, userId } = req.params;
        
        db.run('DELETE FROM user_roles WHERE user_id = ? AND role_id = ?', [userId, id], function(err) {
            if (err) {
                console.error('Błąd przy usuwaniu użytkownika z roli:', err);
                return res.status(500).json({ error: 'Wewnętrzny błąd serwera' });
            }
            res.status(204).send();
        });
    });
    
app.get('/api/admin/roles/:id/users-count', authenticateToken, requirePermission('view_role_users'), (req, res) => {
    const { id } = req.params;
    
    db.get(`
        SELECT 
    (SELECT COUNT(*) FROM permission_roles WHERE role_id = ${id}) as count_permission,
    (SELECT COUNT(*) FROM user_roles WHERE role_id = ${id}) as count_users;`, (err, result) => {
        if (err) {
            console.error('Błąd przy pobieraniu liczby użytkowników roli:', err);
            return res.status(500).json({ error: 'Wewnętrzny błąd serwera' });
        }
        res.json({ count: result.count_users, permission_count: result.count_permission });
    });
});

    // Uprawnienia - GET /api/admin/permissions - Lista uprawnień
    app.get('/api/admin/permissions', authenticateToken, requirePermission('view_permissions'), (req, res) => {
        db.all(`
            SELECT p.*, GROUP_CONCAT(r.name) as role_names 
            FROM permissions p 
            LEFT JOIN permission_roles pr ON p.id = pr.permission_id 
            LEFT JOIN roles r ON pr.role_id = r.id 
            GROUP BY p.id 
            ORDER BY p.name
        `, (err, permissions) => {
            if (err) {
                console.error('Błąd przy pobieraniu uprawnień:', err);
                return res.status(500).json({ error: err.message });
            }
            
            // Przekształć role_names z ciągu znaków na tablicę
            if (Array.isArray(permissions)) {
                permissions.forEach(p => {
                    p.roles = p.role_names ? p.role_names.split(',') : [];
                    delete p.role_names;
                });
            }
            
            res.json(permissions || []);
        });
    });

// Uprawnienia - PUT /api/admin/permissions/{id}/roles - Aktualizacja ról uprawnienia
app.put('/api/admin/permissions/:id/roles', authenticateToken, requirePermission('edit_permission_roles'), (req, res) => {
    const { id } = req.params;
    
    // Akceptuj zarówno roleIds jak i assigned_roles (dla kompatybilności)
    let roleIds = req.body.roleIds || req.body.assigned_roles || [];
    
    console.log('Aktualizacja uprawnienia:', id, 'Role IDs:', roleIds);
    
    // Rozpocznij transakcję
    db.run('BEGIN TRANSACTION', (err) => {
        if (err) {
            console.error('Błąd przy rozpoczynaniu transakcji:', err);
            return res.status(500).json({ error: 'Wewnętrzny błąd serwera' });
        }
        
        // Usuń wszystkie istniejące powiązania dla tego uprawnienia
        db.run('DELETE FROM permission_roles WHERE permission_id = ?', [id], function(err) {
            if (err) {
                return db.run('ROLLBACK', () => {
                    console.error('Błąd przy usuwaniu powiązań:', err);
                    res.status(500).json({ error: 'Wewnętrzny błąd serwera' });
                });
            }
            
            console.log('Usunięto stare powiązania dla uprawnienia:', id);
            
            // Dodaj nowe powiązania jeśli są
            if (roleIds && roleIds.length > 0) {
                const placeholders = roleIds.map(() => '(?, ?)').join(',');
                const values = roleIds.flatMap(roleId => [id, roleId]);
                
                console.log('Dodawanie nowych powiązań:', values);
                
                db.run(`INSERT INTO permission_roles (permission_id, role_id) VALUES ${placeholders}`, values, function(err) {
                    if (err) {
                        return db.run('ROLLBACK', () => {
                            console.error('Błąd przy dodawaniu powiązań:', err);
                            res.status(500).json({ error: 'Wewnętrzny błąd serwera' });
                        });
                    }
                    
                    console.log('Dodano nowe powiązania. affected rows:', this.changes);
                    
                    db.run('COMMIT', (err) => {
                        if (err) {
                            console.error('Błąd przy commitowaniu transakcji:', err);
                            return res.status(500).json({ error: 'Wewnętrzny błąd serwera' });
                        }
                        console.log('Transakcja zakończona sukcesem');
                        res.json({ message: 'Role uprawnienia zaktualizowane', success: true });
                    });
                });
            } else {
                console.log('Brak ról do przypisania - czyszczenie uprawnienia');
                db.run('COMMIT', (err) => {
                    if (err) {
                        console.error('Błąd przy commitowaniu transakcji:', err);
                        return res.status(500).json({ error: 'Wewnętrzny błąd serwera' });
                    }
                    res.json({ message: 'Role uprawnienia zaktualizowane', success: true });
                });
            }
        });
    });
});

    // Kategorie - GET /api/admin/categories_role/permissions - Uprawnienia kategorii
    app.get('/api/admin/categories_role/permissions', authenticateToken, requirePermission('view_category_permissions'), (req, res) => {
        console.log('Pobieranie kategorii z uprawnieniami...');
        
        db.all('SELECT * FROM categories ORDER BY name', (err, categories) => {
            if (err) {
                console.error('Błąd przy pobieraniu kategorii:', err);
                return res.status(500).json({ error: err.message });
            }
            
            if (!categories || categories.length === 0) {
                console.log('Brak kategorii w bazie danych');
                return res.json([]);
            }
            
            console.log('Liczba kategorii:', categories.length);
            
            const results = [];
            let processed = 0;
            
            categories.forEach(category => {
                db.all(`
                    SELECT p.* 
                    FROM permissions p
                    JOIN category_permissions cp ON p.id = cp.permission_id
                    WHERE cp.category_id = ?
                `, [category.id], (err, permissions) => {
                    if (err) {
                        console.error(`Błąd przy pobieraniu uprawnień dla kategorii ${category.id}:`, err);
                        permissions = [];
                    }
                    
                    results.push({
                        id: category.id,
                        name: category.name,
                        description: category.description,
                        icon: category.icon,
                        permissions: permissions || []
                    });
                    
                    processed++;
                    
                    if (processed === categories.length) {
                        console.log('Przetworzono wszystkie kategorie:', results.length);
                        res.json(results);
                    }
                });
            });
        });
    });

    // Kategorie - PUT /api/admin/categories/{id}/permissions - Aktualizacja uprawnień
    app.put('/api/admin/categories/:id/permissions', authenticateToken, requirePermission('edit_category_permissions'), (req, res) => {
        const { id } = req.params;
        const { permissionIds } = req.body;
        
        // Rozpocznij transakcję
        db.run('BEGIN TRANSACTION', (err) => {
            if (err) {
                console.error('Błąd przy rozpoczynaniu transakcji:', err);
                return res.status(500).json({ error: 'Wewnętrzny błąd serwera' });
            }
            
            // Usuń wszystkie istniejące powiązania dla tej kategorii
            db.run('DELETE FROM category_permissions WHERE category_id = ?', [id], function(err) {
                if (err) {
                    return db.run('ROLLBACK', () => {
                        console.error('Błąd przy usuwaniu powiązań:', err);
                        res.status(500).json({ error: 'Wewnętrzny błąd serwera' });
                    });
                }
                
                // Dodaj nowe powiązania jeśli są
                if (permissionIds && permissionIds.length > 0) {
                    const placeholders = permissionIds.map(() => '(?, ?)').join(',');
                    const values = permissionIds.flatMap(permId => [id, permId]);
                    
                    db.run(`INSERT INTO category_permissions (category_id, permission_id) VALUES ${placeholders}`, values, function(err) {
                        if (err) {
                            return db.run('ROLLBACK', () => {
                                console.error('Błąd przy dodawaniu powiązań:', err);
                                res.status(500).json({ error: 'Wewnętrzny błąd serwera' });
                            });
                        }
                        
                        db.run('COMMIT', (err) => {
                            if (err) {
                                console.error('Błąd przy commitowaniu transakcji:', err);
                                return res.status(500).json({ error: 'Wewnętrzny błąd serwera' });
                            }
                            res.json({ message: 'Uprawnienia kategorii zaktualizowane' });
                        });
                    });
                } else {
                    db.run('COMMIT', (err) => {
                        if (err) {
                            console.error('Błąd przy commitowaniu transakcji:', err);
                            return res.status(500).json({ error: 'Wewnętrzny błąd serwera' });
                        }
                        res.json({ message: 'Uprawnienia kategorii zaktualizowane' });
                    });
                }
            });
        });
    });

    // Logi audytu - GET /api/admin/audit/logs - Logi zmian uprawnień
    app.get('/api/admin/audit/logs', authenticateToken, requirePermission('view_audit_logs'), (req, res) => {
        const { page = 1, limit = 50, action, userId } = req.query;
        const offset = (page - 1) * limit;
        
        let query = `
            SELECT al.*, u.username as user_name 
            FROM audit_logs al 
            LEFT JOIN users u ON al.user_id = u.id 
            WHERE 1=1
        `;
        let params = [];
        
        if (action) {
            query += ' AND al.action = ?';
            params.push(action);
        }
        
        if (userId) {
            query += ' AND al.user_id = ?';
            params.push(userId);
        }
        
        query += ' ORDER BY al.timestamp DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);
        
        db.all(query, params, (err, logs) => {
            if (err) {
                console.error('Błąd przy pobieraniu logów audytu:', err);
                return res.status(500).json({ error: 'Wewnętrzny błąd serwera' });
            }
            
            // Pobierz całkowitą liczbę rekordów dla paginacji
            let countQuery = 'SELECT COUNT(*) as total FROM audit_logs WHERE 1=1';
            let countParams = [];
            
            if (action) {
                countQuery += ' AND action = ?';
                countParams.push(action);
            }
            
            if (userId) {
                countQuery += ' AND user_id = ?';
                countParams.push(userId);
            }
            
            db.get(countQuery, countParams, (err, countResult) => {
                if (err) {
                    console.error('Błąd przy pobieraniu liczby logów:', err);
                    return res.status(500).json({ error: 'Wewnętrzny błąd serwera' });
                }
                
                const total = countResult ? countResult.total : 0;
                
                res.json({
                    logs: logs || [],
                    pagination: {
                        page: parseInt(page),
                        limit: parseInt(limit),
                        total,
                        pages: Math.ceil(total / limit)
                    }
                });
            });
        });
    });

    // Statystyki - GET /api/admin/permissions/stats - Statystyki systemu
    app.get('/api/admin/permissions/stats', authenticateToken, requirePermission('view_stats'), (req, res) => {
        let results = {};
        let completed = 0;
        const totalQueries = 5;
        
        const checkCompletion = () => {
            completed++;
            if (completed === totalQueries) {
                res.json({
                    users: results.userCount || 0,
                    roles: results.roleCount || 0,
                    permissions: results.permissionCount || 0,
                    categories: results.categoryCount || 0,
                    recentActivity: results.recentLogs || []
                });
            }
        };
        
        // Liczba użytkowników
        db.get('SELECT COUNT(*) as count FROM users', (err, userCount) => {
            if (err) console.error('Błąd przy pobieraniu liczby użytkowników:', err);
            results.userCount = userCount ? userCount.count : 0;
            checkCompletion();
        });
        
        // Liczba ról
        db.get('SELECT COUNT(*) as count FROM roles', (err, roleCount) => {
            if (err) console.error('Błąd przy pobieraniu liczby ról:', err);
            results.roleCount = roleCount ? roleCount.count : 0;
            checkCompletion();
        });
        
        // Liczba uprawnień
        db.get('SELECT COUNT(*) as count FROM permissions', (err, permissionCount) => {
            if (err) console.error('Błąd przy pobieraniu liczby uprawnień:', err);
            results.permissionCount = permissionCount ? permissionCount.count : 0;
            checkCompletion();
        });
        
        // Liczba kategorii
        db.get('SELECT COUNT(*) as count FROM categories', (err, categoryCount) => {
            if (err) console.error('Błąd przy pobieraniu liczby kategorii:', err);
            results.categoryCount = categoryCount ? categoryCount.count : 0;
            checkCompletion();
        });
        
        // Ostatnie logi
        db.all(`
            SELECT action, COUNT(*) as count 
            FROM audit_logs 
            WHERE timestamp >= datetime('now', '-7 days')
            GROUP BY action
        `, (err, recentLogs) => {
            if (err) console.error('Błąd przy pobieraniu ostatnich logów:', err);
            results.recentLogs = recentLogs || [];
            checkCompletion();
        });
    });

    // Wyszukiwanie użytkowników - GET /api/admin/users/search - Wyszukiwanie użytkowników
    app.get('/api/admin/users/search', authenticateToken, requirePermission('search_users'), (req, res) => {
        const { q, page = 1, limit = 20 } = req.query;
        
        if (!q || q.length < 2) {
            return res.status(400).json({ error: 'Query must be at least 2 characters long' });
        }
        
        const offset = (page - 1) * limit;
        const searchTerm = `%${q}%`;
        
        db.all(`
            SELECT u.id, u.username, u.email, u.created_at,
                   GROUP_CONCAT(r.name) as role_names
            FROM users u
            LEFT JOIN user_roles ur ON u.id = ur.user_id
            LEFT JOIN roles r ON ur.role_id = r.id
            WHERE u.username LIKE ? OR u.email LIKE ?
            GROUP BY u.id
            ORDER BY u.username
            LIMIT ? OFFSET ?
        `, [searchTerm, searchTerm, limit, offset], (err, users) => {
            if (err) {
                console.error('Błąd przy wyszukiwaniu użytkowników:', err);
                return res.status(500).json({ error: 'Wewnętrzny błąd serwera' });
            }
            
            // Przekształć role_names z ciągu znaków na tablicę
            if (Array.isArray(users)) {
                users.forEach(u => {
                    u.roles = u.role_names ? u.role_names.split(',') : [];
                    delete u.role_names;
                });
            }
            
            // Pobierz całkowitą liczbę rekordów dla paginacji
            db.get(`
                SELECT COUNT(DISTINCT u.id) as total 
                FROM users u
                WHERE u.username LIKE ? OR u.email LIKE ?
            `, [searchTerm, searchTerm], (err, countResult) => {
                if (err) {
                    console.error('Błąd przy pobieraniu liczby użytkowników:', err);
                    return res.status(500).json({ error: 'Wewnętrzny błąd serwera' });
                }
                
                const total = countResult ? countResult.total : 0;
                
                res.json({
                    users: users || [],
                    pagination: {
                        page: parseInt(page),
                        limit: parseInt(limit),
                        total,
                        pages: Math.ceil(total / limit)
                    }
                });
            });
        });
    });

};
