import { Injectable } from "@nestjs/common";
import Payment from "../model/payment";
import { AbstractPaymentRepository } from "../repository/payment.repository.abstract";
import { AbstractPaymentService } from "./payment.service.abstract";
import { MessagingService } from "../../../commons/messaging/messaging.abstract";

@Injectable()
export default class PaymentService implements AbstractPaymentService {
    constructor(
        private readonly paymentRepository: AbstractPaymentRepository, 
        private readonly rabbitProducerService: MessagingService
    ) {}

    emitCreatePayment(payment: Payment): Promise<void> {
        return this.rabbitProducerService.emitEvent({
            correlationId: payment.correlationId,
            amount: payment.amount,
            createdAt: new Date(),
        })
    }

    createPayment(payment: Payment & { createdAt: Date }): Promise<{ status: string }> {
        return this.paymentRepository.createPayment(payment);
    }

    getPaymentsSummary(from: Date, to: Date) {
        return this.paymentRepository.getPaymentsSummary(from, to);
    }
}