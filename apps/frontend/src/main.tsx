import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { useAuthStore } from './stores/authStore';
import axios from 'axios';

// Initialize auth token from localStorage on app startup
const initializeAuth = () => {
  const { accessToken } = useAuthStore.getState();
  if (accessToken) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
  }
};

// Initialize auth before rendering
initializeAuth();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
