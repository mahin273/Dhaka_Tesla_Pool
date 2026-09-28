import React from 'react';
import { Pool } from '../../types';
import { formatPoyshaToTaka } from '../../utils/geo';
import { CheckCircle2, Banknote, Users, ArrowRight } from 'lucide-react';

interface DriverCompletionModalProps {
  pool: Pool;
  onClose: () => void;
}

export const DriverCompletionModal: React.FC<DriverCompletionModalProps> = ({
  pool,
  onClose,
}) => {
  const totalCashPoysha = pool.rideRequests.reduce(
    (sum, r) => sum + r.totalFarePoysha,
    0,
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-2 border-b border-slate-800 pb-5">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 mb-1">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-white">
            Trip Completed & Cash Collected
          </h2>
          <p className="text-xs text-slate-400">
            Pool #{pool.id.slice(0, 8)} has concluded. All seats have been freed and restaged.
          </p>
        </div>

        {/* Aggregated Revenue Summary */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Banknote className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-400">Total Cash Collected</div>
              <div className="text-lg font-bold font-mono text-emerald-400">
                {formatPoyshaToTaka(totalCashPoysha)}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300">
            <Users className="w-3.5 h-3.5 text-cyan-400" />
            <span>{pool.rideRequests.length} Riders Settled</span>
          </div>
        </div>

        {/* Passenger Breakdown List */}
        <div className="space-y-2.5">
          <div className="text-xs font-semibold text-slate-300">
            Passenger Cash Manifest
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {pool.rideRequests.map((req) => (
              <div
                key={req.id}
                className="p-3 rounded-xl bg-slate-950 border border-slate-850 flex items-center justify-between text-xs"
              >
                <div className="space-y-0.5">
                  <div className="font-semibold text-slate-200">
                    {req.passenger?.fullName || 'Passenger'}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {req.pickupZone?.name || req.pickupZoneId} to{' '}
                    {req.dropoffZone?.name || req.dropoffZoneId}
                  </div>
                </div>
                <div className="text-right space-y-1">
                  <div className="font-mono font-bold text-emerald-400">
                    {formatPoyshaToTaka(req.totalFarePoysha)}
                  </div>
                  <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    Paid via Cash
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Next Action */}
        <button
          type="button"
          onClick={onClose}
          className="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/10"
        >
          <span>Return to Candidate Radar</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
