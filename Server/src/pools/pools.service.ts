import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PoolStatus, RideStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PoolsService {
  constructor(private readonly prisma: PrismaService) {}

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
