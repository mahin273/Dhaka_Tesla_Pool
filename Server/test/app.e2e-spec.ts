import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { RideStatus, PoolStatus, PaymentStatus } from '@prisma/client';

describe('Dhaka Tesla Pool Backend (E2E Integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let driverToken: string;
  let nusratToken: string;
  let shirinToken: string;
  let rafiqToken: string;

  let driverId: string;
  let nusratId: string;
  let shirinId: string;
  let rafiqId: string;
  let bulletId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
    prisma = app.get<PrismaService>(PrismaService);

    // 1. Authenticate test cast
    const driverRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'jashim@tesla.dhaka', password: 'password123' })
      .expect(200);
    driverToken = driverRes.body.accessToken;
    driverId = driverRes.body.user.id;

    const nusratRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'nusrat@tesla.dhaka', password: 'password123' })
      .expect(200);
    nusratToken = nusratRes.body.accessToken;
    nusratId = nusratRes.body.user.id;

    const shirinRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'shirin@tesla.dhaka', password: 'password123' })
      .expect(200);
    shirinToken = shirinRes.body.accessToken;
    shirinId = shirinRes.body.user.id;

    const rafiqRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'rafiq@tesla.dhaka', password: 'password123' })
      .expect(200);
    rafiqToken = rafiqRes.body.accessToken;
    rafiqId = rafiqRes.body.user.id;

    const tesla = await prisma.tesla.findUnique({
      where: { driverId },
    });
    if (!tesla) {
      throw new Error('Bullet tesla vehicle not found in database seed');
    }
    bulletId = tesla.id;

    // Set Jashim online
    await request(app.getHttpServer())
      .patch('/drivers/me/online-status')
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ isOnline: true })
      .expect(200);
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.payment.deleteMany();
    await prisma.rideStatusHistory.deleteMany();
    await prisma.rideRequest.deleteMany();
    await prisma.pool.deleteMany();

    await prisma.tesla.update({
      where: { id: bulletId },
      data: { seatsAvailable: 3, isOnline: false },
    });

    await app.close();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Reset database operational state before each test
    await prisma.payment.deleteMany();
    await prisma.rideStatusHistory.deleteMany();
    await prisma.rideRequest.deleteMany();
    await prisma.pool.deleteMany();

    await prisma.tesla.update({
      where: { id: bulletId },
      data: { seatsAvailable: 3, isOnline: true },
    });
  });

  describe('1. Concurrency Race Test: Atomic Seat Claiming', () => {
    it('should resolve race condition on last available seat with 1 success and 1 conflict (409)', async () => {
      // Setup: Bullet has only 1 seat available
      await prisma.tesla.update({
        where: { id: bulletId },
        data: { seatsAvailable: 1 },
      });

      // Create Ride Request for Nusrat
      const ride1Res = await request(app.getHttpServer())
        .post('/ride-requests')
        .set('Authorization', `Bearer ${nusratToken}`)
        .send({
          pickupZoneId: 'BANANI',
          pickupLat: 23.7904,
          pickupLng: 90.4078,
          dropoffZoneId: 'GULSHAN_1',
          dropoffLat: 23.7806,
          dropoffLng: 90.4163,
          seatsRequested: 1,
        })
        .expect(201);
      const ride1Id = ride1Res.body.id;

      // Create Ride Request for Shirin
      const ride2Res = await request(app.getHttpServer())
        .post('/ride-requests')
        .set('Authorization', `Bearer ${shirinToken}`)
        .send({
          pickupZoneId: 'BANANI',
          pickupLat: 23.7904,
          pickupLng: 90.4078,
          dropoffZoneId: 'GULSHAN_1',
          dropoffLat: 23.7806,
          dropoffLng: 90.4163,
          seatsRequested: 1,
        })
        .expect(201);
      const ride2Id = ride2Res.body.id;

      // Fire concurrent seat claims
      const [resA, resB] = await Promise.all([
        request(app.getHttpServer())
          .post('/pools/claim')
          .set('Authorization', `Bearer ${driverToken}`)
          .send({
            teslaId: bulletId,
            rideRequestIds: [ride1Id],
            seatsNeeded: 1,
          }),
        request(app.getHttpServer())
          .post('/pools/claim')
          .set('Authorization', `Bearer ${driverToken}`)
          .send({
            teslaId: bulletId,
            rideRequestIds: [ride2Id],
            seatsNeeded: 1,
          }),
      ]);

      const statuses = [resA.status, resB.status].sort();
      expect(statuses).toEqual([201, 409]);

      const conflictRes = resA.status === 409 ? resA : resB;
      expect(conflictRes.body).toHaveProperty('statusCode', 409);
      expect(conflictRes.body).toHaveProperty('error', 'Conflict');
      expect(conflictRes.body.message).toContain('Seat no longer available');

      // Verify PostgreSQL vehicle record
      const teslaInDb = await prisma.tesla.findUnique({
        where: { id: bulletId },
      });
      expect(teslaInDb?.seatsAvailable).toBe(0);

      // Verify ride request statuses: exactly 1 MATCHED and 1 REQUESTED
      const ride1InDb = await prisma.rideRequest.findUnique({ where: { id: ride1Id } });
      const ride2InDb = await prisma.rideRequest.findUnique({ where: { id: ride2Id } });

      const rideStatuses = [ride1InDb?.status, ride2InDb?.status].sort();
      expect(rideStatuses).toEqual([RideStatus.MATCHED, RideStatus.REQUESTED]);

      // Exactly 1 pool created
      const poolsInDb = await prisma.pool.findMany();
      expect(poolsInDb.length).toBe(1);
    });
  });

  describe('2. State Machine Lifecycle & Guardrails', () => {
    it('should strictly enforce sequential state transitions and reject invalid jumps with 400', async () => {
      // Create ride request
      const rideRes = await request(app.getHttpServer())
        .post('/ride-requests')
        .set('Authorization', `Bearer ${nusratToken}`)
        .send({
          pickupZoneId: 'BANANI',
          pickupLat: 23.7904,
          pickupLng: 90.4078,
          dropoffZoneId: 'GULSHAN_1',
          dropoffLat: 23.7806,
          dropoffLng: 90.4163,
          seatsRequested: 1,
        })
        .expect(201);
      const rideId = rideRes.body.id;

      // Claim seat -> pool in MATCHED status
      const claimRes = await request(app.getHttpServer())
        .post('/pools/claim')
        .set('Authorization', `Bearer ${driverToken}`)
        .send({
          teslaId: bulletId,
          rideRequestIds: [rideId],
          seatsNeeded: 1,
        })
        .expect(201);
      const poolId = claimRes.body.poolId;

      // Invalid: Try to start directly from MATCHED
      const invalidStartRes = await request(app.getHttpServer())
        .post(`/pools/${poolId}/start`)
        .set('Authorization', `Bearer ${driverToken}`)
        .expect(400);
      expect(invalidStartRes.body.message).toContain('Cannot start trip: pool is currently in MATCHED status');

      // Invalid: Try to complete directly from MATCHED
      const invalidCompleteRes = await request(app.getHttpServer())
        .post(`/pools/${poolId}/complete`)
        .set('Authorization', `Bearer ${driverToken}`)
        .expect(400);
      expect(invalidCompleteRes.body.message).toContain('Cannot complete trip: pool is currently in MATCHED status');

      // Valid: Arrive
      const arriveRes = await request(app.getHttpServer())
        .post(`/pools/${poolId}/arrive`)
        .set('Authorization', `Bearer ${driverToken}`)
        .expect(200);
      expect(arriveRes.body.status).toBe(PoolStatus.DRIVER_ARRIVED);

      // Invalid: Try to complete directly from DRIVER_ARRIVED
      const invalidCompleteFromArrived = await request(app.getHttpServer())
        .post(`/pools/${poolId}/complete`)
        .set('Authorization', `Bearer ${driverToken}`)
        .expect(400);
      expect(invalidCompleteFromArrived.body.message).toContain('Cannot complete trip: pool is currently in DRIVER_ARRIVED status');

      // Valid: Start trip
      const startRes = await request(app.getHttpServer())
        .post(`/pools/${poolId}/start`)
        .set('Authorization', `Bearer ${driverToken}`)
        .expect(200);
      expect(startRes.body.status).toBe(PoolStatus.STARTED);

      // Invalid: Try to arrive again from STARTED
      const invalidArriveFromStarted = await request(app.getHttpServer())
        .post(`/pools/${poolId}/arrive`)
        .set('Authorization', `Bearer ${driverToken}`)
        .expect(400);
      expect(invalidArriveFromStarted.body.message).toContain('Cannot mark arrived: pool is currently in STARTED status');

      // Valid: Complete trip
      const completeRes = await request(app.getHttpServer())
        .post(`/pools/${poolId}/complete`)
        .set('Authorization', `Bearer ${driverToken}`)
        .expect(200);
      expect(completeRes.body.status).toBe(PoolStatus.COMPLETED);

      // Verify payment was generated
      const payment = await prisma.payment.findUnique({
        where: { rideRequestId: rideId },
      });
      expect(payment).not.toBeNull();
      expect(payment?.amountPoysha).toBe(rideRes.body.totalFarePoysha);

      // Invalid: Try to complete again from COMPLETED
      const invalidCompleteAgain = await request(app.getHttpServer())
        .post(`/pools/${poolId}/complete`)
        .set('Authorization', `Bearer ${driverToken}`)
        .expect(400);
      expect(invalidCompleteAgain.body.message).toContain('Cannot complete trip: pool is currently in COMPLETED status');
    });
  });

  describe('3. Ownership & IDOR Security Defense', () => {
    it('should prevent cross-user ride cancellation and viewing with 403 Forbidden', async () => {
      // Nusrat creates a ride request
      const nusratRideRes = await request(app.getHttpServer())
        .post('/ride-requests')
        .set('Authorization', `Bearer ${nusratToken}`)
        .send({
          pickupZoneId: 'BANANI',
          pickupLat: 23.7904,
          pickupLng: 90.4078,
          dropoffZoneId: 'GULSHAN_1',
          dropoffLat: 23.7806,
          dropoffLng: 90.4163,
          seatsRequested: 1,
        })
        .expect(201);
      const nusratRideId = nusratRideRes.body.id;

      // Shirin attempts to view Nusrat's ride
      const shirinViewRes = await request(app.getHttpServer())
        .get(`/ride-requests/${nusratRideId}`)
        .set('Authorization', `Bearer ${shirinToken}`)
        .expect(403);

      expect(shirinViewRes.body).toHaveProperty('statusCode', 403);
      expect(shirinViewRes.body).toHaveProperty('error', 'Forbidden');
      expect(shirinViewRes.body.message).toBe('You do not have permission to access or modify this ride request');

      // Shirin attempts to cancel Nusrat's ride
      const shirinCancelRes = await request(app.getHttpServer())
        .post(`/ride-requests/${nusratRideId}/cancel`)
        .set('Authorization', `Bearer ${shirinToken}`)
        .expect(403);

      expect(shirinCancelRes.body).toHaveProperty('statusCode', 403);
      expect(shirinCancelRes.body).toHaveProperty('error', 'Forbidden');
      expect(shirinCancelRes.body.message).toBe('You do not have permission to access or modify this ride request');

      // Non-existent ride request ID returns 404
      const nonExistentRes = await request(app.getHttpServer())
        .get('/ride-requests/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${nusratToken}`)
        .expect(404);
      expect(nonExistentRes.body).toHaveProperty('statusCode', 404);
      expect(nonExistentRes.body).toHaveProperty('error', 'Not Found');

      // Nusrat successfully views her own ride
      const nusratViewRes = await request(app.getHttpServer())
        .get(`/ride-requests/${nusratRideId}`)
        .set('Authorization', `Bearer ${nusratToken}`)
        .expect(200);
      expect(nusratViewRes.body.id).toBe(nusratRideId);

      // Nusrat successfully cancels her own ride
      const nusratCancelRes = await request(app.getHttpServer())
        .post(`/ride-requests/${nusratRideId}/cancel`)
        .set('Authorization', `Bearer ${nusratToken}`)
        .expect(200);
      expect(nusratCancelRes.body.status).toBe(RideStatus.CANCELLED);

      // Cannot cancel an already cancelled ride
      const doubleCancelRes = await request(app.getHttpServer())
        .post(`/ride-requests/${nusratRideId}/cancel`)
        .set('Authorization', `Bearer ${nusratToken}`)
        .expect(400);
      expect(doubleCancelRes.body.message).toContain('Cannot cancel ride in CANCELLED status');
    });
  });

  describe('4. Complete Multi-Rider Pooling End-to-End Flow', () => {
    it('should complete full journey for pooled riders with fare discount and seat recovery', async () => {
      // Nusrat creates ride request
      const nusratRideRes = await request(app.getHttpServer())
        .post('/ride-requests')
        .set('Authorization', `Bearer ${nusratToken}`)
        .send({
          pickupZoneId: 'BANANI',
          pickupLat: 23.7904,
          pickupLng: 90.4078,
          dropoffZoneId: 'GULSHAN_1',
          dropoffLat: 23.7806,
          dropoffLng: 90.4163,
          seatsRequested: 1,
        })
        .expect(201);
      const nusratRideId = nusratRideRes.body.id;

      // Rafiq creates ride request
      const rafiqRideRes = await request(app.getHttpServer())
        .post('/ride-requests')
        .set('Authorization', `Bearer ${rafiqToken}`)
        .send({
          pickupZoneId: 'BANANI',
          pickupLat: 23.7904,
          pickupLng: 90.4078,
          dropoffZoneId: 'GULSHAN_1',
          dropoffLat: 23.7806,
          dropoffLng: 90.4163,
          seatsRequested: 1,
        })
        .expect(201);
      const rafiqRideId = rafiqRideRes.body.id;

      // Driver discovers candidates
      const candidatesRes = await request(app.getHttpServer())
        .get('/pools/candidates')
        .set('Authorization', `Bearer ${driverToken}`)
        .expect(200);

      expect(candidatesRes.body.candidates.length).toBeGreaterThanOrEqual(2);
      const candidateIds = candidatesRes.body.candidates.map((c: any) => c.rideRequestId);
      expect(candidateIds).toContain(nusratRideId);
      expect(candidateIds).toContain(rafiqRideId);

      // Driver claims both riders together
      const claimRes = await request(app.getHttpServer())
        .post('/pools/claim')
        .set('Authorization', `Bearer ${driverToken}`)
        .send({
          teslaId: bulletId,
          rideRequestIds: [nusratRideId, rafiqRideId],
          seatsNeeded: 2,
        })
        .expect(201);

      const poolId = claimRes.body.poolId;
      expect(claimRes.body.status).toBe(PoolStatus.MATCHED);

      // Verify seats available decremented by 2 (3 -> 1)
      const teslaAfterClaim = await prisma.tesla.findUnique({ where: { id: bulletId } });
      expect(teslaAfterClaim?.seatsAvailable).toBe(1);

      // Step 1: Arrive
      await request(app.getHttpServer())
        .post(`/pools/${poolId}/arrive`)
        .set('Authorization', `Bearer ${driverToken}`)
        .expect(200);

      // Step 2: Start
      await request(app.getHttpServer())
        .post(`/pools/${poolId}/start`)
        .set('Authorization', `Bearer ${driverToken}`)
        .expect(200);

      // Step 3: Complete
      await request(app.getHttpServer())
        .post(`/pools/${poolId}/complete`)
        .set('Authorization', `Bearer ${driverToken}`)
        .expect(200);

      // Verify vehicle seats fully recovered back to capacity (3)
      const teslaAfterComplete = await prisma.tesla.findUnique({ where: { id: bulletId } });
      expect(teslaAfterComplete?.seatsAvailable).toBe(3);

      // Verify payments created for both riders
      const nusratPayment = await prisma.payment.findUnique({ where: { rideRequestId: nusratRideId } });
      const rafiqPayment = await prisma.payment.findUnique({ where: { rideRequestId: rafiqRideId } });

      expect(nusratPayment).not.toBeNull();
      expect(nusratPayment?.status).toBe(PaymentStatus.PENDING);
      expect(rafiqPayment).not.toBeNull();
      expect(rafiqPayment?.status).toBe(PaymentStatus.PENDING);
    });
  });
});
