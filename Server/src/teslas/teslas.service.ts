import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterTeslaDto } from './dto/register-tesla.dto';

@Injectable()
export class TeslasService {
  constructor(private readonly prisma: PrismaService) {}

  async getDriverTesla(driverId: string) {
    const tesla = await this.prisma.tesla.findUnique({
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
      throw new NotFoundException('No Tesla registered for this driver');
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

    return this.prisma.tesla.update({
      where: { driverId },
      data: { isOnline },
    });
  }
}
