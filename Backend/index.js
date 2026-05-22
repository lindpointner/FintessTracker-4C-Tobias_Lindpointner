const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./db');

const app = express();
const PORT = 3000;
const SECRET = 'fitnesstracker_secret';

app.use(cors());
app.use(express.json());

function verifyToken(req, res, next) {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Kein Token' });
    jwt.verify(token, SECRET, (err, user) => {
        if (err) return res.status(403).json({ message: 'Token ungültig' });
        req.user = user;
        next();
    });
}

app.post('/api/auth/register', async (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
        return res.status(400).json({ message: 'Alle Felder ausfüllen' });

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing)
        return res.status(409).json({ message: 'E-Mail bereits registriert' });

    const hashedPassword = await bcrypt.hash(password, 10);
    db.prepare('INSERT INTO users (name, email, password) VALUES (?, ?, ?)').run(name, email, hashedPassword);
    res.status(201).json({ message: 'Registrierung erfolgreich' });
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) return res.status(401).json({ message: 'E-Mail oder Passwort falsch' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ message: 'E-Mail oder Passwort falsch' });

    const token = jwt.sign({ id: user.id, name: user.name, email: user.email }, SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
});

app.get('/api/workouts', verifyToken, (req, res) => {
    const workouts = db.prepare('SELECT * FROM workouts WHERE user_id = ? ORDER BY date DESC').all(req.user.id);
    res.json(workouts);
});

app.post('/api/workouts', verifyToken, (req, res) => {
    const { title, duration, calories } = req.body;
    if (!title || !duration)
        return res.status(400).json({ message: 'Titel und Dauer sind Pflicht' });

    const result = db.prepare('INSERT INTO workouts (user_id, title, duration, calories) VALUES (?, ?, ?, ?)').run(req.user.id, title, duration, calories || 0);
    const workout = db.prepare('SELECT * FROM workouts WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(workout);
});

app.delete('/api/workouts/:id', verifyToken, (req, res) => {
    const id = parseInt(req.params.id);
    const workout = db.prepare('SELECT id FROM workouts WHERE id = ? AND user_id = ?').get(id, req.user.id);
    if (!workout) return res.status(404).json({ message: 'Workout nicht gefunden' });

    db.prepare('DELETE FROM workouts WHERE id = ?').run(id);
    res.json({ message: 'Workout gelöscht' });
});

app.listen(PORT, () => {
    console.log(`Server läuft auf http://localhost:${PORT}`);
});
