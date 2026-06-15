const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

const MONGO_URI =
  process.env.MONGO_URI ||
  'mongodb+srv://divyah964_db_user:tiFlOmIbEHleK79Y@clustermilli.yxkbquc.mongodb.net/?appName=Clustermilli';
const LEGACY_DB_PATH = path.join(__dirname, 'data.json');

const userSchema = new mongoose.Schema(
  {
    username: { type: String, unique: true, required: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['admin', 'user'], required: true },
    created_at: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

const taskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    assigned_to: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    is_done: { type: Boolean, default: false },
    created_at: { type: Date, default: Date.now },
    completed_at: { type: Date, default: null },
    completion_note: { type: String, default: null },
  },
  { versionKey: false }
);

const User = mongoose.models.User || mongoose.model('User', userSchema);
const Task = mongoose.models.Task || mongoose.model('Task', taskSchema);

function mapTask(taskDoc) {
  const assignedUser = taskDoc.assigned_to || {};
  return {
    id: String(taskDoc._id),
    title: taskDoc.title,
    description: taskDoc.description || '',
    assigned_to: String(assignedUser._id || taskDoc.assigned_to),
    assigned_username: assignedUser.username || 'unknown',
    is_done: Boolean(taskDoc.is_done),
    created_at: taskDoc.created_at,
    completed_at: taskDoc.completed_at,
    completion_note: taskDoc.completion_note || null,
  };
}

async function migrateLegacyDataIfNeeded() {
  const existingUsers = await User.countDocuments();
  if (existingUsers > 0) return;

  if (!fs.existsSync(LEGACY_DB_PATH)) return;

  const raw = JSON.parse(fs.readFileSync(LEGACY_DB_PATH, 'utf8'));
  const idMap = new Map();

  for (const legacyUser of raw.users || []) {
    const userDoc = await User.create({
      username: legacyUser.username,
      password: legacyUser.password,
      role: legacyUser.role,
      created_at: legacyUser.created_at ? new Date(legacyUser.created_at) : new Date(),
    });
    if (legacyUser.id !== undefined) {
      idMap.set(String(legacyUser.id), String(userDoc._id));
    }
  }

  for (const legacyTask of raw.tasks || []) {
    const mappedUserId = idMap.get(String(legacyTask.assigned_to));
    if (!mappedUserId) continue;
    await Task.create({
      title: legacyTask.title,
      description: legacyTask.description || '',
      assigned_to: mappedUserId,
      is_done: Boolean(legacyTask.is_done),
      created_at: legacyTask.created_at ? new Date(legacyTask.created_at) : new Date(),
      completed_at: legacyTask.completed_at ? new Date(legacyTask.completed_at) : null,
      completion_note: legacyTask.completion_note || null,
    });
  }
}

const db = {
  async initDatabase() {
    await mongoose.connect(MONGO_URI);
    await migrateLegacyDataIfNeeded();

    const adminExists = await User.exists({ role: 'admin' });
    if (!adminExists) {
      const hash = bcrypt.hashSync('admin123', 10);
      await User.create({ username: 'admin', password: hash, role: 'admin' });
    }
  },

  async getUsers() {
    const users = await User.find({ role: 'user' }).sort({ username: 1 }).lean();
    return users.map((u) => ({
      id: String(u._id),
      username: u.username,
      role: u.role,
      created_at: u.created_at,
    }));
  },

  async findUserByUsername(username) {
    return User.findOne({ username }).lean();
  },

  async findUserById(id) {
    if (!mongoose.Types.ObjectId.isValid(String(id))) return null;
    return User.findById(String(id)).lean();
  },

  async createUser(username, password) {
    const hash = bcrypt.hashSync(password, 10);
    const user = await User.create({
      username,
      password: hash,
      role: 'user',
    });
    return {
      id: String(user._id),
      username: user.username,
      role: user.role,
      created_at: user.created_at,
    };
  },

  async updateUser(id, updates) {
    if (!mongoose.Types.ObjectId.isValid(String(id))) return null;
    const payload = {};
    if (updates.username) payload.username = updates.username;
    if (updates.password) payload.password = bcrypt.hashSync(updates.password, 10);

    if (Object.keys(payload).length === 0) {
      return this.findUserById(id);
    }

    await User.updateOne({ _id: String(id), role: 'user' }, payload);
    return this.findUserById(id);
  },

  async deleteUser(id) {
    if (!mongoose.Types.ObjectId.isValid(String(id))) return false;
    const userId = String(id);
    const userDelete = await User.deleteOne({ _id: userId, role: 'user' });
    if (userDelete.deletedCount === 0) return false;
    await Task.deleteMany({ assigned_to: userId });
    return true;
  },

  async getTasks(userId) {
    const filter = {};
    if (userId && mongoose.Types.ObjectId.isValid(String(userId))) {
      filter.assigned_to = String(userId);
    }

    const tasks = await Task.find(filter)
      .populate('assigned_to', 'username')
      .sort({ is_done: 1, created_at: -1 })
      .lean();

    return tasks.map(mapTask);
  },

  async findTaskById(id) {
    if (!mongoose.Types.ObjectId.isValid(String(id))) return null;
    const task = await Task.findById(String(id)).populate('assigned_to', 'username').lean();
    if (!task) return null;
    return mapTask(task);
  },

  async createTask(title, description, assignedTo) {
    const task = await Task.create({
      title,
      description: description || '',
      assigned_to: String(assignedTo),
    });
    const fullTask = await Task.findById(task._id).populate('assigned_to', 'username').lean();
    return mapTask(fullTask);
  },

  async updateTask(id, isDone, completionNote) {
    if (!mongoose.Types.ObjectId.isValid(String(id))) return null;
    await Task.updateOne(
      { _id: String(id) },
      {
        is_done: Boolean(isDone),
        completed_at: isDone ? new Date() : null,
        completion_note: isDone ? completionNote || null : null,
      }
    );
    return this.findTaskById(id);
  },

  async deleteTask(id) {
    if (!mongoose.Types.ObjectId.isValid(String(id))) return false;
    const result = await Task.deleteOne({ _id: String(id) });
    return result.deletedCount > 0;
  },
};

module.exports = db;
