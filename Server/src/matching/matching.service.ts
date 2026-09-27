import { Injectable } from '@nestjs/common';
import {
  DETOUR_ABS_CAP_KM,
  DETOUR_PCT_CAP,
  DETOUR_RATIO_CAP,
  DHAKA_CORRIDORS,
  EARTH_RADIUS_KM,
  PICKUP_PROXIMITY_KM,
  ROAD_FACTOR,
} from './matching.constants';
import { Coordinates } from './interfaces/coordinates.interface';
import { RouteLeg } from './interfaces/route-leg.interface';
import {
  CompatibilityResult,
  DropoffOrder,
} from './interfaces/compatibility-result.interface';

@Injectable()
export class MatchingService {
  haversineKm(p1: Coordinates, p2: Coordinates): number {
    const dLat = this.toRadians(p2.lat - p1.lat);
    const dLng = this.toRadians(p2.lng - p1.lng);
    const lat1 = this.toRadians(p1.lat);
    const lat2 = this.toRadians(p2.lat);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return EARTH_RADIUS_KM * c;
  }

  roadDistanceKm(p1: Coordinates, p2: Coordinates): number {
    const straightLine = this.haversineKm(p1, p2);
    return Math.round(straightLine * ROAD_FACTOR * 10) / 10;
  }

  isPickupCompatible(pickupA: Coordinates, pickupB: Coordinates): boolean {
    return this.haversineKm(pickupA, pickupB) <= PICKUP_PROXIMITY_KM;
  }

  evaluateCompatibility(legA: RouteLeg, legB: RouteLeg): CompatibilityResult {
    // 1. Pickup Proximity Check (<= 1.5 km or identical pickup zone)
    const pickupDist =
      Math.round(this.haversineKm(legA.pickup, legB.pickup) * 10) / 10;
    const samePickupZone = Boolean(
      legA.pickupZoneId &&
        legB.pickupZoneId &&
        legA.pickupZoneId === legB.pickupZoneId,
    );

    if (pickupDist > PICKUP_PROXIMITY_KM && !samePickupZone) {
      return {
        compatible: false,
        pickupDistanceKm: pickupDist,
        reason: `Pickups exceed proximity threshold of ${PICKUP_PROXIMITY_KM} km (${pickupDist} km)`,
      };
    }

    // 2. Shared Corridor & Direction Monotonicity Check
    if (
      legA.pickupZoneId &&
      legA.dropoffZoneId &&
      legB.pickupZoneId &&
      legB.dropoffZoneId
    ) {
      const exactSameRoute =
        legA.pickupZoneId === legB.pickupZoneId &&
        legA.dropoffZoneId === legB.dropoffZoneId;

      if (!exactSameRoute) {
        const matchingCorridors = Object.entries(DHAKA_CORRIDORS).filter(
          ([_, corridor]) => {
            const idxA_pick = corridor.indexOf(legA.pickupZoneId!);
            const idxA_drop = corridor.indexOf(legA.dropoffZoneId!);
            const idxB_pick = corridor.indexOf(legB.pickupZoneId!);
            const idxB_drop = corridor.indexOf(legB.dropoffZoneId!);

            if (
              idxA_pick === -1 ||
              idxA_drop === -1 ||
              idxB_pick === -1 ||
              idxB_drop === -1
            ) {
              return false;
            }

            const dirA = idxA_drop - idxA_pick;
            const dirB = idxB_drop - idxB_pick;

            return (dirA > 0 && dirB > 0) || (dirA < 0 && dirB < 0);
          },
        );

        if (matchingCorridors.length === 0) {
          return {
            compatible: false,
            pickupDistanceKm: pickupDist,
            reason:
              'Destinations lie on divergent corridors or opposing directions',
          };
        }
      }
    }

    const directA = this.roadDistanceKm(legA.pickup, legA.dropoff);
    const directB = this.roadDistanceKm(legB.pickup, legB.dropoff);
    const pickupToPickup = this.roadDistanceKm(legA.pickup, legB.pickup);
    const dropoffAToDropoffB = this.roadDistanceKm(legA.dropoff, legB.dropoff);

    // Sequence 1: Drop A first, then Drop B
    const travelA1 =
      pickupToPickup === 0
        ? directA
        : pickupToPickup + this.roadDistanceKm(legB.pickup, legA.dropoff);
    const detourA1 = Math.max(0, travelA1 - directA);

    const travelB1 =
      this.roadDistanceKm(legB.pickup, legA.dropoff) + dropoffAToDropoffB;
    const detourB1 = Math.max(0, travelB1 - directB);
    const maxDetourOrder1 = Math.round(Math.max(detourA1, detourB1) * 10) / 10;

    // Sequence 2: Drop B first, then Drop A
    const travelB2 =
      pickupToPickup === 0
        ? directB
        : this.roadDistanceKm(legB.pickup, legB.dropoff);
    const detourB2 = Math.max(0, travelB2 - directB);

    const travelA2 =
      (pickupToPickup === 0 ? directB : pickupToPickup + directB) +
      dropoffAToDropoffB;
    const detourA2 = Math.max(0, travelA2 - directA);
    const maxDetourOrder2 = Math.round(Math.max(detourA2, detourB2) * 10) / 10;

    let bestOrder: DropoffOrder;
    let bestDetour: number;
    let firstRiderTraveled: number;
    let firstRiderSolo: number;

    if (maxDetourOrder1 <= maxDetourOrder2) {
      bestOrder = DropoffOrder.DROP_A_THEN_B;
      bestDetour = maxDetourOrder1;
      firstRiderTraveled = travelA1;
      firstRiderSolo = directA;
    } else {
      bestOrder = DropoffOrder.DROP_B_THEN_A;
      bestDetour = maxDetourOrder2;
      firstRiderTraveled = travelB2;
      firstRiderSolo = directB;
    }

    // 3. Detour bound ratio check: travel <= 1.3 * soloDistance for the passenger bearing detour
    const detourRatio =
      firstRiderSolo > 0
        ? Math.round((firstRiderTraveled / firstRiderSolo) * 100) / 100
        : 1.0;

    const minDirect = Math.min(directA, directB);
    const isAcceptable =
      bestDetour <= DETOUR_ABS_CAP_KM ||
      bestDetour <= Math.round(minDirect * DETOUR_PCT_CAP * 10) / 10;

    // Overlap distance: segment where both passengers are concurrently inside the Tesla
    let overlapKm = Math.min(directA, directB);
    if (pickupToPickup > 0) {
      const sharedSegment =
        bestOrder === DropoffOrder.DROP_A_THEN_B
          ? this.roadDistanceKm(legB.pickup, legA.dropoff)
          : this.roadDistanceKm(legA.pickup, legB.dropoff);
      overlapKm = Math.max(0, Math.min(sharedSegment, directA, directB));
    }
    overlapKm = Math.round(overlapKm * 10) / 10;

    return {
      compatible: isAcceptable,
      pickupDistanceKm: pickupDist,
      bestOrder,
      detourKm: bestDetour,
      overlapKm,
      directDistanceAKm: directA,
      directDistanceBKm: directB,
      reason: isAcceptable
        ? `Compatible: corridor aligned with ${bestDetour} km detour and ${overlapKm} km shared overlap`
        : `Incompatible: detour of ${bestDetour} km exceeds 1.3x solo bound (ratio ${detourRatio})`,
    };
  }

  private toRadians(deg: number): number {
    return (deg * Math.PI) / 180;
  }
}
