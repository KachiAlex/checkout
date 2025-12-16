# Design Document

## Overview

This design addresses the critical issue where the "Start Free Trial" registration form fails to proceed beyond form submission. The solution involves diagnosing and fixing the API connectivity, improving error handling, implementing email notifications, and ensuring proper user flow after successful registration.

## Architecture

The registration flow involves three main components:

1. **Frontend Registration Form** (`RegistrationForm.tsx`) - Collects user input and handles form submission
2. **Backend Platform API** (`platform.controller.ts` and `platform.service.ts`) - Processes registration requests
3. **Email Service** - Sends welcome emails with login credentials

The current architecture shows the form making POST requests to `/api/v1/platform/register`, but the connection is failing. The design will implement comprehensive debugging, error handling, and user experience improvements.

## Components and Interfaces

### Frontend Components

#### RegistrationForm Component
- **Purpose**: Handle user registration input and form submission
- **Key Methods**:
  - `handleSubmit()` - Process form submission with enhanced error handling
  - `validateForm()` - Client-side validation before API calls
  - `handleApiError()` - Parse and display API error responses
  - `showSuccessMessage()` - Display success state and redirect logic

#### API Service Layer
- **Purpose**: Centralize API communication with proper error handling
- **Key Methods**:
  - `registerTenant()` - Make registration API calls with timeout and retry logic
  - `checkApiHealth()` - Verify API connectivity before registration attempts
  - `handleNetworkError()` - Distinguish between network and API errors

### Backend Components

#### Platform Controller
- **Current Endpoint**: `POST /platform/register`
- **Enhancements Needed**:
  - Add request logging for debugging
  - Improve error response structure
  - Add health check endpoint

#### Platform Service
- **Current Method**: `registerTenant()`
- **Enhancements Needed**:
  - Add email notification after successful registration
  - Improve error handling and logging
  - Add duplicate detection with clear error messages

#### Email Service
- **New Component**: Handle welcome email notifications
- **Key Methods**:
  - `sendWelcomeEmail()` - Send registration success email
  - `generateLoginInstructions()` - Create email content with tenant details

## Data Models

### Registration Request
```typescript
interface RegistrationRequest {
  companyName: string;
  companySlug: string;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
  plan?: TenantPlan;
  industry?: string;
}
```

### Registration Response
```typescript
interface RegistrationResponse {
  success: boolean;
  message: string;
  tenant?: {
    id: string;
    slug: string;
    name: string;
  };
  requiresPayment?: boolean;
  checkoutUrl?: string;
  error?: {
    code: string;
    field?: string;
    details?: string;
  };
}
```

### Email Template Data
```typescript
interface WelcomeEmailData {
  adminName: string;
  adminEmail: string;
  companyName: string;
  tenantSlug: string;
  loginUrl: string;
  planType: string;
  trialEndDate?: string;
}
```

## Error Handling

### Frontend Error Categories

1. **Validation Errors**
   - Client-side validation before API calls
   - Field-specific error messages
   - Form state management

2. **Network Errors**
   - Connection timeouts
   - DNS resolution failures
   - CORS issues

3. **API Errors**
   - 400 Bad Request (validation failures)
   - 409 Conflict (duplicate slug/email)
   - 500 Internal Server Error

4. **Success States**
   - Free trial registration success
   - Paid plan redirect to payment
   - Email notification confirmation

### Backend Error Responses

Standardized error response format:
```typescript
{
  success: false,
  error: {
    code: 'DUPLICATE_SLUG' | 'INVALID_EMAIL' | 'NETWORK_ERROR' | 'INTERNAL_ERROR',
    message: 'Human-readable error message',
    field?: 'companySlug' | 'adminEmail', // For field-specific errors
    details?: 'Additional technical details'
  }
}
```

## Testing Strategy

### Unit Testing
- **Frontend**: Test form validation, error handling, and success flows
- **Backend**: Test registration service methods, email service, and error scenarios
- **API**: Test endpoint responses for various input scenarios

