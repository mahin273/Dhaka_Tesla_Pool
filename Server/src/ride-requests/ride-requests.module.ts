import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { MatchingModule } from '../matching/matching.module';
import { FaresModule } from '../fares/fares.module';
import { RideRequestsController } from './ride-requests.controller';
import { RideRequestsService } from './ride-requests.service';
import { RideOwnershipGuard } from '../common/guards/ride-ownership.guard';

@Module({
  imports: [PrismaModule, MatchingModule, FaresModule],
  controllers: [RideRequestsController],
  providers: [RideRequestsService, RideOwnershipGuard],
  exports: [RideRequestsService, RideOwnershipGuard],
})
export class RideRequestsModule {}

