import {
  Controller,
  Post,
  Param,
  Body,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('payments')
@Controller('orders/:orderId/payments')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('initiate')
  @ApiOperation({ summary: 'Initiate payment for an order' })
  @ApiResponse({ status: 201, description: 'Payment initiated' })
  async initiate(
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Body() dto: InitiatePaymentDto,
  ) {
    return this.paymentsService.initiatePayment(orderId, dto);
  }

  @Post('capture')
  @ApiOperation({ summary: 'Capture a pending payment' })
  @ApiResponse({ status: 200, description: 'Payment captured' })
  async capture(@Body('paymentId') paymentId: string) {
    return this.paymentsService.capture(paymentId);
  }

  @Post('refund')
  @ApiOperation({ summary: 'Refund a completed payment' })
  @ApiResponse({ status: 200, description: 'Payment refunded' })
  async refund(
    @Body('paymentId') paymentId: string,
    @Body('amountCents') amountCents?: number,
  ) {
    return this.paymentsService.refund(paymentId, amountCents);
  }
}
