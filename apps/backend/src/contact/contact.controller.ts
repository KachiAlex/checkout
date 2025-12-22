import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags, ApiResponse } from '@nestjs/swagger';
import { DemoRequestDto } from './dto/demo-request.dto';
import { ContactService } from './contact.service';

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
}
