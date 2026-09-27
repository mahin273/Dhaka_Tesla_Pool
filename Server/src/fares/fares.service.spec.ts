import { BadRequestException } from '@nestjs/common';
import { FaresService } from './fares.service';

describe('FaresService', () => {
  let service: FaresService;

  beforeEach(() => {
    service = new FaresService();
  });

  describe('calculateFare', () => {
    it('calculates pooled fare correctly for Nusrat (2.3 km)', () => {
      const fare = service.calculateFare(2.3, true);

      expect(fare.distanceKm).toBe(2.3);
      expect(fare.baseFarePoysha).toBe(2500);
      expect(fare.distanceChargePoysha).toBe(4140);
      expect(fare.poolDiscountPoysha).toBe(828);
      expect(fare.totalFarePoysha).toBe(5812);
      expect(fare.formatted.baseFareTaka).toBe('25.00');
      expect(fare.formatted.distanceChargeTaka).toBe('41.40');
      expect(fare.formatted.poolDiscountTaka).toBe('8.28');
      expect(fare.formatted.totalFareTaka).toBe('58.12');
    });

    it('calculates pooled fare correctly for Rafiq (2.2 km)', () => {
      const fare = service.calculateFare(2.2, true);

      expect(fare.distanceKm).toBe(2.2);
      expect(fare.baseFarePoysha).toBe(2500);
      expect(fare.distanceChargePoysha).toBe(3960);
      expect(fare.poolDiscountPoysha).toBe(792);
      expect(fare.totalFarePoysha).toBe(5668);
      expect(fare.formatted.baseFareTaka).toBe('25.00');
      expect(fare.formatted.distanceChargeTaka).toBe('39.60');
      expect(fare.formatted.poolDiscountTaka).toBe('7.92');
      expect(fare.formatted.totalFareTaka).toBe('56.68');
    });

    it('calculates solo fare correctly for Nusrat (2.3 km)', () => {
      const fare = service.calculateFare(2.3, false);

      expect(fare.distanceKm).toBe(2.3);
      expect(fare.baseFarePoysha).toBe(2500);
      expect(fare.distanceChargePoysha).toBe(4140);
      expect(fare.poolDiscountPoysha).toBe(0);
      expect(fare.totalFarePoysha).toBe(6640);
      expect(fare.formatted.totalFareTaka).toBe('66.40');
    });

    it('calculates solo fare correctly for Rafiq (2.2 km)', () => {
      const fare = service.calculateFare(2.2, false);

      expect(fare.distanceKm).toBe(2.2);
      expect(fare.baseFarePoysha).toBe(2500);
      expect(fare.distanceChargePoysha).toBe(3960);
      expect(fare.poolDiscountPoysha).toBe(0);
      expect(fare.totalFarePoysha).toBe(6460);
      expect(fare.formatted.totalFareTaka).toBe('64.60');
    });

    it('defaults to solo fare when isPooled is omitted', () => {
      const fare = service.calculateFare(2.3);

      expect(fare.poolDiscountPoysha).toBe(0);
      expect(fare.totalFarePoysha).toBe(6640);
    });

    it('handles zero distance with flat base fare', () => {
      const fare = service.calculateFare(0, false);

      expect(fare.baseFarePoysha).toBe(2500);
      expect(fare.distanceChargePoysha).toBe(0);
      expect(fare.poolDiscountPoysha).toBe(0);
      expect(fare.totalFarePoysha).toBe(2500);
      expect(fare.formatted.totalFareTaka).toBe('25.00');
    });

    it('throws BadRequestException for negative distances', () => {
      expect(() => service.calculateFare(-1)).toThrow(BadRequestException);
      expect(() => service.calculateFare(-0.5)).toThrow(
        'Distance must be non-negative',
      );
    });

    it('rounds intermediate charges accurately to avoid fractional drift', () => {
      const fare = service.calculateFare(1.555, true);

      expect(fare.distanceChargePoysha).toBe(2799);
      expect(fare.poolDiscountPoysha).toBe(560);
      expect(fare.totalFarePoysha).toBe(2500 + 2799 - 560);
    });

    it('calculates 2-seat solo fare correctly with strict per-seat scaling', () => {
      const fare = service.calculateFare(2.3, false, undefined, 2);

      expect(fare.distanceKm).toBe(2.3);
      expect(fare.baseFarePoysha).toBe(5000);
      expect(fare.distanceChargePoysha).toBe(8280);
      expect(fare.poolDiscountPoysha).toBe(0);
      expect(fare.totalFarePoysha).toBe(13280);
      expect(fare.formatted.totalFareTaka).toBe('132.80');
    });

    it('calculates 3-seat full vehicle buyout correctly', () => {
      const fare = service.calculateFare(2.3, false, undefined, 3);

      expect(fare.distanceKm).toBe(2.3);
      expect(fare.baseFarePoysha).toBe(7500);
      expect(fare.distanceChargePoysha).toBe(12420);
      expect(fare.poolDiscountPoysha).toBe(0);
      expect(fare.totalFarePoysha).toBe(19920);
      expect(fare.formatted.totalFareTaka).toBe('199.20');
    });

    it('throws BadRequestException for seats less than 1', () => {
      expect(() => service.calculateFare(2.3, false, undefined, 0)).toThrow(
        BadRequestException,
      );
      expect(() => service.calculateFare(2.3, false, undefined, -1)).toThrow(
        'Seats must be at least 1',
      );
    });
  });
});
