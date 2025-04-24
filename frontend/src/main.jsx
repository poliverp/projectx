import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { AuthProvider } from './context/AuthContext.jsx'; // Import the provider
import 'antd/dist/reset.css'; // <-- ADD THIS IMPORT FOR ANT DESIGN STYLES
import './index.css' // Your existing global style
import { BrowserRouter } from 'react-router-dom'; // <-- Import BrowserRouter

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider> {/* Wrap App with AuthProvider */}
        <App />
      </AuthProvider>
     </BrowserRouter>
    </React.StrictMode>,
  ) 