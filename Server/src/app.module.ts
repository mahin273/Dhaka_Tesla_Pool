import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ZonesModule } from './zones/zones.module';
import { TeslasModule } from './teslas/teslas.module';

@Module({
  imports: [PrismaModule, AuthModule, UsersModule, ZonesModule, TeslasModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
