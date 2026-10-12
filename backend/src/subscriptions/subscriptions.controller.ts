import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CurrentUserId } from '../common/current-user.decorator.js';
import { PurchaseDto } from './dto/purchase.dto.js';
import { SubscriptionsService } from './subscriptions.service.js';

@Controller('subscriptions')
@UseGuards(JwtAuthGuard)
export class SubscriptionsController {
  constructor(private readonly subscriptions: SubscriptionsService) {}

  @Get('me')
  async getStatus(@CurrentUserId() userId: string) {
    return this.subscriptions.getStatus(userId);
  }

  @Post('claim-trial')
  async claimTrial(@CurrentUserId() userId: string) {
    return this.subscriptions.claimTrial(userId);
  }

  @Post('purchase')
  async purchase(@CurrentUserId() userId: string, @Body() dto: PurchaseDto) {
    return this.subscriptions.recordPurchase(userId, dto.plan, dto.productId);
  }
}
