import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Navbar } from '../components/Navbar';
import { DriverStatusToggle } from '../components/driver/DriverStatusToggle';
import { CandidateRadar } from '../components/driver/CandidateRadar';
import { ActivePoolCockpit } from '../components/driver/ActivePoolCockpit';
import { Tesla, CandidateResponse, Pool } from '../types';
import { Radio, Power, Shield } from 'lucide-react';

export const DriverPage: React.FC = () => {
  const { user } = useAuth();

  // 1. Fetch driver's Tesla vehicle details
  const {
    data: tesla,
    isLoading: teslaLoading,
    refetch: refetchTesla,
  } = useQuery<Tesla>({
    queryKey: ['myTesla'],
    queryFn: () => apiClient.get<Tesla>('/drivers/me/tesla'),
  });

  const isOnline = Boolean(tesla?.isOnline);

  // 2. Fetch Candidate Radar (only enabled when driver is online)
  const {
    data: poolData,
    isLoading: candidatesLoading,
    refetch: refetchCandidates,
  } = useQuery<CandidateResponse>({
    queryKey: ['candidates'],
    queryFn: () => apiClient.get<CandidateResponse>('/pools/candidates'),
    enabled: isOnline,
    refetchInterval: 3000,
  });

  const activePoolId = poolData?.activePoolId;

  // 3. Fetch active pool details (only enabled if an active pool exists)
  const {
    data: activePool,
    refetch: refetchPool,
  } = useQuery<Pool>({
    queryKey: ['activePool', activePoolId],
    queryFn: () => apiClient.get<Pool>(`/pools/${activePoolId}`),
    enabled: Boolean(activePoolId),
    refetchInterval: 2500,
  });

  const hasActiveTrip =
    activePool &&
    (activePool.status === 'MATCHED' ||
      activePool.status === 'DRIVER_ARRIVED' ||
      activePool.status === 'STARTED');

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
                Vehicle: Tesla Model 3 &quot;{tesla?.name || 'Bullet'}&quot; | Driver ID: {user?.id.slice(0, 8)}...
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-xs text-slate-300 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
                <Shield className="w-4 h-4 text-emerald-400" />
                <span>Verified Commercial Pilot</span>
              </div>
              <div
                className={`flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 rounded-lg border ${
                  isOnline
                    ? 'text-emerald-400 bg-emerald-950/20 border-emerald-900/40'
                    : 'text-slate-400 bg-slate-950 border-slate-800'
                }`}
              >
                <Radio
                  className={`w-3.5 h-3.5 ${
                    isOnline ? 'animate-pulse text-emerald-400' : 'text-slate-600'
                  }`}
                />
                <span>{isOnline ? 'Radar Active' : 'Radar Standby'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Vehicle & Online Status Toggle */}
        <DriverStatusToggle
          tesla={tesla || null}
          isLoading={teslaLoading}
          hasActiveTrip={Boolean(hasActiveTrip)}
        />

        {/* Offline Notice or Tactical Cockpit */}
        {!isOnline && !hasActiveTrip ? (
          <div className="bg-slate-900/60 border border-dashed border-slate-800 rounded-2xl p-10 text-center space-y-3">
            <div className="inline-flex p-3 rounded-full bg-slate-950 border border-slate-800 text-slate-500">
              <Power className="w-6 h-6" />
            </div>
            <h2 className="text-base font-semibold text-slate-200">
              Driver Terminal is Offline
            </h2>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Switch your status to Online above to broadcast vehicle availability across Dhaka corridors and receive incoming ride-pooling candidates.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Active Pool Cockpit (if driving an ongoing pool) */}
            {hasActiveTrip && (
              <ActivePoolCockpit
                pool={activePool}
                onLifecycleAdvanced={() => {
                  refetchPool();
                  refetchCandidates();
                  refetchTesla();
                }}
              />
            )}

            {/* Candidate Radar (Open when seats available or no active pool) */}
            <CandidateRadar
              teslaId={tesla?.id || ''}
              seatsAvailable={tesla?.seatsAvailable ?? 3}
              candidates={poolData?.candidates || []}
              isLoading={candidatesLoading}
              onClaimSuccess={() => {
                refetchCandidates();
                refetchPool();
                refetchTesla();
              }}
            />
          </div>
        )}
      </main>
    </div>
  );
};

