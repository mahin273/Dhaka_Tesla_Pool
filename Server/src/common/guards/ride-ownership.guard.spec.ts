import { ExecutionContext, ForbiddenException, NotFoundException } from '@nestjs/common';
import { RideOwnershipGuard } from './ride-ownership.guard';
import { PrismaService } from '../../prisma/prisma.service';

describe('RideOwnershipGuard', () => {
  let guard: RideOwnershipGuard;
  let prisma: { rideRequest: { findUnique: jest.Mock } };

  beforeEach(() => {
    prisma = {
      rideRequest: { findUnique: jest.fn() },
    };
    guard = new RideOwnershipGuard(prisma as unknown as PrismaService);
  });

  function createMockContext(user: any, params: any): ExecutionContext {
    const request = { user, params };
    return {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => ({}),
      }),
    } as unknown as ExecutionContext;
  }

  it('should allow through if no id param is present', async () => {
    const context = createMockContext({ id: 'user-1' }, {});
    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('should throw ForbiddenException if user is missing', async () => {
    const context = createMockContext(null, { id: 'ride-1' });
    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('should throw NotFoundException if ride does not exist', async () => {
    prisma.rideRequest.findUnique.mockResolvedValue(null);
    const context = createMockContext({ id: 'user-1' }, { id: 'ride-999' });

    await expect(guard.canActivate(context)).rejects.toThrow(NotFoundException);
  });

  it('should allow access if user is the passenger owner', async () => {
    prisma.rideRequest.findUnique.mockResolvedValue({
      id: 'ride-1',
      passengerId: 'nusrat-id',
      pool: null,
    });

    const context = createMockContext({ id: 'nusrat-id' }, { id: 'ride-1' });
    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('should allow access if user is the assigned pool driver', async () => {
    prisma.rideRequest.findUnique.mockResolvedValue({
      id: 'ride-1',
      passengerId: 'nusrat-id',
      pool: {
        tesla: {
          driverId: 'jashim-id',
        },
      },
    });

    const context = createMockContext({ id: 'jashim-id' }, { id: 'ride-1' });
    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('should reject with ForbiddenException if user is another passenger', async () => {
    prisma.rideRequest.findUnique.mockResolvedValue({
      id: 'ride-1',
      passengerId: 'nusrat-id',
      pool: null,
    });

    const context = createMockContext({ id: 'shirin-id' }, { id: 'ride-1' });
    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('should reject with ForbiddenException if user is a driver of a different vehicle', async () => {
    prisma.rideRequest.findUnique.mockResolvedValue({
      id: 'ride-1',
      passengerId: 'nusrat-id',
      pool: {
        tesla: {
          driverId: 'jashim-id',
        },
      },
    });

    const context = createMockContext({ id: 'other-driver-id' }, { id: 'ride-1' });
    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });
});
