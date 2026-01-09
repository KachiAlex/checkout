import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags, ApiResponse } from '@nestjs/swagger';
import { Request } from 'express';
import { DemoRequestDto } from './dto/demo-request.dto';
import { ContactService } from './contact.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SupportRequestDto } from './dto/support-request.dto';

@ApiTags('contact')
@Controller('contact')
// Note: This controller is intentionally public (no auth required)
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Post('demo-request')
  @ApiOperation({ summary: 'Submit a demo request (public endpoint)' })
  @ApiResponse({ status: 201, description: 'Demo request submitted successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  async submitDemoRequest(@Body() dto: DemoRequestDto) {
    return this.contactService.handleDemoRequest(dto);
  }

  @Post('support-request')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Submit a support request (authenticated)' })
  @ApiResponse({ status: 201, description: 'Support request submitted successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  async submitSupportRequest(@Req() req: Request & { user?: any }, @Body() dto: SupportRequestDto) {
    const user = req.user ?? {};
    return this.contactService.handleSupportRequest(dto, {
      tenantId: user.tenantId,
      actorId: user.sub,
      actorRole: user.role,
      locationId: user.locationId,
      deviceId: user.deviceId,
    });
  }
}
