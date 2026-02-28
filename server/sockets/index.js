import { runMatchingAlgorithm } from './algorithm.js';
import pool from '../db/index.js';

export const initializeSockets = (io) => {
  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Join a game night room
    socket.on('join_room', ({ gameNightId }) => {
      socket.join(`gamenight_${gameNightId}`);
      console.log(`User joined room: gamenight_${gameNightId}`);
    });

    // Leave a game night room
    socket.on('leave_room', ({ gameNightId }) => {
      socket.leave(`gamenight_${gameNightId}`);
    });

    // Player accepts a game suggestion
    socket.on('accept_game', async ({ activeGameId, userId, gameNightId }) => {
      try {
        await pool.query(
          'UPDATE active_game_players SET accepted = true WHERE active_game_id = $1 AND user_id = $2',
          [activeGameId, userId]
        );

        // Check if all players accepted
        const result = await pool.query(
          'SELECT * FROM active_game_players WHERE active_game_id = $1',
          [activeGameId]
        );
        const allAccepted = result.rows.every(p => p.accepted);

        if (allAccepted) {
          await pool.query(
            'UPDATE active_games SET status = $1 WHERE id = $2',
            ['active', activeGameId]
          );
          result.rows.forEach(async (p) => {
            await pool.query(
              'UPDATE game_night_players SET status = $1 WHERE game_night_id = $2 AND user_id = $3',
              ['playing', gameNightId, p.user_id]
            );
          });
          io.to(`gamenight_${gameNightId}`).emit('game_confirmed', { activeGameId });
        }
      } catch (err) {
        console.error('Accept error:', err.message);
      }
    });

    // Player declines a game suggestion
    socket.on('decline_game', async ({ activeGameId, userId, gameNightId }) => {
      try {
        // Get the game id
        const gameResult = await pool.query(
          'SELECT game_id FROM active_games WHERE id = $1',
          [activeGameId]
        );
        const gameId = gameResult.rows[0].game_id;

        // Set preference to not_tonight for this player
        await pool.query(
          `INSERT INTO player_game_preferences (game_night_id, user_id, game_id, preference)
           VALUES ($1, $2, $3, 'not_tonight')
           ON CONFLICT (game_night_id, user_id, game_id)
           DO UPDATE SET preference = 'not_tonight'`,
          [gameNightId, userId, gameId]
        );

        // Put declining player back to waiting
        await pool.query(
          'UPDATE game_night_players SET status = $1 WHERE game_night_id = $2 AND user_id = $3',
          ['waiting', gameNightId, userId]
        );

        // Ask remaining players if they want to play with fewer
        const remaining = await pool.query(
          'SELECT user_id FROM active_game_players WHERE active_game_id = $1 AND user_id != $2',
          [activeGameId, userId]
        );

        io.to(`gamenight_${gameNightId}`).emit('player_declined', {
          activeGameId,
          declinedUserId: userId,
          remainingPlayers: remaining.rows.map(r => r.user_id)
        });

      } catch (err) {
        console.error('Decline error:', err.message);
      }
    });

    // Complete a game
    socket.on('complete_game', async ({ activeGameId, gameNightId }) => {
      try {
        await pool.query(
          'UPDATE active_games SET status = $1, completed_at = NOW() WHERE id = $2',
          ['completed', activeGameId]
        );

        // Get players in the completed game
        const players = await pool.query(
          'SELECT user_id FROM active_game_players WHERE active_game_id = $1',
          [activeGameId]
        );

        // Return all players to waiting pool
        for (const player of players.rows) {
          await pool.query(
            'UPDATE game_night_players SET status = $1 WHERE game_night_id = $2 AND user_id = $3',
            ['waiting', gameNightId, player.user_id]
          );
        }

        io.to(`gamenight_${gameNightId}`).emit('game_completed', { activeGameId });

        // Re-run algorithm
        await runMatchingAlgorithm(gameNightId, io);

      } catch (err) {
        console.error('Complete game error:', err.message);
      }
    });

    // Find a game manually
    socket.on('find_game', async ({ gameNightId }) => {
      await runMatchingAlgorithm(gameNightId, io);
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
    });
  });
};