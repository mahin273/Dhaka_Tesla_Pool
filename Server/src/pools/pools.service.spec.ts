import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PoolStatus, RideStatus } from '@prisma/client';
import { PoolsService } from './pools.service';
import { PrismaService } from '../prisma/prisma.service';
import { MatchingService } from '../matching/matching.service';

describe('PoolsService', () => {
  let service: PoolsService;
  let prisma: {
    tesla: { findUnique: jest.Mock };
    pool: { findFirst: jest.Mock; create: jest.Mock };
    rideRequest: { findMany: jest.Mock; update: jest.Mock };
    $transaction: jest.Mock;
    $executeRaw: jest.Mock;
  };
  let matchingService: MatchingService;

  beforeEach(async () => {
    prisma = {
      tesla: { findUnique: jest.fn() },
      pool: { findFirst: jest.fn(), create: jest.fn() },
      rideRequest: { findMany: jest.fn(), update: jest.fn() },
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

      // Two candidate requests:
      // 1. Rafiq: Banani to Gulshan 1 - identical pickup, detour 2.0 km <= 2.5 km cap (Compatible)
      // 2. Far candidate: Uttara to Motijheel - pickups > 3.5 km away (Incompatible)
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
});
