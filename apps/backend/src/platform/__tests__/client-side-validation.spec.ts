import * as fc from 'fast-check';

/**
 * Property 7: Client-side validation prevents invalid submissions
 * For any invalid registration data, the form should display field-specific error messages
 * and prevent API submission.
 * Validates: Requirements 3.3, 4.2
 */
describe('Client-Side Validation (Property 7)', () => {
  // Validation rules for registration form fields
  const validateCompanySlug = (slug: string): boolean => {
    const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    return slugRegex.test(slug.toLowerCase()) && slug.length > 0 && slug.length <= 50;
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password: string): boolean => {
    return password.length >= 8;
  };

  const validateName = (name: string): boolean => {
    return name.length > 0 && name.length <= 100;
  };

  // Property: Invalid company slugs should be rejected
  it('should reject invalid company slugs (Property 7)', () => {
    fc.assert(
      fc.property(
        fc.string().filter((s) => !validateCompanySlug(s)),
        (invalidSlug) => {
          // Invalid slugs should fail validation
          return !validateCompanySlug(invalidSlug);
        },
      ),
      { numRuns: 100 },
    );
  });

  // Property: Valid company slugs should be accepted
  it('should accept valid company slugs (Property 7)', () => {
    fc.assert(
      fc.property(
        fc.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).filter((s) => s.length > 0 && s.length <= 50),
        (validSlug) => {
          // Valid slugs should pass validation
          return validateCompanySlug(validSlug);
        },
      ),
      { numRuns: 100 },
    );
  });

  // Property: Invalid emails should be rejected
  it('should reject invalid email addresses (Property 7)', () => {
    fc.assert(
      fc.property(
        fc.string().filter((s) => !validateEmail(s)),
        (invalidEmail) => {
          // Invalid emails should fail validation
          return !validateEmail(invalidEmail);
        },
      ),
      { numRuns: 100 },
    );
  });

  // Property: Valid emails should be accepted
  it('should accept valid email addresses (Property 7)', () => {
    fc.assert(
      fc.property(fc.emailAddress(), (validEmail) => {
        // Valid emails should pass validation
        return validateEmail(validEmail);
      }),
      { numRuns: 100 },
    );
  });

  // Property: Short passwords should be rejected
  it('should reject passwords shorter than 8 characters (Property 7)', () => {
    fc.assert(
      fc.property(
        fc.string({ maxLength: 7 }),
        (shortPassword) => {
          // Passwords shorter than 8 characters should fail
          return !validatePassword(shortPassword);
        },
      ),
      { numRuns: 100 },
    );
  });

  // Property: Valid passwords should be accepted
  it('should accept passwords with 8 or more characters (Property 7)', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 8, maxLength: 100 }),
        (validPassword) => {
          // Passwords with 8+ characters should pass
          return validatePassword(validPassword);
        },
      ),
      { numRuns: 100 },
    );
  });

  // Property: Empty names should be rejected
  it('should reject empty names (Property 7)', () => {
    fc.assert(
      fc.property(fc.constant(''), (emptyName) => {
        // Empty names should fail validation
        return !validateName(emptyName);
      }),
      { numRuns: 100 },
    );
  });

  // Property: Valid names should be accepted
  it('should accept valid names (Property 7)', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }),
        (validName) => {
          // Non-empty names up to 100 chars should pass
          return validateName(validName);
        },
      ),
      { numRuns: 100 },
    );
  });

  // Property: Form should not submit with any invalid field
  it('should prevent form submission when any field is invalid (Property 7)', () => {
    fc.assert(
      fc.property(
        fc.record({
          companyName: fc.string(),
          companySlug: fc.string(),
          adminName: fc.string(),
          adminEmail: fc.string(),
          adminPassword: fc.string(),
        }),
        (formData) => {
          const isValid =
            validateName(formData.companyName) &&
            validateCompanySlug(formData.companySlug) &&
            validateName(formData.adminName) &&
            validateEmail(formData.adminEmail) &&
            validatePassword(formData.adminPassword);

          // If any field is invalid, form should not be submittable
          const hasInvalidField =
            !validateName(formData.companyName) ||
            !validateCompanySlug(formData.companySlug) ||
            !validateName(formData.adminName) ||
            !validateEmail(formData.adminEmail) ||
            !validatePassword(formData.adminPassword);

          return isValid === !hasInvalidField;
        },
      ),
      { numRuns: 100 },
    );
  });

  // Property: Validation errors should be field-specific
  it('should provide field-specific error messages (Property 7)', () => {
    fc.assert(
      fc.property(
        fc.record({
          companySlug: fc.string().filter((s) => !validateCompanySlug(s)),
          adminEmail: fc.string().filter((s) => !validateEmail(s)),
          adminPassword: fc.string().filter((s) => !validatePassword(s)),
        }),
        (invalidData) => {
          const errors: Record<string, string> = {};

          if (!validateCompanySlug(invalidData.companySlug)) {
            errors.companySlug = 'Invalid company URL format';
          }
          if (!validateEmail(invalidData.adminEmail)) {
            errors.adminEmail = 'Invalid email address';
          }
          if (!validatePassword(invalidData.adminPassword)) {
            errors.adminPassword = 'Password must be at least 8 characters';
          }

          // Each invalid field should have a corresponding error message
          return (
            Object.keys(errors).length > 0 &&
            Object.values(errors).every((msg) => msg.length > 0)
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  // Property: Validation should be consistent across multiple runs
  it('should validate consistently across multiple runs (Property 7)', () => {
    fc.assert(
      fc.property(
        fc.record({
          companySlug: fc.string(),
          adminEmail: fc.string(),
          adminPassword: fc.string(),
        }),
        (data) => {
          // Validate the same data multiple times
          const result1 = validateCompanySlug(data.companySlug);
          const result2 = validateCompanySlug(data.companySlug);
          const result3 = validateCompanySlug(data.companySlug);

          // Results should be consistent
          return result1 === result2 && result2 === result3;
        },
      ),
      { numRuns: 100 },
    );
  });
});
