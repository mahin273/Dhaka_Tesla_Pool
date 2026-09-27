import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RideOwnershipGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const rideId = request.params.id;

    if (!rideId) {
      return true;
    }

    if (!user) {
      throw new ForbiddenException('User is not authenticated');
    }

    const ride = await this.prisma.rideRequest.findUnique({
      where: { id: rideId },
      include: {
        pool: {
          include: {
            tesla: true,
          },
        },
      },
    });

    if (!ride) {
      throw new NotFoundException('Ride request not found');
    }

    const isPassengerOwner = ride.passengerId === user.id;
    const isAssignedDriver = ride.pool?.tesla?.driverId === user.id;

    if (!isPassengerOwner && !isAssignedDriver) {
      throw new ForbiddenException(
        'You do not have permission to access or modify this ride request',
      );
    }

    request.rideRequest = ride;
    return true;
  }
}
