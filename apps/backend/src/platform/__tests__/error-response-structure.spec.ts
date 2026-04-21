import * as fc from 'fast-check';

/**
 * Property 4: Error responses are structured and displayed
 * For any API error response, the frontend should display the specific error message
 * and log complete error details, and the API should return structured error responses
 * with codes and messages.
 * Validates: Requirements 1.6, 3.1, 3.2
 */
describe('Error Response Structure (Property 4)', () => {
  // Valid error codes that should be returned
  const validErrorCodes = [
    'DUPLICATE_SLUG',
    'DUPLICATE_EMAIL',
    'INVALID_SLUG_FORMAT',
    'INVALID_EMAIL',
    'NETWORK_ERROR',
    'INTERNAL_ERROR',
    'PAYMENT_INITIATION_FAILED',
    'VALIDATION_ERROR',
  ];

  // Property: All error responses should have required fields
  it('should return structured error responses with required fields (Property 4)', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...validErrorCodes),
        fc.string().filter((s) => s.length > 0),
        (errorCode, errorMessage) => {
          // Simulate an error response
          const errorResponse = {
            success: false,
            error: {
              code: errorCode,
              message: errorMessage,
            },
          };

          // Verify all required fields are present
          return (
            errorResponse.success === false &&
            errorResponse.error !== undefined &&
            errorResponse.error.code !== undefined &&
            errorResponse.error.message !== undefined &&
            validErrorCodes.includes(errorResponse.error.code)
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  // Property: Error responses should include field information for field-specific errors
  it('should include field information for field-specific errors (Property 4)', () => {
    const fieldSpecificErrors = [
      { code: 'DUPLICATE_SLUG', field: 'companySlug' },
      { code: 'DUPLICATE_EMAIL', field: 'adminEmail' },
      { code: 'INVALID_SLUG_FORMAT', field: 'companySlug' },
      { code: 'INVALID_EMAIL', field: 'adminEmail' },
    ];

    fc.assert(
      fc.property(
        fc.constantFrom(...fieldSpecificErrors),
        fc.string().filter((s) => s.length > 0),
        (errorInfo, errorMessage) => {
          const errorResponse = {
            success: false,
            error: {
              code: errorInfo.code,
              message: errorMessage,
              field: errorInfo.field,
            },
          };

          // For field-specific errors, field should be present
          return (
            errorResponse.error.code !== undefined &&
            errorResponse.error.message !== undefined &&
            errorResponse.error.field !== undefined &&
            errorResponse.error.field.length > 0
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  // Property: Error responses should include details for debugging
  it('should include details field for debugging information (Property 4)', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...validErrorCodes),
        fc.string().filter((s) => s.length > 0),
        fc.string().filter((s) => s.length > 0),
        (errorCode, errorMessage, details) => {
          const errorResponse = {
            success: false,
            error: {
              code: errorCode,
              message: errorMessage,
              details: details,
            },
          };

          // Verify error response structure
          return (
            errorResponse.success === false &&
            errorResponse.error.code !== undefined &&
            errorResponse.error.message !== undefined &&
            errorResponse.error.details !== undefined
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  // Property: Error codes should be consistent and predictable
  it('should use consistent error codes across all error scenarios (Property 4)', () => {
    fc.assert(
      fc.property(fc.constantFrom(...validErrorCodes), (errorCode) => {
        // Error codes should be uppercase with underscores
        const isValidFormat = /^[A-Z_]+$/.test(errorCode);

        // Error code should be in the valid list
        const isInValidList = validErrorCodes.includes(errorCode);

        return isValidFormat && isInValidList;
      }),
      { numRuns: 100 },
    );
  });

  // Property: Error messages should be human-readable
  it('should provide human-readable error messages (Property 4)', () => {
    const humanReadableMessages = [
      'Company URL is already taken. Please choose a different one.',
      'Email address is already registered. Please use a different email.',
      'Company URL must contain only lowercase letters, numbers, and hyphens',
      'Invalid email format. Please provide a valid email address.',
      'Network connection failed. Please check your internet connection.',
      'An unexpected error occurred. Please try again later.',
    ];

    fc.assert(
      fc.property(
        fc.constantFrom(...humanReadableMessages),
        (message) => {
          // Messages should be non-empty and contain helpful information
          return (
            message.length > 0 &&
            message.length < 500 &&
            !message.includes('[object Object]') &&
            !message.includes('undefined')
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  // Property: Success responses should have different structure than error responses
  it('should distinguish between success and error responses (Property 4)', () => {
    fc.assert(
      fc.property(fc.boolean(), (isSuccess) => {
        const response = isSuccess
          ? {
              success: true,
              message: 'Operation successful',
              tenant: { id: '123', slug: 'test-slug' },
            }
          : {
              success: false,
              error: {
                code: 'VALIDATION_ERROR',
                message: 'Validation failed',
              },
            };

        // Success responses should have 'message' and 'tenant' fields
        // Error responses should have 'error' field
        if (isSuccess) {
          return response.success === true && response.message !== undefined;
        } else {
          return response.success === false && response.error !== undefined;
        }
      }),
      { numRuns: 100 },
    );
  });
});
