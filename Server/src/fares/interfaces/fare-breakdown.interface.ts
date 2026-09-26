export interface FareBreakdown {
  distanceKm: number;
  baseFarePoysha: number;
  distanceChargePoysha: number;
  poolDiscountPoysha: number;
  totalFarePoysha: number;
  formatted: {
    baseFareTaka: string;
    distanceChargeTaka: string;
    poolDiscountTaka: string;
    totalFareTaka: string;
  };
}
