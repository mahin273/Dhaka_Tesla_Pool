import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PoolStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterTeslaDto } from './dto/register-tesla.dto';

@Injectable()
export class TeslasService {
  constructor(private readonly prisma: PrismaService) {}

  async getDriverTesla(driverId: string) {
    let tesla = await this.prisma.tesla.findUnique({
      where: { driverId },
      include: {
        driver: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    if (!tesla) {
      tesla = await this.prisma.tesla.create({
        data: {
          driverId,
          name: 'Model 3 Fleet',
          capacity: 3,
          seatsAvailable: 3,
          isOnline: false,
        },
        include: {
          driver: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phone: true,
            },
          },
        },
      });
    }

    return tesla;
  }

  async registerOrUpdateTesla(driverId: string, dto: RegisterTeslaDto) {
    return this.prisma.tesla.upsert({
      where: { driverId },
      update: {
        name: dto.name,
        capacity: dto.capacity,
        seatsAvailable: dto.capacity,
      },
      create: {
        driverId,
        name: dto.name,
        capacity: dto.capacity,
        seatsAvailable: dto.capacity,
        isOnline: false,
      },
    });
  }

  async setOnlineStatus(driverId: string, isOnline: boolean) {
    const existing = await this.prisma.tesla.findUnique({
      where: { driverId },
    });

    if (!existing) {
      throw new BadRequestException('Driver must register a Tesla before going online');
    }

    if (!isOnline) {
      const activePool = await this.prisma.pool.findFirst({
        where: {
          teslaId: existing.id,
          status: {
            in: [PoolStatus.MATCHED, PoolStatus.DRIVER_ARRIVED, PoolStatus.STARTED],
          },
        },
      });

      if (activePool) {
        throw new BadRequestException(
          'Cannot go offline while an active trip or pool is in progress. Please complete the trip first.',
        );
      }
    }

    return this.prisma.tesla.update({
      where: { driverId },
      data: { isOnline },
    });
  }
}
