export const DHAKA_ROAD_FACTOR = 1.6;
export const BASE_FARE_POYSHA = 2500; // 25 Taka
export const PER_KM_RATE_POYSHA = 1800; // 18 Taka / km
export const POOL_DISCOUNT_PERCENT = 0.2; // 20% off distance charge

export function haversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function calculateDhakaRoadDistance(
  pickupLat: number,
  pickupLng: number,
  dropoffLat: number,
  dropoffLng: number,
): number {
  const crowKm = haversineDistanceKm(pickupLat, pickupLng, dropoffLat, dropoffLng);
  return Number((crowKm * DHAKA_ROAD_FACTOR).toFixed(2));
}

export interface FareCalculation {
  distanceKm: number;
  baseFarePoysha: number;
  distanceChargePoysha: number;
  soloTotalPoysha: number;
  potentialPoolDiscountPoysha: number;
  potentialPooledTotalPoysha: number;
}

export function calculateEstimatedFare(
  distanceKm: number,
  seatsRequested = 1,
): FareCalculation {
  const baseFarePoysha = BASE_FARE_POYSHA * seatsRequested;
  const distanceChargePoysha =
    Math.round(distanceKm * PER_KM_RATE_POYSHA) * seatsRequested;
  const soloTotalPoysha = baseFarePoysha + distanceChargePoysha;
  const potentialPoolDiscountPoysha = Math.round(
    distanceChargePoysha * POOL_DISCOUNT_PERCENT,
  );
  const potentialPooledTotalPoysha =
    soloTotalPoysha - potentialPoolDiscountPoysha;

  return {
    distanceKm,
    baseFarePoysha,
    distanceChargePoysha,
    soloTotalPoysha,
    potentialPoolDiscountPoysha,
    potentialPooledTotalPoysha,
  };
}

export function formatPoyshaToTaka(poysha: number): string {
  const taka = (poysha / 100).toFixed(2);
  return `BDT ${taka}`;
}
