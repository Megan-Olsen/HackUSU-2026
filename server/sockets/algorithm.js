import pool from '../db/index.js';

export const runMatchingAlgorithm = async (gameNightId, io) => {
  try {
    console.log('Algorithm running for game night:', gameNightId);
    const playersResult = await pool.query(
      'SELECT user_id FROM game_night_players WHERE game_night_id = $1 AND status = $2',
      [parseInt(gameNightId), 'waiting']
    );
    console.log('Players result:', playersResult.rows);
    const waitingPlayers = playersResult.rows.map(r => r.user_id);
    if (waitingPlayers.length < 2) return;

    console.log('Waiting players:', waitingPlayers);

    const gamesResult = await pool.query(
      'SELECT g.* FROM games g JOIN game_night_games gng ON g.id = gng.game_id WHERE gng.game_night_id = $1',
      [parseInt(gameNightId)]
    );
    const games = gamesResult.rows;
    console.log('Games available:', games.length);

    const prefsResult = await pool.query(
      `SELECT * FROM player_game_preferences 
       WHERE game_night_id = $1 AND user_id = ANY($2)`,
      [gameNightId, waitingPlayers]
    );
    const preferences = prefsResult.rows;

    let bestScore = -1;
    let bestGame = null;
    let bestGroup = [];

    for (const game of games) {
      const eligiblePlayers = waitingPlayers.filter(userId => {
        const pref = preferences.find(p => p.user_id === userId && p.game_id === game.id);
        if (!pref) return true;
        return pref.preference !== 'skip' && pref.preference !== 'not_tonight';
      });

      if (eligiblePlayers.length < game.min_players) continue;

      // Sort eligible players by their preference score for this game
      const scoredPlayers = eligiblePlayers.map(userId => {
        const pref = preferences.find(p => p.user_id === userId && p.game_id === game.id);
        let score = 1;
        if (pref?.top_game) score += 5;
        if (pref?.preference === 'want') score += 3;
        else if (pref?.preference === 'okay') score += 1;
        return { userId, score };
      });

      scoredPlayers.sort((a, b) => b.score - a.score);

      // Take highest scoring players up to max
      const group = scoredPlayers.slice(0, game.max_players).map(p => p.userId);

      if (group.length < game.min_players) continue;

      // Score the whole group
      let score = 0;
      for (const { score: playerScore } of scoredPlayers.slice(0, game.max_players)) {
        score += playerScore;
      }

      if (score > bestScore) {
        bestScore = score;
        bestGame = game;
        bestGroup = group;
      }
    }

    console.log('Best game:', bestGame);
    console.log('Best group:', bestGroup);

    if (!bestGame) return;

    const activeGame = await pool.query(
      'INSERT INTO active_games (game_night_id, game_id, status) VALUES ($1, $2, $3) RETURNING *',
      [gameNightId, bestGame.id, 'pending']
    );

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

    io.to(`gamenight_${gameNightId}`).emit('game_suggestion', {
      activeGameId: activeGame.rows[0].id,
      game: bestGame,
      players: bestGroup
    });

  } catch (err) {
    console.error('Algorithm error FULL:', err);
  }
};