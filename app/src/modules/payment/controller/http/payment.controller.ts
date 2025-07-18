import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { AbstractPaymentService } from '../../service/payment.service.abstract';
import Payment from '../../model/payment';
import { Ctx, MessagePattern, Payload, RmqContext } from '@nestjs/microservices';

@Controller()
export class PaymentController {
  constructor(private readonly paymentService: AbstractPaymentService) {}

    @Post("payments")
    createPayment(@Body() payment: Payment) {
        return this.paymentService.emitCreatePayment(payment);
    }

    @Get('/payments-summary')
    getPaymentSummary(@Query('from') from: Date, @Query('to') to: Date) {
        return this.paymentService.getPaymentsSummary(from, to);
    }
}
