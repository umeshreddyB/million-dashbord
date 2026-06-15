import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [users, setUsers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [newUser, setNewUser] = useState({ username: '', password: '' });
  const [editUser, setEditUser] = useState({ id: '', username: '', password: '' });
  const [newTask, setNewTask] = useState({ title: '', description: '', assignedTo: '' });

  const loadData = async () => {
    try {
      const [usersData, tasksData] = await Promise.all([api.getUsers(), api.getTasks()]);
      setUsers(usersData);
      setTasks(tasksData);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showSuccess = (msg) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.createUser(newUser.username, newUser.password);
      setNewUser({ username: '', password: '' });
      showSuccess(`User "${newUser.username}" created. Share credentials with them.`);
      loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.createTask(newTask.title, newTask.description, newTask.assignedTo);
      setNewTask({ title: '', description: '', assignedTo: '' });
      showSuccess('Task assigned successfully.');
      loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleStartEditUser = (u) => {
    setEditUser({ id: u.id, username: u.username, password: '' });
    setError('');
  };

  const handleCancelEditUser = () => {
    setEditUser({ id: '', username: '', password: '' });
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.updateUser(editUser.id, editUser.username, editUser.password || undefined);
      showSuccess(`User "${editUser.username}" updated.`);
      handleCancelEditUser();
      loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteUser = async (u) => {
    if (!confirm(`Delete user "${u.username}"? All assigned tasks will be deleted.`)) return;
    setError('');
    try {
      await api.deleteUser(u.id);
      showSuccess(`User "${u.username}" deleted.`);
      if (editUser.id === u.id) handleCancelEditUser();
      if (newTask.assignedTo === u.id) {
        setNewTask((prev) => ({ ...prev, assignedTo: '' }));
      }
      loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteTask = async (id) => {
    if (!confirm('Delete this task?')) return;
    try {
      await api.deleteTask(id);
      loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="app-layout">
      <header className="app-header">
        <div className="header-left">
          <div className="logo-small">✓</div>
          <div>
            <h1>Admin Panel</h1>
            <span className="badge badge-admin">Admin</span>
          </div>
        </div>
        <div className="header-right">
          <span className="username">{user.username}</span>
          <button className="btn btn-outline" onClick={logout}>
            Logout
          </button>
        </div>
      </header>

      <main className="app-main">
        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <div className="grid-2">
          <section className="card">
            <h2>Create User</h2>
            <p className="card-desc">Create accounts and share username/password with users.</p>
            <form onSubmit={handleCreateUser} className="form-stack">
              <div className="form-group">
                <label>Username</label>
                <input
                  type="text"
                  value={newUser.username}
                  onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                  placeholder="e.g. john"
                  required
                  minLength={3}
                />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input
                  type="text"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  placeholder="Set a password"
                  required
                  minLength={4}
                />
              </div>
              <button type="submit" className="btn btn-primary">Create User</button>
            </form>

            <div className="user-list">
              <h3>Users ({users.length})</h3>
              {users.length === 0 ? (
                <p className="empty-text">No users yet. Create one above.</p>
              ) : (
                <ul>
                  {users.map((u) => (
                    <li key={u.id}>
                      <span className="user-avatar">{u.username[0].toUpperCase()}</span>
                      <span style={{ flex: 1 }}>{u.username}</span>
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={() => handleStartEditUser(u)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        onClick={() => handleDeleteUser(u)}
                      >
                        Delete
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {editUser.id && (
              <form onSubmit={handleUpdateUser} className="form-stack" style={{ marginTop: '1rem' }}>
                <h3 style={{ marginBottom: '0.75rem' }}>Edit User</h3>
                <div className="form-group">
                  <label>Username</label>
                  <input
                    type="text"
                    value={editUser.username}
                    onChange={(e) => setEditUser((prev) => ({ ...prev, username: e.target.value }))}
                    required
                    minLength={3}
                  />
                </div>
                <div className="form-group">
                  <label>New Password (optional)</label>
                  <input
                    type="text"
                    value={editUser.password}
                    onChange={(e) => setEditUser((prev) => ({ ...prev, password: e.target.value }))}
                    placeholder="Leave blank to keep current password"
                    minLength={4}
                  />
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button type="submit" className="btn btn-primary">Save User</button>
                  <button type="button" className="btn btn-outline" onClick={handleCancelEditUser}>
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </section>

          <section className="card">
            <h2>Assign Task</h2>
            <p className="card-desc">Add a task and assign it to a user.</p>
            <form onSubmit={handleCreateTask} className="form-stack">
              <div className="form-group">
                <label>Task Title</label>
                <input
                  type="text"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  placeholder="What needs to be done?"
                  required
                />
              </div>
              <div className="form-group">
                <label>Description (optional)</label>
                <textarea
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  placeholder="Additional details..."
                  rows={3}
                />
              </div>
              <div className="form-group">
                <label>Assign To</label>
                <select
                  value={newTask.assignedTo}
                  onChange={(e) => setNewTask({ ...newTask, assignedTo: e.target.value })}
                  required
                >
                  <option value="">Select user</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.username}
                    </option>
                  ))}
                </select>
              </div>
              <button type="submit" className="btn btn-primary" disabled={users.length === 0}>
                Assign Task
              </button>
            </form>
          </section>
        </div>

        <section className="card">
          <h2>All Tasks</h2>
          {tasks.length === 0 ? (
            <p className="empty-text">No tasks assigned yet.</p>
          ) : (
            <div className="task-list">
              {tasks.map((task) => (
                <div key={task.id} className={`task-item ${task.isDone ? 'done' : ''}`}>
                  <div className="task-content">
                    <div className="task-title-row">
                      <span className={`status-dot ${task.isDone ? 'done' : 'pending'}`} />
                      <span className="task-title">{task.title}</span>
                    </div>
                    {task.description && <p className="task-desc">{task.description}</p>}
                    {task.isDone && task.completionNote && (
                      <div className="task-note">
                        <strong>Note:</strong> {task.completionNote}
                      </div>
                    )}
                    <div className="task-meta">
                      <span className="badge">@{task.assignedUsername}</span>
                      {task.isDone ? (
                        <span className="badge badge-done">Completed</span>
                      ) : (
                        <span className="badge">Pending</span>
                      )}
                    </div>
                  </div>
                  <button className="btn btn-danger btn-sm" onClick={() => handleDeleteTask(task.id)}>
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
