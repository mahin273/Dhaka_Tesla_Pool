import { Controller, Get } from '@nestjs/common';
import { ZonesService } from './zones.service';

@Controller('zones')
export class ZonesController {
  constructor(private readonly zonesService: ZonesService) {}

  @Get()
  async getAllZones() {
    return this.zonesService.findAll();
  }
}
