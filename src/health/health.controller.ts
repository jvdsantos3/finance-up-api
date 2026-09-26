import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { HealthService } from './health.service.js';

@Controller()
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get('health')
  async getHealth() {
    const body = await this.healthService.check();
    if (body.database === 'down') {
      throw new ServiceUnavailableException(body);
    }
    return body;
  }
}
