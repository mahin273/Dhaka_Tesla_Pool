import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { Pool, PoolStatus } from '../../types';
import { formatPoyshaToTaka } from '../../utils/geo';
import {
  MapPin,
  Navigation,
  Phone,
  Users,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  Banknote,
} from 'lucide-react';

interface ActivePoolCockpitProps {
  pool: Pool;
  onLifecycleAdvanced?: () => void;
}

interface ActionConfig {
  label: string;
  sublabel: string;
  endpoint: string;
  colorClass: string;
}

export const ActivePoolCockpit: React.FC<ActivePoolCockpitProps> = ({
  pool,
  onLifecycleAdvanced,
}) => {
  const queryClient = useQueryClient();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const getActionConfig = (status: PoolStatus): ActionConfig | null => {
    switch (status) {
      case 'MATCHED':
        return {
          label: 'Mark Arrived at Pickup Hub',
          sublabel: 'Notify passengers that vehicle Bullet has arrived',
          endpoint: `/pools/${pool.id}/arrive`,
          colorClass:
            'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20',
        };
      case 'DRIVER_ARRIVED':
        return {
          label: 'Start Trip (Depart)',
          sublabel: 'Confirm all passengers boarded and depart along corridor',
          endpoint: `/pools/${pool.id}/start`,
          colorClass:
            'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20',
        };
      case 'STARTED':
        return {
          label: 'Complete Trip (Dropoff & Collect Cash)',
          sublabel: 'Safely drop off passengers and finalize cash invoices',
          endpoint: `/pools/${pool.id}/complete`,
          colorClass:
            'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-cyan-500/20',
        };
      default:
        return null;
    }
  };

  const currentAction = getActionConfig(pool.status);

  const lifecycleMutation = useMutation({
    mutationFn: async (endpoint: string) => {
      setErrorMessage(null);
      return apiClient.post(endpoint);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activePool'] });
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
      queryClient.invalidateQueries({ queryKey: ['myTesla'] });
      onLifecycleAdvanced?.();
    },
    onError: (err: any) => {
      setErrorMessage(err.message || 'Failed to update pool state');
    },
  });

  const totalPoolFarePoysha = pool.rideRequests.reduce(
    (sum, r) => sum + r.totalFarePoysha,
    0,
  );

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
      {/* Cockpit Status Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-emerald-400">
              Active Pool Cockpit
            </span>
          </div>
          <h2 className="text-lg font-bold text-white mt-1">
            Pool #{pool.id.slice(0, 8)}
          </h2>
          <p className="text-xs text-slate-400">
            Assigned Tesla: Model 3 &quot;Bullet&quot; | {pool.rideRequests.length} Joined Rider{pool.rideRequests.length === 1 ? '' : 's'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 text-xs font-mono font-bold uppercase rounded-lg bg-slate-950 text-emerald-400 border border-emerald-500/30">
            Status: {pool.status}
          </span>
        </div>
      </div>

      {errorMessage && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-rose-950/40 border border-rose-800 text-rose-300 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Passenger Manifest */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
          <span className="flex items-center gap-1.5">
            <Users className="w-4 h-4 text-cyan-400" />
            <span>Passenger Manifest ({pool.rideRequests.length})</span>
          </span>
          <span className="text-slate-400 font-mono">
            Total Fare: {formatPoyshaToTaka(totalPoolFarePoysha)}
          </span>
        </div>

        <div className="space-y-2.5">
          {pool.rideRequests.map((req) => (
            <div
              key={req.id}
              className="p-3.5 rounded-xl bg-slate-950 border border-slate-850 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-100">
                    {req.passenger?.fullName || 'Passenger'}
                  </span>
                  {req.passenger?.phone && (
                    <a
                      href={`tel:${req.passenger.phone}`}
                      className="text-[11px] font-mono text-cyan-400 hover:underline flex items-center gap-1"
                    >
                      <Phone className="w-3 h-3" />
                      <span>{req.passenger.phone}</span>
                    </a>
                  )}
                </div>

                <div className="flex items-center gap-2 text-slate-400">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{req.pickupZone?.name || req.pickupZoneId}</span>
                  </span>
                  <ArrowRight className="w-3 h-3 text-slate-600" />
                  <span className="flex items-center gap-1">
                    <Navigation className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{req.dropoffZone?.name || req.dropoffZoneId}</span>
                  </span>
                  <span>|</span>
                  <span>{req.distanceKm} km</span>
                  <span>|</span>
                  <span>{req.seatsRequested} seat</span>
                </div>
              </div>

              <div className="flex items-center gap-3 self-end sm:self-center">
                <div className="text-right">
                  <div className="text-[10px] text-slate-400">Fare Due</div>
                  <div className="font-mono font-bold text-emerald-400">
                    {formatPoyshaToTaka(req.totalFarePoysha)}
                  </div>
                </div>

                <div className="px-2 py-1 rounded bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-300 flex items-center gap-1">
                  <Banknote className="w-3 h-3 text-amber-400" />
                  <span>Cash</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sequential Primary Lifecycle Action Button */}
      <div className="pt-2 border-t border-slate-800">
        {currentAction ? (
          <button
            type="button"
            onClick={() => lifecycleMutation.mutate(currentAction.endpoint)}
            disabled={lifecycleMutation.isPending}
            className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm transition-all cursor-pointer flex flex-col items-center justify-center gap-1 shadow-lg ${currentAction.colorClass}`}
          >
            <div className="flex items-center gap-2">
              {lifecycleMutation.isPending ? (
                <>
                  <Clock className="w-4 h-4 animate-spin" />
                  <span>Updating State...</span>
                </>
              ) : (
                <>
                  <span>{currentAction.label}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </div>
            <div className="text-[11px] font-normal opacity-80">
              {currentAction.sublabel}
            </div>
          </button>
        ) : (
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center space-y-1">
            <div className="flex items-center justify-center gap-1.5 text-emerald-400 text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4" />
              <span>Pool Finished & Settled</span>
            </div>
            <div className="text-xs text-slate-400">
              Cash payments recorded and seats freed back to Tesla Model 3 Bullet.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
