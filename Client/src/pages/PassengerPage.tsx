import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Navbar } from '../components/Navbar';
import { MapPin, Navigation, Clock, Shield } from 'lucide-react';

export const PassengerPage: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 space-y-6">
        {/* Welcome Header */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-[11px] font-mono uppercase tracking-wider text-cyan-400 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-800/40">
                Passenger Terminal
              </span>
              <h1 className="text-xl font-bold text-white mt-1">
                Welcome back, {user?.fullName}
              </h1>
              <p className="text-xs text-slate-400">
                Phone: {user?.phone} | Account: {user?.email}
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-300 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span>Verified EV Passenger</span>
            </div>
          </div>
        </div>

        {/* Foundations Overview Card */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
              <MapPin className="w-4 h-4 text-emerald-400" />
              <span>Coverage Zones</span>
            </div>
            <p className="text-sm font-medium text-slate-200">8 Dhaka Hubs</p>
            <p className="text-[11px] text-slate-400">Banani, Gulshan, Dhanmondi, etc.</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
              <Navigation className="w-4 h-4 text-cyan-400" />
              <span>Pooling Discount</span>
            </div>
            <p className="text-sm font-medium text-slate-200">20% Off Distance</p>
            <p className="text-[11px] text-slate-400">Locked upon driver pool match</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>State Tracking</span>
            </div>
            <p className="text-sm font-medium text-slate-200">Live State Machine</p>
            <p className="text-[11px] text-slate-400">Requested to Completed HUD</p>
          </div>
        </div>

        {/* Ready for Chunk 18 card */}
        <div className="bg-slate-900/60 border border-dashed border-slate-800 rounded-2xl p-8 text-center space-y-3">
          <div className="inline-flex p-3 rounded-full bg-cyan-950/40 border border-cyan-800/40 text-cyan-400">
            <Navigation className="w-6 h-6" />
          </div>
          <h2 className="text-base font-semibold text-slate-200">
            Booking & Live Ride Tracker Ready for Deployment
          </h2>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            The authentication, route protection, and API client foundation are established. In Chunk 18, the interactive booking sheet, upfront fare calculator, and live status polling stepper will be rendered here.
          </p>
        </div>
      </main>
    </div>
  );
};
