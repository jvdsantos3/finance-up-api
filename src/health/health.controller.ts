import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { z } from 'zod';
import { HealthService } from './health.service.js';

export const healthBodySchema = z.object({
  status: z.enum(['ok', 'error']),
  database: z.enum(['up', 'down']),
});

@Controller()
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get('health')
  @ApiOperation({ summary: 'Health check' })
  @ApiOkResponse({ standardSchema: healthBodySchema })
  async getHealth() {
    const body = await this.healthService.check();
    if (body.database === 'down') {
      throw new ServiceUnavailableException(body);
    }
    return body;
  }
}
