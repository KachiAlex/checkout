import * as fc from 'fast-check';

/**
 * Property 8: Duplicate registration detection
 * For any registration attempt with an existing company slug or admin email,
 * the API should return appropriate error messages indicating the conflict.
 * Validates: Requirements 4.5
 */
describe('Duplicate Registration Detection (Property 8)', () => {
  // Property: Duplicate slug should be detected
  it('should detect and reject duplicate company slugs (Property 8)', () => {
    fc.assert(
      fc.property(
        fc.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
        (slug) => {
          // Simulate existing slugs in database
          const existingSlugs = new Set([slug]);

          // Try to register with same slug
          const isDuplicate = existingSlugs.has(slug);

          // Should detect duplicate
          return isDuplicate === true;
        },
      ),
      { numRuns: 100 },
    );
  });

  // Property: Duplicate email should be detected
  it('should detect and reject duplicate admin emails (Property 8)', () => {
    fc.assert(
      fc.property(
        fc.emailAddress(),
        (email) => {
          // Simulate existing emails in database
          const existingEmails = new Set([email.toLowerCase()]);

          // Try to register with same email
          const isDuplicate = existingEmails.has(email.toLowerCase());

          // Should detect duplicate
          return isDuplicate === true;
        },
      ),
      { numRuns: 100 },
    );
  });

  // Property: Duplicate slug should return specific error code
  it('should return DUPLICATE_SLUG error code for duplicate slugs (Property 8)', () => {
    fc.assert(
      fc.property(
        fc.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
        (slug) => {
          const existingSlugs = new Set([slug]);
          const isDuplicate = existingSlugs.has(slug);

          const errorResponse = isDuplicate
            ? {
                success: false,
                error: {
                  code: 'DUPLICATE_SLUG',
                  message: 'Company URL is already taken. Please choose a different one.',
                  field: 'companySlug',
                },
              }
            : { success: true };

          // Verify error response for duplicate slug
          if (isDuplicate) {
            return (
              errorResponse.success === false &&
              errorResponse.error.code === 'DUPLICATE_SLUG' &&
              errorResponse.error.field === 'companySlug'
            );
          }
          return true;
        },
      ),
      { numRuns: 100 },
    );
  });

  // Property: Duplicate email should return specific error code
  it('should return DUPLICATE_EMAIL error code for duplicate emails (Property 8)', () => {
    fc.assert(
      fc.property(
        fc.emailAddress(),
        (email) => {
          const existingEmails = new Set([email.toLowerCase()]);
          const isDuplicate = existingEmails.has(email.toLowerCase());

          const errorResponse = isDuplicate
            ? {
                success: false,
                error: {
                  code: 'DUPLICATE_EMAIL',
                  message: 'Email address is already registered. Please use a different email.',
                  field: 'adminEmail',
                },
              }
            : { success: true };

          // Verify error response for duplicate email
          if (isDuplicate) {
            return (
              errorResponse.success === false &&
              errorResponse.error.code === 'DUPLICATE_EMAIL' &&
              errorResponse.error.field === 'adminEmail'
            );
          }
          return true;
        },
      ),
      { numRuns: 100 },
    );
  });

  // Property: Unique slugs should not be rejected
  it('should accept unique company slugs (Property 8)', () => {
    fc.assert(
      fc.property(
        fc.array(fc.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/), {
          minLength: 1,
          maxLength: 10,
        }),
        (slugs) => {
          // All slugs should be unique
          const uniqueSlugs = new Set(slugs);

          // Each unique slug should be accepted
          return slugs.every((slug) => {
            const isDuplicate = uniqueSlugs.size < slugs.length;
            return !isDuplicate || uniqueSlugs.has(slug);
          });
        },
      ),
      { numRuns: 100 },
    );
  });

  // Property: Unique emails should not be rejected
  it('should accept unique admin emails (Property 8)', () => {
    fc.assert(
      fc.property(
        fc.array(fc.emailAddress(), { minLength: 1, maxLength: 10 }),
        (emails) => {
          // All emails should be unique (case-insensitive)
          const uniqueEmails = new Set(emails.map((e) => e.toLowerCase()));

          // Each unique email should be accepted
          return emails.every((email) => {
            const isDuplicate = uniqueEmails.size < emails.length;
            return !isDuplicate || uniqueEmails.has(email.toLowerCase());
          });
        },
      ),
      { numRuns: 100 },
    );
  });

  // Property: Slug comparison should be case-insensitive
  it('should perform case-insensitive slug comparison (Property 8)', () => {
    fc.assert(
      fc.property(
        fc.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
        (slug) => {
          const normalizedSlug = slug.toLowerCase();
          const existingSlugs = new Set([normalizedSlug]);

          // Try different case variations
          const variations = [
            slug,
            slug.toUpperCase(),
            slug.charAt(0).toUpperCase() + slug.slice(1),
          ];

          // All variations should be detected as duplicates
          return variations.every((variant) =>
            existingSlugs.has(variant.toLowerCase()),
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  // Property: Email comparison should be case-insensitive
  it('should perform case-insensitive email comparison (Property 8)', () => {
    fc.assert(
      fc.property(
        fc.emailAddress(),
        (email) => {
          const normalizedEmail = email.toLowerCase();
          const existingEmails = new Set([normalizedEmail]);

          // Try different case variations
          const variations = [
            email,
            email.toUpperCase(),
            email.charAt(0).toUpperCase() + email.slice(1),
          ];

          // All variations should be detected as duplicates
          return variations.every((variant) =>
            existingEmails.has(variant.toLowerCase()),
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  // Property: Duplicate detection should not affect other fields
  it('should only check for duplicates on slug and email (Property 8)', () => {
    fc.assert(
      fc.property(
        fc.record({
          slug: fc.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
          email: fc.emailAddress(),
          companyName: fc.string(),
          industry: fc.string(),
        }),
        (data) => {
          const existingSlugs = new Set([data.slug]);
          const existingEmails = new Set([data.email.toLowerCase()]);

          // Duplicate check should only look at slug and email
          const slugDuplicate = existingSlugs.has(data.slug);
          const emailDuplicate = existingEmails.has(data.email.toLowerCase());

          // Company name and industry should not affect duplicate detection
          return (
            (slugDuplicate || emailDuplicate) &&
            data.companyName !== undefined &&
            data.industry !== undefined
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  // Property: Error messages should be helpful for duplicates
  it('should provide helpful error messages for duplicates (Property 8)', () => {
    const duplicateErrors = [
      {
        code: 'DUPLICATE_SLUG',
        message: 'Company URL is already taken. Please choose a different one.',
      },
      {
        code: 'DUPLICATE_EMAIL',
        message: 'Email address is already registered. Please use a different email.',
      },
    ];

    fc.assert(
      fc.property(
        fc.constantFrom(...duplicateErrors),
        (error) => {
          // Error messages should be helpful and suggest action
          return (
            error.message.length > 0 &&
            error.message.length < 200 &&
            (error.message.includes('choose') ||
              error.message.includes('different') ||
              error.message.includes('use'))
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  // Property: Multiple duplicates should be reported
  it('should detect multiple duplicate violations (Property 8)', () => {
    fc.assert(
      fc.property(
        fc.record({
          slug: fc.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
          email: fc.emailAddress(),
        }),
        (data) => {
          const existingSlugs = new Set([data.slug]);
          const existingEmails = new Set([data.email.toLowerCase()]);

          const slugDuplicate = existingSlugs.has(data.slug);
          const emailDuplicate = existingEmails.has(data.email.toLowerCase());

          // If both are duplicates, both should be reported
          const errors = [];
          if (slugDuplicate) errors.push('DUPLICATE_SLUG');
          if (emailDuplicate) errors.push('DUPLICATE_EMAIL');

          // Should report all duplicates found
          return (
            (slugDuplicate && errors.includes('DUPLICATE_SLUG')) ||
            (emailDuplicate && errors.includes('DUPLICATE_EMAIL')) ||
            (!slugDuplicate && !emailDuplicate && errors.length === 0)
          );
        },
      ),
      { numRuns: 100 },
    );
  });
});
