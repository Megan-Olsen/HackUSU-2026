import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [gameName, setGameName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  const [bggUsername, setBggUsername] = useState('');
const [bggMessage, setBggMessage] = useState('');
const [importing, setImporting] = useState(false);
const [bggResults, setBggResults] = useState([]);
const [library, setLibrary] = useState([]);
const [newLibGame, setNewLibGame] = useState({ title: '', min_players: 2, max_players: 4, avg_playtime: 30 });

  const createGameNight = async () => {
    try {
      const res = await axios.post('/api/gamenights/create', { name: gameName });
      navigate(`/gamenight/${res.data.id}`);
    } catch (err) {
      setError('Failed to create game night');
    }
  };

  const joinGameNight = async () => {
    try {
      const res = await axios.post('/api/gamenights/join', { invite_code: inviteCode.toUpperCase() });
      navigate(`/gamenight/${res.data.id}`);
    } catch (err) {
      setError('Game night not found');
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

useEffect(() => {
  fetchLibrary();
}, []);

  return (
    <div style={{ maxWidth: '500px', margin: '50px auto', padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>🎲 Game Night Guru</h1>
        <button onClick={logout}>Logout</button>
      </div>
      <p>Welcome, {user?.username}!</p>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      <div style={{ border: '1px solid #ccc', padding: '20px', marginBottom: '20px', borderRadius: '8px' }}>
        <h2>Host a Game Night</h2>
        <input
          type="text"
          placeholder="Game night name"
          value={gameName}
          onChange={e => setGameName(e.target.value)}
          style={{ display: 'block', width: '100%', marginBottom: '10px', padding: '8px' }}
        />
        <button onClick={createGameNight} style={{ width: '100%', padding: '10px' }}>
          Create Game Night
        </button>
      </div>

      <div style={{ border: '1px solid #ccc', padding: '20px', borderRadius: '8px' }}>
        <h2>Join a Game Night</h2>
        <input
          type="text"
          placeholder="Enter invite code"
          value={inviteCode}
          onChange={e => setInviteCode(e.target.value)}
          style={{ display: 'block', width: '100%', marginBottom: '10px', padding: '8px' }}
        />
        <button onClick={joinGameNight} style={{ width: '100%', padding: '10px' }}>
          Join Game Night
        </button>
      </div>
     <div style={{ border: '1px solid #ccc', padding: '20px', borderRadius: '8px', marginTop: '20px' }}>
  <h2>My Game Library</h2>
  {bggMessage && <p style={{ color: 'green' }}>{bggMessage}</p>}
  
  <input
    type="text"
    placeholder="Game title"
    value={newLibGame.title}
    onChange={e => setNewLibGame({ ...newLibGame, title: e.target.value })}
    style={{ display: 'block', width: '100%', marginBottom: '8px', padding: '8px' }}
  />
  <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
    <input
      type="number"
      placeholder="Min players"
      value={newLibGame.min_players}
      onChange={e => setNewLibGame({ ...newLibGame, min_players: parseInt(e.target.value) })}
      style={{ width: '50%', padding: '8px' }}
    />
    <input
      type="number"
      placeholder="Max players"
      value={newLibGame.max_players}
      onChange={e => setNewLibGame({ ...newLibGame, max_players: parseInt(e.target.value) })}
      style={{ width: '50%', padding: '8px' }}
    />
  </div>
  <input
    type="number"
    placeholder="Avg playtime (minutes)"
    value={newLibGame.avg_playtime}
    onChange={e => setNewLibGame({ ...newLibGame, avg_playtime: parseInt(e.target.value) })}
    style={{ display: 'block', width: '100%', marginBottom: '8px', padding: '8px' }}
  />
  <button onClick={async () => {
    try {
      await axios.post('/api/games/library/add', newLibGame);
      setBggMessage(`✅ Added ${newLibGame.title} to your library!`);
      setNewLibGame({ title: '', min_players: 2, max_players: 4, avg_playtime: 30 });
      fetchLibrary();
    } catch (err) {
      setBggMessage('❌ Failed to add game.');
    }
  }} style={{ width: '100%', padding: '10px', marginBottom: '15px' }}>
    ➕ Add to Library
  </button>

  <h3>Your Games ({library.length})</h3>
  {library.map(g => (
  <div key={g.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', borderBottom: '1px solid #eee' }}>
    <span><strong>{g.title}</strong> — {g.min_players}-{g.max_players} players, {g.avg_playtime} min</span>
    <button onClick={async () => {
      await axios.delete(`/api/games/library/${g.id}`);
      fetchLibrary();
    }} style={{ background: 'red', color: 'white', padding: '4px 8px' }}>
      🗑️
    </button>
  </div>
))}
</div>
    </div>
  );
}