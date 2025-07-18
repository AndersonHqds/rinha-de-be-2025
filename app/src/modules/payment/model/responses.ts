export class RequestsDetail {
    totalRequests: number;
    totalAmount: number;
}

export class PaymentsSummaryResponse {
    default: RequestsDetail;
    fallback: RequestsDetail;
}