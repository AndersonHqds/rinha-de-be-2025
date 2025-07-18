import { Module } from "@nestjs/common";
import PaymentRepository from "./repository/payment.repository";
import PaymentService from "./service/payment.service";
import { AbstractPaymentService } from "./service/payment.service.abstract";
import { AbstractPaymentRepository } from "./repository/payment.repository.abstract";
import { HttpModule } from "@nestjs/axios";
import { PaymentController } from "./controller/http/payment.controller";
import { RabbitProducerService } from "./messaging/rabbit.producer";
import { DatabaseModule } from "../database/database.module";
import { PaymentMessageConsumer } from "./controller/messaging/payment-messaging.controller";
import { MessagingService } from "../../commons/messaging/messaging.abstract";

@Module({
    imports: [HttpModule, DatabaseModule],
    controllers: [PaymentController, PaymentMessageConsumer],
    providers: [{
        provide: AbstractPaymentService,
        useClass: PaymentService,
    }, {
        provide: AbstractPaymentRepository,
        useClass: PaymentRepository,
    }, {
        provide: MessagingService,
        useClass: RabbitProducerService,
    }],
    exports: [AbstractPaymentService, AbstractPaymentRepository, MessagingService],
})
export default class PaymentModule {}