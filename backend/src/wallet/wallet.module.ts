import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { PayoutRequest } from './entities/payout-request.entity';
import { CollectorFloatLedger } from './entities/collector-float-ledger.entity';
import { PaymentProviderEntity } from '../payments/entities/payment-provider.entity';
import { UserPaymentMethod } from './entities/user-payment-method.entity';
import { PaymentTransaction } from '../payments/entities/payment-transaction.entity';
import { WalletService } from './wallet.service';
import { WalletController } from './wallet.controller';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, PayoutRequest, CollectorFloatLedger, PaymentProviderEntity, UserPaymentMethod, PaymentTransaction]),
    PaymentsModule,
  ],
  providers: [WalletService],
  controllers: [WalletController],
  exports: [WalletService],
})
export class WalletModule {}
