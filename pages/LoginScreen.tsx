import React, { useState } from 'react';
import { supabaseAuthService, AuthResult } from '../services/supabaseAuthService';
import { LoggedInUser } from '../types';

interface Props {
  onLogin: (user: LoggedInUser) => void;
}

const LoginScreen: React.FC<Props> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result: AuthResult = await supabaseAuthService.signIn(email, password);

    setLoading(false);

    if (result.status === 'ok') {
      onLogin(result.user);
    } else if (result.status === 'no_mapping') {
      setError('Authenticated, but no shop is assigned to this account. Contact your administrator.');
    } else {
      setError(result.message);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 p-4">
      <div className="w-full max-w-sm bg-slate-900 border border-white/10 rounded-2xl p-8">
        <h1 className="text-xl font-black text-white uppercase tracking-widest mb-6">Sign In</h1>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-slate-400 uppercase font-bold mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
                className="w-full bg-slate-800 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-white/30 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 uppercase font-bold mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full bg-slate-800 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-white/30 outline-none"
              />
            </div>
            {error && <p className="text-sm text-red-400">{error}</p>}
          </div>
          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full py-3 bg-white text-slate-900 font-bold rounded-lg disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginScreen;
