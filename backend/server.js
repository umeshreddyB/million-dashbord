const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./db');
const { authenticate, requireAdmin, JWT_SECRET } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 5000;
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

app.use(cors());
app.use(express.json());

app.post('/api/auth/login', asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const user = await db.findUserByUsername(username);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  res.json({
    token,
    user: { id: user.id, username: user.username, role: user.role },
  });
}));

app.get('/api/auth/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

app.get('/api/users', authenticate, asyncHandler(async (req, res) => {
  const users = await db.getUsers();
  res.json(users);
}));

app.post('/api/users', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  if (username.length < 3) {
    return res.status(400).json({ error: 'Username must be at least 3 characters' });
  }

  if (password.length < 4) {
    return res.status(400).json({ error: 'Password must be at least 4 characters' });
  }

  if (await db.findUserByUsername(username)) {
    return res.status(409).json({ error: 'Username already exists' });
  }

  const user = await db.createUser(username, password);
  res.status(201).json(user);
}));

app.patch('/api/users/:id', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  if (!username && !password) {
    return res.status(400).json({ error: 'Provide username or password to update' });
  }

  if (username && username.length < 3) {
    return res.status(400).json({ error: 'Username must be at least 3 characters' });
  }

  if (password && password.length < 4) {
    return res.status(400).json({ error: 'Password must be at least 4 characters' });
  }

  if (username) {
    const existingUser = await db.findUserByUsername(username);
    if (existingUser && String(existingUser._id) !== String(req.params.id)) {
      return res.status(409).json({ error: 'Username already exists' });
    }
  }

  const updatedUser = await db.updateUser(req.params.id, { username, password });
  if (!updatedUser || updatedUser.role !== 'user') {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({
    id: String(updatedUser._id),
    username: updatedUser.username,
    role: updatedUser.role,
    created_at: updatedUser.created_at,
  });
}));

app.delete('/api/users/:id', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const deleted = await db.deleteUser(req.params.id);
  if (!deleted) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json({ message: 'User deleted' });
}));

app.get('/api/tasks', authenticate, asyncHandler(async (req, res) => {
  const { userId } = req.query;
  const tasks = await db.getTasks(userId);
  res.json(tasks.map(formatTask));
}));

app.post('/api/tasks', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const { title, description, assignedTo } = req.body;

  if (!title || !assignedTo) {
    return res.status(400).json({ error: 'Title and assigned user are required' });
  }

  const user = await db.findUserById(assignedTo);
  if (!user || user.role !== 'user') {
    return res.status(404).json({ error: 'User not found' });
  }

  const task = await db.createTask(title, description, assignedTo);
  res.status(201).json(formatTask(task));
}));

app.patch('/api/tasks/:id', authenticate, asyncHandler(async (req, res) => {
  const { isDone, completionNote } = req.body;
  const task = await db.findTaskById(req.params.id);

  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  if (req.user.role === 'admin') {
    return res.status(403).json({ error: 'Only the assigned user can mark a task as done' });
  }

  if (String(task.assigned_to) !== String(req.user.id)) {
    return res.status(403).json({ error: 'You can only update your own tasks' });
  }

  if (isDone === false) {
    return res.status(403).json({ error: 'You can only mark tasks as done, not undo them' });
  }

  const updated = await db.updateTask(task.id, isDone, completionNote);
  res.json(formatTask(updated));
}));

app.delete('/api/tasks/:id', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const deleted = await db.deleteTask(req.params.id);
  if (!deleted) {
    return res.status(404).json({ error: 'Task not found' });
  }
  res.json({ message: 'Task deleted' });
}));

function formatTask(task) {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    assignedTo: task.assigned_to,
    assignedUsername: task.assigned_username,
    isDone: Boolean(task.is_done),
    createdAt: task.created_at,
    completedAt: task.completed_at,
    completionNote: task.completion_note || null,
  };
}

app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({ error: 'Internal server error' });
});

async function startServer() {
  try {
    await db.initDatabase();
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
      console.log('Connected to MongoDB');
      console.log('Default admin: username=admin, password=admin123');
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
}

startServer();
