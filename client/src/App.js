import React, { useState } from 'react';

// Same-origin by default: in dev the CRA proxy forwards to :5000, in production
// the Express server serves this app. Override with REACT_APP_API_URL if hosted separately.
const API = process.env.REACT_APP_API_URL || '';

// Read the username from a stored token if it hasn't expired yet.
function userFromStoredToken() {
  try {
    const token = localStorage.getItem('token');
    if (!token) return null;
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      localStorage.removeItem('token');
      return null;
    }
    return payload.username || null;
  } catch {
    return null;
  }
}

function Auth({ onLogin }) {
  const [mode, setMode] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setMessage('');
    try {
      const res = await fetch(`${API}/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return setMessage(data.message || `Request failed (${res.status})`);

      if (mode === 'login') {
        localStorage.setItem('token', data.token);
        onLogin(data.username || username);
      } else {
        setMessage('Registered! You can now log in.');
        setMode('login');
        setPassword('');
      }
    } catch {
      setMessage('Server error. Is the backend running?');
    }
  };

  return (
    <div style={styles.card}>
      <h2>{mode === 'login' ? 'Login' : 'Register'}</h2>
      <form onSubmit={submit} style={styles.form}>
        <input
          style={styles.input}
          placeholder="Username"
          value={username}
          onChange={e => setUsername(e.target.value)}
          required
        />
        <input
          style={styles.input}
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />
        <button style={styles.btn} type="submit">
          {mode === 'login' ? 'Login' : 'Register'}
        </button>
      </form>
      {message && <p style={styles.msg}>{message}</p>}
      <p style={styles.toggle}>
        {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
        <span style={styles.link} onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setMessage(''); }}>
          {mode === 'login' ? 'Register' : 'Login'}
        </span>
      </p>
    </div>
  );
}

function Protected({ username, onLogout }) {
  const [result, setResult] = useState('');

  const fetchProtected = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API}/protected`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401 || res.status === 403) {
        localStorage.removeItem('token');
        onLogout();
        return;
      }
      setResult(data.message || JSON.stringify(data));
    } catch {
      setResult('Server error. Is the backend running?');
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    onLogout();
  };

  return (
    <div style={styles.card}>
      <h2>Welcome, {username}!</h2>
      <p>You are logged in. Your JWT is stored in localStorage.</p>
      <button style={styles.btn} onClick={fetchProtected}>
        Access Protected Route
      </button>
      {result && <p style={{ ...styles.msg, color: '#2d6a4f' }}>{result}</p>}
      <button style={{ ...styles.btn, background: '#e63946', marginTop: 12 }} onClick={logout}>
        Logout
      </button>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(userFromStoredToken);

  return (
    <div style={styles.container}>
      <h1 style={{ marginBottom: 24 }}>JWT Authentication Demo</h1>
      {user
        ? <Protected username={user} onLogout={() => setUser(null)} />
        : <Auth onLogin={setUser} />}
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f0f4f8',
    fontFamily: 'sans-serif',
  },
  card: {
    background: '#fff',
    borderRadius: 10,
    padding: '32px 40px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
    minWidth: 320,
    textAlign: 'center',
  },
  form: { display: 'flex', flexDirection: 'column', gap: 12 },
  input: {
    padding: '10px 14px',
    borderRadius: 6,
    border: '1px solid #ccc',
    fontSize: 15,
    outline: 'none',
  },
  btn: {
    padding: '10px 0',
    borderRadius: 6,
    border: 'none',
    background: '#457b9d',
    color: '#fff',
    fontSize: 15,
    cursor: 'pointer',
    fontWeight: 600,
  },
  msg: { marginTop: 12, color: '#e63946' },
  toggle: { marginTop: 16, fontSize: 14 },
  link: { color: '#457b9d', cursor: 'pointer', fontWeight: 600 },
};
