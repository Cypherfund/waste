import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { PaymentService } from './payment.service';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { PaymentCallbackDto } from './dto/payment-callback.dto';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { PaymentProvider } from './types/gateway.types';
import { PaymentTransaction } from './entities/payment-transaction.entity';

@ApiTags('Payments')
@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  // ── GET providers (public, cached) ────────────────────────────
  @ApiOperation({ summary: 'Get available payment providers for a country' })
  @Public()
  @Get('providers/:countryCode')
  async getProviders(
    @Param('countryCode') countryCode: string,
  ): Promise<PaymentProvider[]> {
    return this.paymentService.getProviders(countryCode);
  }

  // ── INITIATE payment ───────────────────────────────────────────
  @ApiOperation({ summary: 'Initiate a payment (cashin or cashout)' })
  @ApiBearerAuth()
  @Post('initiate')
  async initiatePayment(
    @CurrentUser() user: JwtPayload,
    @Body() dto: InitiatePaymentDto,
  ): Promise<PaymentTransaction> {
    return this.paymentService.initiatePayment(user.sub, dto);
  }

  // ── WEBHOOK callback (public, called by gateway) ───────────────
  @ApiOperation({ summary: 'Payment gateway callback webhook' })
  @Public()
  @Post('callback')
  async handleCallback(
    @Body() payload: PaymentCallbackDto,
  ): Promise<{ received: boolean }> {
    await this.paymentService.handleCallback(payload);
    return { received: true };
  }

  // ── CHECK transaction status ──────────────────────────────────
  @ApiOperation({ summary: 'Check payment transaction status' })
  @ApiBearerAuth()
  @Get(':id/status')
  async checkStatus(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ): Promise<PaymentTransaction> {
    // Verify ownership
    const tx = await this.paymentService.getTransaction(id);
    if (tx.userId !== user.sub) {
      throw new Error('Access denied');
    }
    return this.paymentService.checkTransactionStatus(id);
  }

  // ── GET user transactions ─────────────────────────────────────
  @ApiOperation({ summary: 'Get current user\'s payment transactions' })
  @ApiBearerAuth()
  @Get('my-transactions')
  async getMyTransactions(
    @CurrentUser() user: JwtPayload,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ): Promise<PaymentTransaction[]> {
    return this.paymentService.getUserTransactions(user.sub, Math.min(limit, 100));
  }
}
