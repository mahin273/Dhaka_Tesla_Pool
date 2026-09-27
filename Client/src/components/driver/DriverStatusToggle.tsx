import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { Tesla } from '../../types';
import { Car, Power, Users } from 'lucide-react';

interface DriverStatusToggleProps {
  tesla: Tesla | null;
  isLoading: boolean;
}

export const DriverStatusToggle: React.FC<DriverStatusToggleProps> = ({
  tesla,
  isLoading,
}) => {
  const queryClient = useQueryClient();

  const toggleMutation = useMutation({
    mutationFn: async (targetOnline: boolean) => {
      return apiClient.patch<Tesla>('/drivers/me/online-status', {
        isOnline: targetOnline,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myTesla'] });
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
    },
  });

  const isOnline = tesla?.isOnline ?? false;
  const seatsAvailable = tesla?.seatsAvailable ?? 0;
  const capacity = tesla?.capacity ?? 3;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Vehicle Metadata */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-emerald-400">
            <Car className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white">
                Tesla Model 3 &quot;{tesla?.name || 'Bullet'}&quot;
              </h2>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase tracking-wider font-semibold ${
                  isOnline
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}
              >
                {isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Smart Fleet EV | Dedicated Dhaka Metro Pool Corridor
            </p>
          </div>
        </div>

        {/* Toggle Action */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => toggleMutation.mutate(!isOnline)}
            disabled={isLoading || toggleMutation.isPending || !tesla}
            className={`px-4 py-2.5 rounded-xl font-semibold text-xs transition-all cursor-pointer flex items-center gap-2 shadow-md ${
              isOnline
                ? 'bg-emerald-500/20 hover:bg-rose-950/40 border border-emerald-500/40 hover:border-rose-800 text-emerald-300 hover:text-rose-300'
                : 'bg-slate-800 hover:bg-emerald-950/40 border border-slate-700 hover:border-emerald-800 text-slate-300 hover:text-emerald-300'
            }`}
          >
            <Power
              className={`w-4 h-4 ${
                toggleMutation.isPending ? 'animate-spin' : isOnline ? 'text-emerald-400' : 'text-slate-400'
              }`}
            />
            <span>
              {toggleMutation.isPending
                ? 'Updating Status...'
                : isOnline
                ? 'Go Offline'
                : 'Go Online'}
            </span>
          </button>
        </div>
      </div>

      {/* Vehicle Seating Capacity */}
      <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
        <div className="text-slate-400 flex items-center gap-2">
          <Users className="w-4 h-4 text-cyan-400" />
          <span>Vehicle Seating Capacity</span>
        </div>
        <div className="text-sm font-bold text-white font-mono bg-slate-950 px-3 py-1 rounded-lg border border-slate-850">
          {seatsAvailable} / {capacity} Seats Free
        </div>
      </div>
    </div>
  );
};
