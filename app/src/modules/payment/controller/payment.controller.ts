import { Body, Controller, Post } from '@nestjs/common';
import { AbstractPaymentService } from '../service/payment.service.abstract';
import Payment from '../model/payment';
import { Ctx, MessagePattern, Payload, RmqContext } from '@nestjs/microservices';

@Controller("payments")
export class PaymentController {
  constructor(private readonly paymentService: AbstractPaymentService) {}

  @Post()
  createPayment(@Body() payment: Payment) {
    return this.paymentService.emitCreatePayment(payment);
  }

  @MessagePattern('create_payment')
  async handlePayment(@Payload() data: any, @Ctx() context: RmqContext) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();

    try {
        console.log('Processando pagamento:', data);
        const result = await this.paymentService.createPayment(data);
        
        if (result.status === 'success') {
            channel.ack(originalMsg);
        } else {
            channel.nack(originalMsg, false, true);
        }
    } catch (err) {
        console.error('Erro no processamento:', err.message);
        channel.nack(originalMsg, false, true);
    }
  }
}
