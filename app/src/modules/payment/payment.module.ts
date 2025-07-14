import { Module } from "@nestjs/common";
import PaymentRepository from "./repository/payment.repository";
import PaymentService from "./service/payment.service";
import { AbstractPaymentService } from "./service/payment.service.abstract";
import { AbstractPaymentRepository } from "./repository/payment.repository.abstract";
import { HttpModule } from "@nestjs/axios";
import { PaymentController } from "./controller/payment.controller";
import { RabbitProducerService } from "./messaging/rabbit.producer";
import { DatabaseModule } from "../database/database.module";

@Module({
    imports: [HttpModule, DatabaseModule],
    controllers: [PaymentController],
    providers: [{
        provide: AbstractPaymentService,
        useClass: PaymentService,
    }, {
        provide: AbstractPaymentRepository,
        useClass: PaymentRepository,
    }, RabbitProducerService],
    exports: [AbstractPaymentService, AbstractPaymentRepository],
})
export default class PaymentModule {}