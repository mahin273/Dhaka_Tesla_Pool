import { Body, Controller, Post } from '@nestjs/common';
import { MatchingService } from './matching.service';
import { EvaluateCompatibilityDto } from './dto/evaluate-compatibility.dto';
import { CompatibilityResult } from './interfaces/compatibility-result.interface';

@Controller('matching')
export class MatchingController {
  constructor(private readonly matchingService: MatchingService) {}

  @Post('compatibility')
  evaluateCompatibility(
    @Body() body: EvaluateCompatibilityDto,
  ): CompatibilityResult {
    return this.matchingService.evaluateCompatibility(body.legA, body.legB);
  }
}
