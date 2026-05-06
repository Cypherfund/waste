import { Controller, Get, Post, Patch, Param, Body, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SubscriptionsService } from './subscriptions.service';
import { PricingService } from './pricing.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/role.enum';

@ApiTags('Subscriptions')
@ApiBearerAuth()
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(
    private readonly subscriptionsService: SubscriptionsService,
    private readonly pricingService: PricingService,
  ) {}

  // ─── Public (household) ───────────────────────────────────────

  @Get('plans')
  listPlans() {
    return this.subscriptionsService.listPlans();
  }

  @Post('subscribe')
  @Roles(UserRole.HOUSEHOLD)
  subscribe(
    @CurrentUser('sub') userId: string,
    @Body() body: { planId: string },
  ) {
    return this.subscriptionsService.subscribe(userId, body.planId);
  }

  @Get('my')
  @Roles(UserRole.HOUSEHOLD)
  getMySubscription(@CurrentUser('sub') userId: string) {
    return this.subscriptionsService.getMySubscription(userId);
  }

  @Get('my/history')
  @Roles(UserRole.HOUSEHOLD)
  getHistory(@CurrentUser('sub') userId: string) {
    return this.subscriptionsService.getSubscriptionHistory(userId);
  }

  @Post('cancel')
  @Roles(UserRole.HOUSEHOLD)
  cancel(@CurrentUser('sub') userId: string) {
    return this.subscriptionsService.cancel(userId);
  }

  @Get('pricing-quote')
  @Roles(UserRole.HOUSEHOLD)
  getPricingQuote(@CurrentUser('sub') userId: string) {
    return this.pricingService.getQuoteForUser(userId);
  }

  // ─── Admin ────────────────────────────────────────────────────

  @Get('admin/plans')
  @Roles(UserRole.ADMIN)
  adminListPlans() {
    return this.subscriptionsService.adminListPlans();
  }

  @Post('admin/plans')
  @Roles(UserRole.ADMIN)
  adminCreatePlan(
    @Body() body: { name: string; price: number; pickupsPerWeek: number; description?: string },
  ) {
    return this.subscriptionsService.adminCreatePlan(body);
  }

  @Patch('admin/plans/:id')
  @Roles(UserRole.ADMIN)
  adminUpdatePlan(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { name?: string; price?: number; pickupsPerWeek?: number; isActive?: boolean; description?: string },
  ) {
    return this.subscriptionsService.adminUpdatePlan(id, body);
  }
}
