import { NotFoundException } from '@nestjs/common';
import { AppConfigService } from '../config/app-config.service';
import { BillingEnabledGuard } from './billing-enabled.guard';

describe('BillingEnabledGuard', () => {
  it('returns 404 behavior when billing is disabled', () => {
    const guard = new BillingEnabledGuard({
      billingEnabled: false,
    } as AppConfigService);

    expect(() => guard.canActivate()).toThrow(NotFoundException);
  });

  it('allows requests when billing is explicitly enabled', () => {
    const guard = new BillingEnabledGuard({
      billingEnabled: true,
    } as AppConfigService);

    expect(guard.canActivate()).toBe(true);
  });
});
