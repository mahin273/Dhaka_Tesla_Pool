import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { CandidatePassenger } from '../../types';
import { formatPoyshaToTaka } from '../../utils/geo';
import {
  Radio,
  MapPin,
  Navigation,
  Users,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Route,
  Clock,
} from 'lucide-react';

interface CandidateRadarProps {
  teslaId: string;
  seatsAvailable: number;
  candidates: CandidatePassenger[];
  isLoading: boolean;
  onClaimSuccess?: () => void;
}

export const CandidateRadar: React.FC<CandidateRadarProps> = ({
  teslaId,
  seatsAvailable,
  candidates,
  isLoading,
  onClaimSuccess,
}) => {
  const queryClient = useQueryClient();
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const claimMutation = useMutation({
    mutationFn: async (candidate: CandidatePassenger) => {
      setClaimingId(candidate.rideRequestId);
      setErrorMessage(null);
      return apiClient.post('/pools/claim', {
        teslaId,
        rideRequestIds: [candidate.rideRequestId],
        seatsNeeded: candidate.seatsRequested,
      });
    },
    onSuccess: () => {
      setClaimingId(null);
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
      queryClient.invalidateQueries({ queryKey: ['myTesla'] });
      queryClient.invalidateQueries({ queryKey: ['activePool'] });
      onClaimSuccess?.();
    },
    onError: (err: any) => {
      setClaimingId(null);
      setErrorMessage(err.message || 'Failed to claim seat');
    },
  });

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
      {/* Radar Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-cyan-400">
              Candidate Discovery Radar
            </span>
          </div>
          <h2 className="text-lg font-bold text-white mt-1">
            Nearby Passenger Requests
          </h2>
          <p className="text-xs text-slate-400">
            Corridor-aligned matches evaluated against 1.5 km pickup proximity and 1.3x detour ratio bound.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-slate-400 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
          <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
          <span>Polling 3s Interval</span>
        </div>
      </div>

      {errorMessage && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-rose-950/40 border border-rose-800 text-rose-300 text-xs">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Candidate List */}
      {isLoading && candidates.length === 0 ? (
        <div className="py-12 text-center space-y-3">
          <div className="w-8 h-8 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin mx-auto" />
          <p className="text-xs text-slate-400">Scanning Dhaka corridors for pool requests...</p>
        </div>
      ) : candidates.length === 0 ? (
        <div className="py-12 text-center space-y-3 bg-slate-950 rounded-xl border border-slate-850">
          <div className="inline-flex p-3 rounded-full bg-slate-900 text-slate-500">
            <Route className="w-6 h-6" />
          </div>
          <p className="text-sm font-semibold text-slate-300">
            Radar Active - No Open Requests In Range
          </p>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Waiting for passengers in Banani, Gulshan, Mohakhali, or Dhanmondi to request a ride.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {candidates.map((candidate) => {
            const isClaiming = claimingId === candidate.rideRequestId;
            const canFit = seatsAvailable >= candidate.seatsRequested;

            return (
              <div
                key={candidate.rideRequestId}
                className={`p-4 rounded-xl border transition-all ${
                  candidate.compatible
                    ? 'bg-slate-950 border-slate-800 hover:border-slate-700'
                    : 'bg-slate-950/50 border-slate-850 opacity-75'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  {/* Left Column: Passenger & Route Details */}
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-slate-100">
                        {candidate.passenger.fullName}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">
                        {candidate.passenger.phone}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-300">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{candidate.pickupZone?.name || 'Pickup'}</span>
                      </span>
                      <ArrowRight className="w-3 h-3 text-slate-500" />
                      <span className="flex items-center gap-1">
                        <Navigation className="w-3.5 h-3.5 text-cyan-400" />
                        <span>{candidate.dropoffZone?.name || 'Dropoff'}</span>
                      </span>
                      <span className="text-slate-500">|</span>
                      <span className="font-mono text-slate-400">
                        {candidate.distanceKm} km
                      </span>
                      <span className="text-slate-500">|</span>
                      <span className="flex items-center gap-1 font-mono text-slate-400">
                        <Users className="w-3 h-3" />
                        <span>{candidate.seatsRequested} seat</span>
                      </span>
                    </div>

                    {/* Spatial Compatibility Badge */}
                    <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                      {candidate.compatible ? (
                        <>
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>
                              Corridor Match (+{candidate.detourKm} km detour)
                            </span>
                          </span>
                          {candidate.overlapKm !== undefined && candidate.overlapKm > 0 && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                              <span>{candidate.overlapKm} km Shared Overlap</span>
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
                          <AlertTriangle className="w-3 h-3" />
                          <span>
                            {candidate.detourKm > 0
                              ? `Detour Alert (+${candidate.detourKm} km)`
                              : 'Not Poolable'}
                          </span>
                        </span>
                      )}

                      {candidate.compatible && (candidate.dropoffSequence || candidate.bestOrder) && (
                        <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                          Sequence: {candidate.dropoffSequence || candidate.bestOrder?.replace(/_/g, ' ')}
                        </span>
                      )}

                      <span className="text-[11px] text-slate-400">
                        {candidate.reason}
                      </span>
                    </div>
                  </div>

                  {/* Right Column: Fare & Action CTA */}
                  <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-3 shrink-0">
                    <div className="text-left sm:text-right">
                      <div className="text-[10px] text-slate-400">Estimated Fare</div>
                      <div className="text-base font-bold text-emerald-400 font-mono">
                        {formatPoyshaToTaka(candidate.totalFarePoysha)}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => claimMutation.mutate(candidate)}
                      disabled={isClaiming || claimMutation.isPending || !canFit || !candidate.compatible}
                      className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-md ${
                        !canFit
                          ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                          : !candidate.compatible
                          ? 'bg-slate-800/80 text-slate-500 border border-slate-700/50 cursor-not-allowed'
                          : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/10 cursor-pointer'
                      }`}
                    >
                      {isClaiming ? (
                        <>
                          <Clock className="w-3.5 h-3.5 animate-spin" />
                          <span>Claiming...</span>
                        </>
                      ) : !canFit ? (
                        <span>Vehicle Full</span>
                      ) : !candidate.compatible ? (
                        <span>Cannot Pool</span>
                      ) : (
                        <>
                          <span>Accept & Claim</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
