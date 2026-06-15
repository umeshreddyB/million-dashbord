import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';

function CompletionModal({ task, onConfirm, onCancel }) {
  const [note, setNote] = useState('');

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h3>Mark Task as Done</h3>
        <div className="modal-task-name">{task.title}</div>
        <div className="form-group">
          <label>Completion note <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(required)</span></label>
          <textarea
            rows={3}
            placeholder="Describe what you did or how you completed this task..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            autoFocus
          />
        </div>
        <div className="modal-actions">
          <button className="btn btn-outline" onClick={onCancel}>Cancel</button>
          <button
            className="btn btn-primary"
            disabled={!note.trim()}
            onClick={() => onConfirm(note.trim())}
          >
            Mark as Done
          </button>
        </div>
      </div>
    </div>
  );
}

export default function UserDashboard() {
  const { user, logout } = useAuth();
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [error, setError] = useState('');
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [pendingTask, setPendingTask] = useState(null);

  useEffect(() => {
    api.getUsers().then(setUsers).catch((err) => setError(err.message));
  }, []);

  const selectUser = async (u) => {
    setSelectedUser(u);
    setLoadingTasks(true);
    setError('');
    try {
      const data = await api.getTasks(u.id);
      setTasks(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingTasks(false);
    }
  };

  const handleCheckboxClick = (task) => {
    if (task.isDone) return;
    if (task.assignedUsername !== user.username) {
      setError('You can only mark your own tasks as done.');
      return;
    }
    setPendingTask(task);
  };

  const handleConfirmDone = async (note) => {
    try {
      const updated = await api.updateTask(pendingTask.id, true, note);
      setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    } catch (err) {
      setError(err.message);
    } finally {
      setPendingTask(null);
    }
  };

  const isOwnTask = (task) => task.assignedUsername === user.username;

  return (
    <div className="app-layout">
      {pendingTask && (
        <CompletionModal
          task={pendingTask}
          onConfirm={handleConfirmDone}
          onCancel={() => setPendingTask(null)}
        />
      )}

      <header className="app-header">
        <div className="header-left">
          <div className="logo-small">✓</div>
          <div>
            <h1>Task Manager</h1>
            <span className="badge badge-user">User</span>
          </div>
        </div>
        <div className="header-right">
          <span className="username">Logged in as <strong>{user.username}</strong></span>
          <button className="btn btn-outline" onClick={logout}>Logout</button>
        </div>
      </header>

      <main className="app-main user-main">
        {error && (
          <div className="alert alert-error">
            {error}
            <button className="alert-close" onClick={() => setError('')}>×</button>
          </div>
        )}

        <div className="user-layout">
          <aside className="user-sidebar card">
            <h2>Team Members</h2>
            <p className="card-desc">Click a name to view their tasks</p>
            {users.length === 0 ? (
              <p className="empty-text">No users found.</p>
            ) : (
              <ul className="member-list">
                {users.map((u) => (
                  <li key={u.id}>
                    <button
                      className={`member-btn ${selectedUser?.id === u.id ? 'active' : ''} ${u.username === user.username ? 'is-me' : ''}`}
                      onClick={() => selectUser(u)}
                    >
                      <span className="user-avatar">{u.username[0].toUpperCase()}</span>
                      <span className="member-name">
                        {u.username}
                        {u.username === user.username && <span className="you-tag">You</span>}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </aside>

          <section className="user-tasks card">
            {!selectedUser ? (
              <div className="empty-state">
                <div className="empty-icon">👥</div>
                <h3>Select a team member</h3>
                <p>Choose a user from the list to see their assigned tasks.</p>
              </div>
            ) : loadingTasks ? (
              <div className="loading-inline">
                <div className="spinner" />
                <p>Loading tasks...</p>
              </div>
            ) : (
              <>
                <div className="tasks-header">
                  <h2>
                    Tasks for <span className="highlight">{selectedUser.username}</span>
                  </h2>
                  {selectedUser.username === user.username ? (
                    <span className="badge badge-own">Your tasks — check off when done</span>
                  ) : (
                    <span className="badge badge-view">View only</span>
                  )}
                </div>

                {tasks.length === 0 ? (
                  <p className="empty-text">No tasks assigned to {selectedUser.username}.</p>
                ) : (
                  <div className="task-list">
                    {tasks.map((task) => (
                      <div
                        key={task.id}
                        className={`task-item ${task.isDone ? 'done' : ''} ${!isOwnTask(task) ? 'readonly' : ''}`}
                      >
                        <div className="task-content">
                          {isOwnTask(task) && !task.isDone ? (
                            <label className="checkbox-label" onClick={(e) => { e.preventDefault(); handleCheckboxClick(task); }}>
                              <input type="checkbox" checked={false} readOnly />
                              <span className="task-title">{task.title}</span>
                            </label>
                          ) : (
                            <div className="task-title-row">
                              <span className={`status-dot ${task.isDone ? 'done' : 'pending'}`} />
                              <span className="task-title">{task.title}</span>
                            </div>
                          )}

                          {task.description && <p className="task-desc">{task.description}</p>}

                          {task.isDone && task.completionNote && (
                            <div className="task-note">
                              <strong>Note:</strong> {task.completionNote}
                            </div>
                          )}

                          <div className="task-meta">
                            {task.isDone && <span className="badge badge-done">Completed</span>}
                          </div>
                        </div>

                        {!isOwnTask(task) && !task.isDone && (
                          <span className="readonly-hint">Only {task.assignedUsername} can mark this done</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
