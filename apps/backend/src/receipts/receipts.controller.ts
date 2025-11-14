import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ReceiptsService } from './receipts.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('receipts')
@Controller('receipts')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class ReceiptsController {
  constructor(private readonly receiptsService: ReceiptsService) {}

  @Get(':orderId')
  @ApiOperation({ summary: 'Get receipt for an order' })
  @ApiResponse({ status: 200, description: 'Receipt generated' })
  async getReceipt(@Param('orderId', ParseUUIDPipe) orderId: string) {
    const receipt = await this.receiptsService.generateReceipt(orderId);
    return { receipt, orderId };
  }

  @Get(':orderId/print')
  @ApiOperation({ summary: 'Get receipt in ESC/POS format for printing' })
  @ApiResponse({ status: 200, description: 'Receipt in ESC/POS format' })
  async getReceiptForPrint(@Param('orderId', ParseUUIDPipe) orderId: string) {
    return this.receiptsService.getReceiptForPrint(orderId);
  }

  @Post(':orderId/email')
  @ApiOperation({ summary: 'Send receipt via email' })
  @ApiResponse({ status: 200, description: 'Receipt sent' })
  async sendEmailReceipt(
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Body('email') email: string,
  ) {
    const success = await this.receiptsService.sendEmailReceipt(orderId, email);
    return { success, message: success ? 'Receipt sent successfully' : 'Failed to send receipt' };
  }
}
