import { Coordinates } from './coordinates.interface';

export interface RouteLeg {
  pickup: Coordinates;
  dropoff: Coordinates;
  pickupZoneId?: string;
  dropoffZoneId?: string;
}
