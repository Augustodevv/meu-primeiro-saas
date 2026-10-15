import React, { useCallback, useState } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { AuthScreen } from './components/AuthScreen';
import { Dashboard } from './components/Dashboard';
import { AuthResponse } from './lib/api';

function App() {
  const [session, setSession] = useState<AuthResponse | null>(() => {
    try { return JSON.parse(localStorage.getItem('finance_session') ?? 'null') as AuthResponse | null; }
    catch { return null; }
  });

  function authenticate(next: AuthResponse) { localStorage.setItem('finance_session', JSON.stringify(next)); setSession(next); }
  const signOut = useCallback(() => { localStorage.removeItem('finance_session'); setSession(null); }, []);
  return session ? <Dashboard session={session} onSignOut={signOut} /> : <AuthScreen onAuthenticated={authenticate} />;
}

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
