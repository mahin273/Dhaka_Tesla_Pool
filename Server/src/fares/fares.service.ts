import { Injectable, BadRequestException } from '@nestjs/common';
import {
  BASE_FARE_POYSHA,
  PER_KM_RATE_POYSHA,
  POOL_DISCOUNT_PERCENT,
} from './fares.constants';
import { FareBreakdown } from './interfaces/fare-breakdown.interface';

@Injectable()
export class FaresService {
  calculateFare(
    distanceKm: number,
    isPooled = false,
    overlapKm?: number,
    seats = 1,
  ): FareBreakdown {
    if (distanceKm < 0) {
      throw new BadRequestException('Distance must be non-negative');
    }
    if (seats < 1) {
      throw new BadRequestException('Seats must be at least 1');
    }

    const baseFarePoysha = BASE_FARE_POYSHA * seats;
    const distanceChargePoysha =
      Math.round(distanceKm * PER_KM_RATE_POYSHA) * seats;

    let poolDiscountPoysha = 0;
    if (isPooled) {
      if (overlapKm !== undefined) {
        const rawDiscount =
          Math.round(
            Math.max(0, overlapKm) * PER_KM_RATE_POYSHA * POOL_DISCOUNT_PERCENT,
          ) * seats;
        poolDiscountPoysha = Math.min(rawDiscount, distanceChargePoysha);
      } else {
        poolDiscountPoysha = Math.round(
          distanceChargePoysha * POOL_DISCOUNT_PERCENT,
        );
      }
    }

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
