import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, STORY_CAST, StoryCastKey } from '../context/AuthContext';
import { Zap, LogOut, UserCheck, ChevronDown } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, loginAs, logout } = useAuth();
  const navigate = useNavigate();
  const [switching, setSwitching] = useState<boolean>(false);
  const [dropdownOpen, setDropdownOpen] = useState<boolean>(false);

  if (!user) return null;

  const handleQuickSwitch = async (key: StoryCastKey) => {
    try {
      setSwitching(true);
      setDropdownOpen(false);
      const loggedUser = await loginAs(key);
      if (loggedUser.role === 'DRIVER') {
        navigate('/driver');
      } else {
        navigate('/passenger');
      }
    } catch (err) {
      console.error('Failed to switch user:', err);
    } finally {
      setSwitching(false);
    }
  };

  const isDriver = user.role === 'DRIVER';

  return (
    <header className="sticky top-0 z-50 bg-slate-950/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand */}
        <div
          onClick={() => navigate(isDriver ? '/driver' : '/passenger')}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:border-emerald-400 transition-colors">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-100 tracking-tight text-base sm:text-lg">
                Dhaka Tesla Pool
              </span>
              <span className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono tracking-wider uppercase rounded bg-slate-800 text-slate-300 border border-slate-700">
                EV Pool
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              {isDriver ? 'Driver Dispatch Cockpit' : 'Passenger Ride Sharing'}
            </p>
          </div>
        </div>

        {/* Story Cast Switcher */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            disabled={switching}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-slate-600 text-xs font-medium text-slate-200 transition-colors"
          >
            <UserCheck className="w-4 h-4 text-emerald-400" />
            <span className="hidden md:inline text-slate-400">Cast Switcher:</span>
            <span className="font-semibold text-slate-100">{user.fullName.split(' ')[0]}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-72 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-2 z-50">
              <div className="px-2 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800 mb-1">
                Switch Story Cast
              </div>
              {(Object.keys(STORY_CAST) as StoryCastKey[]).map((key) => {
                const cast = STORY_CAST[key];
                const isCurrent = user.email === cast.email;
                return (
                  <button
                    key={key}
                    onClick={() => handleQuickSwitch(key)}
                    className={`w-full text-left p-2 rounded-lg text-xs transition-colors flex items-center justify-between ${
                      isCurrent
                        ? 'bg-slate-800 text-white font-medium'
                        : 'hover:bg-slate-800/60 text-slate-300'
                    }`}
                  >
                    <div>
                      <div className="font-medium text-slate-100">{cast.name}</div>
                      <div className="text-[11px] text-slate-400">{cast.tagline}</div>
                    </div>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                        cast.role === 'DRIVER'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                      }`}
                    >
                      {cast.role}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* User Badge & Logout */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-xs font-medium text-slate-200">{user.fullName}</span>
            <span
              className={`text-[10px] font-mono tracking-wider ${
                isDriver ? 'text-emerald-400' : 'text-cyan-400'
              }`}
            >
              {user.role}
            </span>
          </div>

          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            title="Sign out"
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-rose-900/50 hover:bg-rose-950/20 text-slate-400 hover:text-rose-400 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
