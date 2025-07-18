import { Controller } from '@nestjs/common';
import { MessagePattern, Payload, Ctx, RmqContext } from '@nestjs/microservices';
import { AbstractPaymentService } from '../../service/payment.service.abstract';

@Controller()
export class PaymentMessageConsumer {
  constructor(private readonly paymentService: AbstractPaymentService) {}

    @MessagePattern('create_payment')
    async handle(@Payload() data: any, @Ctx() context: RmqContext) {
        const channel = context.getChannelRef();
        const originalMsg = context.getMessage();

        try {
            const result = await this.paymentService.createPayment(data);
            if (result.status === 'success') {
                channel.ack(originalMsg);
            } else {
                console.log('Pagamento falhou');
                channel.nack(originalMsg, false, true);
            }
            return;
        } catch (err) {
            console.error('Erro no processamento:', err.message);
            channel.nack(originalMsg, false, true);
            return;
        }
    }
}