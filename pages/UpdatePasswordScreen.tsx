import React, { useState } from 'react';
import { supabaseAuthService } from '../services/supabaseAuthService';

interface Props {
  onComplete: () => void;
}

const UpdatePasswordScreen: React.FC<Props> = ({ onComplete }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    const result = await supabaseAuthService.updatePassword(password);
    setLoading(false);

    if (result.status === 'ok') {
      setSuccess(true);
      setTimeout(() => {
        onComplete();
      }, 2000);
    } else {
      setError(result.message);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 p-4">
        <div className="w-full max-w-sm bg-slate-900 border border-neon-seafoam/20 rounded-2xl p-8 text-center">
          <div className="w-16 h-16 bg-neon-seafoam/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-neon-seafoam" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-black text-white uppercase tracking-widest mb-2">Success</h2>
          <p className="text-slate-400 text-sm">Your password has been updated. Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 p-4">
      <div className="w-full max-w-sm bg-slate-900 border border-white/10 rounded-2xl p-8">
        <h1 className="text-xl font-black text-white uppercase tracking-widest mb-6">Set New Password</h1>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-slate-400 uppercase font-bold mb-2">New Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoFocus
                className="w-full bg-slate-800 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-white/30 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 uppercase font-bold mb-2">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                className="w-full bg-slate-800 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-white/30 outline-none"
              />
            </div>
            {error && <p className="text-sm text-red-400">{error}</p>}
          </div>
          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full py-3 bg-neon-seafoam text-slate-900 font-bold rounded-lg disabled:opacity-50 transition-all hover:shadow-[0_0_15px_rgba(45,212,191,0.4)]"
          >
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default UpdatePasswordScreen;
