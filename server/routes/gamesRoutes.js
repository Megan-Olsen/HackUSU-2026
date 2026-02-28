import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
  addGameToNight,
  getGamesForNight,
  setPreference,
  getUserLibrary,
  addGameToLibrary,
  getPreferences,
  getActiveGames
} from '../controllers/gamesController.js';

const router = express.Router();

router.get('/library', authenticateToken, getUserLibrary);
router.post('/library/add', authenticateToken, addGameToLibrary);
router.post('/night/add', authenticateToken, addGameToNight);
router.get('/night/:game_night_id', authenticateToken, getGamesForNight);
router.post('/preference', authenticateToken, setPreference);
router.get('/preferences/:game_night_id', authenticateToken, getPreferences);
router.get('/active/:game_night_id', authenticateToken, getActiveGames);

export default router;