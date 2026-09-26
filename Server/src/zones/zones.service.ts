import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ZonesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.zone.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: string) {
    return this.prisma.zone.findUnique({
      where: { id },
    });
  }
}
