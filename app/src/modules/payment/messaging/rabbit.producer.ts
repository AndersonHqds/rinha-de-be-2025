import { Injectable } from "@nestjs/common";
import { ClientProxy, ClientProxyFactory, Transport } from "@nestjs/microservices";
import { MessagingService } from "src/commons/messaging/messaging.abstract";

@Injectable()
export class RabbitProducerService implements MessagingService {
  private client: ClientProxy;

  constructor() {
    this.client = ClientProxyFactory.create({
      transport: Transport.RMQ,
      options: {
        urls: [process.env.RABBITMQ_URL],
        queue: 'create_payment',
        queueOptions: { durable: true },
      },
    });
  }

  async emitEvent(data: any) {
    await this.client.emit('create_payment', data);
  }
}