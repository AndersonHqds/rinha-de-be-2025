import { Injectable } from "@nestjs/common";
import Payment from "../model/payment";
import { AbstractPaymentRepository } from "./payment.repository.abstract";
import { HttpService } from "@nestjs/axios";
import { UrlBuilder } from "src/commons/builders/url-builder";
import { lastValueFrom } from 'rxjs';
import { ConfigService } from "@nestjs/config";
import * as CircuitBreaker from 'opossum';
import Connection from "src/modules/database/connection";
import { PaymentsSummaryResponse } from "../model/responses";

@Injectable()
export default class PaymentRepository implements AbstractPaymentRepository {
    private readonly paymentProcessor: UrlBuilder;
    private readonly paymentProcessorFallback: UrlBuilder;

    private breaker: CircuitBreaker<any, any>;

    constructor(private readonly httpService: HttpService, private readonly configService: ConfigService, private readonly postgresAdapter: Connection) {
        this.paymentProcessor = UrlBuilder.build(this.configService.get('PAYMENT_PROCESSOR_URL'));
        this.paymentProcessorFallback = UrlBuilder.build(this.configService.get('PAYMENT_PROCESSOR_FALLBACK_URL'));

        this.breaker = new CircuitBreaker(this.callPrimaryProcessor.bind(this), {
            timeout: 5000, // quanto tempo esperar cada chamada
            errorThresholdPercentage: 50, // se 50% das chamadas falharem, abre o circuito
            resetTimeout: 5000, // depois de 10s, tenta fechar o circuito
        });

        this.breaker.on('open', () => console.log('Circuit breaker OPEN'));
        this.breaker.on('halfOpen', () => console.log('Circuit breaker HALF-OPEN'));
        this.breaker.on('close', () => console.log('Circuit breaker CLOSED'));
    }

    async findPaymentByCorrelationId(correlationId: string) {
        const result = await this.postgresAdapter.query(`SELECT * FROM payments WHERE correlation_id = $1`, [correlationId]);
        return result.length > 0 ? result[0] : null;
    }

    async purgePayments(): Promise<void> {
        await this.postgresAdapter.query('DELETE FROM payments');
    }
    
    async getPaymentsSummary(from: Date, to: Date): Promise<PaymentsSummaryResponse> {
        const conditions: string[] = [];
        const values: any[] = [];

        if (from) {
            conditions.push(`created_at >= $${values.length + 1}`);
            values.push(from);
        }

        if (to) {
            conditions.push(`created_at <= $${values.length + 1}`);
            values.push(to);
        }
        const whereClause = conditions.length > 1 ? `${conditions.join(' AND ')} AND` : '';
        const resultPrimary = await this.postgresAdapter.query(`SELECT count(correlation_id) as quantity, sum(amount) as totalAmount FROM payments WHERE ${whereClause} payment_processor = 'primary'`, values)
        const resultFallback = await this.postgresAdapter.query(`SELECT count(correlation_id) as quantity, sum(amount) as totalAmount FROM payments WHERE ${whereClause} payment_processor = 'fallback'`, values)
        
        return {
            default: {
                totalRequests: resultPrimary[0].quantity,
                totalAmount: parseFloat(resultPrimary[0].totalAmount.toFixed(2)),
            },
            fallback: {
                totalRequests: resultFallback[0].quantity,
                totalAmount: parseFloat(resultFallback[0].totalAmount.toFixed(2)),
            },
        }
    }

    private async callPrimaryProcessor(payment): Promise<void> {
        const { createdAt: requestedAt, ...rest } = payment;
        const result = await lastValueFrom(this.httpService.post(this.paymentProcessor.url('payments'), {
            ...rest,
            requestedAt,
        })).catch(error => {
            console.log(`[Primary] Error detail`, error.response.data);
            throw error;
        });
        if (result.status === 200) {
            await this.savePayment({ ...payment, paymentProcessor: 'primary' });
        }
    }

    private async callFallbackProcessor(payment): Promise<void> {
        const { createdAt: requestedAt, ...rest } = payment;
        const result = await lastValueFrom(this.httpService.post(this.paymentProcessorFallback.url('payments'), {
            ...rest,
            requestedAt
        })).catch(error => {
            console.log(`[Fallback] Error detail`, error.response.data);
            throw error;
        });
        if (result.status === 200) {
            await this.savePayment({ ...payment, paymentProcessor: 'fallback' });
        }
    }

    private async savePayment(payment: Payment & { createdAt: Date; paymentProcessor: string }) {
        await this.postgresAdapter.query('INSERT INTO payments (correlation_id, amount, created_at, payment_processor) VALUES ($1, $2, $3, $4)', 
            [payment.correlationId, payment.amount, payment.createdAt, payment.paymentProcessor]);
    }


    async createPayment(payment: Payment) {
        try {
          await this.breaker.fire(payment);
          return { status: 'success' };
        } catch (err) {
          try {
            await this.callFallbackProcessor(payment);
            return { status: 'success' };
          } catch (fallbackErr) {
            console.error(`Fallback processor also failed: ${fallbackErr.message}`);
            return { status: 'error' };
          }
        }
      }
}