### Property-Based Testing
Property-based tests will be implemented using **fast-check** for JavaScript/TypeScript to verify universal properties across many inputs.

Each property-based test will run a minimum of 100 iterations and be tagged with comments referencing the design document properties.

### Integration Testing
- End-to-end registration flow testing
- Email delivery verification
- API connectivity testing
- CORS configuration validation

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection

After analyzing all acceptance criteria, several properties can be consolidated to eliminate redundancy:

- Properties 1.1 and 4.1 both test successful registration with valid data - these can be combined
- Properties 1.6, 3.1, and 3.2 all test error handling - these can be consolidated into comprehensive error handling properties
- Properties 2.3, 3.4, and 4.3 all test network failure handling - these can be combined
- Properties 5.1 and 5.2 both test email content - these can be consolidated

### Core Properties

**Property 1: Valid registration data creates tenant and user**
*For any* valid registration request containing company name, slug, admin credentials, plan, and industry, the API should successfully create both a tenant record and an admin user account
**Validates: Requirements 1.1, 1.2, 4.1**

**Property 2: Successful registration triggers email notification**
*For any* successful tenant registration, the system should send a welcome email containing the tenant slug, admin email, login instructions, and direct login link
**Validates: Requirements 1.3, 5.1, 5.2**

**Property 3: Registration form routes correctly by plan type**
*For any* successful registration, if the plan is free then redirect to login page, if the plan is paid then redirect to payment flow
**Validates: Requirements 1.4, 1.5, 4.4**

**Property 4: Error responses are structured and displayed**
*For any* API error response, the frontend should display the specific error message and log complete error details, and the API should return structured error responses with codes and messages
**Validates: Requirements 1.6, 3.1, 3.2**

**Property 5: CORS configuration allows valid origins**
*For any* request from a configured frontend origin, the API should accept the request, and for any request from an unauthorized origin, the API should reject it
**Validates: Requirements 2.2**

**Property 6: Network failures are handled gracefully**
*For any* network connectivity issue or timeout, the frontend should display appropriate error messages, maintain UI stability, and suggest retry actions without breaking the interface
**Validates: Requirements 2.3, 3.4, 4.3**

**Property 7: Client-side validation prevents invalid submissions**
*For any* invalid registration data, the form should display field-specific error messages and prevent API submission
**Validates: Requirements 3.3, 4.2**

**Property 8: Duplicate registration detection**
*For any* registration attempt with an existing company slug or admin email, the API should return appropriate error messages indicating the conflict
**Validates: Requirements 4.5**

**Property 9: Registration logging and analytics**
*For any* registration attempt (success or failure), the system should log the event details for debugging and analytics purposes
**Validates: Requirements 2.5, 3.5**

**Property 10: Post-registration user guidance**
*For any* successful registration, the frontend should display instructions on accessing the account and provide the tenant slug prominently during redirect
**Validates: Requirements 5.3, 5.4**

**Property 11: Email failure graceful handling**
*For any* registration where email delivery fails, the registration should still complete successfully but log the email failure for manual follow-up
**Validates: Requirements 5.5**

## Implementation Plan

### Phase 1: Diagnosis and Basic Fixes
1. Add comprehensive logging to both frontend and backend
2. Implement API health check endpoint
3. Fix any CORS or connectivity issues
4. Add proper error response formatting

### Phase 2: Enhanced Error Handling
1. Improve frontend error parsing and display
2. Add client-side validation improvements
3. Implement retry logic for network failures
4. Add loading states and user feedback

### Phase 3: Email Notifications
1. Implement email service for welcome messages
2. Create email templates with login instructions
3. Add email delivery error handling
4. Test email functionality across providers

### Phase 4: User Experience Improvements
1. Improve success message and redirect flow
2. Add tenant slug display and instructions
3. Implement proper routing to login page
4. Add analytics and success tracking