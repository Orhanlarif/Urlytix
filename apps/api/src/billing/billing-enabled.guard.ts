import { CanActivate, Injectable, NotFoundException } from '@nestjs/common';
import { AppConfigService } from '../config/app-config.service';

@Injectable()
export class BillingEnabledGuard implements CanActivate {
  constructor(private readonly appConfig: AppConfigService) {}

  canActivate() {
    if (!this.appConfig.billingEnabled) {
      throw new NotFoundException();
    }

    return true;
  }
}
