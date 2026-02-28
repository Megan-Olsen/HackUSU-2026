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
    </div>
  );
}