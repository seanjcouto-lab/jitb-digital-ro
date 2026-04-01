import React, { useState } from 'react';
import { supabaseAuthService, AuthResult } from '../services/supabaseAuthService';
import { LoggedInUser, UserPrivilege } from '../types';

interface Props {
  onLogin: (user: LoggedInUser) => void;
}

const LoginScreen: React.FC<Props> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetMessage, setResetMessage] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

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

  const handleResetPassword = async () => {
    if (!resetEmail) return;
    setResetLoading(true);
    const result = await supabaseAuthService.resetPassword(resetEmail);
    setResetLoading(false);
    if (result.status === 'ok') {
      setResetMessage('Reset email sent. Check your inbox.');
    } else {
      setResetMessage(result.message);
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
          
          <div className="mt-4 text-center">
            {!showReset ? (
              <button type="button" onClick={() => setShowReset(true)} className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
                Forgot Password?
              </button>
            ) : (
              <div className="space-y-3">
                <input
                  type="email"
                  value={resetEmail}
                  onChange={e => setResetEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full bg-slate-800 border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:border-white/30 outline-none"
                />
                {resetMessage && <p className="text-xs text-slate-400">{resetMessage}</p>}
                <button type="button" onClick={handleResetPassword} disabled={resetLoading} className="w-full py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm font-bold rounded-lg disabled:opacity-50 transition-colors">
                  {resetLoading ? 'Sending...' : 'Send Reset Email'}
                </button>
                <button type="button" onClick={() => { setShowReset(false); setResetMessage(''); }} className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
                  Back to Sign In
                </button>
              </div>
            )}
          </div>

          {import.meta.env.DEV && (
          <div className="mt-8 pt-6 border-t border-white/5">
            <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-4 text-center">Development Access</p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => onLogin({ id: 'dev-sm', name: 'Test SM', role: 'SERVICE_MANAGER' as any, privileges: [UserPrivilege.DEVELOPER], shopId: '00000000-0000-0000-0000-000000000001' })}
                className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-lg transition-colors border border-white/5"
              >
                Test SM
              </button>
              <button
                type="button"
                onClick={() => onLogin({ id: 'dev-tech', name: 'Test Tech', role: 'TECHNICIAN' as any, privileges: [], shopId: '00000000-0000-0000-0000-000000000001', techId: 'tech-1' })}
                className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-lg transition-colors border border-white/5"
              >
                Test Tech
              </button>
              <button
                type="button"
                onClick={() => onLogin({ id: 'dev-parts', name: 'Test Parts', role: 'PARTS_MANAGER' as any, privileges: [], shopId: '00000000-0000-0000-0000-000000000001' })}
                className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-lg transition-colors border border-white/5"
              >
                Test Parts
              </button>
            </div>
          </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default LoginScreen;
