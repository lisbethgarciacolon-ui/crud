const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');

const app = express();
const db = new sqlite3.Database('./tareas.db');

// Crear tablas
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        usuario TEXT UNIQUE,
        password TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS tareas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        titulo TEXT,
        estado TEXT DEFAULT 'pendiente',
        usuario_id INTEGER,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    )`);
    
    console.log('✅ Base de datos creada');
});

app.use(cors());
app.use(express.json());

// ========== REGISTRO ==========
app.post('/auth/register', async (req, res) => {
    try {
        const { usuario, password } = req.body;
        
        if (!usuario || !password) {
            return res.status(400).json({ error: 'Faltan datos' });
        }

        // Cifrar contraseña
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);

        db.run(
            'INSERT INTO usuarios (usuario, password) VALUES (?, ?)',
            [usuario, hash],
            function(err) {
                if (err) {
                    return res.status(400).json({ error: 'El usuario ya existe' });
                }
                res.json({ mensaje: 'Usuario creado correctamente' });
            }
        );
    } catch (error) {
        res.status(500).json({ error: 'Error del servidor' });
    }
});

// ========== LOGIN ==========
app.post('/auth/login', (req, res) => {
    const { usuario, password } = req.body;

    db.get(
        'SELECT * FROM usuarios WHERE usuario = ?',
        [usuario],
        async (err, user) => {
            if (err || !user) {
                return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
            }

            const valid = await bcrypt.compare(password, user.password);
            
            if (!valid) {
                return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
            }

            const { password: _, ...userSinPassword } = user;
            res.json({ 
                mensaje: 'Login correcto', 
                user: userSinPassword 
            });
        }
    );
});

// ========== OBTENER TAREAS ==========
app.get('/tareas/:usuario', (req, res) => {
    db.get(
        'SELECT id FROM usuarios WHERE usuario = ?',
        [req.params.usuario],
        (err, user) => {
            if (err || !user) {
                return res.status(401).json({ error: 'Usuario no autorizado' });
            }

            db.all(
                'SELECT * FROM tareas WHERE usuario_id = ? ORDER BY id DESC',
                [user.id],
                (err, tareas) => {
                    if (err) {
                        return res.status(500).json({ error: 'Error al cargar tareas' });
                    }
                    res.json(tareas);
                }
            );
        }
    );
});

// ========== CREAR TAREA ==========
app.post('/tareas', (req, res) => {
    const { titulo, usuario } = req.body;

    db.get(
        'SELECT id FROM usuarios WHERE usuario = ?',
        [usuario],
        (err, user) => {
            if (err || !user) {
                return res.status(401).json({ error: 'Usuario no autorizado' });
            }

            db.run(
                'INSERT INTO tareas (titulo, usuario_id) VALUES (?, ?)',
                [titulo, user.id],
                function(err) {
                    if (err) {
                        return res.status(500).json({ error: 'Error al crear tarea' });
                    }
                    res.json({ 
                        mensaje: 'Tarea creada',
                        id: this.lastID 
                    });
                }
            );
        }
    );
});

// ========== ACTUALIZAR TAREA ==========
app.put('/tareas/:id', (req, res) => {
    const { titulo, estado } = req.body;
    
    db.run(
        'UPDATE tareas SET titulo = ?, estado = ? WHERE id = ?',
        [titulo, estado, req.params.id],
        function(err) {
            if (err) {
                return res.status(500).json({ error: 'Error al actualizar' });
            }
            res.json({ mensaje: 'Tarea actualizada' });
        }
    );
});

// ========== ELIMINAR TAREA ==========
app.delete('/tareas/:id', (req, res) => {
    db.run(
        'DELETE FROM tareas WHERE id = ?',
        [req.params.id],
        function(err) {
            if (err) {
                return res.status(500).json({ error: 'Error al eliminar' });
            }
            res.json({ mensaje: 'Tarea eliminada' });
        }
    );
});

// ========== RUTA DE PRUEBA ==========
app.get('/', (req, res) => {
    res.json({ mensaje: 'API funcionando correctamente' });
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`✅ Servidor en http://localhost:${PORT}`);
});