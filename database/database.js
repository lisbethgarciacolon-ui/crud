const Database = require('better-sqlite3');

const db = new Database('./database.db');

db.prepare(`
CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario TEXT UNIQUE,
    password TEXT
)
`).run();

db.prepare(`
CREATE TABLE IF NOT EXISTS tareas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    titulo TEXT,
    estado TEXT,
    usuario_id INTEGER,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
)
`).run();

console.log("Base de datos lista 😎");

module.exports = db;