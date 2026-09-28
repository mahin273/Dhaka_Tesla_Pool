import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { RideRequestsService } from './ride-requests.service';
import { CreateRideRequestDto } from './dto/create-ride-request.dto';
import { CreateRatingDto } from './dto/create-rating.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { RideOwnershipGuard } from '../common/guards/ride-ownership.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('ride-requests')
@UseGuards(JwtAuthGuard)
export class RideRequestsController {
  constructor(private readonly rideRequestsService: RideRequestsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.PASSENGER)
  async create(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateRideRequestDto,
  ) {
    return this.rideRequestsService.create(user.id, dto);
  }

  @Get('me')
  @UseGuards(RolesGuard)
  @Roles(UserRole.PASSENGER)
  async getMyRequests(@CurrentUser() user: { id: string }) {
    return this.rideRequestsService.findAllForPassenger(user.id);
  }

  @Get(':id')
  @UseGuards(RideOwnershipGuard)
  async getRequestById(
    @CurrentUser() user: { id: string; role?: UserRole },
    @Param('id') id: string,
  ) {
    return this.rideRequestsService.findById(user, id);
  }

  @Post(':id/rate')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(RideOwnershipGuard)
  async rate(
    @CurrentUser() user: { id: string; role?: UserRole },
    @Param('id') id: string,
    @Body() dto: CreateRatingDto,
  ) {
    return this.rideRequestsService.createRating(user, id, dto);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard, RideOwnershipGuard)
  @Roles(UserRole.PASSENGER)
  async cancel(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
  ) {
    return this.rideRequestsService.cancel(user.id, id);
  }
}

