const express = require('express');
const cors = require('cors');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');

const app = express();
const SECRET = process.env.JWT_SECRET || 'mi_secreto_seguro_123';

app.use(cookieParser());

// Servir el front-end desde la carpeta public
app.get('/gestor.js', authenticateToken, (req, res) => {
    res.sendFile(path.join(__dirname, '../public/gestor.js'));
});
app.use(express.static(path.join(__dirname, '../public')));

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

function generarToken(user) {
    return jwt.sign({ id: user.id, usuario: user.usuario }, SECRET, { expiresIn: '2h' });
}

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = (authHeader && authHeader.split(' ')[1]) || req.cookies.token;

    if (!token) {
        return res.status(401).json({ error: 'No autorizado' });
    }

    jwt.verify(token, SECRET, (err, user) => {
        if (err) {
            return res.status(401).json({ error: 'Token inválido' });
        }
        req.user = user;
        next();
    });
}

// ========== REGISTRO ==========
app.post('/auth/register', async (req, res) => {
    try {
        const { usuario, password } = req.body;
        
        if (!usuario || !password) {
            return res.status(400).json({ error: 'Faltan datos' });
        }

        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);

        db.run(
            'INSERT INTO usuarios (usuario, password) VALUES (?, ?)',
            [usuario, hash],
            function(err) {
                if (err) {
                    return res.status(400).json({ error: 'El usuario ya existe' });
                }

                const token = generarToken({ id: this.lastID, usuario });
                res.cookie('token', token, {
                    httpOnly: true,
                    sameSite: 'lax',
                    maxAge: 2 * 60 * 60 * 1000
                });
                res.json({
                    mensaje: 'Usuario creado correctamente',
                    token
                });
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
            const token = generarToken(user);
            res.cookie('token', token, {
                httpOnly: true,
                sameSite: 'lax',
                maxAge: 2 * 60 * 60 * 1000
            });
            res.json({ 
                mensaje: 'Login correcto', 
                user: userSinPassword,
                token
            });
        }
    );
});

app.get('/auth/me', authenticateToken, (req, res) => {
    res.json({ usuario: req.user.usuario, id: req.user.id });
});

app.post('/auth/logout', authenticateToken, (req, res) => {
    res.clearCookie('token');
    res.json({ mensaje: 'Logout correcto' });
});

// ========== OBTENER TAREAS ==========
app.get('/tareas', authenticateToken, (req, res) => {
    db.all(
        'SELECT * FROM tareas WHERE usuario_id = ? ORDER BY id DESC',
        [req.user.id],
        (err, tareas) => {
            if (err) {
                return res.status(500).json({ error: 'Error al cargar tareas' });
            }
            res.json(tareas);
        }
    );
});

// ========== CREAR TAREA ==========
app.post('/tareas', authenticateToken, (req, res) => {
    const { titulo } = req.body;

    if (!titulo || !titulo.trim()) {
        return res.status(400).json({ error: 'Título obligatorio' });
    }

    db.run(
        'INSERT INTO tareas (titulo, usuario_id) VALUES (?, ?)',
        [titulo.trim(), req.user.id],
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
});

// ========== ACTUALIZAR TAREA ==========
app.put('/tareas/:id', authenticateToken, (req, res) => {
    const { titulo, estado } = req.body;
    const updates = [];
    const params = [];

    if (titulo != null) {
        updates.push('titulo = ?');
        params.push(titulo.trim());
    }

    if (estado != null) {
        updates.push('estado = ?');
        params.push(estado);
    }

    if (updates.length === 0) {
        return res.status(400).json({ error: 'No hay datos para actualizar' });
    }

    params.push(req.params.id, req.user.id);

    const query = `UPDATE tareas SET ${updates.join(', ')} WHERE id = ? AND usuario_id = ?`;
    db.run(query, params, function(err) {
        if (err) {
            return res.status(500).json({ error: 'Error al actualizar' });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Tarea no encontrada' });
        }
        res.json({ mensaje: 'Tarea actualizada' });
    });
});

// ========== ELIMINAR TAREA ==========
app.delete('/tareas/:id', authenticateToken, (req, res) => {
    db.run(
        'DELETE FROM tareas WHERE id = ? AND usuario_id = ?',
        [req.params.id, req.user.id],
        function(err) {
            if (err) {
                return res.status(500).json({ error: 'Error al eliminar' });
            }
            if (this.changes === 0) {
                return res.status(404).json({ error: 'Tarea no encontrada' });
            }
            res.json({ mensaje: 'Tarea eliminada' });
        }
    );
});

// ========== RUTA DE PRUEBA ==========
app.get('/api/health', (req, res) => {
    res.json({ mensaje: 'API funcionando correctamente' });
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`✅ Servidor en http://localhost:${PORT}`);
});