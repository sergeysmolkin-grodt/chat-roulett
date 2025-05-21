import React from 'react'
import ReactDOM from 'react-dom/client'
import RootApp from './App'
import './index.css'
import './i18n'
import { Toaster } from '@/components/ui/toaster'
import { AuthProvider } from './contexts/AuthContext'

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthProvider>
      <RootApp />
      <Toaster />
    </AuthProvider>
  </React.StrictMode>
);
