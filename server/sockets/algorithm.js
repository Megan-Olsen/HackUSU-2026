import pool from '../db/index.js';

export const runMatchingAlgorithm = async (gameNightId, io) => {
  try {
    // Get all waiting players
    const playersResult = await pool.query(
      'SELECT user_id FROM game_night_players WHERE game_night_id = $1 AND status = $2',
      [gameNightId, 'waiting']
    );
    const waitingPlayers = playersResult.rows.map(r => r.user_id);
    if (waitingPlayers.length < 2) return;

    // Get all available games for the night
    const gamesResult = await pool.query(
      'SELECT g.* FROM games g JOIN game_night_games gng ON g.id = gng.game_id WHERE gng.game_night_id = $1',
      [gameNightId]
    );
    const games = gamesResult.rows;

    // Get all preferences for waiting players
    const prefsResult = await pool.query(
      `SELECT * FROM player_game_preferences 
       WHERE game_night_id = $1 AND user_id = ANY($2)`,
      [gameNightId, waitingPlayers]
    );
    const preferences = prefsResult.rows;

    // Score each game for each possible group
    let bestScore = -1;
    let bestGame = null;
    let bestGroup = [];

    for (const game of games) {
      // Get eligible players (not skipping or not_tonight)
      const eligiblePlayers = waitingPlayers.filter(userId => {
        const pref = preferences.find(p => p.user_id === userId && p.game_id === game.id);
        if (!pref) return true; // default okay
        return pref.preference !== 'skip' && pref.preference !== 'not_tonight';
      });

      if (eligiblePlayers.length < game.min_players) continue;

      // Cap at max players
      const group = eligiblePlayers.slice(0, game.max_players);

      // Score the group
      let score = 0;
      for (const userId of group) {
        const pref = preferences.find(p => p.user_id === userId && p.game_id === game.id);
        if (!pref) { score += 1; continue; } // default okay
        if (pref.top_game) score += 5;
        if (pref.preference === 'want') score += 3;
        else if (pref.preference === 'okay') score += 1;
      }

      if (score > bestScore) {
        bestScore = score;
        bestGame = game;
        bestGroup = group;
      }
    }

    if (!bestGame) return;

    // Create active game
    const activeGame = await pool.query(
      'INSERT INTO active_games (game_night_id, game_id, status) VALUES ($1, $2, $3) RETURNING *',
      [gameNightId, bestGame.id, 'pending']
    );

    // Add players to active game and set status to pending
    for (const userId of bestGroup) {
      await pool.query(
        'INSERT INTO active_game_players (active_game_id, user_id) VALUES ($1, $2)',
        [activeGame.rows[0].id, userId]
      );
      await pool.query(
        'UPDATE game_night_players SET status = $1 WHERE game_night_id = $2 AND user_id = $3',
        ['pending', gameNightId, userId]
      );
    }

    // Emit suggestion to the group
    io.to(`gamenight_${gameNightId}`).emit('game_suggestion', {
      activeGameId: activeGame.rows[0].id,
      game: bestGame,
      players: bestGroup
    });

  } catch (err) {
    console.error('Algorithm error:', err.message);
  }
};