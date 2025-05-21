import React from 'react'
import { createRoot } from 'react-dom/client'
import RootApp from './App.tsx'
import './index.css'

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RootApp />
  </React.StrictMode>
);
