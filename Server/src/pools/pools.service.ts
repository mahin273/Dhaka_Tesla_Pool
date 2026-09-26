import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PoolStatus, RideStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MatchingService } from '../matching/matching.service';
import { DropoffOrder } from '../matching/interfaces/compatibility-result.interface';

@Injectable()
export class PoolsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly matchingService: MatchingService,
  ) {}

  async findCandidates(driverId: string) {
    const tesla = await this.prisma.tesla.findUnique({
      where: { driverId },
    });

    if (!tesla) {
      throw new NotFoundException('Driver has no registered vehicle');
    }

    if (!tesla.isOnline) {
      throw new BadRequestException(
        'Driver is offline. Go online to view candidates',
      );
    }

    if (tesla.seatsAvailable <= 0) {
      return {
        teslaId: tesla.id,
        seatsAvailable: 0,
        activePoolId: null,
        activePassengersCount: 0,
        candidates: [],
      };
    }

    // Check if driver has an active pool
    const activePool = await this.prisma.pool.findFirst({
      where: {
        teslaId: tesla.id,
        status: { in: [PoolStatus.MATCHED, PoolStatus.DRIVER_ARRIVED] },
      },
      include: {
        rideRequests: {
          where: {
            status: { in: [RideStatus.MATCHED, RideStatus.DRIVER_ARRIVED] },
          },
          include: {
            pickupZone: true,
            dropoffZone: true,
            passenger: {
              select: { id: true, fullName: true, phone: true },
            },
          },
        },
      },
    });

    // Query open ride requests that can fit in remaining seats
    const openRequests = await this.prisma.rideRequest.findMany({
      where: {
        status: RideStatus.REQUESTED,
        seatsRequested: { lte: tesla.seatsAvailable },
      },
      include: {
        pickupZone: true,
        dropoffZone: true,
        passenger: {
          select: { id: true, fullName: true, phone: true },
        },
      },
      orderBy: { requestedAt: 'asc' },
    });

    const activeRiders = activePool?.rideRequests ?? [];

    const candidates = openRequests.map((req) => {
      // If car is empty (no active riders), candidate can start a new pool
      if (activeRiders.length === 0) {
        return {
          rideRequestId: req.id,
          passenger: req.passenger,
          pickupZone: req.pickupZone,
          dropoffZone: req.dropoffZone,
          seatsRequested: req.seatsRequested,
          baseFarePoysha: req.baseFarePoysha,
          distanceChargePoysha: req.distanceChargePoysha,
          totalFarePoysha: req.totalFarePoysha,
          distanceKm: Number(req.distanceKm),
          compatible: true,
          detourKm: 0,
          pickupDistanceKm: 0,
          bestOrder: DropoffOrder.DROP_A_THEN_B,
          reason: 'Car is currently empty; candidate can initiate new pool',
        };
      }

      // If active riders exist, evaluate candidate against all active riders
      const candidateLeg = {
        pickup: {
          lat: req.pickupLat,
          lng: req.pickupLng,
        },
        dropoff: {
          lat: req.dropoffLat,
          lng: req.dropoffLng,
        },
      };

      let isAllCompatible = true;
      let maxDetour = 0;
      let maxPickupDist = 0;
      let bestOrder = DropoffOrder.DROP_A_THEN_B;
      let rejectionReason: string | undefined;

      for (const rider of activeRiders) {
        const riderLeg = {
          pickup: {
            lat: rider.pickupLat,
            lng: rider.pickupLng,
          },
          dropoff: {
            lat: rider.dropoffLat,
            lng: rider.dropoffLng,
          },
        };

        const result = this.matchingService.evaluateCompatibility(
          riderLeg,
          candidateLeg,
        );

        if (!result.compatible) {
          isAllCompatible = false;
          rejectionReason = result.reason;
          maxDetour = result.detourKm ?? 999.0;
          maxPickupDist = Math.max(maxPickupDist, result.pickupDistanceKm);
          break;
        }

        maxDetour = Math.max(maxDetour, result.detourKm ?? 0);
        maxPickupDist = Math.max(maxPickupDist, result.pickupDistanceKm);
        if (result.bestOrder) {
          bestOrder = result.bestOrder;
        }
      }

      return {
        rideRequestId: req.id,
        passenger: req.passenger,
        pickupZone: req.pickupZone,
        dropoffZone: req.dropoffZone,
        seatsRequested: req.seatsRequested,
        baseFarePoysha: req.baseFarePoysha,
        distanceChargePoysha: req.distanceChargePoysha,
        totalFarePoysha: req.totalFarePoysha,
        distanceKm: Number(req.distanceKm),
        compatible: isAllCompatible,
        detourKm: maxDetour,
        pickupDistanceKm: maxPickupDist,
        bestOrder,
        reason: isAllCompatible
          ? `Compatible: detour of ${maxDetour} km is within acceptable limits`
          : (rejectionReason ?? 'Route detour exceeds limits'),
      };
    });

    // Sort: compatible candidates first (lowest detour), then incompatible (lowest pickup distance)
    candidates.sort((a, b) => {
      if (a.compatible && !b.compatible) return -1;
      if (!a.compatible && b.compatible) return 1;
      if (a.compatible && b.compatible) {
        return a.detourKm - b.detourKm;
      }
      return a.pickupDistanceKm - b.pickupDistanceKm;
    });

    return {
      teslaId: tesla.id,
      seatsAvailable: tesla.seatsAvailable,
      activePoolId: activePool ? activePool.id : null,
      activePassengersCount: activeRiders.length,
      candidates,
    };
  }


  async claimSeats(
    driverId: string,
    teslaId: string,
    rideRequestIds: string[],
    seatsNeeded: number,
  ) {
    const tesla = await this.prisma.tesla.findUnique({
      where: { id: teslaId },
    });

    if (!tesla) {
      throw new NotFoundException('Tesla not found');
    }

    if (tesla.driverId !== driverId) {
      throw new ForbiddenException('You do not own this Tesla');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Single atomic conditional UPDATE
      // The WHERE clause is re-evaluated by PostgreSQL against the row's
      // freshly committed state upon acquiring the row lock.
      const updated: number = await tx.$executeRaw`
        UPDATE teslas
        SET seats_available = seats_available - ${seatsNeeded},
            updated_at = NOW()
        WHERE id = ${teslaId} AND seats_available >= ${seatsNeeded}
      `;

      if (updated === 0) {
        throw new ConflictException('Seat no longer available');
      }

      // 2. Validate all ride requests are currently REQUESTED
      const requests = await tx.rideRequest.findMany({
        where: { id: { in: rideRequestIds } },
      });

      if (requests.length !== rideRequestIds.length) {
        throw new NotFoundException('One or more ride requests not found');
      }

      for (const req of requests) {
        if (req.status !== RideStatus.REQUESTED) {
          throw new BadRequestException(
            `Ride request ${req.id} is already in ${req.status} status`,
          );
        }
      }

      // 3. Find or create an open pool for this tesla
      let pool = await tx.pool.findFirst({
        where: {
          teslaId,
          status: { in: [PoolStatus.MATCHED, PoolStatus.DRIVER_ARRIVED] },
        },
      });

      if (!pool) {
        pool = await tx.pool.create({
          data: {
            teslaId,
            status: PoolStatus.MATCHED,
          },
        });
      }

      // 4. Update ride requests to MATCHED, assign poolId, and apply 20% pool discount
      const updatedRequests = [];
      for (const req of requests) {
        const discountPoysha = Math.round(req.distanceChargePoysha * 0.2);
        const totalFarePoysha =
          req.baseFarePoysha + req.distanceChargePoysha - discountPoysha;

        const updatedReq = await tx.rideRequest.update({
          where: { id: req.id },
          data: {
            poolId: pool.id,
            status: RideStatus.MATCHED,
            poolDiscountPoysha: discountPoysha,
            totalFarePoysha,
          },
        });

        await tx.rideStatusHistory.create({
          data: {
            rideRequestId: req.id,
            fromStatus: RideStatus.REQUESTED,
            toStatus: RideStatus.MATCHED,
            changedById: driverId,
            note: 'Matched to pool and seats claimed',
          },
        });

        updatedRequests.push(updatedReq);
      }

      const updatedTesla = await tx.tesla.findUnique({
        where: { id: teslaId },
        select: { id: true, name: true, capacity: true, seatsAvailable: true },
      });

      return {
        poolId: pool.id,
        tesla: updatedTesla,
        status: PoolStatus.MATCHED,
        rideRequests: updatedRequests,
      };
    });
  }

  async getPoolById(poolId: string) {
    const pool = await this.prisma.pool.findUnique({
      where: { id: poolId },
      include: {
        tesla: {
          include: {
            driver: {
              select: {
                id: true,
                fullName: true,
                phone: true,
              },
            },
          },
        },
        rideRequests: {
          include: {
            passenger: {
              select: {
                id: true,
                fullName: true,
                phone: true,
              },
            },
            pickupZone: true,
            dropoffZone: true,
          },
        },
      },
    });

    if (!pool) {
      throw new NotFoundException('Pool not found');
    }

    return pool;
  }
}
