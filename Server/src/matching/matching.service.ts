import { Injectable } from '@nestjs/common';
import {
  DETOUR_ABS_CAP_KM,
  DETOUR_PCT_CAP,
  EARTH_RADIUS_KM,
  PICKUP_CLUSTER_RADIUS_KM,
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
    return this.haversineKm(pickupA, pickupB) <= PICKUP_CLUSTER_RADIUS_KM;
  }

  evaluateCompatibility(legA: RouteLeg, legB: RouteLeg): CompatibilityResult {
    const pickupDist =
      Math.round(this.haversineKm(legA.pickup, legB.pickup) * 10) / 10;

    if (pickupDist > PICKUP_CLUSTER_RADIUS_KM) {
      return {
        compatible: false,
        pickupDistanceKm: pickupDist,
        reason: `Pickups exceed cluster radius of ${PICKUP_CLUSTER_RADIUS_KM} km (${pickupDist} km)`,
      };
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

    if (maxDetourOrder1 <= maxDetourOrder2) {
      bestOrder = DropoffOrder.DROP_A_THEN_B;
      bestDetour = maxDetourOrder1;
    } else {
      bestOrder = DropoffOrder.DROP_B_THEN_A;
      bestDetour = maxDetourOrder2;
    }

    const minDirect = Math.min(directA, directB);
    const isAcceptable =
      bestDetour <= DETOUR_ABS_CAP_KM ||
      bestDetour <= Math.round(minDirect * DETOUR_PCT_CAP * 10) / 10;

    return {
      compatible: isAcceptable,
      pickupDistanceKm: pickupDist,
      bestOrder,
      detourKm: bestDetour,
      directDistanceAKm: directA,
      directDistanceBKm: directB,
      reason: isAcceptable
        ? `Compatible: detour of ${bestDetour} km is within acceptable limits`
        : `Incompatible: detour of ${bestDetour} km exceeds both absolute (${DETOUR_ABS_CAP_KM} km) and relative (${DETOUR_PCT_CAP * 100}%) limits`,
    };
  }

  private toRadians(deg: number): number {
    return (deg * Math.PI) / 180;
  }
}
