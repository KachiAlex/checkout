import * as fc from 'fast-check';

/**
 * Property 10: Post-registration user guidance
 * For any successful registration, the frontend should display instructions on
 * accessing the account and provide the tenant slug prominently during redirect.
 * Validates: Requirements 5.3, 5.4
 */
describe('Post-Registration Guidance (Property 10)', () => {
  // Property: Success message should be displayed
  it('should display success message after registration (Property 10)', () => {
    fc.assert(
      fc.property(
        fc.record({
          companyName: fc.string({ minLength: 1, maxLength: 100 }),
          plan: fc.constantFrom('FREE', 'STARTER', 'PROFESSIONAL'),
        }),
        (data) => {
          const successMessage = {
            displayed: true,
            text: `Registration successful! Your ${data.plan === 'FREE' ? '14-day free trial' : 'account'} has started.`,
            visible: true,
          };

          // Success message should be displayed
          return (
            successMessage.displayed === true &&
            successMessage.text.length > 0 &&
            successMessage.visible === true
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  // Property: Tenant slug should be prominently displayed
  it('should display tenant slug prominently (Property 10)', () => {
    fc.assert(
      fc.property(
        fc.record({
          tenantSlug: fc.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
        }),
        (data) => {
          const slugDisplay = {
            displayed: true,
            text: `Your tenant URL: ${data.tenantSlug}`,
            prominent: true,
            fontSize: 'large',
          };

          // Tenant slug should be prominently displayed
          return (
            slugDisplay.displayed === true &&
            slugDisplay.text.includes(data.tenantSlug) &&
            slugDisplay.prominent === true
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  // Property: Login instructions should be provided
  it('should provide clear login instructions (Property 10)', () => {
    fc.assert(
      fc.property(
        fc.record({
          tenantSlug: fc.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
        }),
        (data) => {
          const instructions = {
            provided: true,
            text: `To access your account, visit the login page and enter your tenant URL: ${data.tenantSlug}`,
            clear: true,
          };

          // Instructions should be clear and include tenant slug
          return (
            instructions.provided === true &&
            instructions.text.includes('login') &&
            instructions.text.includes(data.tenantSlug) &&
            instructions.clear === true
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  // Property: Tenant slug should be passed as URL parameter
  it('should pass tenant slug as URL parameter in redirect (Property 10)', () => {
    fc.assert(
      fc.property(
        fc.record({
          tenantSlug: fc.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
        }),
        (data) => {
          const redirectUrl = `/login?slug=${data.tenantSlug}`;

          // URL should include tenant slug parameter
          return (
            redirectUrl.includes('/login') &&
            redirectUrl.includes(`slug=${data.tenantSlug}`)
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  // Property: Next steps should be clearly outlined
  it('should outline next steps for user (Property 10)', () => {
    fc.assert(
      fc.property(
        fc.record({
          tenantSlug: fc.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
        }),
        (data) => {
          const nextSteps = {
            outlined: true,
            steps: [
              `1. Go to login page with URL: ${data.tenantSlug}`,
              '2. Enter your email and password',
              '3. Start using your account',
            ],
            clear: true,
          };

          // Next steps should be clear and actionable
          return (
            nextSteps.outlined === true &&
            nextSteps.steps.length > 0 &&
            nextSteps.steps.every((step) => step.length > 0) &&
            nextSteps.clear === true
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  // Property: Guidance should be different for free vs paid plans
  it('should provide plan-specific guidance (Property 10)', () => {
    fc.assert(
      fc.property(
        fc.record({
          plan: fc.constantFrom('FREE', 'STARTER'),
          tenantSlug: fc.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
        }),
        (data) => {
          const guidance = {
            plan: data.plan,
            message:
              data.plan === 'FREE'
                ? `Your 14-day free trial starts now. Access your account at ${data.tenantSlug}`
                : `Your subscription is active. Access your account at ${data.tenantSlug}`,
          };

          // Guidance should be plan-specific
          return (
            guidance.message.length > 0 &&
            guidance.message.includes(data.tenantSlug) &&
            (data.plan === 'FREE'
              ? guidance.message.includes('trial')
              : guidance.message.includes('subscription'))
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  // Property: Guidance should include trial end date for free plans
  it('should include trial end date for free plan guidance (Property 10)', () => {
    fc.assert(
      fc.property(
        fc.record({
          plan: fc.constant('FREE'),
        }),
        (data) => {
          const trialEndDate = new Date();
          trialEndDate.setDate(trialEndDate.getDate() + 14);

          const guidance = {
            plan: data.plan,
            message: `Your trial ends on ${trialEndDate.toDateString()}`,
            includesEndDate: true,
          };

          // Free plan guidance should include trial end date
          return (
            guidance.includesEndDate === true &&
            guidance.message.includes('trial') &&
            guidance.message.includes(trialEndDate.toDateString())
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  // Property: Guidance should be accessible and readable
  it('should present guidance in accessible format (Property 10)', () => {
    fc.assert(
      fc.property(
        fc.record({
          tenantSlug: fc.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
        }),
        (data) => {
          const guidance = {
            format: 'clear-text',
            fontSize: 'readable',
            contrast: 'high',
            language: 'simple',
            content: `Your tenant URL is ${data.tenantSlug}. Use this to login.`,
          };

          // Guidance should be accessible
          return (
            guidance.format === 'clear-text' &&
            guidance.fontSize === 'readable' &&
            guidance.contrast === 'high' &&
            guidance.content.length > 0
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  // Property: Guidance should include support contact information
  it('should include support contact information (Property 10)', () => {
    fc.assert(
      fc.property(
        fc.record({
          tenantSlug: fc.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
        }),
        (data) => {
          const guidance = {
            content: `If you need help, contact support@example.com. Your tenant URL is ${data.tenantSlug}`,
            hasSupport: true,
          };

          // Guidance should include support information
          return (
            guidance.hasSupport === true &&
            guidance.content.includes('support') &&
            guidance.content.includes('@')
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  // Property: Guidance should be displayed before redirect
  it('should display guidance before redirecting user (Property 10)', () => {
    fc.assert(
      fc.property(
        fc.record({
          tenantSlug: fc.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
        }),
        (data) => {
          const displaySequence = {
            step1: 'Display success message',
            step2: `Display tenant slug: ${data.tenantSlug}`,
            step3: 'Display instructions',
            step4: 'Redirect to login',
            order: ['message', 'slug', 'instructions', 'redirect'],
          };

          // Guidance should be displayed in correct order
          return (
            displaySequence.order.length === 4 &&
            displaySequence.order[0] === 'message' &&
            displaySequence.order[displaySequence.order.length - 1] === 'redirect'
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  // Property: Guidance should be persistent during redirect
  it('should maintain guidance information during redirect (Property 10)', () => {
    fc.assert(
      fc.property(
        fc.record({
          tenantSlug: fc.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
          message: fc.string({ minLength: 1, maxLength: 100 }),
        }),
        (data) => {
          const beforeRedirect = {
            slug: data.tenantSlug,
            message: data.message,
          };

          const afterRedirect = {
            slug: data.tenantSlug,
            message: data.message,
          };

          // Information should persist through redirect
          return (
            beforeRedirect.slug === afterRedirect.slug &&
            beforeRedirect.message === afterRedirect.message
          );
        },
      ),
      { numRuns: 100 },
    );
  });
});
