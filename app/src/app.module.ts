import { Module } from '@nestjs/common';
import PaymentModule from './modules/payment/payment.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [PaymentModule, ConfigModule.forRoot({
    isGlobal: true,
  })],
  controllers: [],
  providers: [],
})
export class AppModule {}
