import { Injectable } from "@nestjs/common";
import Payment from "../model/payment";
import { AbstractPaymentRepository } from "./payment.repository.abstract";
import { HttpService } from "@nestjs/axios";
import { UrlBuilder } from "src/commons/builders/url-builder";
import { lastValueFrom } from 'rxjs';
import { ConfigService } from "@nestjs/config";
import * as CircuitBreaker from 'opossum';
import { PostgresService } from "src/modules/database/postgres";

@Injectable()
export default class PaymentRepository implements AbstractPaymentRepository {
    private readonly paymentProcessor: UrlBuilder;
    private readonly paymentProcessorFallback: UrlBuilder;

    private breaker: CircuitBreaker<any, any>;

    constructor(private readonly httpService: HttpService, private readonly configService: ConfigService, private readonly postgresService: PostgresService) {
        this.paymentProcessor = UrlBuilder.build(this.configService.get('PAYMENT_PROCESSOR_URL'));
        this.paymentProcessorFallback = UrlBuilder.build(this.configService.get('PAYMENT_PROCESSOR_FALLBACK_URL'));

        this.breaker = new CircuitBreaker(this.callPrimaryProcessor.bind(this), {
            timeout: 5000, // quanto tempo esperar cada chamada
            errorThresholdPercentage: 50, // se 50% das chamadas falharem, abre o circuito
            resetTimeout: 10000, // depois de 10s, tenta fechar o circuito
        });

        // Logs de estado
        this.breaker.on('open', () => console.log('Circuit breaker OPEN'));
        this.breaker.on('halfOpen', () => console.log('Circuit breaker HALF-OPEN'));
        this.breaker.on('close', () => console.log('Circuit breaker CLOSED'));
    }

    private async callPrimaryProcessor(payment): Promise<void> {
        console.log('Calling primary payment processor');
        const result = await lastValueFrom(this.httpService.post(this.paymentProcessor.url('payments'), payment));
        if (result.status === 200) {
            await this.postgresService.query('INSERT INTO payments (correlation_id, amount, created_at, payment_processor) VALUES ($1, $2, $3, $4)', [payment.correlationId, payment.amount, payment.createdAt, 'primary']);
        }
    }

    private async callFallbackProcessor(payment): Promise<void> {
        console.log('Calling fallback payment processor');
        const result = await lastValueFrom(this.httpService.post(this.paymentProcessorFallback.url('payments'), payment));
        if (result.status === 200) {
            await this.postgresService.query('INSERT INTO payments (correlation_id, amount, created_at, payment_processor) VALUES ($1, $2, $3, $4)', [payment.correlationId, payment.amount, payment.createdAt, 'fallback']);
        }
    }

    async createPayment(payment: Payment) {
        try {
          await this.breaker.fire(payment);
          return { status: 'success' };
        } catch (err) {
          console.error(`Primary processor failed: ${err.message}. Calling fallback.`);
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

