import {
  Controller,
  Get,
  Post,
  Body,
  ForbiddenException,
  Patch,
  Param,
  Query,
  Delete,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsNumber, IsString, IsOptional, Min, IsEnum } from 'class-validator';
import { WalletService } from './wallet.service';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import { UserRole } from '../common/enums/role.enum';
import { UserPaymentMethodUsageType } from './entities/user-payment-method.entity';

class RequestWithdrawalDto {
  @IsNumber()
  @Min(1)
  amount: number;

  @IsString()
  method: string;

  @IsOptional()
  @IsString()
  accountNumber?: string;

  @IsOptional()
  @IsString()
  accountName?: string;
}

class AddPaymentMethodDto {
  @IsString()
  paymentCode: string;

  @IsString()
  accountNumber: string;

  @IsOptional()
  @IsString()
  accountName?: string;

  @IsOptional()
  @IsEnum(UserPaymentMethodUsageType)
  usageType?: UserPaymentMethodUsageType;

  @IsOptional()
  isDefault?: boolean;
}

class UpdatePaymentMethodDto {
  @IsOptional()
  @IsString()
  accountNumber?: string;

  @IsOptional()
  @IsString()
  accountName?: string;
}

class TopUpWalletDto {
  @IsNumber()
  @Min(1)
  amount: number;

  @IsString()
  paymentMethodId: string;

  @IsOptional()
  @IsString()
  paymentRef?: string;

  @IsOptional()
  @IsString()
  paymentProofUrl?: string;
}

class PayJobWithWalletDto {
  @IsString()
  jobId: string;
}

class PaySubscriptionWithWalletDto {
  @IsString()
  planId: string;
}

@ApiTags('Wallet')
@ApiBearerAuth()
@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get('balance')
  async getBalance(@CurrentUser() user: JwtPayload) {
    return this.walletService.getBalance(user.sub);
  }

  @Get('app-config')
  getAppConfig(@CurrentUser() user: JwtPayload) {
    const countryCode = user.countryCode ?? 'cmr';
    return this.walletService.getAppConfig(countryCode);
  }

  @Get('payout-config')
  getPayoutConfig(@CurrentUser() _user: JwtPayload) {
    return this.walletService.getPayoutConfig();
  }

  @Post('withdraw')
  async requestWithdrawal(@CurrentUser() user: JwtPayload, @Body() dto: RequestWithdrawalDto) {
    if (user.role !== UserRole.COLLECTOR) {
      throw new ForbiddenException('Only collectors can request withdrawals');
    }
    return this.walletService.requestWithdrawal(user.sub, dto);
  }

  @Get('payouts')
  async getMyPayouts(@CurrentUser() user: JwtPayload) {
    if (user.role !== UserRole.COLLECTOR) {
      throw new ForbiddenException('Only collectors can view their payouts');
    }
    return this.walletService.getMyPayoutRequests(user.sub);
  }

  @Post('top-up')
  async topUpWallet(@CurrentUser() user: JwtPayload, @Body() dto: TopUpWalletDto) {
    if (user.role !== UserRole.HOUSEHOLD) {
      throw new ForbiddenException('Only households can top up their wallet');
    }
    return this.walletService.topUp(user.sub, dto);
  }

  @Post('pay-job')
  async payJobWithWallet(@CurrentUser() user: JwtPayload, @Body() dto: PayJobWithWalletDto) {
    if (user.role !== UserRole.HOUSEHOLD) {
      throw new ForbiddenException('Only households can pay for jobs');
    }
    return this.walletService.payJobWithWallet(user.sub, dto.jobId);
  }

  @Post('pay-subscription')
  async paySubscriptionWithWallet(
    @CurrentUser() user: JwtPayload,
    @Body() dto: PaySubscriptionWithWalletDto,
  ) {
    if (user.role !== UserRole.HOUSEHOLD) {
      throw new ForbiddenException('Only households can pay for subscriptions');
    }
    return this.walletService.paySubscriptionWithWallet(user.sub, dto.planId);
  }

  // ── USER PAYMENT METHODS ────────────────────────────────────────

  @Get('payment-methods')
  async getPaymentMethods(
    @CurrentUser() user: JwtPayload,
    @Query('usage') usage?: 'CASHIN' | 'CASHOUT',
  ) {
    return this.walletService.listPaymentMethods(user.sub, usage);
  }

  @Post('payment-methods')
  async addPaymentMethod(@CurrentUser() user: JwtPayload, @Body() dto: AddPaymentMethodDto) {
    return this.walletService.addPaymentMethod(user.sub, dto);
  }

  @Patch('payment-methods/:id')
  async updatePaymentMethod(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdatePaymentMethodDto,
  ) {
    return this.walletService.updatePaymentMethod(user.sub, id, dto);
  }

  @Patch('payment-methods/:id/default')
  async setDefaultPaymentMethod(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Query('usage') usage: 'CASHIN' | 'CASHOUT',
  ) {
    return this.walletService.setDefaultPaymentMethod(user.sub, id, usage);
  }

  @Delete('payment-methods/:id')
  async deletePaymentMethod(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    await this.walletService.deletePaymentMethod(user.sub, id);
    return { success: true };
  }
}
