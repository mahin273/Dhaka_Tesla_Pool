import React from 'react';
import { RideRequest } from '../../types';
import { formatPoyshaToTaka } from '../../utils/geo';
import { CheckCircle2, ArrowRight, Receipt } from 'lucide-react';

interface TripReceiptProps {
  ride: RideRequest;
  onBookAgain: () => void;
}

export const TripReceipt: React.FC<TripReceiptProps> = ({
  ride,
  onBookAgain,
}) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
      <div className="text-center space-y-2 border-b border-slate-800 pb-5">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 mb-1">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-white">Trip Completed</h2>
        <p className="text-xs text-slate-400">
          You safely arrived at {ride.dropoffZone?.name || ride.dropoffZoneId}. Thank you for pooling with Dhaka Tesla Pool!
        </p>
      </div>

      {/* Invoice Breakdown */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-850 pb-2">
          <span className="flex items-center gap-1.5 font-medium text-slate-300">
            <Receipt className="w-3.5 h-3.5 text-emerald-400" />
            <span>Official Ride Receipt</span>
          </span>
          <span className="font-mono text-slate-400 text-[11px]">
            ID: {ride.id.slice(0, 8)}
          </span>
        </div>

        <div className="space-y-1.5 text-xs">
          <div className="flex justify-between text-slate-400">
            <span>Route</span>
            <span className="font-medium text-slate-200">
              {ride.pickupZone?.name || ride.pickupZoneId} to{' '}
              {ride.dropoffZone?.name || ride.dropoffZoneId}
            </span>
          </div>

          <div className="flex justify-between text-slate-400">
            <span>Distance Traveled</span>
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
            <div className="flex justify-between text-emerald-400 font-semibold bg-emerald-950/20 px-2 py-1 rounded border border-emerald-900/30">
              <span>20% Pooling Savings Applied</span>
              <span className="font-mono">
                -{formatPoyshaToTaka(ride.poolDiscountPoysha)}
              </span>
            </div>
          )}
        </div>

        <div className="pt-3 border-t border-slate-800 flex justify-between items-center text-sm font-bold text-white">
          <span>Total Fare Due</span>
          <span className="text-lg font-mono text-emerald-400">
            {formatPoyshaToTaka(ride.totalFarePoysha)}
          </span>
        </div>
      </div>

      {/* Payment Method Details */}
      <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
        <div className="space-y-0.5">
          <div className="font-semibold text-slate-200">Payment Method: Cash to Driver</div>
          <div className="text-[11px] text-slate-500">
            Pay exact amount to Captain Jashim upon disembarking
          </div>
        </div>
        <span className="px-2 py-1 rounded text-[10px] font-mono font-semibold uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20">
          Payment Pending
        </span>
      </div>

      <button
        type="button"
        onClick={onBookAgain}
        className="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/10"
      >
        <span>Book Another Ride</span>
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
};
