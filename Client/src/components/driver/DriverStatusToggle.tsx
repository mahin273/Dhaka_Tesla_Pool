import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { Tesla, Zone } from '../../types';
import { Car, Power, Users, MapPin } from 'lucide-react';

interface DriverStatusToggleProps {
  tesla: Tesla | null;
  isLoading: boolean;
  hasActiveTrip?: boolean;
}

export const DriverStatusToggle: React.FC<DriverStatusToggleProps> = ({
  tesla,
  isLoading,
  hasActiveTrip = false,
}) => {
  const queryClient = useQueryClient();

  const { data: zones = [] } = useQuery<Zone[]>({
    queryKey: ['zones'],
    queryFn: () => apiClient.get<Zone[]>('/zones'),
  });

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

  const locationMutation = useMutation({
    mutationFn: async (zoneId: string) => {
      return apiClient.patch<Tesla>('/drivers/me/location', { zoneId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myTesla'] });
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
    },
  });

  const isOnline = tesla?.isOnline ?? false;
  const seatsAvailable = tesla?.seatsAvailable ?? 0;
  const capacity = tesla?.capacity ?? 3;
  const isLockedOnline = isOnline && hasActiveTrip;

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
        <div className="flex flex-col sm:items-end gap-1.5">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => toggleMutation.mutate(!isOnline)}
              disabled={isLoading || toggleMutation.isPending || !tesla || isLockedOnline}
              title={isLockedOnline ? 'Complete ongoing trip before going offline' : undefined}
              className={`px-4 py-2.5 rounded-xl font-semibold text-xs transition-all flex items-center gap-2 shadow-md ${
                isLockedOnline
                  ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400 cursor-not-allowed'
                  : isOnline
                  ? 'bg-emerald-500/20 hover:bg-rose-950/40 border border-emerald-500/40 hover:border-rose-800 text-emerald-300 hover:text-rose-300 cursor-pointer'
                  : 'bg-slate-800 hover:bg-emerald-950/40 border border-slate-700 hover:border-emerald-800 text-slate-300 hover:text-emerald-300 cursor-pointer'
              }`}
            >
              <Power
                className={`w-4 h-4 ${
                  toggleMutation.isPending
                    ? 'animate-spin'
                    : isLockedOnline
                    ? 'text-amber-400'
                    : isOnline
                    ? 'text-emerald-400'
                    : 'text-slate-400'
                }`}
              />
              <span>
                {toggleMutation.isPending
                  ? 'Updating Status...'
                  : isLockedOnline
                  ? 'Trip in Progress'
                  : isOnline
                  ? 'Go Offline'
                  : 'Go Online'}
              </span>
            </button>
          </div>
          {isLockedOnline && (
            <p className="text-[11px] text-amber-400/90 font-mono">
              Complete ongoing trip to go offline
            </p>
          )}
          {toggleMutation.isError && (
            <p className="text-[11px] text-rose-400 font-mono">
              {(toggleMutation.error as unknown as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to update status'}
            </p>
          )}
        </div>
      </div>

      {/* Driver Staging Hub & Capacity */}
      <div className="pt-3 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        {/* Staging Zone Selector */}
        <div className="flex items-center justify-between bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
          <div className="text-slate-400 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-amber-400" />
            <span>Staging Hub</span>
          </div>
          <select
            value={tesla?.currentZoneId || ''}
            onChange={(e) => locationMutation.mutate(e.target.value)}
            disabled={isLoading || locationMutation.isPending || hasActiveTrip || !tesla}
            title={hasActiveTrip ? 'Cannot change staging hub during an active trip' : 'Select staging area'}
            className={`bg-slate-900 border text-xs font-semibold rounded-lg px-2.5 py-1.5 focus:outline-none transition-colors ${
              hasActiveTrip
                ? 'border-slate-800 text-slate-500 cursor-not-allowed'
                : 'border-slate-700 text-white hover:border-amber-500/50 cursor-pointer'
            }`}
          >
            {zones.map((zone) => (
              <option key={zone.id} value={zone.id}>
                {zone.name}
              </option>
            ))}
          </select>
        </div>

        {/* Vehicle Seating Capacity */}
        <div className="flex items-center justify-between bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
          <div className="text-slate-400 flex items-center gap-2">
            <Users className="w-4 h-4 text-cyan-400" />
            <span>Seating Capacity</span>
          </div>
          <div className="text-xs font-bold text-white font-mono bg-slate-900 px-2.5 py-1 rounded-md border border-slate-800">
            {seatsAvailable} / {capacity} Seats Free
          </div>
        </div>
      </div>

      {locationMutation.isError && (
        <p className="text-[11px] text-rose-400 font-mono">
          {(locationMutation.error as unknown as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to update staging area'}
        </p>
      )}
    </div>
  );
};
