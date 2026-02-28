import pool from '../db/index.js';
import axios from 'axios';

export const addGameToNight = async (req, res) => {
  const { game_night_id, game_id } = req.body;
  const user_id = req.user.id;
  try {
    await pool.query(
      'INSERT INTO game_night_games (game_night_id, game_id, brought_by) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
      [game_night_id, game_id, user_id]
    );
    res.json({ message: 'Game added to night' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getGamesForNight = async (req, res) => {
  const { game_night_id } = req.params;
  try {
    const result = await pool.query(
      `SELECT g.*, gng.brought_by FROM games g
       JOIN game_night_games gng ON g.id = gng.game_id
       WHERE gng.game_night_id = $1`,
      [game_night_id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const setPreference = async (req, res) => {
  const { game_night_id, game_id, preference, top_game } = req.body;
  const user_id = req.user.id;
  try {
    await pool.query(
      `INSERT INTO player_game_preferences (game_night_id, user_id, game_id, preference, top_game)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (game_night_id, user_id, game_id)
       DO UPDATE SET preference = $4, top_game = $5`,
      [game_night_id, user_id, game_id, preference, top_game || false]
    );
    res.json({ message: 'Preference saved' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getUserLibrary = async (req, res) => {
  const user_id = req.user.id;
  try {
    const result = await pool.query(
      `SELECT g.* FROM games g
       JOIN user_games ug ON g.id = ug.game_id
       WHERE ug.user_id = $1`,
      [user_id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const addGameToLibrary = async (req, res) => {
  const { title, min_players, max_players, avg_playtime, bgg_id, thumbnail_url } = req.body;
  const user_id = req.user.id;
  try {
    let game;
    if (bgg_id) {
      const existing = await pool.query('SELECT * FROM games WHERE bgg_id = $1', [bgg_id]);
      game = existing.rows[0];
    }
    if (!game) {
      const result = await pool.query(
        'INSERT INTO games (title, min_players, max_players, avg_playtime, bgg_id, thumbnail_url) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [title, min_players, max_players, avg_playtime, bgg_id || null, thumbnail_url || null]
      );
      game = result.rows[0];
    }
    await pool.query(
      'INSERT INTO user_games (user_id, game_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [user_id, game.id]
    );
    res.json(game);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getPreferences = async (req, res) => {
  const { game_night_id } = req.params;
  const user_id = req.user.id;
  try {
    const result = await pool.query(
      'SELECT * FROM player_game_preferences WHERE game_night_id = $1 AND user_id = $2',
      [game_night_id, user_id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getActiveGames = async (req, res) => {
  const { game_night_id } = req.params;
  const user_id = req.user.id;
  try {
    const result = await pool.query(
      `SELECT ag.*, g.title FROM active_games ag
       JOIN games g ON ag.game_id = g.id
       JOIN active_game_players agp ON ag.id = agp.active_game_id
       WHERE ag.game_night_id = $1 AND ag.status = 'active' AND agp.user_id = $2`,
      [game_night_id, user_id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const importFromBGG = async (req, res) => {
  const { bgg_username } = req.body;
  const user_id = req.user.id;
  try {
    const response = await axios.get(
      `https://boardgamegeek.com/xmlapi2/collection?username=${bgg_username}&own=1&stats=1`
    );
    const xml = response.data;

    // Parse the XML
    const items = xml.match(/<item[^>]*objectid="(\d+)"[^>]*>([\s\S]*?)<\/item>/g) || [];
    
    for (const item of items) {
      const bggId = item.match(/objectid="(\d+)"/)?.[1];
      const title = item.match(/<name[^>]*sortindex="1"[^>]*>(.*?)<\/name>/)?.[1] ||
                    item.match(/<name>(.*?)<\/name>/)?.[1];
      const minPlayers = item.match(/<minplayers[^>]*>(\d+)<\/minplayers>/)?.[1];
      const maxPlayers = item.match(/<maxplayers[^>]*>(\d+)<\/maxplayers>/)?.[1];
      const playTime = item.match(/<playingtime[^>]*>(\d+)<\/playingtime>/)?.[1];
      const thumbnail = item.match(/<thumbnail>(.*?)<\/thumbnail>/)?.[1];

      if (!title || !bggId) continue;

      let game;
      const existing = await pool.query('SELECT * FROM games WHERE bgg_id = $1', [parseInt(bggId)]);
      game = existing.rows[0];

      if (!game) {
        const result = await pool.query(
          'INSERT INTO games (title, min_players, max_players, avg_playtime, bgg_id, thumbnail_url) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
          [title, parseInt(minPlayers) || 2, parseInt(maxPlayers) || 4, parseInt(playTime) || 30, parseInt(bggId), thumbnail || null]
        );
        game = result.rows[0];
      }

      await pool.query(
        'INSERT INTO user_games (user_id, game_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [user_id, game.id]
      );
    }

    // Return user's full library
    const library = await pool.query(
      `SELECT g.* FROM games g JOIN user_games ug ON g.id = ug.game_id WHERE ug.user_id = $1`,
      [user_id]
    );
    res.json(library.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};