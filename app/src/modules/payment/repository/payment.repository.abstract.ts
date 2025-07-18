import Payment from "../model/payment";
import { PaymentsSummaryResponse } from "../model/responses";

export abstract class AbstractPaymentRepository {
  abstract createPayment(payment: Payment): Promise<{ status: string }>;
  abstract getPaymentsSummary(from: Date, to: Date): Promise<PaymentsSummaryResponse>;
}