const API_BASE = '/api';

export function getToken() {
  return localStorage.getItem('plantguard_token');
}

export function setToken(token) {
  if (token) {
    localStorage.setItem('plantguard_token', token);
  } else {
    localStorage.removeItem('plantguard_token');
  }
}

export function getUser() {
  const user = localStorage.getItem('plantguard_user');
  try {
    return user ? JSON.parse(user) : null;
  } catch {
    return null;
  }
}

export function setUser(user) {
  if (user) {
    localStorage.setItem('plantguard_user', JSON.stringify(user));
  } else {
    localStorage.removeItem('plantguard_user');
  }
}

export async function login(username, password) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || 'Login failed');
  }
  setToken(data.token);
  setUser(data.user);
  return data;
}

export async function register(username, password) {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || 'Registration failed');
  }
  return data;
}

export function logout() {
  setToken(null);
  setUser(null);
}

export async function checkHealth() {
  try {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) return { status: 'error' };
    return await res.json();
  } catch {
    return { status: 'offline' };
  }
}

export async function getModelInfo() {
  try {
    const res = await fetch(`${API_BASE}/model-info`);
    if (!res.ok) throw new Error('Failed to fetch model info');
    return await res.json();
  } catch (err) {
    return {
      model: 'custom_cnn_best',
      classes: 38,
      input_size: 224,
      architecture: '3 Conv Blocks + Dense(512)',
      status: 'ready',
    };
  }
}

export async function predictDisease(imageFile) {
  const token = getToken();
  if (!token) throw new Error('Please login to analyze leaf images');

  const formData = new FormData();
  formData.append('image', imageFile);

  const res = await fetch(`${API_BASE}/predict`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  const data = await res.json();
  if (!res.ok) {
    if (res.status === 401) {
      logout();
      throw new Error('Session expired. Please log in again.');
    }
    throw new Error(data.detail || 'Disease prediction failed');
  }
  return data;
}

export async function generateGradcam(imageFile) {
  const token = getToken();
  if (!token) throw new Error('Please login to run Grad-CAM analysis');

  const formData = new FormData();
  formData.append('image', imageFile);

  const res = await fetch(`${API_BASE}/gradcam`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  const data = await res.json();
  if (!res.ok) {
    if (res.status === 401) {
      logout();
      throw new Error('Session expired. Please log in again.');
    }
    throw new Error(data.detail || 'Grad-CAM generation failed');
  }
  return data;
}

export async function fetchHistory() {
  const token = getToken();
  if (!token) return [];

  const res = await fetch(`${API_BASE}/history`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) return [];
  const data = await res.json();
  return data.records || [];
}
