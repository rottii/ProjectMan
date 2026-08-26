import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import PublicDashboardView from './components/PublicDashboardView'
import './index.css'
import './i18n'
import ErrorBoundary from './components/ErrorBoundary'

const path = window.location.pathname;

if (path.startsWith('/public/dashboard/')) {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <ErrorBoundary>
        <PublicDashboardView />
      </ErrorBoundary>
    </React.StrictMode>
  )
} else {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>,
  )
}