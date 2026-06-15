const API_BASE = '/api';

function getToken() {
  return localStorage.getItem('token');
}

async function request(endpoint, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || 'Something went wrong');
  }

  return data;
}

export const api = {
  login: (username, password) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  getUsers: () => request('/users'),

  createUser: (username, password) =>
    request('/users', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  updateUser: (id, username, password) =>
    request(`/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ username, password }),
    }),

  deleteUser: (id) =>
    request(`/users/${id}`, {
      method: 'DELETE',
    }),

  getTasks: (userId) => request(userId ? `/tasks?userId=${userId}` : '/tasks'),

  createTask: (title, description, assignedTo) =>
    request('/tasks', {
      method: 'POST',
      body: JSON.stringify({ title, description, assignedTo }),
    }),

  updateTask: (id, isDone, completionNote) =>
    request(`/tasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ isDone, completionNote }),
    }),

  deleteTask: (id) =>
    request(`/tasks/${id}`, {
      method: 'DELETE',
    }),
};
