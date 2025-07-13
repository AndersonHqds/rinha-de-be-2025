import { Injectable } from "@nestjs/common";
import { ClientProxy, ClientProxyFactory, Transport } from "@nestjs/microservices";

@Injectable()
export class RabbitProducerService {
  private client: ClientProxy;

  constructor() {
    this.client = ClientProxyFactory.create({
      transport: Transport.RMQ,
      options: {
        urls: [process.env.RABBITMQ_URL],
        queue: 'payments',
        queueOptions: { durable: false },
      },
    });
  }

  async emitEvent(data: any) {
    await this.client.emit('create_payment', data);
  }
}