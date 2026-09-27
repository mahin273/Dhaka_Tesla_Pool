import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { Zone, RideRequest } from '../../types';
import {
  calculateDhakaRoadDistance,
  calculateEstimatedFare,
  formatPoyshaToTaka,
} from '../../utils/geo';
import { MapPin, Navigation, Users, Zap, AlertCircle, ArrowRight } from 'lucide-react';

interface BookingSheetProps {
  onRideCreated: (ride: RideRequest) => void;
}

export const BookingSheet: React.FC<BookingSheetProps> = ({ onRideCreated }) => {
  const queryClient = useQueryClient();

  const [pickupZoneId, setPickupZoneId] = useState<string>('BANANI');
  const [dropoffZoneId, setDropoffZoneId] = useState<string>('GULSHAN_1');
  const [seatsRequested, setSeatsRequested] = useState<number>(1);
  const [error, setError] = useState<string | null>(null);

  // Fetch Dhaka Zones
  const { data: zones = [], isLoading: zonesLoading } = useQuery<Zone[]>({
    queryKey: ['zones'],
    queryFn: () => apiClient.get<Zone[]>('/zones'),
  });

  const selectedPickup = zones.find((z) => z.id === pickupZoneId);
  const selectedDropoff = zones.find((z) => z.id === dropoffZoneId);

  const isSameZone = pickupZoneId === dropoffZoneId;

  // Calculate live estimate
  const distanceKm =
    selectedPickup && selectedDropoff && !isSameZone
      ? calculateDhakaRoadDistance(
          selectedPickup.centerLat,
          selectedPickup.centerLng,
          selectedDropoff.centerLat,
          selectedDropoff.centerLng,
        )
      : 0;

  const fareEstimate = distanceKm > 0 ? calculateEstimatedFare(distanceKm) : null;

  // Booking Mutation
  const bookMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPickup || !selectedDropoff || isSameZone) {
        throw new Error('Please select different pickup and dropoff zones');
      }

      return apiClient.post<RideRequest>('/ride-requests', {
        pickupZoneId,
        pickupLat: selectedPickup.centerLat,
        pickupLng: selectedPickup.centerLng,
        dropoffZoneId,
        dropoffLat: selectedDropoff.centerLat,
        dropoffLng: selectedDropoff.centerLng,
        seatsRequested,
      });
    },
    onSuccess: (newRide) => {
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['myRides'] });
      onRideCreated(newRide);
    },
    onError: (err: any) => {
      setError(err.message || 'Failed to submit ride request');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSameZone) {
      setError('Pickup and dropoff zones must be different');
      return;
    }
    setError(null);
    bookMutation.mutate();
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
      <div className="border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold uppercase tracking-wider">
          <Zap className="w-4 h-4" />
          <span>Book an Electric Pool</span>
        </div>
        <h2 className="text-lg font-bold text-white mt-1">
          Dhaka Urban Smart Transit
        </h2>
        <p className="text-xs text-slate-400">
          Fixed-price electric vehicle pooling with guaranteed 20% distance discount upon match.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-rose-950/40 border border-rose-800 text-rose-300 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Zone Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-emerald-400" />
              <span>Pickup Hub</span>
            </label>
            <select
              value={pickupZoneId}
              onChange={(e) => setPickupZoneId(e.target.value)}
              disabled={zonesLoading || bookMutation.isPending}
              className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-emerald-500 transition-colors"
            >
              {zones.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5 flex items-center gap-1.5">
              <Navigation className="w-3.5 h-3.5 text-cyan-400" />
              <span>Dropoff Destination</span>
            </label>
            <select
              value={dropoffZoneId}
              onChange={(e) => setDropoffZoneId(e.target.value)}
              disabled={zonesLoading || bookMutation.isPending}
              className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-emerald-500 transition-colors"
            >
              {zones.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Seat Count Selector */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-slate-400" />
            <span>Seats Needed</span>
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => setSeatsRequested(num)}
                disabled={bookMutation.isPending}
                className={`py-2 px-3 rounded-lg text-xs font-medium border transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  seatsRequested === num
                    ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 font-semibold'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <span>{num} {num === 1 ? 'Seat' : 'Seats'}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Upfront Fare Estimate Card */}
        {fareEstimate && !isSameZone && (
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-850 pb-2">
              <span>Road Distance (1.6x Dhaka Grid)</span>
              <span className="font-mono text-slate-200 font-medium">
                {fareEstimate.distanceKm} km
              </span>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Base Fare</span>
                <span className="font-mono">{formatPoyshaToTaka(fareEstimate.baseFarePoysha)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Distance Charge ({fareEstimate.distanceKm} km @ BDT 18/km)</span>
                <span className="font-mono">{formatPoyshaToTaka(fareEstimate.distanceChargePoysha)}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="text-[11px] text-slate-400">Upfront Solo Quote</div>
                <div className="text-base font-bold text-white font-mono">
                  {formatPoyshaToTaka(fareEstimate.soloTotalPoysha)}
                </div>
              </div>

              <div className="bg-emerald-950/40 border border-emerald-800/40 rounded-lg px-3 py-1.5 text-right">
                <div className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider">
                  20% Pooled Estimate
                </div>
                <div className="text-sm font-bold text-emerald-300 font-mono">
                  {formatPoyshaToTaka(fareEstimate.potentialPooledTotalPoysha)}
                </div>
                <div className="text-[10px] text-slate-400">
                  Save {formatPoyshaToTaka(fareEstimate.potentialPoolDiscountPoysha)} when matched
                </div>
              </div>
            </div>
          </div>
        )}

        {isSameZone && (
          <div className="text-center p-3 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 text-xs">
            Pickup and Dropoff locations cannot be in the same zone.
          </div>
        )}

        {/* Submit CTA */}
        <button
          type="submit"
          disabled={bookMutation.isPending || isSameZone || zonesLoading}
          className="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-sm rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/10"
        >
          {bookMutation.isPending ? (
            <span>Requesting Dispatch...</span>
          ) : (
            <>
              <span>Request Tesla Pool</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>
    </div>
  );
};
