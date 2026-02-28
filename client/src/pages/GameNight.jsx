import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import axios from 'axios';

export default function GameNight() {
  const { id } = useParams();
  const { user } = useAuth();
  const { socket } = useSocket();

  const [gameNight, setGameNight] = useState(null);
  const [players, setPlayers] = useState([]);
  const [games, setGames] = useState([]);
  const [suggestion, setSuggestion] = useState(null);
  const [message, setMessage] = useState('');

  // Add game form
  const [newGame, setNewGame] = useState({ title: '', min_players: 2, max_players: 4, avg_playtime: 30 });

  useEffect(() => {
    fetchGameNight();
    fetchGames();
    if (socket) {
      socket.emit('join_room', { gameNightId: id });

      socket.on('game_suggestion', (data) => {
        if (data.players.includes(user?.id)) {
          setSuggestion(data);
        }
      });

      socket.on('game_confirmed', () => {
        setSuggestion(null);
        setMessage('Game confirmed! Have fun! 🎲');
        fetchGameNight();
      });

      socket.on('game_completed', () => {
        setMessage('Game complete! Finding next game...');
        fetchGameNight();
        fetchGames();
      });

      socket.on('player_declined', ({ remainingPlayers }) => {
        if (remainingPlayers.includes(user?.id)) {
          setMessage('A player declined. Would you still like to play with fewer people?');
        } else {
          setSuggestion(null);
        }
      });

      return () => {
        socket.off('game_suggestion');
        socket.off('game_confirmed');
        socket.off('game_completed');
        socket.off('player_declined');
      };
    }
  }, [socket, id]);

  const fetchGameNight = async () => {
    try {
      const res = await axios.get(`/api/gamenights/${id}`);
      setGameNight(res.data.gameNight);
      setPlayers(res.data.players);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchGames = async () => {
    try {
      const res = await axios.get(`/api/games/night/${id}`);
      setGames(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const addGame = async () => {
    try {
      // First add to library
      const gameRes = await axios.post('/api/games/library/add', newGame);
      // Then add to night
      await axios.post('/api/games/night/add', {
        game_night_id: id,
        game_id: gameRes.data.id
      });
      setNewGame({ title: '', min_players: 2, max_players: 4, avg_playtime: 30 });
      fetchGames();
    } catch (err) {
      console.error(err);
    }
  };

  const setPreference = async (gameId, preference, topGame = false) => {
    try {
      await axios.post('/api/games/preference', {
        game_night_id: id,
        game_id: gameId,
        preference,
        top_game: topGame
      });
      setMessage('Preference saved!');
    } catch (err) {
      console.error(err);
    }
  };

  const acceptGame = () => {
    socket.emit('accept_game', {
      activeGameId: suggestion.activeGameId,
      userId: user.id,
      gameNightId: id
    });
    setSuggestion(null);
    setMessage('Accepted! Waiting for others...');
  };

  const declineGame = () => {
    socket.emit('decline_game', {
      activeGameId: suggestion.activeGameId,
      userId: user.id,
      gameNightId: id
    });
    setSuggestion(null);
  };

  const findGame = () => {
    socket.emit('find_game', { gameNightId: id });
  };

  const completeGame = (activeGameId) => {
    socket.emit('complete_game', { activeGameId, gameNightId: id });
  };

  return (
    <div style={{ maxWidth: '600px', margin: '30px auto', padding: '20px' }}>
      <h1>🎲 {gameNight?.name}</h1>
      <p>Invite Code: <strong>{gameNight?.invite_code}</strong></p>

      {message && <p style={{ color: 'green' }}>{message}</p>}

      {/* Game Suggestion */}
      {suggestion && (
        <div style={{ border: '2px solid green', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
          <h2>🎯 Suggested Game: {suggestion.game.title}</h2>
          <p>Players: {suggestion.players.length}</p>
          <button onClick={acceptGame} style={{ marginRight: '10px', padding: '10px 20px', background: 'green', color: 'white' }}>
            Accept ✅
          </button>
          <button onClick={declineGame} style={{ padding: '10px 20px', background: 'red', color: 'white' }}>
            Decline ❌
          </button>
        </div>
      )}

      {/* Players */}
      <div style={{ border: '1px solid #ccc', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
        <h2>Players ({players.length})</h2>
        {players.map(p => (
          <div key={p.user_id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
            <span>{p.username} — {p.status}</span>
          </div>
        ))}
      </div>

      {/* Games */}
      <div style={{ border: '1px solid #ccc', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
        <h2>Games Tonight</h2>
        {games.map(g => (
          <div key={g.id} style={{ marginBottom: '15px', padding: '10px', border: '1px solid #eee', borderRadius: '4px' }}>
            <strong>{g.title}</strong> ({g.min_players}-{g.max_players} players)
            <div style={{ marginTop: '5px' }}>
              <button onClick={() => setPreference(g.id, 'want')} style={{ marginRight: '5px' }}>⭐ Want</button>
              <button onClick={() => setPreference(g.id, 'okay')} style={{ marginRight: '5px' }}>👍 Okay</button>
              <button onClick={() => setPreference(g.id, 'skip')} style={{ marginRight: '5px' }}>❌ Skip</button>
              <button onClick={() => setPreference(g.id, 'want', true)}>🏆 Top Game</button>
            </div>
          </div>
        ))}

        {/* Add Game */}
        <h3>Add a Game</h3>
        <input
          placeholder="Game title"
          value={newGame.title}
          onChange={e => setNewGame({ ...newGame, title: e.target.value })}
          style={{ display: 'block', width: '100%', marginBottom: '5px', padding: '8px' }}
        />
        <input
          type="number"
          placeholder="Min players"
          value={newGame.min_players}
          onChange={e => setNewGame({ ...newGame, min_players: parseInt(e.target.value) })}
          style={{ width: '48%', marginRight: '4%', marginBottom: '5px', padding: '8px' }}
        />
        <input
          type="number"
          placeholder="Max players"
          value={newGame.max_players}
          onChange={e => setNewGame({ ...newGame, max_players: parseInt(e.target.value) })}
          style={{ width: '48%', marginBottom: '5px', padding: '8px' }}
        />
        <button onClick={addGame} style={{ width: '100%', padding: '10px', marginTop: '5px' }}>
          Add Game
        </button>
      </div>

      {/* Find Game Button */}
      <button onClick={findGame} style={{ width: '100%', padding: '15px', fontSize: '18px', marginBottom: '10px' }}>
        🎲 Find a Game
      </button>
    </div>
  );
}