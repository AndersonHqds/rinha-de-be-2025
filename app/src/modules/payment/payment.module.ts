import { Module } from "@nestjs/common";
import PaymentRepository from "./repository/payment.repository";
import PaymentService from "./service/payment.service";
import { AbstractPaymentService } from "./service/payment.service.abstract";
import { AbstractPaymentRepository } from "./repository/payment.repository.abstract";
import { HttpModule } from "@nestjs/axios";
import { PaymentController } from "./controller/payment.controller";
import { RabbitProducerService } from "./messaging/rabbit.producer";
import { PostgresService } from "../database/postgres";

@Module({
    imports: [HttpModule],
    controllers: [PaymentController],
    providers: [{
        provide: AbstractPaymentService,
        useClass: PaymentService,
    }, {
        provide: AbstractPaymentRepository,
        useClass: PaymentRepository,
    }, RabbitProducerService, PostgresService],
    exports: [AbstractPaymentService, AbstractPaymentRepository],
})
export default class PaymentModule {}