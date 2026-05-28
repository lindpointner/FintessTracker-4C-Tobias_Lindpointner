const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'fitnesstracker.db'));

db.exec(`
    
    CREATE TABLE IF NOT EXISTS users (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        name         TEXT NOT NULL,
        email        TEXT NOT NULL UNIQUE,
        password     TEXT NOT NULL,
        created_at   TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS exercises (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        name         TEXT NOT NULL,
        muscle_group TEXT,
        description  TEXT
    );

    CREATE TABLE IF NOT EXISTS workout_sessions (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id      INTEGER NOT NULL,
        plan_id      INTEGER,
        title        TEXT NOT NULL,
        duration_min INTEGER DEFAULT 0,
        notes        TEXT,
        date         TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (plan_id) REFERENCES training_plans(id)
    );

    CREATE TABLE IF NOT EXISTS workout_sets (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id   INTEGER NOT NULL,
        exercise_id  INTEGER NOT NULL,
        set_number   INTEGER NOT NULL,
        reps         INTEGER,
        weight_kg    REAL,
        duration_sec INTEGER,
        rest_sec     INTEGER DEFAULT 60,
        FOREIGN KEY (session_id)  REFERENCES workout_sessions(id),
        FOREIGN KEY (exercise_id) REFERENCES exercises(id)
    );

    CREATE TABLE IF NOT EXISTS training_plans (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id      INTEGER NOT NULL,
        name         TEXT NOT NULL,
        description  TEXT,
        created_at   TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS plan_days (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        plan_id      INTEGER NOT NULL,
        day_number   INTEGER NOT NULL,
        name         TEXT,
        FOREIGN KEY (plan_id) REFERENCES training_plans(id)
    );

    CREATE TABLE IF NOT EXISTS plan_exercises (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        day_id       INTEGER NOT NULL,
        exercise_id  INTEGER NOT NULL,
        sets         INTEGER DEFAULT 3,
        reps         INTEGER DEFAULT 10,
        weight_kg    REAL,
        rest_sec     INTEGER DEFAULT 60,
        order_index  INTEGER DEFAULT 0,
        FOREIGN KEY (day_id)      REFERENCES plan_days(id),
        FOREIGN KEY (exercise_id) REFERENCES exercises(id)
    );

    CREATE TABLE IF NOT EXISTS food_items (
        id                  INTEGER PRIMARY KEY AUTOINCREMENT,
        name                TEXT NOT NULL,
        calories_per_100g   REAL DEFAULT 0,
        protein_per_100g    REAL DEFAULT 0,
        carbs_per_100g      REAL DEFAULT 0,
        fat_per_100g        REAL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS meal_logs (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id      INTEGER NOT NULL,
        food_item_id INTEGER NOT NULL,
        meal_type    TEXT CHECK(meal_type IN ('breakfast','lunch','dinner','snack')),
        amount_g     REAL NOT NULL,
        date         TEXT DEFAULT (date('now')),
        FOREIGN KEY (user_id)      REFERENCES users(id),
        FOREIGN KEY (food_item_id) REFERENCES food_items(id)
    );

    CREATE TABLE IF NOT EXISTS body_measurements (
        id               INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id          INTEGER NOT NULL,
        weight_kg        REAL,
        height_cm        REAL,
        body_fat_percent REAL,
        bmi              REAL,
        date             TEXT DEFAULT (date('now')),
        FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS progress_photos (
        id        INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id   INTEGER NOT NULL,
        file_path TEXT NOT NULL,
        note      TEXT,
        date      TEXT DEFAULT (date('now')),
        FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS water_logs (
        id        INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id   INTEGER NOT NULL,
        amount_ml INTEGER NOT NULL,
        date      TEXT DEFAULT (date('now')),
        FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS sleep_logs (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id      INTEGER NOT NULL,
        sleep_start  TEXT NOT NULL,
        sleep_end    TEXT NOT NULL,
        duration_min INTEGER,
        quality      INTEGER CHECK(quality BETWEEN 1 AND 5),
        date         TEXT DEFAULT (date('now')),
        FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS streaks (
        id               INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id          INTEGER NOT NULL UNIQUE,
        current_streak   INTEGER DEFAULT 0,
        longest_streak   INTEGER DEFAULT 0,
        last_active_date TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id)
    );
`);

module.exports = db;
