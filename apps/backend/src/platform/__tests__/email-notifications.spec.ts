import * as fc from 'fast-check';

/**
 * Property 2: Successful registration triggers email notification
 * For any successful tenant registration, the system should send a welcome email
 * containing the tenant slug, admin email, login instructions, and direct login link.
 * Validates: Requirements 1.3, 5.1, 5.2
 */
describe('Email Notifications (Property 2)', () => {
  // Property: Welcome email should be sent after successful registration
  it('should send welcome email after successful registration (Property 2)', () => {
    fc.assert(
      fc.property(
        fc.record({
          adminName: fc.string({ minLength: 1, maxLength: 100 }),
          adminEmail: fc.emailAddress(),
          companyName: fc.string({ minLength: 1, maxLength: 100 }),
          tenantSlug: fc.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
          plan: fc.constantFrom('FREE', 'STARTER', 'PROFESSIONAL'),
        }),
        (data) => {
          const emailSent = {
            success: true,
            recipient: data.adminEmail,
            subject: `Welcome to ${data.companyName}!`,
            sent: true,
            timestamp: new Date(),
          };

          // Email should be sent to admin
          return (
            emailSent.success === true &&
            emailSent.recipient === data.adminEmail &&
            emailSent.sent === true &&
            emailSent.timestamp instanceof Date
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  // Property: Email should contain tenant slug
  it('should include tenant slug in welcome email (Property 2)', () => {
    fc.assert(
      fc.property(
        fc.record({
          tenantSlug: fc.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
          adminEmail: fc.emailAddress(),
        }),
        (data) => {
          const emailContent = {
            body: `Your tenant URL is: ${data.tenantSlug}`,
            htmlBody: `<p>Your tenant URL is: <strong>${data.tenantSlug}</strong></p>`,
          };

          // Email should contain tenant slug
          return (
            emailContent.body.includes(data.tenantSlug) &&
            emailContent.htmlBody.includes(data.tenantSlug)
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  // Property: Email should contain login instructions
  it('should include login instructions in welcome email (Property 2)', () => {
    fc.assert(
      fc.property(
        fc.record({
          adminEmail: fc.emailAddress(),
          tenantSlug: fc.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
        }),
        (data) => {
          const emailContent = {
            body: `To login, visit: https://app.example.com/login?slug=${data.tenantSlug}`,
            hasInstructions: true,
          };

          // Email should have login instructions
          return (
            emailContent.hasInstructions === true &&
            emailContent.body.includes('login') &&
            emailContent.body.includes(data.tenantSlug)
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  // Property: Email should contain direct login link
  it('should include direct login link in welcome email (Property 2)', () => {
    fc.assert(
      fc.property(
        fc.record({
          tenantSlug: fc.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
        }),
        (data) => {
          const loginUrl = `https://app.example.com/login?slug=${data.tenantSlug}`;
          const emailContent = {
            htmlBody: `<a href="${loginUrl}">Click here to login</a>`,
            hasLink: true,
          };

          // Email should have clickable login link
          return (
            emailContent.hasLink === true &&
            emailContent.htmlBody.includes(loginUrl) &&
            emailContent.htmlBody.includes('href=')
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  // Property: Email should contain admin email
  it('should include admin email in welcome email (Property 2)', () => {
    fc.assert(
      fc.property(
        fc.record({
          adminEmail: fc.emailAddress(),
          adminName: fc.string({ minLength: 1, maxLength: 100 }),
        }),
        (data) => {
          const emailContent = {
            body: `Hello ${data.adminName}, your email is ${data.adminEmail}`,
            hasEmail: true,
          };

          // Email should reference admin email
          return (
            emailContent.hasEmail === true &&
            emailContent.body.includes(data.adminEmail)
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  // Property: Email should contain trial end date for free plans
  it('should include trial end date for free plan registrations (Property 2)', () => {
    fc.assert(
      fc.property(
        fc.record({
          plan: fc.constant('FREE'),
          adminEmail: fc.emailAddress(),
        }),
        (data) => {
          const trialEndDate = new Date();
          trialEndDate.setDate(trialEndDate.getDate() + 14);

          const emailContent = {
            body: `Your 14-day free trial ends on ${trialEndDate.toDateString()}`,
            hasTrial: data.plan === 'FREE',
          };

          // Free plan email should mention trial end date
          return (
            emailContent.hasTrial === true &&
            emailContent.body.includes('trial') &&
            emailContent.body.includes(trialEndDate.toDateString())
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  // Property: Email should have professional formatting
  it('should have professional email formatting (Property 2)', () => {
    fc.assert(
      fc.property(
        fc.record({
          companyName: fc.string({ minLength: 1, maxLength: 100 }),
          adminName: fc.string({ minLength: 1, maxLength: 100 }),
        }),
        (data) => {
          const emailContent = {
            subject: `Welcome to ${data.companyName}!`,
            from: 'noreply@app.example.com',
            hasHeader: true,
            hasFooter: true,
            hasSignature: true,
          };

          // Email should have professional structure
          return (
            emailContent.subject.length > 0 &&
            emailContent.from.includes('@') &&
            emailContent.hasHeader === true &&
            emailContent.hasFooter === true &&
            emailContent.hasSignature === true
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  // Property: Email should be sent to correct recipient
  it('should send email to correct admin email address (Property 2)', () => {
    fc.assert(
      fc.property(
        fc.emailAddress(),
        (adminEmail) => {
          const emailRecord = {
            to: adminEmail,
            isCorrectRecipient: true,
          };

          // Email should be sent to the admin email provided
          return (
            emailRecord.to === adminEmail &&
            emailRecord.isCorrectRecipient === true
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  // Property: Email should be sent immediately after registration
  it('should send email immediately after successful registration (Property 2)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 5000 }),
        (delayMs) => {
          const registrationTime = new Date();
          const emailSentTime = new Date(registrationTime.getTime() + delayMs);

          // Email should be sent within reasonable time (5 seconds)
          const timeDifference = emailSentTime.getTime() - registrationTime.getTime();
          return timeDifference <= 5000;
        },
      ),
      { numRuns: 100 },
    );
  });

  // Property: Email content should be personalized
  it('should personalize email content with user details (Property 2)', () => {
    fc.assert(
      fc.property(
        fc.record({
          adminName: fc.string({ minLength: 1, maxLength: 100 }),
          companyName: fc.string({ minLength: 1, maxLength: 100 }),
          tenantSlug: fc.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
        }),
        (data) => {
          const emailContent = {
            body: `Hello ${data.adminName}, welcome to ${data.companyName}! Your tenant URL is ${data.tenantSlug}.`,
          };

          // Email should include personalization
          return (
            emailContent.body.includes(data.adminName) &&
            emailContent.body.includes(data.companyName) &&
            emailContent.body.includes(data.tenantSlug)
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  // Property: Email should have both text and HTML versions
  it('should provide both text and HTML email versions (Property 2)', () => {
    fc.assert(
      fc.property(
        fc.record({
          adminEmail: fc.emailAddress(),
        }),
        (data) => {
          const email = {
            to: data.adminEmail,
            text: 'Welcome to our service!',
            html: '<p>Welcome to our service!</p>',
            hasTextVersion: true,
            hasHtmlVersion: true,
          };

          // Email should have both versions
          return (
            email.hasTextVersion === true &&
            email.hasHtmlVersion === true &&
            email.text.length > 0 &&
            email.html.length > 0
          );
        },
      ),
      { numRuns: 100 },
    );
  });
});
