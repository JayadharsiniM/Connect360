import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { configureAmplify } from './config/amplify';
import './index.css';

const isMock = import.meta.env.VITE_MOCK_MODE === 'true';

// Only initialize Amplify if not in mock mode
if (!isMock) {
  configureAmplify();
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
