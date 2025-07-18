import Payment from "../model/payment";
import { PaymentsSummaryResponse } from "../model/responses";

export abstract class AbstractPaymentService {
    abstract emitCreatePayment(payment: Payment): Promise<void>;
    abstract createPayment(payment: Payment & { createdAt: Date }): Promise<{ status: string }>;
    abstract getPaymentsSummary(from: Date, to: Date): Promise<PaymentsSummaryResponse>;
}