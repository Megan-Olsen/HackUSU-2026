import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  const [preferences, setPreferences] = useState({});
  const [activeGames, setActiveGames] = useState([]);
  const [library, setLibrary] = useState([]);
  const [playerDeclined, setPlayerDeclined] = useState(null);

  const isHost = gameNight?.host_id === parseInt(user?.id);
  const navigate = useNavigate();

  // Add game form
  const [newGame, setNewGame] = useState({ title: '', min_players: 2, max_players: 4, avg_playtime: 30 });

  useEffect(() => {
    fetchGameNight();
    fetchGames();
    fetchActiveGames();
    fetchLibrary();
    if (socket) {
      socket.emit('join_room', { gameNightId: id });

      socket.on('game_suggestion', (data) => {
        console.log('Suggestion received:', data);
        console.log('Current user id:', user?.id);
        if (data.players.map(p => parseInt(p)).includes(parseInt(user?.id))) {
          setSuggestion(data);
        }
      });



      socket.on('game_confirmed', () => {
        setSuggestion(null);
        setMessage('Game confirmed! Have fun! 🎲');
        fetchGameNight();
        fetchActiveGames();
      });

      socket.on('game_completed', () => {
        setMessage('Game complete! Finding next game...');
        fetchGameNight();
        fetchGames();
        fetchActiveGames();
      });

      socket.on('player_declined', ({ activeGameId, remainingPlayers }) => {
  if (remainingPlayers.map(p => parseInt(p)).includes(parseInt(user?.id))) {
    setPlayerDeclined({ activeGameId, remainingPlayers });
    setMessage('');
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
    // Fetch preferences
    const prefsRes = await axios.get(`/api/games/preferences/${id}`);
    const prefsMap = {};
    prefsRes.data.forEach(p => {
      prefsMap[p.game_id] = { preference: p.preference, top_game: p.top_game };
    });
    setPreferences(prefsMap);
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
    setPreferences(prev => ({ ...prev, [gameId]: { preference, top_game: topGame } }));
    setMessage('Preference saved!');
  } catch (err) {
    console.error(err);
  }
};

  const fetchActiveGames = async () => {
  try {
    const res = await axios.get(`/api/games/active/${id}`);
    console.log('Active games:', res.data);
    setActiveGames(res.data);
  } catch (err) {
    console.error('Active games error:',err);
  }
};

const fetchLibrary = async () => {
  try {
    const res = await axios.get('/api/games/library');
    setLibrary(res.data);
  } catch (err) {
    console.error(err);
  }
};

const removeGameFromNight = async (gameId) => {
  try {
    await axios.delete(`/api/games/night/${id}/${gameId}`);
    fetchGames();
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

        <div style={{ marginBottom: '20px' }}>
  {isHost ? (
    <button 
      onClick={async () => {
        await axios.put(`/api/gamenights/close/${id}`);
        navigate('/dashboard');
      }}
      style={{ padding: '10px 20px', background: 'red', color: 'white', marginRight: '10px' }}
    >
      🔒 Close Game Night
    </button>
  ) : (
    <button 
      onClick={async () => {
        await axios.put(`/api/gamenights/leave/${id}`);
        navigate('/dashboard');
      }}
      style={{ padding: '10px 20px', background: 'orange', color: 'white' }}
    >
      🚪 Leave Game Night
    </button>
  )}
</div>

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
      {activeGames.filter(g => g.status === 'active').map(g => (
        <div key={g.id} style={{ border: '2px solid blue', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
        <h2>🎮 Now Playing: {g.title}</h2>
        <button onClick={() => completeGame(g.id)} style={{ padding: '10px 20px', background: 'blue', color: 'white' }}>
            ✅ Complete Game
        </button>
        </div>
    ))}

    {playerDeclined && (
  <div style={{ border: '2px solid orange', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
    <h2>⚠️ A player declined</h2>
    <p>Would you still like to play with fewer people?</p>
    <button onClick={() => {
      socket.emit('accept_game', {
        activeGameId: playerDeclined.activeGameId,
        userId: user.id,
        gameNightId: id
      });
      setPlayerDeclined(null);
      setMessage('Accepted! Waiting for others...');
    }} style={{ marginRight: '10px', padding: '10px 20px', background: 'green', color: 'white' }}>
      Yes ✅
    </button>
    <button onClick={() => {
      socket.emit('decline_game', {
        activeGameId: playerDeclined.activeGameId,
        userId: user.id,
        gameNightId: id
      });
      setPlayerDeclined(null);
    }} style={{ padding: '10px 20px', background: 'red', color: 'white' }}>
      No ❌
    </button>
  </div>
)}

      {/* Players */}
      <div style={{ border: '1px solid #ccc', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
        <h2>Players ({players.length})</h2>
        {players.map(p => (
  <div key={p.user_id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
    <span>{p.username} — {p.status}</span>
    {isHost && p.user_id !== parseInt(user?.id) && (
      <button
        onClick={async () => {
          await axios.put(`/api/gamenights/remove/${id}/${p.user_id}`);
          fetchGameNight();
        }}
        style={{ padding: '3px 8px', background: 'red', color: 'white', fontSize: '12px' }}
      >
        Remove
      </button>
    )}
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
                <button onClick={() => setPreference(g.id, 'want')} style={{ marginRight: '5px', background: preferences[g.id]?.preference === 'want' ? 'gold' : '' }}>⭐ Want</button>
                <button onClick={() => setPreference(g.id, 'okay')} style={{ marginRight: '5px', background: preferences[g.id]?.preference === 'okay' && !preferences[g.id]?.top_game ? 'lightblue' : '' }}>👍 Okay</button>
                <button onClick={() => setPreference(g.id, 'skip')} style={{ marginRight: '5px', background: preferences[g.id]?.preference === 'skip' ? 'lightcoral' : '' }}>❌ Skip</button>
                <button onClick={() => setPreference(g.id, 'want', true)} style={{ background: preferences[g.id]?.top_game ? 'orange' : '' }}>🏆 Top Game</button>
            </div>
          </div>
        ))}

        {/* Add Game */}
        <h3>Add from Your Library</h3>
<button onClick={async () => {
  for (const g of library) {
    await axios.post('/api/games/night/add', { game_night_id: id, game_id: g.id });
  }
  fetchGames();
}} style={{ width: '100%', padding: '8px', marginBottom: '10px' }}>
  ➕ Add All My Games
</button>
{library.map(g => {
  const inNight = games.some(ng => ng.id === g.id);
  return (
    <div key={g.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px', borderBottom: '1px solid #eee' }}>
      <span>{g.title} ({g.min_players}-{g.max_players} players)</span>
      {inNight ? (
        <button onClick={() => removeGameFromNight(g.id)} style={{ background: 'red', color: 'white', padding: '4px 8px' }}>
          ➖
        </button>
      ) : (
        <button onClick={async () => {
          await axios.post('/api/games/night/add', { game_night_id: id, game_id: g.id });
          fetchGames();
        }}>➕</button>
      )}
    </div>
  );
})}

<h3>Add a New Game</h3>
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
  Add New Game
</button>
      </div>

      {/* Find Game Button */}
      <button onClick={findGame} style={{ width: '100%', padding: '15px', fontSize: '18px', marginBottom: '10px' }}>
        🎲 Find a Game
      </button>
    </div>
  );
}