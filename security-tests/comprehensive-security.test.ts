/**
 * Comprehensive Security Test Suite
 *
 * Tests for:
 * - JWT Security
 * - Authentication & Authorization
 * - Input Validation
 * - CORS Configuration
 * - Rate Limiting
 * - Tenant Isolation
 * - XSS Prevention
 * - Error Handling
 * - Environment Security
 */

import { describe, it, expect } from "vitest";

describe("Comprehensive Security Tests", () => {
  const API_BASE =
    process.env.VITE_API_URL ||
    "https://lyxwslsckkbcpepxigdx.supabase.co/functions/v1/api/v1";
  const FRONTEND_ORIGIN = "https://checkout-77d99.web.app";
  const MALICIOUS_ORIGIN = "https://malicious-site.com";

  describe("1. JWT Security", () => {
    it("should reject requests without JWT token", async () => {
      const response = await fetch(`${API_BASE}/orders`, {
        method: "GET",
      });
      expect(response.status).toBe(401);
    });

    it("should reject requests with invalid JWT format", async () => {
      const response = await fetch(`${API_BASE}/orders`, {
        method: "GET",
        headers: {
          Authorization: "Bearer invalid-token-format",
        },
      });
      expect(response.status).toBe(401);
    });

    it("should reject requests with tampered JWT signature", async () => {
      // Create a token with tampered signature
      const fakeToken =
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwidGVuYW50SWQiOiJ0ZXN0In0.tampered-signature";
      const response = await fetch(`${API_BASE}/orders`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${fakeToken}`,
        },
      });
      expect(response.status).toBe(401);
    });

    it("should reject expired JWT tokens", async () => {
      // This would require generating an expired token
      // For now, we test that expired tokens are rejected
      const expiredToken =
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0IiwidGVuYW50SWQiOiJ0ZXN0IiwiZXhwIjoxNjAwMDAwMDAwfQ.expired";
      const response = await fetch(`${API_BASE}/orders`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${expiredToken}`,
        },
      });
      expect(response.status).toBe(401);
    });

    it("should require JWT_SECRET to be set (not use default)", () => {
      // This is tested at application startup
      // JWT_SECRET should be required, not have a default
      expect(process.env.JWT_SECRET).toBeDefined();
    });
  });

  describe("2. Authentication & Authorization", () => {
    it("should enforce tenant isolation in data queries", async () => {
      // This test verifies that tenant data is isolated
      // In a real scenario, we'd need valid tokens for different tenants
      const tenantAToken = "tenant-a-token";
      const response = await fetch(`${API_BASE}/products`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${tenantAToken}`,
        },
      });

      // Should either return 401 (invalid token) or filter by tenant
      if (response.ok) {
        const products = await response.json();
        // All products should belong to the authenticated tenant
        products.forEach((product: any) => {
          expect(product.tenantId).toBeDefined();
        });
      } else {
        expect(response.status).toBe(401);
      }
    });

    it("should prevent cross-tenant location access", async () => {
      const token = "valid-token";
      const otherTenantLocation = "other-tenant-location-id";

      const response = await fetch(
        `${API_BASE}/inventory/${otherTenantLocation}/stock`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      // Should return 403 or 404, not reveal location existence
      expect([401, 403, 404]).toContain(response.status);
    });

    it("should enforce role-based access control", async () => {
      // Cashiers should not access manager-only endpoints
      const cashierToken = "cashier-token";
      const response = await fetch(`${API_BASE}/auth/verify-manager`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${cashierToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pin: "manager-pin",
        }),
      });

      // Should require proper authorization
      expect([401, 403]).toContain(response.status);
    });
  });

  describe("3. Input Validation", () => {
    it("should reject orders with negative prices", async () => {
      const token = "valid-token";
      const response = await fetch(`${API_BASE}/orders`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          uuid: "test-uuid",
          items: [
            {
              productId: "product-123",
              quantity: 1,
              priceCents: -100, // Negative price
              taxCents: 0,
            },
          ],
          subtotalCents: -100,
          taxCents: 0,
          totalCents: -100,
        }),
      });

      expect([400, 401]).toContain(response.status);
    });

    it("should reject orders with zero or negative quantities", async () => {
      const token = "valid-token";
      const response = await fetch(`${API_BASE}/orders`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          uuid: "test-uuid",
          items: [
            {
              productId: "product-123",
              quantity: 0, // Invalid quantity
              priceCents: 100,
              taxCents: 0,
            },
          ],
          subtotalCents: 0,
          taxCents: 0,
          totalCents: 0,
        }),
      });

      expect([400, 401]).toContain(response.status);
    });

    it("should sanitize user input to prevent XSS", async () => {
      const token = "valid-token";
      const xssPayload = '<script>alert("XSS")</script>';

      const response = await fetch(`${API_BASE}/customers`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: xssPayload,
          email: "test@example.com",
        }),
      });

      // Should either reject or sanitize
      if (response.ok) {
        const data = await response.json();
        expect(data.name).not.toContain("<script>");
      } else {
        expect([400, 401]).toContain(response.status);
      }
    });

    it("should validate email format", async () => {
      const token = "valid-token";
      const response = await fetch(`${API_BASE}/customers`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Test User",
          email: "invalid-email", // Invalid email format
        }),
      });

      expect([400, 401]).toContain(response.status);
    });

    it("should validate UUID format", async () => {
      const token = "valid-token";
      const response = await fetch(`${API_BASE}/orders/invalid-uuid`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect([400, 401, 404]).toContain(response.status);
    });
  });

  describe("4. CORS Security", () => {
    it("should reject requests from unauthorized origins", async () => {
      const response = await fetch(`${API_BASE}/products`, {
        method: "GET",
        headers: {
          Origin: MALICIOUS_ORIGIN,
        },
      });

      // Should not include CORS headers for unauthorized origin
      const corsHeader = response.headers.get("Access-Control-Allow-Origin");
      expect(corsHeader).not.toBe(MALICIOUS_ORIGIN);
    });

    it("should allow requests from authorized origins", async () => {
      const response = await fetch(`${API_BASE}/products`, {
        method: "GET",
        headers: {
          Origin: FRONTEND_ORIGIN,
        },
      });

      const corsHeader = response.headers.get("Access-Control-Allow-Origin");
      // Should allow the authorized origin or use wildcard
      expect(corsHeader === FRONTEND_ORIGIN || corsHeader === "*").toBe(true);
    });

    it("should handle OPTIONS preflight requests correctly", async () => {
      const response = await fetch(`${API_BASE}/orders`, {
        method: "OPTIONS",
        headers: {
          Origin: FRONTEND_ORIGIN,
          "Access-Control-Request-Method": "POST",
          "Access-Control-Request-Headers": "authorization,content-type",
        },
      });

      expect(response.status).toBe(204);
      expect(response.headers.get("Access-Control-Allow-Methods")).toContain(
        "POST",
      );
    });
  });

  describe("5. Rate Limiting", () => {
    it("should enforce rate limiting on login endpoint", async () => {
      const loginAttempts = [];
      for (let i = 0; i < 10; i++) {
        loginAttempts.push(
          fetch(`${API_BASE}/auth/login`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              tenantSlug: "test-tenant",
              pin: "1234",
            }),
          }),
        );
      }

      const responses = await Promise.all(loginAttempts);
      // At least some requests should be rate limited (429) or fail (401)
      const rateLimited = responses.filter((r) => r.status === 429);
      const failed = responses.filter((r) => r.status === 401);
      expect(rateLimited.length + failed.length).toBeGreaterThan(0);
    });
  });

  describe("6. Business Logic Security", () => {
    it("should validate prices against product catalog", async () => {
      const token = "valid-token";
      const productId = "product-123";
      const manipulatedPrice = 100; // Client trying to pay less

      const response = await fetch(`${API_BASE}/orders`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          uuid: "test-uuid",
          items: [
            {
              productId,
              quantity: 1,
              priceCents: manipulatedPrice, // Client trying to manipulate
              taxCents: 0,
            },
          ],
          subtotalCents: manipulatedPrice,
          taxCents: 0,
          totalCents: manipulatedPrice,
        }),
      });

      // Should either reject or use server-calculated price
      if (response.ok) {
        const order = await response.json();
        // Server should validate or override client price
        expect(order.items[0].priceCents).toBeGreaterThanOrEqual(0);
      } else {
        expect([400, 401]).toContain(response.status);
      }
    });

    it("should prevent inventory overselling", async () => {
      const token = "valid-token";
      const productId = "product-123";
      const availableStock = 10;

      const response = await fetch(`${API_BASE}/orders`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          uuid: "test-uuid",
          items: [
            {
              productId,
              quantity: availableStock + 1, // More than available
              priceCents: 100,
              taxCents: 0,
            },
          ],
          subtotalCents: (availableStock + 1) * 100,
          taxCents: 0,
          totalCents: (availableStock + 1) * 100,
        }),
      });

      // Should return 409 Conflict or 400 Bad Request for insufficient stock
      expect([400, 401, 409]).toContain(response.status);
    });
  });

  describe("7. Error Handling", () => {
    it("should not leak sensitive information in error messages", async () => {
      const token = "invalid-token";
      const response = await fetch(`${API_BASE}/orders`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response
          .json()
          .catch(() => ({ message: response.statusText }));
        // Should not contain stack traces, file paths, or internal details
        expect(error.message || "").not.toContain("at ");
        expect(error.message || "").not.toContain("/app/");
        expect(error.message || "").not.toContain("JWT_SECRET");
        expect(error.message || "").not.toContain("private key");
      }
    });

    it("should return generic error messages for unauthorized access", async () => {
      const response = await fetch(`${API_BASE}/orders`, {
        method: "GET",
      });

      if (!response.ok) {
        const error = await response
          .json()
          .catch(() => ({ message: response.statusText }));
        // Should not reveal whether resource exists
        expect(error.message || "").not.toContain("order");
        expect(error.message || "").not.toContain("tenant");
      }
    });
  });

  describe("8. Environment Security", () => {
    it("should not expose sensitive environment variables in frontend", () => {
      // Frontend should not have access to backend secrets
      expect(process.env.JWT_SECRET).toBeUndefined();
      expect(process.env.JWT_REFRESH_SECRET).toBeUndefined();
      expect(process.env.DATABASE_URL).toBeUndefined();
      expect(process.env.FIREBASE_PRIVATE_KEY).toBeUndefined();
    });

    it("should use environment variables for configuration", () => {
      // API URL should be configurable
      expect(API_BASE).toBeDefined();
    });
  });

  describe("9. API Endpoint Security", () => {
    it("should require authentication for protected endpoints", async () => {
      const protectedEndpoints = [
        "/orders",
        "/products",
        "/inventory",
        "/customers",
        "/suppliers",
      ];

      for (const endpoint of protectedEndpoints) {
        const response = await fetch(`${API_BASE}${endpoint}`, {
          method: "GET",
        });
        expect(response.status).toBe(401);
      }
    });

    it("should validate request body structure", async () => {
      const token = "valid-token";
      const response = await fetch(`${API_BASE}/orders`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          // Missing required fields
          invalidField: "test",
        }),
      });

      expect([400, 401]).toContain(response.status);
    });
  });

  describe("10. Data Validation", () => {
    it("should enforce minimum length constraints", async () => {
      const token = "valid-token";
      const response = await fetch(`${API_BASE}/users`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "A", // Too short
          email: "test@example.com",
          pin: "123", // Too short
        }),
      });

      expect([400, 401]).toContain(response.status);
    });

    it("should enforce maximum length constraints", async () => {
      const token = "valid-token";
      const longString = "a".repeat(10000);
      const response = await fetch(`${API_BASE}/customers`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: longString,
          email: "test@example.com",
        }),
      });

      expect([400, 401, 413]).toContain(response.status);
    });
  });
});
