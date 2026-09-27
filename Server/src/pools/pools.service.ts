import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  PaymentMethod,
  PaymentStatus,
  PoolStatus,
  RideStatus,
} from '@prisma/client';
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

    // Check if driver has an active pool
    const activePool = await this.prisma.pool.findFirst({
      where: {
        teslaId: tesla.id,
        status: {
          in: [
            PoolStatus.MATCHED,
            PoolStatus.DRIVER_ARRIVED,
            PoolStatus.STARTED,
          ],
        },
      },
      orderBy: { matchedAt: 'desc' },
      include: {
        rideRequests: {
          where: {
            status: {
              in: [
                RideStatus.MATCHED,
                RideStatus.DRIVER_ARRIVED,
                RideStatus.STARTED,
              ],
            },
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

    const activeRiders = activePool?.rideRequests ?? [];

    if (activePool?.status === PoolStatus.STARTED) {
      return {
        teslaId: tesla.id,
        seatsAvailable: tesla.seatsAvailable,
        activePoolId: activePool.id,
        activePassengersCount: activeRiders.length,
        candidates: [],
      };
    }

    if (tesla.seatsAvailable <= 0) {
      return {
        teslaId: tesla.id,
        seatsAvailable: 0,
        activePoolId: activePool ? activePool.id : null,
        activePassengersCount: activeRiders.length,
        candidates: [],
      };
    }

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
        pickupZoneId: req.pickupZoneId,
        dropoffZoneId: req.dropoffZoneId,
      };

      let isAllCompatible = true;
      let maxDetour = 0;
      let maxPickupDist = 0;
      let minOverlap = Number(req.distanceKm);
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
          pickupZoneId: rider.pickupZoneId,
          dropoffZoneId: rider.dropoffZoneId,
        };

        const result = this.matchingService.evaluateCompatibility(
          riderLeg,
          candidateLeg,
        );

        if (!result.compatible) {
          isAllCompatible = false;
          rejectionReason = result.reason;
          maxDetour = result.detourKm ?? 0;
          maxPickupDist = Math.max(maxPickupDist, result.pickupDistanceKm);
          break;
        }

        maxDetour = Math.max(maxDetour, result.detourKm ?? 0);
        maxPickupDist = Math.max(maxPickupDist, result.pickupDistanceKm);
        minOverlap = Math.min(
          minOverlap,
          result.overlapKm ?? Number(req.distanceKm),
        );
        if (result.bestOrder) {
          bestOrder = result.bestOrder;
        }
      }

      let dropoffSequence: string | undefined;
      if (isAllCompatible && activeRiders.length > 0) {
        if (activeRiders.length === 1) {
          const riderName =
            activeRiders[0].passenger?.fullName || 'Current Rider';
          const candidateName = req.passenger?.fullName || 'New Rider';
          dropoffSequence =
            bestOrder === DropoffOrder.DROP_A_THEN_B
              ? `Drop ${riderName} then ${candidateName}`
              : `Drop ${candidateName} then ${riderName}`;
        } else {
          const riderNames = activeRiders.map(
            (r) => r.passenger?.fullName || 'Rider',
          );
          const candidateName = req.passenger?.fullName || 'New Rider';
          dropoffSequence =
            bestOrder === DropoffOrder.DROP_A_THEN_B
              ? `Drop ${riderNames.join(', ')} then ${candidateName}`
              : `Drop ${candidateName} then ${riderNames.join(', ')}`;
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
        overlapKm: isAllCompatible ? minOverlap : 0,
        pickupDistanceKm: maxPickupDist,
        bestOrder,
        dropoffSequence,
        reason: isAllCompatible
          ? `Compatible: corridor aligned with ${maxDetour} km detour and ${minOverlap} km shared overlap`
          : (rejectionReason ?? 'Route detour exceeds limits'),
      };
    });

    // Sort: compatible candidates first (lowest detour, highest overlap), then incompatible (lowest pickup distance)
    candidates.sort((a, b) => {
      if (a.compatible && !b.compatible) return -1;
      if (!a.compatible && b.compatible) return 1;
      if (a.compatible && b.compatible) {
        if (a.detourKm !== b.detourKm) {
          return a.detourKm - b.detourKm;
        }
        return (b.overlapKm ?? 0) - (a.overlapKm ?? 0);
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
          status: {
            in: [
              PoolStatus.MATCHED,
              PoolStatus.DRIVER_ARRIVED,
              PoolStatus.STARTED,
            ],
          },
        },
        orderBy: { matchedAt: 'desc' },
      });

      if (pool && pool.status === PoolStatus.STARTED) {
        throw new BadRequestException(
          'Cannot add passengers to a pool that is already in transit (STARTED)',
        );
      }

      if (!pool) {
        pool = await tx.pool.create({
          data: {
            teslaId,
            status: PoolStatus.MATCHED,
          },
        });
      }

      // Query existing active riders in this pool
      const existingRiders = await tx.rideRequest.findMany({
        where: {
          poolId: pool.id,
          status: {
            in: [RideStatus.MATCHED, RideStatus.DRIVER_ARRIVED],
          },
        },
      });

      // 4. Update ride requests to MATCHED, assign poolId, and apply overlap-based pool discount
      const updatedRequests = [];
      for (const req of requests) {
        let overlapKm = Number(req.distanceKm);

        if (existingRiders.length > 0) {
          const candidateLeg = {
            pickup: { lat: req.pickupLat, lng: req.pickupLng },
            dropoff: { lat: req.dropoffLat, lng: req.dropoffLng },
            pickupZoneId: req.pickupZoneId,
            dropoffZoneId: req.dropoffZoneId,
          };

          for (const rider of existingRiders) {
            const riderLeg = {
              pickup: { lat: rider.pickupLat, lng: rider.pickupLng },
              dropoff: { lat: rider.dropoffLat, lng: rider.dropoffLng },
              pickupZoneId: rider.pickupZoneId,
              dropoffZoneId: rider.dropoffZoneId,
            };

            const comp = this.matchingService.evaluateCompatibility(
              riderLeg,
              candidateLeg,
            );
            if (!comp.compatible) {
              throw new BadRequestException(
                `Cannot claim ride request ${req.id}: ${comp.reason}`,
              );
            }
            if (comp.overlapKm !== undefined) {
              overlapKm = Math.min(overlapKm, comp.overlapKm);
            }
          }
        } else if (requests.length > 1) {
          // If claiming multiple requests simultaneously into an empty pool
          overlapKm = Number(req.distanceKm);
        } else {
          // Single passenger starting a pool has 0 overlap until a pool mate joins
          overlapKm = 0;
        }

        const rawDiscount =
          Math.round(overlapKm * 1800 * 0.2) * req.seatsRequested;
        const discountPoysha = Math.min(rawDiscount, req.distanceChargePoysha);
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

      // If new riders joined existing riders, apply overlap discount to existing riders who had 0 discount
      if (existingRiders.length > 0) {
        for (const existing of existingRiders) {
          if (existing.poolDiscountPoysha === 0) {
            let maxOverlap = 0;
            const existingLeg = {
              pickup: { lat: existing.pickupLat, lng: existing.pickupLng },
              dropoff: { lat: existing.dropoffLat, lng: existing.dropoffLng },
              pickupZoneId: existing.pickupZoneId,
              dropoffZoneId: existing.dropoffZoneId,
            };

            for (const newReq of requests) {
              const newLeg = {
                pickup: { lat: newReq.pickupLat, lng: newReq.pickupLng },
                dropoff: { lat: newReq.dropoffLat, lng: newReq.dropoffLng },
                pickupZoneId: newReq.pickupZoneId,
                dropoffZoneId: newReq.dropoffZoneId,
              };

              const comp = this.matchingService.evaluateCompatibility(
                existingLeg,
                newLeg,
              );
              if (comp.overlapKm) {
                maxOverlap = Math.max(maxOverlap, comp.overlapKm);
              }
            }

            if (maxOverlap > 0) {
              const existingDiscount = Math.min(
                Math.round(maxOverlap * 1800 * 0.2) * existing.seatsRequested,
                existing.distanceChargePoysha,
              );
              const existingTotal =
                existing.baseFarePoysha +
                existing.distanceChargePoysha -
                existingDiscount;

              await tx.rideRequest.update({
                where: { id: existing.id },
                data: {
                  poolDiscountPoysha: existingDiscount,
                  totalFarePoysha: existingTotal,
                },
              });
            }
          }
        }
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

  async arrive(driverId: string, poolId: string) {
    const pool = await this.prisma.pool.findUnique({
      where: { id: poolId },
      include: {
        tesla: true,
        rideRequests: {
          where: { status: RideStatus.MATCHED },
        },
      },
    });

    if (!pool) {
      throw new NotFoundException('Pool not found');
    }

    if (pool.tesla.driverId !== driverId) {
      throw new ForbiddenException(
        'You do not drive the vehicle for this pool',
      );
    }

    if (pool.status !== PoolStatus.MATCHED) {
      throw new BadRequestException(
        `Cannot mark arrived: pool is currently in ${pool.status} status`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedPool = await tx.pool.update({
        where: { id: poolId },
        data: {
          status: PoolStatus.DRIVER_ARRIVED,
          driverArrivedAt: new Date(),
        },
      });

      const updatedRequests = [];
      for (const req of pool.rideRequests) {
        const updated = await tx.rideRequest.update({
          where: { id: req.id },
          data: { status: RideStatus.DRIVER_ARRIVED },
        });

        await tx.rideStatusHistory.create({
          data: {
            rideRequestId: req.id,
            fromStatus: RideStatus.MATCHED,
            toStatus: RideStatus.DRIVER_ARRIVED,
            changedById: driverId,
            note: 'Driver arrived at pickup zone',
          },
        });

        updatedRequests.push(updated);
      }

      return {
        ...updatedPool,
        rideRequests: updatedRequests,
      };
    });
  }

  async startTrip(driverId: string, poolId: string) {
    const pool = await this.prisma.pool.findUnique({
      where: { id: poolId },
      include: {
        tesla: true,
        rideRequests: {
          where: { status: RideStatus.DRIVER_ARRIVED },
        },
      },
    });

    if (!pool) {
      throw new NotFoundException('Pool not found');
    }

    if (pool.tesla.driverId !== driverId) {
      throw new ForbiddenException(
        'You do not drive the vehicle for this pool',
      );
    }

    if (pool.status !== PoolStatus.DRIVER_ARRIVED) {
      throw new BadRequestException(
        `Cannot start trip: pool is currently in ${pool.status} status`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedPool = await tx.pool.update({
        where: { id: poolId },
        data: {
          status: PoolStatus.STARTED,
          startedAt: new Date(),
        },
      });

      const updatedRequests = [];
      for (const req of pool.rideRequests) {
        const updated = await tx.rideRequest.update({
          where: { id: req.id },
          data: { status: RideStatus.STARTED },
        });

        await tx.rideStatusHistory.create({
          data: {
            rideRequestId: req.id,
            fromStatus: RideStatus.DRIVER_ARRIVED,
            toStatus: RideStatus.STARTED,
            changedById: driverId,
            note: 'Trip started and passengers onboard',
          },
        });

        updatedRequests.push(updated);
      }

      return {
        ...updatedPool,
        rideRequests: updatedRequests,
      };
    });
  }

  async completeTrip(driverId: string, poolId: string) {
    const pool = await this.prisma.pool.findUnique({
      where: { id: poolId },
      include: {
        tesla: true,
        rideRequests: {
          where: {
            status: {
              in: [
                RideStatus.STARTED,
                RideStatus.DRIVER_ARRIVED,
                RideStatus.MATCHED,
              ],
            },
          },
        },
      },
    });

    if (!pool) {
      throw new NotFoundException('Pool not found');
    }

    if (pool.tesla.driverId !== driverId) {
      throw new ForbiddenException(
        'You do not drive the vehicle for this pool',
      );
    }

    if (pool.status !== PoolStatus.STARTED) {
      throw new BadRequestException(
        `Cannot complete trip: pool is currently in ${pool.status} status`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedPool = await tx.pool.update({
        where: { id: poolId },
        data: {
          status: PoolStatus.COMPLETED,
          completedAt: new Date(),
        },
      });

      // Release seats back to vehicle up to capacity
      const freedSeats = pool.rideRequests.reduce(
        (sum, req) => sum + req.seatsRequested,
        0,
      );

      await tx.$executeRaw`
        UPDATE teslas
        SET seats_available = LEAST(capacity, seats_available + ${freedSeats}),
            updated_at = NOW()
        WHERE id = ${pool.teslaId}
      `;

      const updatedRequests = [];
      const createdPayments = [];

      for (const req of pool.rideRequests) {
        const updated = await tx.rideRequest.update({
          where: { id: req.id },
          data: { status: RideStatus.COMPLETED },
        });

        await tx.rideStatusHistory.create({
          data: {
            rideRequestId: req.id,
            fromStatus: req.status,
            toStatus: RideStatus.COMPLETED,
            changedById: driverId,
            note: 'Trip completed and dropoff confirmed',
          },
        });

        const payment = await tx.payment.create({
          data: {
            rideRequestId: req.id,
            method: PaymentMethod.CASH,
            amountPoysha: req.totalFarePoysha,
            status: PaymentStatus.PENDING,
          },
        });

        updatedRequests.push(updated);
        createdPayments.push(payment);
      }

      return {
        ...updatedPool,
        rideRequests: updatedRequests,
        payments: createdPayments,
      };
    });
  }

  async updatePoolStatus(
    driverId: string,
    poolId: string,
    targetStatus: PoolStatus,
  ) {
    switch (targetStatus) {
      case PoolStatus.DRIVER_ARRIVED:
        return this.arrive(driverId, poolId);
      case PoolStatus.STARTED:
        return this.startTrip(driverId, poolId);
      case PoolStatus.COMPLETED:
        return this.completeTrip(driverId, poolId);
      default:
        throw new BadRequestException(
          `Unsupported target status transition to ${targetStatus}`,
        );
    }
  }
}

