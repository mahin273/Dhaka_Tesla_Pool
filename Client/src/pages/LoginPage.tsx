import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, STORY_CAST, StoryCastKey } from '../context/AuthContext';
import { Zap, ShieldCheck, AlertCircle, ArrowRight } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, loginAs } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const user = await login(email, password);
      if (user.role === 'DRIVER') {
        navigate('/driver');
      } else {
        navigate('/passenger');
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleCastLogin = async (key: StoryCastKey) => {
    setError(null);
    setLoading(true);
    try {
      const user = await loginAs(key);
      if (user.role === 'DRIVER') {
        navigate('/driver');
      } else {
        navigate('/passenger');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to authenticate cast member.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 mb-2">
            <Zap className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Dhaka Tesla Pool
          </h1>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            High-efficiency electric vehicle pooling across Banani, Gulshan, and Dhaka corridors.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-rose-950/40 border border-rose-800 text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Manual Credentials Form */}
        <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Sign In with Account
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. nusrat@tesla.dhaka"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-semibold text-sm rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? 'Authenticating...' : 'Sign In'}
            {!loading && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>

        {/* Story Cast 1-Click Fast Login */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Story Cast Fast Login (1-Click)</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {(Object.keys(STORY_CAST) as StoryCastKey[]).map((key) => {
              const cast = STORY_CAST[key];
              const isDriver = cast.role === 'DRIVER';
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleCastLogin(key)}
                  disabled={loading}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    isDriver
                      ? 'bg-slate-900/90 border-emerald-900/40 hover:border-emerald-500/50 hover:bg-emerald-950/10'
                      : 'bg-slate-900/90 border-slate-800 hover:border-cyan-500/50 hover:bg-cyan-950/10'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-semibold text-xs text-slate-100">
                      {cast.name}
                    </span>
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded font-mono uppercase ${
                        isDriver
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                      }`}
                    >
                      {cast.role}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 mb-2">
                    {cast.tagline}
                  </div>
                  <div className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                    <span>Quick Login</span>
                    <ArrowRight className="w-3 h-3" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
