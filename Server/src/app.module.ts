import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ZonesModule } from './zones/zones.module';
import { TeslasModule } from './teslas/teslas.module';
import { FaresModule } from './fares/fares.module';
import { MatchingModule } from './matching/matching.module';
import { RideRequestsModule } from './ride-requests/ride-requests.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UsersModule,
    ZonesModule,
    TeslasModule,
    FaresModule,
    MatchingModule,
    RideRequestsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
