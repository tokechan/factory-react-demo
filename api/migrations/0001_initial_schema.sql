-- Photo Archive Database Schema
-- Migration: 0001_initial_schema
-- Created: 2024-09-22

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Refresh tokens table
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    token_hash TEXT NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Photos table
CREATE TABLE IF NOT EXISTS photos (
    id TEXT PRIMARY KEY,
    filename TEXT NOT NULL,
    original_key TEXT NOT NULL,
    thumb_key TEXT,
    medium_key TEXT,
    file_size INTEGER NOT NULL,
    content_type TEXT NOT NULL,
    upload_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    storage_class TEXT DEFAULT 'Standard',
    ia_transition_date DATETIME,
    
    -- EXIF data
    exif_data TEXT, -- JSON string
    date_taken DATETIME,
    camera_model TEXT,
    gps_lat REAL,
    gps_lng REAL,
    
    -- Upload status
    upload_completed INTEGER DEFAULT 0, -- SQLite boolean
    variants_generated INTEGER DEFAULT 0, -- SQLite boolean
    etag TEXT,
    completed_at DATETIME,
    
    -- Statistics
    view_count INTEGER DEFAULT 0,
    last_accessed DATETIME,
    original_access_count INTEGER DEFAULT 0,
    
    -- User relationship
    user_id TEXT NOT NULL,
    
    -- Timestamps
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Usage statistics table
CREATE TABLE IF NOT EXISTS usage_stats (
    date DATE PRIMARY KEY,
    total_storage_gb REAL NOT NULL,
    standard_storage_gb REAL NOT NULL,
    ia_storage_gb REAL NOT NULL,
    monthly_cost_usd REAL,
    class_a_operations INTEGER DEFAULT 0,
    class_b_operations INTEGER DEFAULT 0,
    ia_retrievals INTEGER DEFAULT 0,
    ia_retrieval_gb REAL DEFAULT 0,
    user_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Alert settings table  
CREATE TABLE IF NOT EXISTS alert_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    alert_type TEXT NOT NULL, -- 'storage_quota' | 'cost_threshold'
    threshold_value REAL NOT NULL,
    is_enabled INTEGER DEFAULT 1, -- SQLite boolean
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, alert_type)
);

-- Access logs table
CREATE TABLE IF NOT EXISTS access_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    photo_id TEXT NOT NULL,
    access_type TEXT NOT NULL, -- 'thumb' | 'medium' | 'original'
    accessed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    cost_incurred_usd REAL DEFAULT 0,
    user_agent TEXT,
    ip_address TEXT,
    FOREIGN KEY (photo_id) REFERENCES photos(id) ON DELETE CASCADE
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_photos_user_id ON photos(user_id);
CREATE INDEX IF NOT EXISTS idx_photos_upload_date ON photos(upload_date);
CREATE INDEX IF NOT EXISTS idx_photos_date_taken ON photos(date_taken);
CREATE INDEX IF NOT EXISTS idx_photos_storage_class ON photos(storage_class);
CREATE INDEX IF NOT EXISTS idx_photos_camera_model ON photos(camera_model);
CREATE INDEX IF NOT EXISTS idx_photos_upload_completed ON photos(upload_completed);

CREATE INDEX IF NOT EXISTS idx_access_logs_photo_id ON access_logs(photo_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_accessed_at ON access_logs(accessed_at);
CREATE INDEX IF NOT EXISTS idx_access_logs_access_type ON access_logs(access_type);

CREATE INDEX IF NOT EXISTS idx_usage_stats_date ON usage_stats(date);
CREATE INDEX IF NOT EXISTS idx_usage_stats_user_id ON usage_stats(user_id);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);

CREATE INDEX IF NOT EXISTS idx_alert_settings_user_id ON alert_settings(user_id);

-- Triggers for updated_at timestamps
CREATE TRIGGER IF NOT EXISTS update_photos_timestamp 
    AFTER UPDATE ON photos
BEGIN
    UPDATE photos SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_users_timestamp 
    AFTER UPDATE ON users
BEGIN
    UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_alert_settings_timestamp 
    AFTER UPDATE ON alert_settings
BEGIN
    UPDATE alert_settings SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;
