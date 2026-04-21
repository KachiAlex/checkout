import { BadRequestException } from '@nestjs/common';

export interface RegistrationErrorOptions {
  code: string;
  message: string;
  field?: string;
  details?: string;
}

/**
 * Custom exception for registration errors with standardized structure
 */
export class RegistrationException extends BadRequestException {
  constructor(options: RegistrationErrorOptions) {
    super({
      success: false,
      error: {
        code: options.code,
        message: options.message,
        field: options.field,
        details: options.details,
      },
    });
  }
}
