import pool from '../db/index.js';
import { nanoid } from 'nanoid';

export const createGameNight = async (req, res) => {
    const {name} = req.body;
    const host_id = req.user.id;
    try {
        const invite_code = nanoid(6).toUpperCase();
        const result = await pool.query(
            'INSERT INTO game_nights (host_id, name, invite_code) VALUES ($1, $2, $3) RETURNING *',
            [host_id, name, invite_code]
        );
        const gameNight = result.rows[0];
        await pool.query(
            'INSERT INTO game_night_players (game_night_id, user_id, status) VALUES ($1, $2, $3)',
            [gameNight.id, host_id, 'waiting']
        );
        res.json(gameNight);
    } catch (err) {
        res.status(500).json({error: err.message});
    }
};

export const joinGameNight = async (req, res) => {
    const { invite_code } = req.body;
    const user_id = req.user.id;
    try {
        const result = await pool.query(
            'SELECT * FROM game_nights WHERE invite_code = $1 AND status = $2',
            [invite_code, 'active']
        );
        if (!result.rows[0]) return res.status(404).json({ error: 'Game Night not found'});
        const gameNight = result.rows[0];
        await pool.query(
            'INSERT INTO game_night_players (game_night_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [gameNight.id, user_id] 
        );
        res.json(gameNight);
    } catch (err) {
        res.status(500).json({ error: err.message});
    }
};

export const leaveGameNight = async (req, res) => {
  const { game_night_id } = req.params;
  const user_id = req.user.id;
  try {
    await pool.query(
      'UPDATE game_night_players SET status = $1 WHERE game_night_id = $2 AND user_id = $3',
      ['left', game_night_id, user_id]
    );
    res.json({ message: 'Left game night' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const removePlayer = async (req, res) => {
    const { game_night_id, user_id } = req.params;
    const host_id = req.user.id;
    try { 
        const night = await pool.query(
            'SELECT * FROM game_nights WHERE id = $1 AND host_id =$2',
            [game_night_id, host_id]
        );
        if (!night.rows[0]) return res.status(403).json({ error: 'Not authorized'}); 
        await pool.query(
            'UPDATE game_night_players SET status = $1 WHERE game_night_id = $2 and user_id = $3',
            ['left', game_night_id, user_id]
        );
        res.json({ message: 'Player removed'});
    } catch (err){
        res.status(500).json({ error: err.message});
    }
};

export const closeGameNight = async (req, res) => {
    const { game_night_id } = req.params;
    const host_id = req.user.id;
    try {
        const result = await pool.query(
            'SELECT * FROM game_nights WHERE id = $1 AND host_id = $2',
            [game_night_id, host_id]
        );
        if (!result.rows[0]) return res.status(403).json({ error: 'Not authorized' });
        await pool.query(
            'UPDATE game_nights SET status = $1 WHERE id = $2',
            ['closed', game_night_id]
        );
        res.json({ message: 'Game Night closed' });
    }catch (err) {
        res.status(500).json({ error: err.message});
    }
};

export const getGameNight = async (req, res) => {
  const { id } = req.params;
  try {
    const gameNight = await pool.query(
      'SELECT * FROM game_nights WHERE id = $1',
      [id]
    );
    const players = await pool.query(
      `SELECT gnp.*, u.username FROM game_night_players gnp
       JOIN users u ON gnp.user_id = u.id
       WHERE gnp.game_night_id = $1 AND gnp.status != 'left'`,
      [id]
    );
    res.json({ gameNight: gameNight.rows[0], players: players.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


