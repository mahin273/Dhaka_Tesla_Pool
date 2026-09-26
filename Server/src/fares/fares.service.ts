import { Injectable, BadRequestException } from '@nestjs/common';
import {
  BASE_FARE_POYSHA,
  PER_KM_RATE_POYSHA,
  POOL_DISCOUNT_PERCENT,
} from './fares.constants';
import { FareBreakdown } from './interfaces/fare-breakdown.interface';

@Injectable()
export class FaresService {
  calculateFare(distanceKm: number, isPooled = false): FareBreakdown {
    if (distanceKm < 0) {
      throw new BadRequestException('Distance must be non-negative');
    }

    const baseFarePoysha = BASE_FARE_POYSHA;
    const distanceChargePoysha = Math.round(distanceKm * PER_KM_RATE_POYSHA);
    const poolDiscountPoysha = isPooled
      ? Math.round(distanceChargePoysha * POOL_DISCOUNT_PERCENT)
      : 0;
    const totalFarePoysha =
      baseFarePoysha + distanceChargePoysha - poolDiscountPoysha;

    return {
      distanceKm,
      baseFarePoysha,
      distanceChargePoysha,
      poolDiscountPoysha,
      totalFarePoysha,
      formatted: {
        baseFareTaka: this.formatTaka(baseFarePoysha),
        distanceChargeTaka: this.formatTaka(distanceChargePoysha),
        poolDiscountTaka: this.formatTaka(poolDiscountPoysha),
        totalFareTaka: this.formatTaka(totalFarePoysha),
      },
    };
  }

  private formatTaka(poysha: number): string {
    return (poysha / 100).toFixed(2);
  }
}
