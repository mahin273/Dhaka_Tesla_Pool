import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PoolsService } from './pools.service';
import { ClaimSeatsDto } from './dto/claim-seats.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('pools')
@UseGuards(JwtAuthGuard)
export class PoolsController {
  constructor(private readonly poolsService: PoolsService) {}

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

  @Get(':id')
  async getPool(@Param('id') id: string) {
    return this.poolsService.getPoolById(id);
  }
}
