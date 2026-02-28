CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  bgg_username VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE friendships (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  friend_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE games (
  id SERIAL PRIMARY KEY,
  bgg_id INTEGER UNIQUE,
  title VARCHAR(255) NOT NULL,
  min_players INTEGER,
  max_players INTEGER,
  avg_playtime INTEGER,
  thumbnail_url VARCHAR(255)
);

CREATE TABLE user_games (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  game_id INTEGER REFERENCES games(id) ON DELETE CASCADE
);




CREATE TABLE game_nights (
  id SERIAL PRIMARY KEY,
  host_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  status VARCHAR(20) DEFAULT 'active',
  invite_code VARCHAR(10) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE game_night_players (
  id SERIAL PRIMARY KEY,
  game_night_id INTEGER REFERENCES game_nights(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'waiting',
  joined_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE game_night_games (
  id SERIAL PRIMARY KEY,
  game_night_id INTEGER REFERENCES game_nights(id) ON DELETE CASCADE,
  game_id INTEGER REFERENCES games(id) ON DELETE CASCADE,
  brought_by INTEGER REFERENCES users(id)
);

CREATE TABLE player_game_preferences (
  id SERIAL PRIMARY KEY,
  game_night_id INTEGER REFERENCES game_nights(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  game_id INTEGER REFERENCES games(id) ON DELETE CASCADE,
  preference VARCHAR(20) DEFAULT 'okay',
  top_game BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_game_night_players_night ON game_night_players(game_night_id);
CREATE INDEX idx_game_night_players_user ON game_night_players(user_id);
CREATE INDEX idx_player_preferences_night ON player_game_preferences(game_night_id);
CREATE INDEX idx_player_preferences_user ON player_game_preferences(user_id);
CREATE INDEX idx_game_night_games_night ON game_night_games(game_night_id);



CREATE TABLE active_games (
  id SERIAL PRIMARY KEY,
  game_night_id INTEGER REFERENCES game_nights(id) ON DELETE CASCADE,
  game_id INTEGER REFERENCES games(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

CREATE TABLE active_game_players (
  id SERIAL PRIMARY KEY,
  active_game_id INTEGER REFERENCES active_games(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  accepted BOOLEAN DEFAULT FALSE
);

CREATE TABLE game_requests (
  id SERIAL PRIMARY KEY,
  game_night_id INTEGER REFERENCES game_nights(id) ON DELETE CASCADE,
  requester_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  owner_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  game_id INTEGER REFERENCES games(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_active_games_night ON active_games(game_night_id);
CREATE INDEX idx_active_game_players_game ON active_game_players(active_game_id);

ALTER TABLE player_game_preferences 
ADD CONSTRAINT unique_player_game_pref 
UNIQUE (game_night_id, user_id, game_id);