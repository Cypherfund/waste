import {
  Controller,
  Get,
  Post,
  Body,
  ForbiddenException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { WalletService } from './wallet.service';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import { UserRole } from '../common/enums/role.enum';

class RequestWithdrawalDto {
  amount: number;
  method: string;
  accountNumber?: string;
  accountName?: string;
}

@ApiTags('Wallet')
@ApiBearerAuth()
@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get('balance')
  async getBalance(@CurrentUser() user: JwtPayload) {
    if (user.role !== UserRole.COLLECTOR) {
      throw new ForbiddenException('Only collectors have a wallet');
    }
    return this.walletService.getBalance(user.sub);
  }

  @Get('app-config')
  getAppConfig(@CurrentUser() _user: JwtPayload) {
    return this.walletService.getAppConfig();
  }

  @Get('payout-config')
  getPayoutConfig(@CurrentUser() _user: JwtPayload) {
    return this.walletService.getPayoutConfig();
  }

  @Post('withdraw')
  async requestWithdrawal(
    @CurrentUser() user: JwtPayload,
    @Body() dto: RequestWithdrawalDto,
  ) {
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
}
