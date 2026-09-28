import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Zap, LogOut } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

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
