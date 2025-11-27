import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { WebhooksController } from './webhooks.controller';
import { OrdersModule } from '../orders/orders.module';
import { PaymentsRepository } from './payments.repository';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [OrdersModule, UsersModule],
  controllers: [PaymentsController, WebhooksController],
  providers: [PaymentsService, PaymentsRepository],
  exports: [PaymentsService, PaymentsRepository],
})
export class PaymentsModule {}
