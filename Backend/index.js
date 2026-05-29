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

// ── Auth ──────────────────────────────────────────────────────────────────────

app.post('/api/auth/register', async (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
        return res.status(400).json({ message: 'Alle Felder ausfüllen' });

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing)
        return res.status(409).json({ message: 'E-Mail bereits registriert' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = db.prepare('INSERT INTO users (name, email, password) VALUES (?, ?, ?)').run(name, email, hashedPassword);
    const userId = result.lastInsertRowid;

    const token = jwt.sign({ id: userId, name, email }, SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user: { id: userId, name, email } });
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

// ── Profile ───────────────────────────────────────────────────────────────────

app.get('/api/profile', verifyToken, (req, res) => {
    const userData = db.prepare('SELECT id, name, email, created_at FROM users WHERE id = ?').get(req.user.id);
    if (!userData) return res.status(404).json({ message: 'Benutzer nicht gefunden' });

    const measurement = db.prepare(
        'SELECT weight_kg, height_cm, bmi, date FROM body_measurements WHERE user_id = ? ORDER BY date DESC, id DESC LIMIT 1'
    ).get(req.user.id);

    res.json({ ...userData, measurement: measurement || null });
});

app.put('/api/profile', verifyToken, async (req, res) => {
    const { name, email } = req.body;
    if (!name || !email)
        return res.status(400).json({ message: 'Name und E-Mail sind Pflicht' });

    const conflict = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(email, req.user.id);
    if (conflict)
        return res.status(409).json({ message: 'E-Mail bereits vergeben' });

    db.prepare('UPDATE users SET name = ?, email = ? WHERE id = ?').run(name, email, req.user.id);

    const newToken = jwt.sign({ id: req.user.id, name, email }, SECRET, { expiresIn: '7d' });
    res.json({ token: newToken, user: { id: req.user.id, name, email } });
});

app.put('/api/profile/password', verifyToken, async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword)
        return res.status(400).json({ message: 'Alle Felder ausfüllen' });

    const userData = db.prepare('SELECT password FROM users WHERE id = ?').get(req.user.id);
    const valid = await bcrypt.compare(currentPassword, userData.password);
    if (!valid)
        return res.status(401).json({ message: 'Aktuelles Passwort falsch' });

    const hashed = await bcrypt.hash(newPassword, 10);
    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashed, req.user.id);
    res.json({ message: 'Passwort geändert' });
});

app.post('/api/profile/measurements', verifyToken, (req, res) => {
    const { weight_kg, height_cm } = req.body;
    if (!weight_kg || !height_cm)
        return res.status(400).json({ message: 'Gewicht und Größe sind Pflicht' });

    const heightM = height_cm / 100;
    const bmi = Math.round((weight_kg / (heightM * heightM)) * 10) / 10;

    db.prepare(
        'INSERT INTO body_measurements (user_id, weight_kg, height_cm, bmi) VALUES (?, ?, ?, ?)'
    ).run(req.user.id, weight_kg, height_cm, bmi);

    res.status(201).json({ weight_kg, height_cm, bmi });
});

// ── Workouts ──────────────────────────────────────────────────────────────────

app.get('/api/workouts', verifyToken, (req, res) => {
    const workouts = db.prepare('SELECT * FROM workout_sessions WHERE user_id = ? ORDER BY date DESC').all(req.user.id);
    res.json(workouts);
});

app.post('/api/workouts', verifyToken, (req, res) => {
    const { title, duration_min, notes } = req.body;
    if (!title)
        return res.status(400).json({ message: 'Titel ist Pflicht' });

    const result = db.prepare(
        'INSERT INTO workout_sessions (user_id, title, duration_min, notes) VALUES (?, ?, ?, ?)'
    ).run(req.user.id, title, duration_min || 0, notes || null);
    const workout = db.prepare('SELECT * FROM workout_sessions WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(workout);
});

app.delete('/api/workouts/:id', verifyToken, (req, res) => {
    const id = parseInt(req.params.id);
    const workout = db.prepare('SELECT id FROM workout_sessions WHERE id = ? AND user_id = ?').get(id, req.user.id);
    if (!workout) return res.status(404).json({ message: 'Workout nicht gefunden' });

    db.prepare('DELETE FROM workout_sessions WHERE id = ?').run(id);
    res.json({ message: 'Workout gelöscht' });
});

app.listen(PORT, () => {
    console.log(`Server läuft auf http://localhost:${PORT}`);
});
