import React, { useState } from 'react';
import { RideRequest, Rating } from '../../types';
import { formatPoyshaToTaka } from '../../utils/geo';
import { apiClient } from '../../api/client';
import {
  CheckCircle2,
  ArrowRight,
  Receipt,
  Star,
  Banknote,
  Loader2,
  AlertCircle,
} from 'lucide-react';

interface TripReceiptProps {
  ride: RideRequest;
  onBookAgain: () => void;
  onRatingSubmitted?: (rating: Rating) => void;
}

const AVAILABLE_TAGS = [
  'Clean vehicle',
  'Smooth driving',
  'On time',
  'Friendly driver',
];

export const TripReceipt: React.FC<TripReceiptProps> = ({
  ride,
  onBookAgain,
  onRatingSubmitted,
}) => {
  const [stars, setStars] = useState<number>(5);
  const [hoveredStars, setHoveredStars] = useState<number | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [comment, setComment] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [localRating, setLocalRating] = useState<Rating | null>(
    ride.rating || null,
  );

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const handleRate = async () => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const response = await apiClient.post<Rating>(
        `/ride-requests/${ride.id}/rate`,
        {
          stars,
          tags: selectedTags,
          comment: comment.trim() || undefined,
        },
      );
      setLocalRating(response);
      if (onRatingSubmitted) {
        onRatingSubmitted(response);
      }
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to submit rating');
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeRating = localRating || ride.rating;

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
          <div className="font-semibold text-slate-200 flex items-center gap-1.5">
            <Banknote className="w-4 h-4 text-emerald-400" />
            <span>Payment Method: Cash to Driver</span>
          </div>
          <div className="text-[11px] text-slate-500">
            Cash payment settled upon arrival (Cash only)
          </div>
        </div>
        <span className="px-2.5 py-1 rounded text-[10px] font-mono font-semibold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
          Paid via Cash
        </span>
      </div>

      {/* 5-Star Rating & Feedback */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-850 pb-2.5">
          <span className="text-xs font-semibold text-slate-200">
            {activeRating ? 'Your Rating & Feedback' : 'Rate Your Driver & Trip'}
          </span>
          {activeRating && (
            <span className="px-2 py-0.5 text-[10px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 rounded flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              <span>Rating Submitted</span>
            </span>
          )}
        </div>

        {activeRating ? (
          <div className="space-y-3">
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className={`w-5 h-5 ${
                    s <= activeRating.stars
                      ? 'text-amber-400 fill-amber-400'
                      : 'text-slate-700'
                  }`}
                />
              ))}
              <span className="text-xs font-mono font-bold text-amber-400 ml-2">
                {activeRating.stars}.0 / 5.0
              </span>
            </div>

            {activeRating.tags && activeRating.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {activeRating.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 text-[11px] rounded bg-slate-900 border border-slate-800 text-slate-300"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {activeRating.comment && (
              <p className="text-xs text-slate-400 italic bg-slate-900/60 p-2.5 rounded-lg border border-slate-850">
                &quot;{activeRating.comment}&quot;
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3.5">
            <div className="space-y-1">
              <div className="text-[11px] text-slate-400">
                Tap to rate your experience:
              </div>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStars(s)}
                    onMouseEnter={() => setHoveredStars(s)}
                    onMouseLeave={() => setHoveredStars(null)}
                    className="p-1 rounded hover:bg-slate-900 transition-colors cursor-pointer"
                  >
                    <Star
                      className={`w-6 h-6 transition-colors ${
                        s <= (hoveredStars ?? stars)
                          ? 'text-amber-400 fill-amber-400'
                          : 'text-slate-600'
                      }`}
                    />
                  </button>
                ))}
                <span className="text-xs font-mono font-bold text-amber-400 ml-1">
                  {hoveredStars ?? stars} / 5 Stars
                </span>
              </div>
            </div>

            {/* Quick Feedback Tags */}
            <div className="space-y-1.5">
              <div className="text-[11px] text-slate-400">
                Quick feedback tags:
              </div>
              <div className="flex flex-wrap gap-1.5">
                {AVAILABLE_TAGS.map((tag) => {
                  const isSelected = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Optional Comment */}
            <div className="space-y-1">
              <label
                htmlFor="rating-comment"
                className="text-[11px] text-slate-400 block"
              >
                Additional comments (optional):
              </label>
              <input
                id="rating-comment"
                type="text"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Share your experience..."
                maxLength={200}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500"
              />
            </div>

            {submitError && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-rose-950/40 border border-rose-800 text-rose-300 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            <button
              type="button"
              onClick={handleRate}
              disabled={isSubmitting}
              className="w-full py-2.5 px-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Submitting Rating...</span>
                </>
              ) : (
                <span>Submit Rating</span>
              )}
            </button>
          </div>
        )}
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
