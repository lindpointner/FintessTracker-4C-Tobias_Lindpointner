const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = 3000;
const SECRET = 'fitnesstracker_secret';

app.use(cors());
app.use(express.json());

const UPLOAD_DIR = path.join(__dirname, 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
app.use('/uploads', express.static(UPLOAD_DIR));

const upload = multer({
    storage: multer.diskStorage({
        destination: UPLOAD_DIR,
        filename: (req, file, cb) =>
            cb(null, `${req.user.id}-${Date.now()}${path.extname(file.originalname) || '.jpg'}`)
    }),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => cb(null, file.mimetype.startsWith('image/'))
});

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


app.get('/api/profile', verifyToken, (req, res) => {
    const userData = db.prepare('SELECT id, name, email, created_at FROM users WHERE id = ?').get(req.user.id);
    if (!userData) return res.status(404).json({ message: 'Benutzer nicht gefunden' });

    const measurement = db.prepare(
        'SELECT weight_kg, height_cm, bmi, body_fat_percent, date FROM body_measurements WHERE user_id = ? ORDER BY date DESC, id DESC LIMIT 1'
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
    const { weight_kg, height_cm, body_fat_percent } = req.body;
    if (!weight_kg || !height_cm)
        return res.status(400).json({ message: 'Gewicht und Größe sind Pflicht' });

    const heightM = height_cm / 100;
    const bmi = Math.round((weight_kg / (heightM * heightM)) * 10) / 10;

    let bodyFat = parseFloat(body_fat_percent);
    bodyFat = Number.isFinite(bodyFat) && bodyFat >= 2 && bodyFat <= 70
        ? Math.round(bodyFat * 10) / 10
        : null;

    db.prepare(
        'INSERT INTO body_measurements (user_id, weight_kg, height_cm, bmi, body_fat_percent) VALUES (?, ?, ?, ?, ?)'
    ).run(req.user.id, weight_kg, height_cm, bmi, bodyFat);

    res.status(201).json({ weight_kg, height_cm, bmi, body_fat_percent: bodyFat });
});


app.get('/api/nutrition', verifyToken, (req, res) => {
    const date = req.query.date || new Date().toISOString().split('T')[0];
    const entries = db.prepare(`
        SELECT ml.id, fi.name, fi.calories_per_100g, ml.amount_g, ml.meal_type, ml.date,
               ROUND(fi.calories_per_100g * ml.amount_g / 100) AS total_kcal
        FROM meal_logs ml
        JOIN food_items fi ON ml.food_item_id = fi.id
        WHERE ml.user_id = ? AND ml.date = ?
        ORDER BY ml.id ASC
    `).all(req.user.id, date);
    res.json(entries);
});

app.post('/api/nutrition', verifyToken, (req, res) => {
    const { food_name, calories_per_100g, amount_g, meal_type, protein_per_100g, carbs_per_100g, fat_per_100g } = req.body;
    if (!food_name || calories_per_100g == null || !amount_g)
        return res.status(400).json({ message: 'Fehlende Felder' });

    let foodItem = db.prepare('SELECT id FROM food_items WHERE name = ?').get(food_name);
    if (!foodItem) {
        const r = db.prepare(
            'INSERT INTO food_items (name, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g) VALUES (?, ?, ?, ?, ?)'
        ).run(food_name, calories_per_100g, Number(protein_per_100g) || 0, Number(carbs_per_100g) || 0, Number(fat_per_100g) || 0);
        foodItem = { id: r.lastInsertRowid };
    }

    const result = db.prepare(
        'INSERT INTO meal_logs (user_id, food_item_id, meal_type, amount_g) VALUES (?, ?, ?, ?)'
    ).run(req.user.id, foodItem.id, meal_type || 'snack', amount_g);

    const entry = db.prepare(`
        SELECT ml.id, fi.name, fi.calories_per_100g, ml.amount_g, ml.meal_type, ml.date,
               ROUND(fi.calories_per_100g * ml.amount_g / 100) AS total_kcal
        FROM meal_logs ml
        JOIN food_items fi ON ml.food_item_id = fi.id
        WHERE ml.id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json(entry);
});

app.delete('/api/nutrition/:id', verifyToken, (req, res) => {
    const id = parseInt(req.params.id);
    const entry = db.prepare('SELECT id FROM meal_logs WHERE id = ? AND user_id = ?').get(id, req.user.id);
    if (!entry) return res.status(404).json({ message: 'Eintrag nicht gefunden' });
    db.prepare('DELETE FROM meal_logs WHERE id = ?').run(id);
    res.json({ message: 'Gelöscht' });
});


app.get('/api/water', verifyToken, (req, res) => {
    const date = req.query.date || new Date().toISOString().split('T')[0];
    const row = db.prepare(
        'SELECT COALESCE(SUM(amount_ml), 0) AS total_ml FROM water_logs WHERE user_id = ? AND date = ?'
    ).get(req.user.id, date);
    res.json({ total_ml: row.total_ml });
});

app.put('/api/water', verifyToken, (req, res) => {
    const date = req.body.date || new Date().toISOString().split('T')[0];
    const totalMl = Math.round(Number(req.body.total_ml));
    if (!Number.isFinite(totalMl) || totalMl < 0)
        return res.status(400).json({ message: 'Ungültige Menge' });

    db.prepare('DELETE FROM water_logs WHERE user_id = ? AND date = ?').run(req.user.id, date);
    if (totalMl > 0) {
        db.prepare('INSERT INTO water_logs (user_id, amount_ml, date) VALUES (?, ?, ?)')
          .run(req.user.id, totalMl, date);
    }
    res.json({ total_ml: totalMl });
});


function attachExercises(sessions) {
    if (sessions.length === 0) return sessions;
    const ids = sessions.map(s => s.id);
    const placeholders = ids.map(() => '?').join(',');
    const rows = db.prepare(`
        SELECT ws.session_id, ex.name,
               COUNT(*)        AS sets,
               MAX(ws.reps)    AS reps,
               MAX(ws.weight_kg) AS weight_kg
        FROM workout_sets ws
        JOIN exercises ex ON ws.exercise_id = ex.id
        WHERE ws.session_id IN (${placeholders})
        GROUP BY ws.session_id, ws.exercise_id, ex.name
        ORDER BY ws.session_id, MIN(ws.set_number)
    `).all(...ids);

    const bySession = {};
    for (const r of rows) (bySession[r.session_id] ||= []).push(r);
    return sessions.map(s => ({ ...s, exercises: bySession[s.id] || [] }));
}

app.get('/api/workouts', verifyToken, (req, res) => {
    const sessions = db.prepare(
        'SELECT id, title, duration_min, notes, date FROM workout_sessions WHERE user_id = ? ORDER BY date DESC, id DESC'
    ).all(req.user.id);
    res.json(attachExercises(sessions));
});

app.post('/api/workouts', verifyToken, (req, res) => {
    const { title, duration_min, notes, exercises, plan_id } = req.body;
    if (!title || !title.trim())
        return res.status(400).json({ message: 'Titel ist Pflicht' });

    let planId = null;
    if (plan_id) {
        const plan = db.prepare('SELECT id FROM training_plans WHERE id = ? AND user_id = ?').get(plan_id, req.user.id);
        if (plan) planId = plan.id;
    }

    const insertSession = db.prepare(
        'INSERT INTO workout_sessions (user_id, plan_id, title, duration_min, notes) VALUES (?, ?, ?, ?, ?)'
    );
    const findExercise = db.prepare('SELECT id FROM exercises WHERE name = ?');
    const insertExercise = db.prepare('INSERT INTO exercises (name) VALUES (?)');
    const insertSet = db.prepare(
        'INSERT INTO workout_sets (session_id, exercise_id, set_number, reps, weight_kg) VALUES (?, ?, ?, ?, ?)'
    );

    const create = db.transaction(() => {
        const r = insertSession.run(req.user.id, planId, title.trim(), parseInt(duration_min) || 0, notes?.trim() || null);
        const sessionId = r.lastInsertRowid;

        for (const ex of (Array.isArray(exercises) ? exercises : [])) {
            const name = (ex.name || '').trim();
            if (!name) continue;
            let row = findExercise.get(name);
            if (!row) row = { id: insertExercise.run(name).lastInsertRowid };

            const setCount = Math.min(20, Math.max(1, parseInt(ex.sets) || 1));
            const reps = parseInt(ex.reps) || 0;
            const weight = parseFloat(ex.weight_kg);
            for (let i = 1; i <= setCount; i++) {
                insertSet.run(sessionId, row.id, i, reps, Number.isFinite(weight) ? weight : null);
            }
        }
        return sessionId;
    });

    const sessionId = create();
    const session = db.prepare(
        'SELECT id, title, duration_min, notes, date FROM workout_sessions WHERE id = ?'
    ).get(sessionId);
    res.status(201).json(attachExercises([session])[0]);
});

app.delete('/api/workouts/:id', verifyToken, (req, res) => {
    const id = parseInt(req.params.id);
    const session = db.prepare('SELECT id FROM workout_sessions WHERE id = ? AND user_id = ?').get(id, req.user.id);
    if (!session) return res.status(404).json({ message: 'Workout nicht gefunden' });

    db.prepare('DELETE FROM workout_sets WHERE session_id = ?').run(id);
    db.prepare('DELETE FROM workout_sessions WHERE id = ?').run(id);
    res.json({ message: 'Gelöscht' });
});


function getPlansNested(userId, planId = null) {
    const plans = planId
        ? db.prepare('SELECT id, name, description, created_at FROM training_plans WHERE user_id = ? AND id = ?').all(userId, planId)
        : db.prepare('SELECT id, name, description, created_at FROM training_plans WHERE user_id = ? ORDER BY created_at DESC, id DESC').all(userId);
    if (plans.length === 0) return plans;

    const planIds = plans.map(p => p.id);
    const planPh = planIds.map(() => '?').join(',');
    const days = db.prepare(
        `SELECT id, plan_id, day_number, name FROM plan_days WHERE plan_id IN (${planPh}) ORDER BY day_number, id`
    ).all(...planIds);

    const exercisesByDay = {};
    if (days.length > 0) {
        const dayIds = days.map(d => d.id);
        const dayPh = dayIds.map(() => '?').join(',');
        const rows = db.prepare(`
            SELECT pe.id, pe.day_id, pe.sets, pe.reps, pe.weight_kg, pe.rest_sec, ex.name
            FROM plan_exercises pe
            JOIN exercises ex ON pe.exercise_id = ex.id
            WHERE pe.day_id IN (${dayPh})
            ORDER BY pe.order_index, pe.id
        `).all(...dayIds);
        for (const r of rows) (exercisesByDay[r.day_id] ||= []).push(r);
    }

    const daysByPlan = {};
    for (const d of days) (daysByPlan[d.plan_id] ||= []).push({ ...d, exercises: exercisesByDay[d.id] || [] });
    return plans.map(p => ({ ...p, days: daysByPlan[p.id] || [] }));
}

function insertPlanDays(planId, days) {
    const insertDay = db.prepare('INSERT INTO plan_days (plan_id, day_number, name) VALUES (?, ?, ?)');
    const findExercise = db.prepare('SELECT id FROM exercises WHERE name = ?');
    const insertExercise = db.prepare('INSERT INTO exercises (name) VALUES (?)');
    const insertPlanExercise = db.prepare(
        'INSERT INTO plan_exercises (day_id, exercise_id, sets, reps, weight_kg, rest_sec, order_index) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );

    (Array.isArray(days) ? days : []).forEach((day, di) => {
        const dayId = insertDay.run(
            planId,
            parseInt(day.day_number) || di + 1,
            (day.name || '').trim() || null
        ).lastInsertRowid;

        (Array.isArray(day.exercises) ? day.exercises : []).forEach((ex, ei) => {
            const name = (ex.name || '').trim();
            if (!name) return;
            let row = findExercise.get(name);
            if (!row) row = { id: insertExercise.run(name).lastInsertRowid };

            const weight = parseFloat(ex.weight_kg);
            insertPlanExercise.run(
                dayId,
                row.id,
                Math.min(20, Math.max(1, parseInt(ex.sets) || 3)),
                parseInt(ex.reps) || 10,
                Number.isFinite(weight) ? weight : null,
                parseInt(ex.rest_sec) || 60,
                ei
            );
        });
    });
}

app.get('/api/plans', verifyToken, (req, res) => {
    res.json(getPlansNested(req.user.id));
});

app.post('/api/plans', verifyToken, (req, res) => {
    const { name, description, days } = req.body;
    if (!name || !name.trim())
        return res.status(400).json({ message: 'Name ist Pflicht' });

    const create = db.transaction(() => {
        const r = db.prepare('INSERT INTO training_plans (user_id, name, description) VALUES (?, ?, ?)')
            .run(req.user.id, name.trim(), description?.trim() || null);
        insertPlanDays(r.lastInsertRowid, days);
        return r.lastInsertRowid;
    });

    const planId = create();
    res.status(201).json(getPlansNested(req.user.id, planId)[0]);
});

app.put('/api/plans/:id', verifyToken, (req, res) => {
    const id = parseInt(req.params.id);
    const plan = db.prepare('SELECT id FROM training_plans WHERE id = ? AND user_id = ?').get(id, req.user.id);
    if (!plan) return res.status(404).json({ message: 'Plan nicht gefunden' });

    const { name, description, days } = req.body;
    if (!name || !name.trim())
        return res.status(400).json({ message: 'Name ist Pflicht' });

    const update = db.transaction(() => {
        db.prepare('UPDATE training_plans SET name = ?, description = ? WHERE id = ?')
            .run(name.trim(), description?.trim() || null, id);
        db.prepare('DELETE FROM plan_exercises WHERE day_id IN (SELECT id FROM plan_days WHERE plan_id = ?)').run(id);
        db.prepare('DELETE FROM plan_days WHERE plan_id = ?').run(id);
        insertPlanDays(id, days);
    });
    update();

    res.json(getPlansNested(req.user.id, id)[0]);
});

app.delete('/api/plans/:id', verifyToken, (req, res) => {
    const id = parseInt(req.params.id);
    const plan = db.prepare('SELECT id FROM training_plans WHERE id = ? AND user_id = ?').get(id, req.user.id);
    if (!plan) return res.status(404).json({ message: 'Plan nicht gefunden' });

    const remove = db.transaction(() => {
        db.prepare('DELETE FROM plan_exercises WHERE day_id IN (SELECT id FROM plan_days WHERE plan_id = ?)').run(id);
        db.prepare('DELETE FROM plan_days WHERE plan_id = ?').run(id);
        db.prepare('UPDATE workout_sessions SET plan_id = NULL WHERE plan_id = ?').run(id);
        db.prepare('DELETE FROM training_plans WHERE id = ?').run(id);
    });
    remove();

    res.json({ message: 'Gelöscht' });
});


app.get('/api/sleep', verifyToken, (req, res) => {
    const entries = db.prepare(
        'SELECT id, sleep_start, sleep_end, duration_min, quality, date FROM sleep_logs WHERE user_id = ? ORDER BY date DESC, id DESC LIMIT 90'
    ).all(req.user.id);
    res.json(entries);
});

app.post('/api/sleep', verifyToken, (req, res) => {
    const { date, bed_time, wake_time, quality } = req.body;
    const timeRe = /^\d{2}:\d{2}$/;
    const day = (date || new Date().toISOString().split('T')[0]);
    if (!timeRe.test(bed_time || '') || !timeRe.test(wake_time || ''))
        return res.status(400).json({ message: 'Fehlende Felder' });
    const q = parseInt(quality);
    if (!Number.isInteger(q) || q < 1 || q > 5)
        return res.status(400).json({ message: 'Ungültige Qualität' });

    const startDay = bed_time > wake_time ? shiftDate(day, -1) : day;
    const sleepStart = `${startDay} ${bed_time}`;
    const sleepEnd = `${day} ${wake_time}`;
    const durationMin = Math.round(
        (new Date(sleepEnd.replace(' ', 'T')) - new Date(sleepStart.replace(' ', 'T'))) / 60000
    );
    if (durationMin <= 0)
        return res.status(400).json({ message: 'Ungültige Zeiten' });

    const r = db.prepare(
        'INSERT INTO sleep_logs (user_id, sleep_start, sleep_end, duration_min, quality, date) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(req.user.id, sleepStart, sleepEnd, durationMin, q, day);

    const entry = db.prepare(
        'SELECT id, sleep_start, sleep_end, duration_min, quality, date FROM sleep_logs WHERE id = ?'
    ).get(r.lastInsertRowid);
    res.status(201).json(entry);
});

app.delete('/api/sleep/:id', verifyToken, (req, res) => {
    const id = parseInt(req.params.id);
    const entry = db.prepare('SELECT id FROM sleep_logs WHERE id = ? AND user_id = ?').get(id, req.user.id);
    if (!entry) return res.status(404).json({ message: 'Eintrag nicht gefunden' });
    db.prepare('DELETE FROM sleep_logs WHERE id = ?').run(id);
    res.json({ message: 'Gelöscht' });
});


app.post('/api/photos', verifyToken, upload.single('photo'), (req, res) => {
    if (!req.file)
        return res.status(400).json({ message: 'Bitte ein Bild auswählen' });

    const date = req.body.date || new Date().toISOString().split('T')[0];
    const filePath = '/uploads/' + req.file.filename;
    const r = db.prepare(
        'INSERT INTO progress_photos (user_id, file_path, note, date) VALUES (?, ?, ?, ?)'
    ).run(req.user.id, filePath, req.body.note?.trim() || null, date);

    const photo = db.prepare(
        'SELECT id, file_path, note, date FROM progress_photos WHERE id = ?'
    ).get(r.lastInsertRowid);
    res.status(201).json(photo);
});

app.get('/api/photos', verifyToken, (req, res) => {
    const photos = db.prepare(
        'SELECT id, file_path, note, date FROM progress_photos WHERE user_id = ? ORDER BY date DESC, id DESC'
    ).all(req.user.id);
    res.json(photos);
});

app.delete('/api/photos/:id', verifyToken, (req, res) => {
    const id = parseInt(req.params.id);
    const photo = db.prepare('SELECT id, file_path FROM progress_photos WHERE id = ? AND user_id = ?').get(id, req.user.id);
    if (!photo) return res.status(404).json({ message: 'Foto nicht gefunden' });

    fs.unlink(path.join(__dirname, photo.file_path), () => {});
    db.prepare('DELETE FROM progress_photos WHERE id = ?').run(id);
    res.json({ message: 'Gelöscht' });
});


function shiftDate(d, delta) {
    const dt = new Date(d + 'T00:00:00Z');
    dt.setUTCDate(dt.getUTCDate() + delta);
    return dt.toISOString().split('T')[0];
}

function computeStreaks(dates) {
    const set = new Set(dates);
    let longest = 0;
    for (const d of dates) {
        if (set.has(shiftDate(d, -1))) continue;
        let len = 1;
        let cur = d;
        while (set.has(shiftDate(cur, 1))) {
            cur = shiftDate(cur, 1);
            len++;
        }
        if (len > longest) longest = len;
    }

    const today = new Date().toISOString().split('T')[0];
    let current = 0;
    let cur = set.has(today) ? today : shiftDate(today, -1);
    while (set.has(cur)) {
        current++;
        cur = shiftDate(cur, -1);
    }
    return { current, longest };
}

app.get('/api/stats', verifyToken, (req, res) => {
    const uid = req.user.id;
    const days = Math.min(365, Math.max(7, parseInt(req.query.days) || 30));
    const since = `-${days - 1} days`;
    const today = new Date().toISOString().split('T')[0];

    const activeDates = db.prepare(`
        SELECT DISTINCT date(date) AS d FROM workout_sessions WHERE user_id = ?
        UNION SELECT date FROM meal_logs WHERE user_id = ?
        UNION SELECT date FROM water_logs WHERE user_id = ?
        ORDER BY d
    `).all(uid, uid, uid).map(r => r.d);
    const { current, longest } = computeStreaks(activeDates);
    const activeDays30 = activeDates.filter(d => d >= shiftDate(today, -29)).length;

    const wTotals = db.prepare(
        'SELECT COUNT(*) AS total, COALESCE(SUM(duration_min), 0) AS total_min FROM workout_sessions WHERE user_id = ?'
    ).get(uid);
    const wWeek = db.prepare(
        "SELECT COUNT(*) AS c FROM workout_sessions WHERE user_id = ? AND date(date) >= date('now', '-6 days')"
    ).get(uid);
    const wSets = db.prepare(`
        SELECT COUNT(*) AS total_sets,
               COALESCE(SUM(ws.reps * COALESCE(ws.weight_kg, 0)), 0) AS volume_kg,
               ROUND(AVG(ws.rest_sec)) AS avg_rest_sec
        FROM workout_sets ws
        JOIN workout_sessions s ON ws.session_id = s.id
        WHERE s.user_id = ?
    `).get(uid);

    const firstWorkout = db.prepare(
        'SELECT MIN(date(date)) AS first FROM workout_sessions WHERE user_id = ?'
    ).get(uid);
    let avgPerWeek = 0;
    if (wTotals.total > 0 && firstWorkout.first) {
        const daysSince = Math.max(1, (new Date(today) - new Date(firstWorkout.first)) / 86400000 + 1);
        avgPerWeek = Math.round((wTotals.total / Math.max(1, daysSince / 7)) * 10) / 10;
    }

    const perWeek = db.prepare(`
        SELECT strftime('%Y-%W', date) AS week,
               MIN(date(date, 'weekday 0', '-6 days')) AS week_start,
               COUNT(*) AS count
        FROM workout_sessions
        WHERE user_id = ? AND date(date) >= date('now', '-55 days')
        GROUP BY week ORDER BY week
    `).all(uid);

    const nutritionPerDay = db.prepare(`
        SELECT ml.date AS date,
               ROUND(SUM(fi.calories_per_100g * ml.amount_g / 100)) AS kcal,
               ROUND(SUM(fi.protein_per_100g  * ml.amount_g / 100), 1) AS protein_g,
               ROUND(SUM(fi.carbs_per_100g    * ml.amount_g / 100), 1) AS carbs_g,
               ROUND(SUM(fi.fat_per_100g      * ml.amount_g / 100), 1) AS fat_g
        FROM meal_logs ml
        JOIN food_items fi ON ml.food_item_id = fi.id
        WHERE ml.user_id = ? AND ml.date >= date('now', ?)
        GROUP BY ml.date ORDER BY ml.date
    `).all(uid, since);
    const todayNutrition = nutritionPerDay.find(r => r.date === today);
    const avgKcal = nutritionPerDay.length
        ? Math.round(nutritionPerDay.reduce((s, r) => s + r.kcal, 0) / nutritionPerDay.length)
        : 0;
    const macros = nutritionPerDay.reduce(
        (m, r) => ({
            protein_g: Math.round((m.protein_g + r.protein_g) * 10) / 10,
            carbs_g: Math.round((m.carbs_g + r.carbs_g) * 10) / 10,
            fat_g: Math.round((m.fat_g + r.fat_g) * 10) / 10
        }),
        { protein_g: 0, carbs_g: 0, fat_g: 0 }
    );

    const waterPerDay = db.prepare(`
        SELECT date, SUM(amount_ml) AS ml FROM water_logs
        WHERE user_id = ? AND date >= date('now', ?)
        GROUP BY date ORDER BY date
    `).all(uid, since);
    const todayWater = waterPerDay.find(r => r.date === today);
    const waterAvg = db.prepare(`
        SELECT ROUND(AVG(day_ml)) AS avg_ml FROM (
            SELECT SUM(amount_ml) AS day_ml FROM water_logs WHERE user_id = ? GROUP BY date
        )
    `).get(uid);

    const latestBody = db.prepare(
        'SELECT weight_kg, height_cm, bmi, body_fat_percent, date FROM body_measurements WHERE user_id = ? ORDER BY date DESC, id DESC LIMIT 1'
    ).get(uid);
    const bodyHistory = db.prepare(
        'SELECT date, weight_kg, bmi, body_fat_percent FROM body_measurements WHERE user_id = ? ORDER BY date ASC, id ASC'
    ).all(uid);

    const sleep = db.prepare(`
        SELECT COUNT(*) AS count,
               ROUND(AVG(duration_min)) AS avg_duration_min,
               ROUND(AVG(quality), 1) AS avg_quality
        FROM sleep_logs WHERE user_id = ?
    `).get(uid);
    const sleepPerDay = db.prepare(`
        SELECT date, SUM(duration_min) AS duration_min, ROUND(AVG(quality), 1) AS quality
        FROM sleep_logs
        WHERE user_id = ? AND date >= date('now', ?)
        GROUP BY date ORDER BY date
    `).all(uid, since);

    const plans = db.prepare(
        'SELECT id, name, description, created_at FROM training_plans WHERE user_id = ? ORDER BY created_at DESC'
    ).all(uid);

    const photoCount = db.prepare('SELECT COUNT(*) AS count FROM progress_photos WHERE user_id = ?').get(uid);
    const latestPhoto = db.prepare(
        'SELECT file_path, note, date FROM progress_photos WHERE user_id = ? ORDER BY date DESC, id DESC LIMIT 1'
    ).get(uid);

    res.json({
        days,
        streak: { current, longest, activeDays30 },
        workouts: {
            total: wTotals.total,
            totalMin: wTotals.total_min,
            thisWeek: wWeek.c,
            avgPerWeek,
            totalSets: wSets.total_sets,
            volumeKg: Math.round(wSets.volume_kg),
            avgRestSec: wSets.avg_rest_sec,
            perWeek: perWeek.map(r => ({ weekStart: r.week_start, count: r.count }))
        },
        nutrition: {
            todayKcal: todayNutrition ? todayNutrition.kcal : 0,
            avgKcal,
            macros,
            perDay: nutritionPerDay
        },
        water: {
            todayMl: todayWater ? todayWater.ml : 0,
            avgMl: waterAvg.avg_ml || 0,
            perDay: waterPerDay
        },
        body: { latest: latestBody || null, history: bodyHistory },
        sleep: {
            count: sleep.count,
            avgDurationMin: sleep.avg_duration_min,
            avgQuality: sleep.avg_quality,
            perDay: sleepPerDay
        },
        plans: { count: plans.length, list: plans },
        photos: { count: photoCount.count, latest: latestPhoto || null }
    });
});

app.listen(PORT, () => {
    console.log(`Server läuft auf http://localhost:${PORT}`);
});
