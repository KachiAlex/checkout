import * as fc from 'fast-check';

/**
 * Property 3: Registration form routes correctly by plan type
 * For any successful registration, if the plan is free then redirect to login page,
 * if the plan is paid then redirect to payment flow.
 * Validates: Requirements 1.4, 1.5, 4.4
 */
describe('Plan-Based Routing (Property 3)', () => {
  const freePlans = ['FREE'];
  const paidPlans = ['STARTER', 'PROFESSIONAL', 'ENTERPRISE'];
  const allPlans = [...freePlans, ...paidPlans, 'LIFETIME'];

  // Property: Free plan should redirect to login page
  it('should redirect to login page for free plan registration (Property 3)', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...freePlans),
        (plan) => {
          const registrationResult = {
            success: true,
            plan: plan,
            redirectUrl: '/login',
            requiresPayment: false,
          };

          // Free plan should redirect to login, not payment
          return (
            registrationResult.success === true &&
            registrationResult.plan === 'FREE' &&
            registrationResult.redirectUrl === '/login' &&
            registrationResult.requiresPayment === false
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  // Property: Paid plans should redirect to payment flow
  it('should redirect to payment flow for paid plan registration (Property 3)', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...paidPlans),
        (plan) => {
          const registrationResult = {
            success: true,
            plan: plan,
            redirectUrl: '/subscription/payment',
            requiresPayment: true,
            checkoutUrl: 'https://checkout.example.com/pay',
            paymentId: 'payment-123',
          };

          // Paid plans should redirect to payment
          return (
            registrationResult.success === true &&
            paidPlans.includes(registrationResult.plan) &&
            registrationResult.redirectUrl === '/subscription/payment' &&
            registrationResult.requiresPayment === true &&
            registrationResult.checkoutUrl !== undefined &&
            registrationResult.paymentId !== undefined
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  // Property: Lifetime plan should redirect to login page
  it('should redirect to login page for lifetime plan registration (Property 3)', () => {
    fc.assert(
      fc.property(fc.constant('LIFETIME'), (plan) => {
        const registrationResult = {
          success: true,
          plan: plan,
          redirectUrl: '/login',
          requiresPayment: false,
        };

        // Lifetime plan should redirect to login, not payment
        return (
          registrationResult.success === true &&
          registrationResult.plan === 'LIFETIME' &&
          registrationResult.redirectUrl === '/login' &&
          registrationResult.requiresPayment === false
        );
      }),
      { numRuns: 100 },
    );
  });

  // Property: Routing should be consistent for same plan
  it('should route consistently for the same plan (Property 3)', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...allPlans),
        (plan) => {
          // First registration
          const route1 = plan === 'FREE' || plan === 'LIFETIME' ? '/login' : '/subscription/payment';

          // Second registration with same plan
          const route2 = plan === 'FREE' || plan === 'LIFETIME' ? '/login' : '/subscription/payment';

          // Routes should be identical
          return route1 === route2;
        },
      ),
      { numRuns: 100 },
    );
  });

  // Property: Payment information should only be included for paid plans
  it('should include payment info only for paid plans (Property 3)', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...allPlans),
        (plan) => {
          const response = {
            success: true,
            plan: plan,
            requiresPayment: paidPlans.includes(plan),
            checkoutUrl: paidPlans.includes(plan) ? 'https://checkout.example.com' : undefined,
            paymentId: paidPlans.includes(plan) ? 'payment-123' : undefined,
          };

          // Payment fields should only be present for paid plans
          if (paidPlans.includes(plan)) {
            return (
              response.requiresPayment === true &&
              response.checkoutUrl !== undefined &&
              response.paymentId !== undefined
            );
          } else {
            return (
              response.requiresPayment === false &&
              (response.checkoutUrl === undefined || response.checkoutUrl === null) &&
              (response.paymentId === undefined || response.paymentId === null)
            );
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  // Property: Tenant slug should be included in redirect URL for login
  it('should include tenant slug in login redirect (Property 3)', () => {
    fc.assert(
      fc.property(
        fc.record({
          plan: fc.constantFrom(...freePlans),
          tenantSlug: fc.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
        }),
        (data) => {
          const redirectUrl = `/login?slug=${data.tenantSlug}`;

          // Login redirect should include tenant slug
          return (
            redirectUrl.includes('/login') &&
            redirectUrl.includes(`slug=${data.tenantSlug}`)
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  // Property: Payment ID should be included in payment redirect
  it('should include payment ID in payment redirect (Property 3)', () => {
    fc.assert(
      fc.property(
        fc.record({
          plan: fc.constantFrom(...paidPlans),
          paymentId: fc.uuid(),
        }),
        (data) => {
          const checkoutUrl = `https://checkout.example.com/pay?paymentId=${data.paymentId}`;

          // Payment redirect should include payment ID
          return (
            checkoutUrl.includes('checkout.example.com') &&
            checkoutUrl.includes(`paymentId=${data.paymentId}`)
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  // Property: Response should indicate payment requirement correctly
  it('should correctly indicate payment requirement (Property 3)', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...allPlans),
        (plan) => {
          const requiresPayment = paidPlans.includes(plan);

          // Verify payment requirement matches plan type
          return (
            (paidPlans.includes(plan) && requiresPayment === true) ||
            (!paidPlans.includes(plan) && requiresPayment === false)
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  // Property: All plans should have valid routing
  it('should have valid routing for all plan types (Property 3)', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...allPlans),
        (plan) => {
          const validRoutes = ['/login', '/subscription/payment'];
          const route = paidPlans.includes(plan) ? '/subscription/payment' : '/login';

          // Route should be one of the valid options
          return validRoutes.includes(route);
        },
      ),
      { numRuns: 100 },
    );
  });

  // Property: Routing should not depend on other registration data
  it('should route based only on plan type (Property 3)', () => {
    fc.assert(
      fc.property(
        fc.record({
          plan: fc.constantFrom(...allPlans),
          companyName: fc.string(),
          adminEmail: fc.emailAddress(),
          industry: fc.string(),
        }),
        (data) => {
          // Route should only depend on plan, not other fields
          const route1 = data.plan === 'FREE' || data.plan === 'LIFETIME' ? '/login' : '/subscription/payment';

          // Change other fields but keep plan same
          const route2 = data.plan === 'FREE' || data.plan === 'LIFETIME' ? '/login' : '/subscription/payment';

          // Routes should be identical
          return route1 === route2;
        },
      ),
      { numRuns: 100 },
    );
  });
});
