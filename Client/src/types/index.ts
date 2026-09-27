export type UserRole = 'PASSENGER' | 'DRIVER';

export type RideStatus =
  | 'REQUESTED'
  | 'MATCHED'
  | 'DRIVER_ARRIVED'
  | 'STARTED'
  | 'COMPLETED'
  | 'CANCELLED';

export type PoolStatus =
  | 'MATCHED'
  | 'DRIVER_ARRIVED'
  | 'STARTED'
  | 'COMPLETED'
  | 'CANCELLED';

export type PaymentMethod = 'CASH' | 'TESLAPAY';
export type PaymentStatus = 'PENDING' | 'COMPLETED' | 'FAILED';

export interface User {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  role: UserRole;
}

export interface Zone {
  id: string;
  name: string;
  centerLat: number;
  centerLng: number;
}

export interface Tesla {
  id: string;
  driverId: string;
  name: string;
  capacity: number;
  seatsAvailable: number;
  isOnline: boolean;
}

export interface RideRequest {
  id: string;
  passengerId: string;
  passenger?: {
    id: string;
    fullName: string;
    phone: string;
  };
  poolId?: string | null;
  pickupZoneId: string;
  pickupZone?: Zone;
  pickupLat: number;
  pickupLng: number;
  dropoffZoneId: string;
  dropoffZone?: Zone;
  dropoffLat: number;
  dropoffLng: number;
  seatsRequested: number;
  status: RideStatus;
  distanceKm: number;
  baseFarePoysha: number;
  distanceChargePoysha: number;
  poolDiscountPoysha: number;
  totalFarePoysha: number;
  requestedAt: string;
  cancelledAt?: string | null;
}

export interface Pool {
  id: string;
  teslaId: string;
  tesla?: Tesla & { driver?: { id: string; fullName: string; phone: string } };
  status: PoolStatus;
  matchedAt: string;
  driverArrivedAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  cancelledAt?: string | null;
  rideRequests: RideRequest[];
}

export interface Payment {
  id: string;
  rideRequestId: string;
  method: PaymentMethod;
  amountPoysha: number;
  status: PaymentStatus;
  paidAt?: string | null;
}

export interface CandidatePassenger {
  rideRequestId: string;
  passenger: { id: string; fullName: string; phone: string };
  pickupZone: Zone;
  dropoffZone: Zone;
  seatsRequested: number;
  baseFarePoysha: number;
  distanceChargePoysha: number;
  totalFarePoysha: number;
  distanceKm: number;
  compatible: boolean;
  detourKm: number;
  pickupDistanceKm: number;
  bestOrder?: string;
  reason?: string;
}

export interface CandidateResponse {
  teslaId: string;
  seatsAvailable: number;
  activePoolId: string | null;
  activePassengersCount: number;
  candidates: CandidatePassenger[];
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}

export interface ApiErrorPayload {
  statusCode: number;
  timestamp: string;
  path: string;
  message: string | string[];
  error: string;
}

