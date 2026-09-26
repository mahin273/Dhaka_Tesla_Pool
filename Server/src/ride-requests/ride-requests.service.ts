import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { RideStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MatchingService } from '../matching/matching.service';
import { FaresService } from '../fares/fares.service';
import { CreateRideRequestDto } from './dto/create-ride-request.dto';

@Injectable()
export class RideRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly matchingService: MatchingService,
    private readonly faresService: FaresService,
  ) {}

  async create(passengerId: string, dto: CreateRideRequestDto) {
    const [pickupZone, dropoffZone] = await Promise.all([
      this.prisma.zone.findUnique({ where: { id: dto.pickupZoneId } }),
      this.prisma.zone.findUnique({ where: { id: dto.dropoffZoneId } }),
    ]);

    if (!pickupZone || !dropoffZone) {
      throw new BadRequestException('Invalid pickup or dropoff zone ID');
    }

    const activeRequest = await this.prisma.rideRequest.findFirst({
      where: {
        passengerId,
        status: {
          in: [
            RideStatus.REQUESTED,
            RideStatus.MATCHED,
            RideStatus.DRIVER_ARRIVED,
            RideStatus.STARTED,
          ],
        },
      },
    });

    if (activeRequest) {
      throw new BadRequestException(
        'You already have an active ride request in progress',
      );
    }

    const distanceKm = this.matchingService.roadDistanceKm(
      { lat: dto.pickupLat, lng: dto.pickupLng },
      { lat: dto.dropoffLat, lng: dto.dropoffLng },
    );

    const fare = this.faresService.calculateFare(distanceKm, false);

    const created = await this.prisma.$transaction(async (tx) => {
      const request = await tx.rideRequest.create({
        data: {
          passengerId,
          pickupZoneId: dto.pickupZoneId,
          pickupLat: dto.pickupLat,
          pickupLng: dto.pickupLng,
          dropoffZoneId: dto.dropoffZoneId,
          dropoffLat: dto.dropoffLat,
          dropoffLng: dto.dropoffLng,
          seatsRequested: dto.seatsRequested,
          status: RideStatus.REQUESTED,
          distanceKm,
          baseFarePoysha: fare.baseFarePoysha,
          distanceChargePoysha: fare.distanceChargePoysha,
          poolDiscountPoysha: fare.poolDiscountPoysha,
          totalFarePoysha: fare.totalFarePoysha,
        },
        include: {
          pickupZone: true,
          dropoffZone: true,
        },
      });

      await tx.rideStatusHistory.create({
        data: {
          rideRequestId: request.id,
          fromStatus: null,
          toStatus: RideStatus.REQUESTED,
          changedById: passengerId,
          note: 'Ride requested by passenger',
        },
      });

      return request;
    });

    return {
      ...created,
      note: 'poolDiscount applies once matched - this is the solo estimate',
    };
  }

  async findAllForPassenger(passengerId: string) {
    return this.prisma.rideRequest.findMany({
      where: { passengerId },
      orderBy: { requestedAt: 'desc' },
      include: {
        pickupZone: true,
        dropoffZone: true,
        pool: {
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
          },
        },
      },
    });
  }

  async findById(user: { id: string; role?: UserRole }, id: string) {
    const request = await this.prisma.rideRequest.findUnique({
      where: { id },
      include: {
        pickupZone: true,
        dropoffZone: true,
        pool: {
          include: {
            tesla: true,
          },
        },
        statusHistory: {
          orderBy: { changedAt: 'asc' },
        },
      },
    });

    if (!request) {
      throw new NotFoundException('Ride request not found');
    }

    const isPassengerOwner = request.passengerId === user.id;
    const isAssignedDriver = request.pool?.tesla?.driverId === user.id;

    if (!isPassengerOwner && !isAssignedDriver) {
      throw new ForbiddenException(
        'You do not have access to this ride request',
      );
    }

    return request;
  }

  async cancel(passengerId: string, id: string) {
    const request = await this.prisma.rideRequest.findUnique({
      where: { id },
      include: {
        pool: true,
      },
    });

    if (!request) {
      throw new NotFoundException('Ride request not found');
    }

    if (request.passengerId !== passengerId) {
      throw new ForbiddenException(
        "You cannot cancel another passenger's ride",
      );
    }

    const cancellableStatuses: RideStatus[] = [
      RideStatus.REQUESTED,
      RideStatus.MATCHED,
      RideStatus.DRIVER_ARRIVED,
    ];

    if (!cancellableStatuses.includes(request.status)) {
      throw new BadRequestException(
        `Cannot cancel ride in ${request.status} status`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      if (request.poolId && request.pool?.teslaId) {
        await tx.tesla.update({
          where: { id: request.pool.teslaId },
          data: {
            seatsAvailable: {
              increment: request.seatsRequested,
            },
          },
        });
      }

      const updated = await tx.rideRequest.update({
        where: { id },
        data: {
          status: RideStatus.CANCELLED,
          cancelledAt: new Date(),
        },
      });

      await tx.rideStatusHistory.create({
        data: {
          rideRequestId: id,
          fromStatus: request.status,
          toStatus: RideStatus.CANCELLED,
          changedById: passengerId,
          note: 'Cancelled by passenger',
        },
      });

      return updated;
    });
  }
}
