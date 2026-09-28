import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { RideRequest, RideStatus } from '../../types';
import { formatPoyshaToTaka } from '../../utils/geo';
import {
  Car,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Star,
} from 'lucide-react';

interface RideTrackerProps {
  ride: RideRequest;
  onCancelled: () => void;
}

interface StepConfig {
  status: RideStatus;
  label: string;
  sublabel: string;
}

const STEPS: StepConfig[] = [
  {
    status: 'REQUESTED',
    label: 'Finding Pool',
    sublabel: 'Evaluating routes & driver availability',
  },
  {
    status: 'MATCHED',
    label: 'Tesla Matched',
    sublabel: 'Assigned to Tesla Model 3 "Bullet"',
  },
  {
    status: 'DRIVER_ARRIVED',
    label: 'Driver Arrived',
    sublabel: 'Bullet has arrived at pickup hub',
  },
  {
    status: 'STARTED',
    label: 'En Route',
    sublabel: 'Traveling along Dhaka corridor',
  },
  {
    status: 'COMPLETED',
    label: 'Trip Completed',
    sublabel: 'Safely arrived at destination',
  },
];

export const RideTracker: React.FC<RideTrackerProps> = ({ ride, onCancelled }) => {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const driver = ride.pool?.tesla?.driver;
  const driverName = driver?.fullName
    ? driver.fullName.startsWith('Captain')
      ? driver.fullName
      : `Captain ${driver.fullName}`
    : 'Captain Jashim Uddin';
  const driverPhone = driver?.phone || '+8801710000001';
  const driverRating = driver?.rating ?? 4.9;
  const vehicleName = ride.pool?.tesla?.name || 'Bullet';

  const currentStepIndex = STEPS.findIndex((s) => s.status === ride.status);
  const canCancel =
    ride.status === 'REQUESTED' ||
    ride.status === 'MATCHED' ||
    ride.status === 'DRIVER_ARRIVED';

  const cancelMutation = useMutation({
    mutationFn: async () => {
      return apiClient.post(`/ride-requests/${ride.id}/cancel`);
    },
    onSuccess: () => {
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['myRides'] });
      onCancelled();
    },
    onError: (err: any) => {
      setError(err.message || 'Failed to cancel ride');
    },
  });

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-emerald-400">
              Live Trip Tracking
            </span>
          </div>
          <h2 className="text-lg font-bold text-white mt-1">
            Trip #{ride.id.slice(0, 8)}
          </h2>
          <p className="text-xs text-slate-400">
            {ride.pickupZone?.name || ride.pickupZoneId} to{' '}
            {ride.dropoffZone?.name || ride.dropoffZoneId}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <span className="px-2.5 py-1 text-xs font-mono font-semibold uppercase rounded-lg bg-slate-950 text-slate-200 border border-slate-800">
            Status: {ride.status}
          </span>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-rose-950/40 border border-rose-800 text-rose-300 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Stepper HUD */}
      <div className="space-y-4 py-2">
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Journey State Machine
        </div>

        <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
          {STEPS.map((step, idx) => {
            const isCompleted = idx < currentStepIndex;
            const isCurrent = idx === currentStepIndex;

            return (
              <div key={step.status} className="relative flex items-start gap-4">
                {/* Node icon */}
                <div
                  className={`absolute -left-6 mt-0.5 w-5 h-5 rounded-full flex items-center justify-center text-xs transition-colors ${
                    isCompleted
                      ? 'bg-emerald-500 text-slate-950'
                      : isCurrent
                      ? 'bg-emerald-500/20 border-2 border-emerald-400 text-emerald-400 animate-pulse'
                      : 'bg-slate-950 border border-slate-800 text-slate-600'
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-current" />
                  )}
                </div>

                {/* Content */}
                <div>
                  <div
                    className={`text-sm font-semibold ${
                      isCurrent
                        ? 'text-emerald-400'
                        : isCompleted
                        ? 'text-slate-200'
                        : 'text-slate-500'
                    }`}
                  >
                    {step.label}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {step.sublabel}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Driver & Vehicle Details (Once Matched) */}
      {ride.status !== 'REQUESTED' && (
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-850 pb-2">
            <span className="font-semibold text-slate-300 flex items-center gap-1.5">
              <Car className="w-4 h-4 text-emerald-400" />
              <span>Assigned Pool Vehicle</span>
            </span>
            <span className="font-mono text-emerald-400 font-medium">
              Tesla Model 3
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <div className="text-slate-400">Driver</div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-semibold text-slate-100">
                  {driverName}
                </span>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono text-[11px] font-bold">
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                  <span>{driverRating.toFixed(1)}</span>
                </span>
              </div>
              <div className="text-[11px] text-slate-500 font-mono">
                {driverPhone}
              </div>
            </div>
            <div>
              <div className="text-slate-400">Vehicle</div>
              <div className="font-semibold text-slate-100">
                &quot;{vehicleName}&quot;
              </div>
              <div className="text-[11px] text-emerald-400">EV Fleet Priority</div>
            </div>
          </div>
        </div>
      )}

      {/* Trip Financials */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2 text-xs">
        <div className="flex justify-between text-slate-400">
          <span>Distance (1.6x Dhaka Grid)</span>
          <span className="font-mono text-slate-200">{ride.distanceKm} km</span>
        </div>
        <div className="flex justify-between text-slate-400">
          <span>Base Fare</span>
          <span className="font-mono">{formatPoyshaToTaka(ride.baseFarePoysha)}</span>
        </div>
        <div className="flex justify-between text-slate-400">
          <span>Distance Charge</span>
          <span className="font-mono">{formatPoyshaToTaka(ride.distanceChargePoysha)}</span>
        </div>
        {ride.poolDiscountPoysha > 0 && (
          <div className="flex justify-between text-emerald-400 font-medium">
            <span>20% Pooling Discount Applied</span>
            <span className="font-mono">
              -{formatPoyshaToTaka(ride.poolDiscountPoysha)}
            </span>
          </div>
        )}
        <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-sm font-bold text-white">
          <span>Current Fare</span>
          <span className="font-mono text-emerald-400">
            {formatPoyshaToTaka(ride.totalFarePoysha)}
          </span>
        </div>
      </div>

      {/* Cancellation Action Guard */}
      <div className="pt-2 border-t border-slate-800">
        {canCancel ? (
          <button
            type="button"
            onClick={() => cancelMutation.mutate()}
            disabled={cancelMutation.isPending}
            className="w-full py-2.5 px-4 bg-slate-950 hover:bg-rose-950/30 border border-slate-800 hover:border-rose-800/60 text-slate-300 hover:text-rose-300 font-medium text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            {cancelMutation.isPending ? (
              <span>Cancelling Trip...</span>
            ) : (
              <>
                <XCircle className="w-4 h-4 text-rose-400" />
                <span>Cancel Ride Request</span>
              </>
            )}
          </button>
        ) : ride.status === 'STARTED' ? (
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center space-y-1">
            <div className="text-xs font-medium text-slate-300">
              Trip En Route - Cancellation Disabled
            </div>
            <div className="text-[11px] text-slate-500">
              For passenger safety and driver compensation, mid-trip cancellation is not permitted once the vehicle departs.
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
