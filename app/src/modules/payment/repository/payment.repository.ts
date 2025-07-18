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
            resetTimeout: 10000, // depois de 10s, tenta fechar o circuito
        });

        this.breaker.on('open', () => console.log('Circuit breaker OPEN'));
        this.breaker.on('halfOpen', () => console.log('Circuit breaker HALF-OPEN'));
        this.breaker.on('close', () => console.log('Circuit breaker CLOSED'));
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
        const resultPrimary = await this.postgresAdapter.query(`SELECT correlation_id, amount, totalRequests, created_at, payment_processor FROM payments WHERE ${whereClause} payment_processor = 'primary'`, values)
        const resultFallback = await this.postgresAdapter.query(`SELECT correlation_id, amount, totalRequests, created_at, payment_processor FROM payments WHERE ${whereClause} payment_processor = 'fallback'`, values)
        console.log(resultPrimary);
        console.log(resultFallback);
        return {
            default: resultPrimary.reduce((acc, row) => {
                return ({
                    totalRequests: resultPrimary.length,
                    totalAmount: acc.totalAmount + Number(row.amount),
                })
            }, {
                totalRequests: 0,
                totalAmount: 0,
            }),
            fallback: resultFallback.reduce((acc, row) => {
                return ({
                    totalRequests: resultFallback.length,
                    totalAmount: acc.totalAmount + Number(row.amount),
                })
            }, {
                totalRequests: 0,
                totalAmount: 0,
            }),
        }
    }

    private async callPrimaryProcessor(payment): Promise<void> {
        const result = await lastValueFrom(this.httpService.post(this.paymentProcessor.url('payments'), payment));
        if (result.status === 200) {
            await this.savePayment({ ...payment, paymentProcessor: 'primary' });
        }
    }

    private async callFallbackProcessor(payment): Promise<void> {
        console.log('Calling fallback payment processor');
        const result = await lastValueFrom(this.httpService.post(this.paymentProcessorFallback.url('payments'), payment)).catch(error => {
            console.log(`Error detail: ${error.response.data}`);
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

