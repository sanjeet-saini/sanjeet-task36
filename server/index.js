const path = require('path');
const fs = require('fs');
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

// Secret comes from the environment. In development a fallback is used,
// in production the server refuses to start without one.
const JWT_SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? null : 'dev_only_secret_change_me');
if (!JWT_SECRET) {
  console.error('JWT_SECRET environment variable is required in production');
  process.exit(1);
}

app.use(cors({ origin: process.env.CORS_ORIGIN || true }));
app.use(express.json({ limit: '10kb' }));

// NOTE: in-memory store — users are lost when the server restarts.
const users = [];

// Wrap async handlers so a thrown error goes to the error handler instead of crashing the process.
const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function readCredentials(body) {
  const { username, password } = body || {};
  if (typeof username !== 'string' || typeof password !== 'string') return null;
  const name = username.trim();
  if (!name || !password) return null;
  return { username: name, password };
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ message: 'Access token required' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Invalid or expired token' });
    req.user = user;
    next();
  });
}

app.post('/register', asyncHandler(async (req, res) => {
  const creds = readCredentials(req.body);
  if (!creds) return res.status(400).json({ message: 'Username and password are required' });
  if (creds.username.length > 50) return res.status(400).json({ message: 'Username is too long' });
  if (creds.password.length < 6 || creds.password.length > 72)
    return res.status(400).json({ message: 'Password must be 6-72 characters' });

  if (users.find(u => u.username === creds.username))
    return res.status(409).json({ message: 'User already exists' });

  const hashedPassword = await bcrypt.hash(creds.password, 10);
  users.push({ username: creds.username, password: hashedPassword });

  res.status(201).json({ message: 'User registered successfully' });
}));

app.post('/login', asyncHandler(async (req, res) => {
  const creds = readCredentials(req.body);
  if (!creds) return res.status(400).json({ message: 'Username and password are required' });

  const user = users.find(u => u.username === creds.username);
  if (!user) return res.status(401).json({ message: 'Invalid credentials' });

  const valid = await bcrypt.compare(creds.password, user.password);
  if (!valid) return res.status(401).json({ message: 'Invalid credentials' });

  const token = jwt.sign({ username: user.username }, JWT_SECRET, { expiresIn: '1h' });
  res.json({ token, username: user.username });
}));

app.get('/protected', authenticateToken, (req, res) => {
  res.json({ message: `Hello ${req.user.username}! You accessed a protected route.` });
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Serve the React build when it exists (single-service deployment).
const buildDir = path.join(__dirname, '..', 'client', 'build');
if (fs.existsSync(buildDir)) {
  app.use(express.static(buildDir));
  app.get('*', (req, res) => res.sendFile(path.join(buildDir, 'index.html')));
}

// Unknown API route
app.use((req, res) => res.status(404).json({ message: 'Not found' }));

// Central error handler — never leaks stack traces to the client.
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ message: 'Invalid JSON body' });
  if (err.type === 'entity.too.large') return res.status(413).json({ message: 'Request body too large' });
  console.error(err);
  res.status(500).json({ message: 'Internal server error' });
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
