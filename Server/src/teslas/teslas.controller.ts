import { Controller, Get, Post, Patch, Body, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { TeslasService } from './teslas.service';
import { RegisterTeslaDto } from './dto/register-tesla.dto';
import { UpdateOnlineStatusDto } from './dto/update-online-status.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('drivers/me')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.DRIVER)
export class TeslasController {
  constructor(private readonly teslasService: TeslasService) {}

  @Get('tesla')
  async getMyTesla(@CurrentUser() user: { id: string }) {
    return this.teslasService.getDriverTesla(user.id);
  }

  @Post('tesla')
  async registerMyTesla(
    @CurrentUser() user: { id: string },
    @Body() dto: RegisterTeslaDto,
  ) {
    return this.teslasService.registerOrUpdateTesla(user.id, dto);
  }

  @Patch('online-status')
  async updateOnlineStatus(
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateOnlineStatusDto,
  ) {
    return this.teslasService.setOnlineStatus(user.id, dto.isOnline);
  }
}
