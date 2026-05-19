const express = require('express');
const db = require('../db');

const router = express.Router();

router.get('/', (req, res) => {
    const workouts = db.prepare('SELECT * FROM workouts WHERE user_id = ? ORDER BY date DESC').all(req.user.id);
    res.json(workouts);
});

router.post('/', (req, res) => {
    const { title, duration, calories } = req.body;

    if (!title || !duration)
        return res.status(400).json({ message: 'Titel und Dauer sind Pflicht' });

    const result = db.prepare('INSERT INTO workouts (user_id, title, duration, calories) VALUES (?, ?, ?, ?)').run(req.user.id, title, duration, calories || 0);
    const workout = db.prepare('SELECT * FROM workouts WHERE id = ?').get(result.lastInsertRowid);

    res.status(201).json(workout);
});

router.delete('/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const workout = db.prepare('SELECT id FROM workouts WHERE id = ? AND user_id = ?').get(id, req.user.id);

    if (!workout) return res.status(404).json({ message: 'Workout nicht gefunden' });

    db.prepare('DELETE FROM workouts WHERE id = ?').run(id);
    res.json({ message: 'Workout gelöscht' });
});

module.exports = router;
