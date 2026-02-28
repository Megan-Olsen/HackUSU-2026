import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
  addGameToNight,
  getGamesForNight,
  setPreference,
  getUserLibrary,
  addGameToLibrary
} from '../controllers/gamesController.js';

const router = express.Router();

router.get('/library', authenticateToken, getUserLibrary);
router.post('/library/add', authenticateToken, addGameToLibrary);
router.post('/night/add', authenticateToken, addGameToNight);
router.get('/night/:game_night_id', authenticateToken, getGamesForNight);
router.post('/preference', authenticateToken, setPreference);

export default router;