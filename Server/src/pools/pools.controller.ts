import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PoolsService } from './pools.service';
import { ClaimSeatsDto } from './dto/claim-seats.dto';
import { UpdatePoolStatusDto } from './dto/update-pool-status.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('pools')
@UseGuards(JwtAuthGuard)
export class PoolsController {
  constructor(private readonly poolsService: PoolsService) {}

  @Get('candidates')
  @UseGuards(RolesGuard)
  @Roles(UserRole.DRIVER)
  async getCandidates(@CurrentUser() user: { id: string }) {
    return this.poolsService.findCandidates(user.id);
  }

  @Post('claim')
  @UseGuards(RolesGuard)
  @Roles(UserRole.DRIVER)
  async claim(
    @CurrentUser() user: { id: string },
    @Body() dto: ClaimSeatsDto,
  ) {
    return this.poolsService.claimSeats(
      user.id,
      dto.teslaId,
      dto.rideRequestIds,
      dto.seatsNeeded,
    );
  }

  @Post(':id/arrive')
  @UseGuards(RolesGuard)
  @Roles(UserRole.DRIVER)
  async arrive(
    @CurrentUser() user: { id: string },
    @Param('id') poolId: string,
  ) {
    return this.poolsService.arrive(user.id, poolId);
  }

  @Post(':id/start')
  @UseGuards(RolesGuard)
  @Roles(UserRole.DRIVER)
  async startTrip(
    @CurrentUser() user: { id: string },
    @Param('id') poolId: string,
  ) {
    return this.poolsService.startTrip(user.id, poolId);
  }

  @Post(':id/complete')
  @UseGuards(RolesGuard)
  @Roles(UserRole.DRIVER)
  async completeTrip(
    @CurrentUser() user: { id: string },
    @Param('id') poolId: string,
  ) {
    return this.poolsService.completeTrip(user.id, poolId);
  }

  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles(UserRole.DRIVER)
  async updateStatus(
    @CurrentUser() user: { id: string },
    @Param('id') poolId: string,
    @Body() dto: UpdatePoolStatusDto,
  ) {
    return this.poolsService.updatePoolStatus(user.id, poolId, dto.status);
  }

  @Get(':id')
  async getPool(@Param('id') id: string) {
    return this.poolsService.getPoolById(id);
  }
}

