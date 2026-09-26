import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PaymentMethod, PaymentStatus, PoolStatus, RideStatus } from '@prisma/client';
import { PoolsService } from './pools.service';
import { PrismaService } from '../prisma/prisma.service';
import { MatchingService } from '../matching/matching.service';

describe('PoolsService', () => {
  let service: PoolsService;
  let prisma: {
    tesla: { findUnique: jest.Mock };
    pool: { findFirst: jest.Mock; findUnique: jest.Mock; create: jest.Mock; update: jest.Mock };
    rideRequest: { findMany: jest.Mock; update: jest.Mock };
    rideStatusHistory: { create: jest.Mock };
    payment: { create: jest.Mock };
    $transaction: jest.Mock;
    $executeRaw: jest.Mock;
  };
  let matchingService: MatchingService;

  beforeEach(async () => {
    prisma = {
      tesla: { findUnique: jest.fn() },
      pool: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      rideRequest: { findMany: jest.fn(), update: jest.fn() },
      rideStatusHistory: { create: jest.fn() },
      payment: { create: jest.fn() },
      $transaction: jest.fn(),
      $executeRaw: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PoolsService,
        MatchingService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<PoolsService>(PoolsService);
    matchingService = module.get<MatchingService>(MatchingService);
  });

  describe('findCandidates', () => {
    it('should throw NotFoundException if driver has no registered vehicle', async () => {
      prisma.tesla.findUnique.mockResolvedValue(null);

      await expect(service.findCandidates('driver-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if driver is offline', async () => {
      prisma.tesla.findUnique.mockResolvedValue({
        id: 'tesla-1',
        driverId: 'driver-1',
        isOnline: false,
        seatsAvailable: 4,
      });

      await expect(service.findCandidates('driver-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should return empty candidates if vehicle has 0 seats available', async () => {
      prisma.tesla.findUnique.mockResolvedValue({
        id: 'tesla-1',
        driverId: 'driver-1',
        isOnline: true,
        seatsAvailable: 0,
      });

      const result = await service.findCandidates('driver-1');
      expect(result.candidates).toEqual([]);
      expect(result.seatsAvailable).toBe(0);
    });

    it('should return compatible candidates with detour 0 when car has no active riders', async () => {
      prisma.tesla.findUnique.mockResolvedValue({
        id: 'tesla-1',
        driverId: 'driver-1',
        isOnline: true,
        seatsAvailable: 4,
      });

      prisma.pool.findFirst.mockResolvedValue(null);

      prisma.rideRequest.findMany.mockResolvedValue([
        {
          id: 'req-1',
          passengerId: 'p-1',
          passenger: { id: 'p-1', fullName: 'Nusrat', phone: '01711111111' },
          pickupZoneId: 'banani',
          pickupZone: { name: 'Banani' },
          pickupLat: 23.7937,
          pickupLng: 90.4066,
          dropoffZoneId: 'gulshan_2',
          dropoffZone: { name: 'Gulshan 2' },
          dropoffLat: 23.7925,
          dropoffLng: 90.4167,
          seatsRequested: 1,
          baseFarePoysha: 2500,
          distanceChargePoysha: 4140,
          totalFarePoysha: 6640,
          distanceKm: 2.3,
        },
      ]);

      const result = await service.findCandidates('driver-1');
      expect(result.candidates.length).toBe(1);
      expect(result.candidates[0].compatible).toBe(true);
      expect(result.candidates[0].detourKm).toBe(0);
      expect(result.candidates[0].reason).toContain('Car is currently empty');
    });

    it('should evaluate detour compatibility against existing pool passengers', async () => {
      prisma.tesla.findUnique.mockResolvedValue({
        id: 'tesla-1',
        driverId: 'driver-1',
        isOnline: true,
        seatsAvailable: 3,
      });

      // Active pool with Nusrat (Banani to Mohakhali)
      prisma.pool.findFirst.mockResolvedValue({
        id: 'pool-1',
        teslaId: 'tesla-1',
        status: PoolStatus.MATCHED,
        rideRequests: [
          {
            id: 'req-nusrat',
            pickupLat: 23.7904,
            pickupLng: 90.4078,
            dropoffLat: 23.7784,
            dropoffLng: 90.4034,
            status: RideStatus.MATCHED,
          },
        ],
      });

      prisma.rideRequest.findMany.mockResolvedValue([
        {
          id: 'req-uttara',
          passenger: { id: 'p-far', fullName: 'Far Rider', phone: '01700000000' },
          pickupZone: { name: 'Uttara' },
          dropoffZone: { name: 'Motijheel' },
          pickupLat: 23.8683,
          pickupLng: 90.385,
          dropoffLat: 23.733,
          dropoffLng: 90.4172,
          seatsRequested: 1,
          baseFarePoysha: 2500,
          distanceChargePoysha: 15000,
          totalFarePoysha: 17500,
          distanceKm: 15.0,
        },
        {
          id: 'req-rafiq',
          passenger: { id: 'p-rafiq', fullName: 'Rafiq', phone: '01722222222' },
          pickupZone: { name: 'Banani' },
          dropoffZone: { name: 'Gulshan 1' },
          pickupLat: 23.7904,
          pickupLng: 90.4078,
          dropoffLat: 23.7806,
          dropoffLng: 90.4163,
          seatsRequested: 1,
          baseFarePoysha: 2500,
          distanceChargePoysha: 3960,
          totalFarePoysha: 6460,
          distanceKm: 2.2,
        },
      ]);

      const result = await service.findCandidates('driver-1');
      expect(result.candidates.length).toBe(2);

      // Compatible Rafiq must be sorted first
      expect(result.candidates[0].rideRequestId).toBe('req-rafiq');
      expect(result.candidates[0].compatible).toBe(true);
      expect(result.candidates[0].detourKm).toBeLessThanOrEqual(2.5);

      // Incompatible Uttara must be sorted second
      expect(result.candidates[1].rideRequestId).toBe('req-uttara');
      expect(result.candidates[1].compatible).toBe(false);
      expect(result.candidates[1].reason).toContain('Pickups exceed cluster radius');
    });
  });

  describe('arrive (MATCHED -> DRIVER_ARRIVED)', () => {
    it('should throw NotFoundException if pool does not exist', async () => {
      prisma.pool.findUnique.mockResolvedValue(null);

      await expect(service.arrive('driver-1', 'pool-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if driver is not the vehicle owner', async () => {
      prisma.pool.findUnique.mockResolvedValue({
        id: 'pool-1',
        status: PoolStatus.MATCHED,
        tesla: { driverId: 'other-driver' },
        rideRequests: [],
      });

      await expect(service.arrive('driver-1', 'pool-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw BadRequestException if pool is not in MATCHED status', async () => {
      prisma.pool.findUnique.mockResolvedValue({
        id: 'pool-1',
        status: PoolStatus.STARTED,
        tesla: { driverId: 'driver-1' },
        rideRequests: [],
      });

      await expect(service.arrive('driver-1', 'pool-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should update pool and rideRequests to DRIVER_ARRIVED', async () => {
      prisma.pool.findUnique.mockResolvedValue({
        id: 'pool-1',
        status: PoolStatus.MATCHED,
        tesla: { driverId: 'driver-1' },
        rideRequests: [{ id: 'req-1', status: RideStatus.MATCHED }],
      });

      prisma.$transaction.mockImplementation(async (cb) => {
        return cb({
          pool: {
            update: jest.fn().mockResolvedValue({
              id: 'pool-1',
              status: PoolStatus.DRIVER_ARRIVED,
            }),
          },
          rideRequest: {
            update: jest.fn().mockResolvedValue({
              id: 'req-1',
              status: RideStatus.DRIVER_ARRIVED,
            }),
          },
          rideStatusHistory: {
            create: jest.fn().mockResolvedValue({ id: 'hist-1' }),
          },
        });
      });

      const result = await service.arrive('driver-1', 'pool-1');
      expect(result.status).toBe(PoolStatus.DRIVER_ARRIVED);
      expect(result.rideRequests[0].status).toBe(RideStatus.DRIVER_ARRIVED);
    });
  });

  describe('startTrip (DRIVER_ARRIVED -> STARTED)', () => {
    it('should throw BadRequestException if driver has not arrived yet', async () => {
      prisma.pool.findUnique.mockResolvedValue({
        id: 'pool-1',
        status: PoolStatus.MATCHED,
        tesla: { driverId: 'driver-1' },
        rideRequests: [],
      });

      await expect(service.startTrip('driver-1', 'pool-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should update pool and rideRequests to STARTED', async () => {
      prisma.pool.findUnique.mockResolvedValue({
        id: 'pool-1',
        status: PoolStatus.DRIVER_ARRIVED,
        tesla: { driverId: 'driver-1' },
        rideRequests: [{ id: 'req-1', status: RideStatus.DRIVER_ARRIVED }],
      });

      prisma.$transaction.mockImplementation(async (cb) => {
        return cb({
          pool: {
            update: jest.fn().mockResolvedValue({
              id: 'pool-1',
              status: PoolStatus.STARTED,
            }),
          },
          rideRequest: {
            update: jest.fn().mockResolvedValue({
              id: 'req-1',
              status: RideStatus.STARTED,
            }),
          },
          rideStatusHistory: {
            create: jest.fn().mockResolvedValue({ id: 'hist-1' }),
          },
        });
      });

      const result = await service.startTrip('driver-1', 'pool-1');
      expect(result.status).toBe(PoolStatus.STARTED);
      expect(result.rideRequests[0].status).toBe(RideStatus.STARTED);
    });
  });

  describe('completeTrip (STARTED -> COMPLETED)', () => {
    it('should throw BadRequestException if trip has not started', async () => {
      prisma.pool.findUnique.mockResolvedValue({
        id: 'pool-1',
        status: PoolStatus.DRIVER_ARRIVED,
        tesla: { driverId: 'driver-1' },
        rideRequests: [],
      });

      await expect(service.completeTrip('driver-1', 'pool-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should update pool to COMPLETED, release vehicle seats, and create payments', async () => {
      prisma.pool.findUnique.mockResolvedValue({
        id: 'pool-1',
        teslaId: 'tesla-1',
        status: PoolStatus.STARTED,
        tesla: { driverId: 'driver-1' },
        rideRequests: [
          {
            id: 'req-1',
            seatsRequested: 1,
            totalFarePoysha: 5812,
            status: RideStatus.STARTED,
          },
          {
            id: 'req-2',
            seatsRequested: 1,
            totalFarePoysha: 5668,
            status: RideStatus.STARTED,
          },
        ],
      });

      const txMock = {
        pool: {
          update: jest.fn().mockResolvedValue({
            id: 'pool-1',
            status: PoolStatus.COMPLETED,
          }),
        },
        rideRequest: {
          update: jest.fn().mockImplementation(({ where }) => ({
            id: where.id,
            status: RideStatus.COMPLETED,
          })),
        },
        rideStatusHistory: {
          create: jest.fn().mockResolvedValue({ id: 'hist-1' }),
        },
        payment: {
          create: jest.fn().mockImplementation(({ data }) => ({
            id: `pay-${data.rideRequestId}`,
            ...data,
          })),
        },
        $executeRaw: jest.fn().mockResolvedValue(1),
      };

      prisma.$transaction.mockImplementation(async (cb) => cb(txMock));

      const result = await service.completeTrip('driver-1', 'pool-1');
      expect(result.status).toBe(PoolStatus.COMPLETED);
      expect(result.rideRequests.length).toBe(2);
      expect(result.payments.length).toBe(2);
      expect(result.payments[0].amountPoysha).toBe(5812);
      expect(result.payments[0].status).toBe(PaymentStatus.PENDING);
      expect(result.payments[0].method).toBe(PaymentMethod.CASH);
      expect(txMock.$executeRaw).toHaveBeenCalled();
    });
  });
});
