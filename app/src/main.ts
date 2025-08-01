import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [process.env.RABBITMQ_URL],
      queue: 'create_payment',
      queueOptions: {
        durable: true,
      },
      noAck: false,
      prefetchCount: 1,
    },
  });
  app.startAllMicroservices();
  process.on('uncaughtException', (err) => {
    console.error('Uncaught exception', err);
  });
  process.on('unhandledRejection', (reason) => {
    console.error('Unhandled rejection', reason);
  });
  await app.listen(3000);
}
bootstrap();
