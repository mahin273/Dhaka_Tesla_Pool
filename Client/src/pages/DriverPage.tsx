import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Navbar } from '../components/Navbar';
import { Car, Zap, Users, Gauge, Radio } from 'lucide-react';

export const DriverPage: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 space-y-6">
        {/* Welcome Header */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/40">
                Driver Cockpit
              </span>
              <h1 className="text-xl font-bold text-white mt-1">
                Captain {user?.fullName}
              </h1>
              <p className="text-xs text-slate-400">
                Vehicle: Tesla Model 3 &quot;Bullet&quot; | Driver ID: {user?.id.slice(0, 8)}...
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-950/20 px-3 py-1.5 rounded-lg border border-emerald-900/40 font-mono">
              <Radio className="w-4 h-4 animate-pulse text-emerald-400" />
              <span>Cockpit Active</span>
            </div>
          </div>
        </div>

        {/* Foundations Overview Card */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
              <Car className="w-4 h-4 text-emerald-400" />
              <span>Assigned Tesla</span>
            </div>
            <p className="text-sm font-medium text-slate-200">Bullet (Capacity: 3)</p>
            <p className="text-[11px] text-slate-400">Atomic conditional lock protected</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
              <Users className="w-4 h-4 text-cyan-400" />
              <span>Candidate Discovery</span>
            </div>
            <p className="text-sm font-medium text-slate-200">Smart Radar Engine</p>
            <p className="text-[11px] text-slate-400">3.5km cluster and 2.5km detour cap</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
              <Gauge className="w-4 h-4 text-amber-400" />
              <span>Lifecycle Controller</span>
            </div>
            <p className="text-sm font-medium text-slate-200">Sequential Actions</p>
            <p className="text-[11px] text-slate-400">Arrive to Start to Complete</p>
          </div>
        </div>

        {/* Ready for Chunk 19 card */}
        <div className="bg-slate-900/60 border border-dashed border-slate-800 rounded-2xl p-8 text-center space-y-3">
          <div className="inline-flex p-3 rounded-full bg-emerald-950/40 border border-emerald-800/40 text-emerald-400">
            <Zap className="w-6 h-6" />
          </div>
          <h2 className="text-base font-semibold text-slate-200">
            Driver Tactical HUD Ready for Deployment
          </h2>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Authentication, session persistence, and role guards are verified. In Chunk 19, the live Online/Offline switch, incoming candidate cards, and progressive lifecycle action buttons will be rendered here.
          </p>
        </div>
      </main>
    </div>
  );
};
