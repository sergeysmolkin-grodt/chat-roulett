import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './i18n'
import { AuthProvider } from './contexts/AuthContext'
import { Toaster } from 'sonner'
import './App.css';

ReactDOM.createRoot(document.getElementById("root")!).render(
  // <React.StrictMode>
    <AuthProvider>
      <App />
      <Toaster position="top-right" />
    </AuthProvider>
  // </React.StrictMode>
);
