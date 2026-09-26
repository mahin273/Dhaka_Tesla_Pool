import { MatchingService } from './matching.service';
import { DropoffOrder } from './interfaces/compatibility-result.interface';

describe('MatchingService', () => {
  let service: MatchingService;

  const BANANI = { lat: 23.7904, lng: 90.4078 };
  const MOHAKHALI = { lat: 23.7784, lng: 90.4034 };
  const GULSHAN_1 = { lat: 23.7806, lng: 90.4163 };
  const UTTARA = { lat: 23.8683, lng: 90.385 };
  const DHANMONDI = { lat: 23.745, lng: 90.3767 };

  beforeEach(() => {
    service = new MatchingService();
  });

  describe('haversineKm', () => {
    it('returns 0 for identical points', () => {
      expect(service.haversineKm(BANANI, BANANI)).toBe(0);
    });

    it('calculates great-circle distance accurately', () => {
      const distance = service.haversineKm(BANANI, MOHAKHALI);
      expect(distance).toBeGreaterThan(1.3);
      expect(distance).toBeLessThan(1.5);
    });
  });

  describe('roadDistanceKm', () => {
    it('applies the 1.6 road factor correctly', () => {
      const straight = service.haversineKm(BANANI, MOHAKHALI);
      const road = service.roadDistanceKm(BANANI, MOHAKHALI);
      const expected = Math.round(straight * 1.6 * 10) / 10;
      expect(road).toBe(expected);
    });

    it('matches the calibrated Dhaka zone distances', () => {
      expect(service.roadDistanceKm(BANANI, MOHAKHALI)).toBe(2.3);
      expect(service.roadDistanceKm(BANANI, GULSHAN_1)).toBe(2.2);
      expect(service.roadDistanceKm(MOHAKHALI, GULSHAN_1)).toBe(2.1);
    });
  });

  describe('isPickupCompatible', () => {
    it('returns true for pickups within 3.5 km', () => {
      expect(service.isPickupCompatible(BANANI, MOHAKHALI)).toBe(true);
      expect(service.isPickupCompatible(BANANI, GULSHAN_1)).toBe(true);
    });

    it('returns false for pickups beyond 3.5 km', () => {
      expect(service.isPickupCompatible(BANANI, UTTARA)).toBe(false);
      expect(service.isPickupCompatible(BANANI, DHANMONDI)).toBe(false);
    });
  });

  describe('evaluateCompatibility (Nusrat & Rafiq Scenario)', () => {
    it('approves pooling for Nusrat and Rafiq with optimal dropoff order', () => {
      const nusratLeg = { pickup: BANANI, dropoff: MOHAKHALI };
      const rafiqLeg = { pickup: BANANI, dropoff: GULSHAN_1 };

      const result = service.evaluateCompatibility(nusratLeg, rafiqLeg);

      expect(result.compatible).toBe(true);
      expect(result.pickupDistanceKm).toBe(0);
      expect(result.bestOrder).toBe(DropoffOrder.DROP_B_THEN_A);
      expect(result.detourKm).toBe(2.0);
      expect(result.directDistanceAKm).toBe(2.3);
      expect(result.directDistanceBKm).toBe(2.2);
      expect(result.reason).toContain('within acceptable limits');
    });

    it('rejects pooling when pickups exceed cluster radius of 3.5 km', () => {
      const legUttara = { pickup: UTTARA, dropoff: BANANI };
      const legDhanmondi = { pickup: DHANMONDI, dropoff: MOHAKHALI };

      const result = service.evaluateCompatibility(legUttara, legDhanmondi);

      expect(result.compatible).toBe(false);
      expect(result.reason).toContain('Pickups exceed cluster radius');
    });

    it('rejects pooling for divergent destinations with excessive detour', () => {
      const northBound = { pickup: BANANI, dropoff: UTTARA };
      const southBound = { pickup: BANANI, dropoff: DHANMONDI };

      const result = service.evaluateCompatibility(northBound, southBound);

      expect(result.compatible).toBe(false);
      expect(result.detourKm).toBeGreaterThan(2.5);
      expect(result.reason).toContain('Incompatible');
    });
  });
});
