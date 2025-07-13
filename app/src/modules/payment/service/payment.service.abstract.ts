import Payment from "../model/payment";

export abstract class AbstractPaymentService {
    abstract emitCreatePayment(payment: Payment): Promise<void>;
    abstract createPayment(payment: Payment & { createdAt: Date }): Promise<{ status: string }>;
}