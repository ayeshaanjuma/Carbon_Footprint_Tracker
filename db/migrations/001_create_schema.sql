-- 1. Create trigger function to handle updated_at automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 2. Create Users Table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    xp INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 3. Create Carbon Goals Table
CREATE TABLE IF NOT EXISTS carbon_goals (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    weekly_target NUMERIC(6, 2) DEFAULT 50.00,
    monthly_allowance NUMERIC(6, 2) DEFAULT 200.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE TRIGGER update_carbon_goals_updated_at
    BEFORE UPDATE ON carbon_goals
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 4. Create Carbon Records Table
CREATE TABLE IF NOT EXISTS carbon_records (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    driving_distance NUMERIC(6, 2) DEFAULT 0.00,
    flights INTEGER DEFAULT 0,
    meat_meals INTEGER DEFAULT 0,
    food_waste_level INTEGER DEFAULT 1, -- 0=Low, 1=Medium, 2=High
    electricity_usage NUMERIC(6, 2) DEFAULT 0.00,
    heating_type VARCHAR(50) DEFAULT 'gas',
    weekly_footprint NUMERIC(8, 2) NOT NULL,
    carbon_score INTEGER NOT NULL,
    logged_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_carbon_records_user_date ON carbon_records(user_id, logged_date);

CREATE TRIGGER update_carbon_records_updated_at
    BEFORE UPDATE ON carbon_records
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 5. Create Daily Challenges Table
CREATE TABLE IF NOT EXISTS daily_challenges (
    id SERIAL PRIMARY KEY,
    category VARCHAR(50) NOT NULL, -- 'transport', 'diet', 'energy'
    title VARCHAR(255) NOT NULL,
    description TEXT,
    icon VARCHAR(10),
    xp_reward INTEGER DEFAULT 50,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE TRIGGER update_daily_challenges_updated_at
    BEFORE UPDATE ON daily_challenges
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 6. Create Challenge Progress Table
CREATE TABLE IF NOT EXISTS challenge_progress (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    challenge_id INTEGER REFERENCES daily_challenges(id) ON DELETE CASCADE,
    completed BOOLEAN DEFAULT FALSE,
    completed_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_challenge_date ON challenge_progress(user_id, challenge_id, completed_date);

CREATE TRIGGER update_challenge_progress_updated_at
    BEFORE UPDATE ON challenge_progress
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 7. Create User Streaks Table
CREATE TABLE IF NOT EXISTS user_streaks (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_active_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER update_user_streaks_updated_at
    BEFORE UPDATE ON user_streaks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 8. Create AI Recommendation History Table
CREATE TABLE IF NOT EXISTS ai_recommendation_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    highest_category VARCHAR(50) NOT NULL,
    query TEXT,
    response TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE TRIGGER update_ai_recommendations_updated_at
    BEFORE UPDATE ON ai_recommendation_history
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
