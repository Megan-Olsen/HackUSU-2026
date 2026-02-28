import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
    createGameNight,
    joinGameNight,
    leaveGameNight,
    removePlayer,
    closeGameNight,
    getGameNight,
} from '../controllers/gameNightController.js';

const router = express.Router();

router.post('/create', authenticateToken, createGameNight);
router.post('/join', authenticateToken, joinGameNight);
router.put('/leave/:game_night_id', authenticateToken, leaveGameNight);
router.put('/remove/:game_night_id/:user_id', authenticateToken, removePlayer);
router.put('/close/:game_night_id', authenticateToken, closeGameNight);
router.get('/:id', authenticateToken, getGameNight);

export default router;