-- Movie MCP Server Database Schema
-- Multi-user support with basic API key authentication

-- Users table for authentication and user management
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  api_key TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Movies table (shared across all users)
-- Stores movie metadata from TMDB
CREATE TABLE IF NOT EXISTS movies (
  id SERIAL PRIMARY KEY,
  tmdb_id INTEGER UNIQUE NOT NULL,
  title TEXT NOT NULL,
  year INTEGER,
  overview TEXT,
  poster_url TEXT,
  rating DECIMAL(3,1),
  created_at TIMESTAMP DEFAULT NOW()
);

-- User-specific watchlist
-- Tracks movies users want to watch
CREATE TABLE IF NOT EXISTS watchlist (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  movie_id INTEGER NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
  added_at TIMESTAMP DEFAULT NOW(),
  notes TEXT,
  UNIQUE(user_id, movie_id)
);

-- User-specific watch history
-- Tracks movies users have watched with ratings
CREATE TABLE IF NOT EXISTS watched (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  movie_id INTEGER NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
  watched_at TIMESTAMP DEFAULT NOW(),
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  notes TEXT,
  UNIQUE(user_id, movie_id)
);

-- User-specific preferences
-- Stores user preferences as flexible JSONB (genres, actors, moods, etc.)
CREATE TABLE IF NOT EXISTS preferences (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value JSONB NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, key)
);

-- User-specific favorite colors
-- Stores colors users have saved to their favorites
CREATE TABLE IF NOT EXISTS favorite_colors (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  hex TEXT NOT NULL,
  rgb_r INTEGER NOT NULL CHECK (rgb_r BETWEEN 0 AND 255),
  rgb_g INTEGER NOT NULL CHECK (rgb_g BETWEEN 0 AND 255),
  rgb_b INTEGER NOT NULL CHECK (rgb_b BETWEEN 0 AND 255),
  hsl_h INTEGER NOT NULL CHECK (hsl_h BETWEEN 0 AND 360),
  hsl_s INTEGER NOT NULL CHECK (hsl_s BETWEEN 0 AND 100),
  hsl_l INTEGER NOT NULL CHECK (hsl_l BETWEEN 0 AND 100),
  name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, hex)
);

-- User-specific favorite properties
-- Stores Homebuyme properties users have saved to favorites
CREATE TABLE IF NOT EXISTS favorite_properties (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  property_id TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  price DECIMAL NOT NULL,
  hbm_price DECIMAL NOT NULL,
  property_type TEXT NOT NULL,
  status TEXT NOT NULL,
  image_url TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, property_id)
);

-- Indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_watchlist_user ON watchlist(user_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_movie ON watchlist(movie_id);
CREATE INDEX IF NOT EXISTS idx_watched_user ON watched(user_id);
CREATE INDEX IF NOT EXISTS idx_watched_movie ON watched(movie_id);
CREATE INDEX IF NOT EXISTS idx_watched_rating ON watched(rating);
CREATE INDEX IF NOT EXISTS idx_preferences_user ON preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_users_api_key ON users(api_key);
CREATE INDEX IF NOT EXISTS idx_favorite_colors_user ON favorite_colors(user_id);
CREATE INDEX IF NOT EXISTS idx_favorite_colors_hex ON favorite_colors(hex);
CREATE INDEX IF NOT EXISTS idx_favorite_properties_user ON favorite_properties(user_id);
CREATE INDEX IF NOT EXISTS idx_favorite_properties_property ON favorite_properties(property_id);
CREATE INDEX IF NOT EXISTS idx_favorite_properties_state ON favorite_properties(state);

-- Insert a default demo user for testing
-- In production, users should be created through a proper registration flow
INSERT INTO users (email, api_key) 
VALUES ('demo@example.com', 'demo_api_key_change_in_production')
ON CONFLICT (email) DO NOTHING;

