import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Navbar } from '../components/Navbar';
import { BookingSheet } from '../components/passenger/BookingSheet';
import { RideTracker } from '../components/passenger/RideTracker';
import { TripReceipt } from '../components/passenger/TripReceipt';
import { RideRequest } from '../types';
import { formatPoyshaToTaka } from '../utils/geo';
import { Shield, History } from 'lucide-react';

export const PassengerPage: React.FC = () => {
  const { user } = useAuth();
  const [dismissedRideIds, setDismissedRideIds] = useState<string[]>([]);

  // Auto-polling for passenger's ride requests
  const {
    data: rides = [],
    isLoading,
    refetch,
  } = useQuery<RideRequest[]>({
    queryKey: ['myRides'],
    queryFn: () => apiClient.get<RideRequest[]>('/ride-requests/me'),
    refetchInterval: 2500, // poll every 2.5 seconds
  });

  // 1. Check for actively ongoing ride
  const activeRide = rides.find(
    (r) =>
      r.status === 'REQUESTED' ||
      r.status === 'MATCHED' ||
      r.status === 'DRIVER_ARRIVED' ||
      r.status === 'STARTED',
  );

  // 2. Check for newly completed ride (not yet dismissed)
  const completedRide = rides.find(
    (r) => r.status === 'COMPLETED' && !dismissedRideIds.includes(r.id),
  );

  const handleDismissReceipt = (rideId: string) => {
    setDismissedRideIds((prev) => [...prev, rideId]);
  };

  const pastRides = rides.filter(
    (r) => r.status === 'COMPLETED' || r.status === 'CANCELLED',
  );

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
                Hello, {user?.fullName}
              </h1>
              <p className="text-xs text-slate-400">
                {user?.email} | {user?.phone}
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-300 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span>Verified EV Passenger</span>
            </div>
          </div>
        </div>

        {/* Dynamic Primary View */}
        {isLoading && rides.length === 0 ? (
          <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
            <div className="w-8 h-8 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin mx-auto" />
            <div className="text-xs text-slate-400">Loading terminal state...</div>
          </div>
        ) : activeRide ? (
          <RideTracker
            ride={activeRide}
            onCancelled={() => refetch()}
          />
        ) : completedRide ? (
          <TripReceipt
            ride={completedRide}
            onBookAgain={() => handleDismissReceipt(completedRide.id)}
            onRatingSubmitted={() => refetch()}
          />
        ) : (
          <BookingSheet
            onRideCreated={() => refetch()}
          />
        )}

        {/* Past Trips History */}
        {pastRides.length > 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
              <span className="flex items-center gap-1.5">
                <History className="w-4 h-4 text-slate-400" />
                <span>Trip History ({pastRides.length})</span>
              </span>
            </div>

            <div className="space-y-2">
              {pastRides.slice(0, 5).map((trip) => {
                const isCompleted = trip.status === 'COMPLETED';
                return (
                  <div
                    key={trip.id}
                    className="p-3 rounded-xl bg-slate-950 border border-slate-850 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                  >
                    <div>
                      <div className="font-medium text-slate-200">
                        {trip.pickupZone?.name || trip.pickupZoneId} to{' '}
                        {trip.dropoffZone?.name || trip.dropoffZoneId}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {trip.distanceKm} km | {new Date(trip.requestedAt).toLocaleTimeString()}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase ${
                          isCompleted
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {trip.status}
                      </span>
                      <span className="font-mono font-semibold text-slate-200">
                        {formatPoyshaToTaka(trip.totalFarePoysha)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
