import Payment from "../model/payment";

export abstract class AbstractPaymentRepository {
  abstract createPayment(payment: Payment): Promise<{ status: string }>;
}