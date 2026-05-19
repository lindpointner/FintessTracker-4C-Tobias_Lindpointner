const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { SECRET } = require('../middleware/auth');

const router = express.Router();

router.post('/register', async (req, res) => {
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

router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) return res.status(401).json({ message: 'E-Mail oder Passwort falsch' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ message: 'E-Mail oder Passwort falsch' });

    const token = jwt.sign({ id: user.id, name: user.name, email: user.email }, SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
});

module.exports = router;
