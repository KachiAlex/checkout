import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { API_URL } from "../config";
import axios from "axios";

// Health check function to test API connectivity
const checkApiHealth = async (apiUrl: string): Promise<boolean> => {
  try {
    const healthUrl = `${apiUrl}/api/v1/health`;
    console.log("[Health Check] Testing API connectivity:", healthUrl);

    const response = await axios.get(healthUrl, {
      timeout: 10000, // 10 second timeout for health check
    });

    console.log("[Health Check] API is healthy:", response.data);
    return response.status === 200;
  } catch (error: any) {
    console.error("[Health Check] API health check failed:", error);
    return false;
  }
};

interface RegistrationFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

type PlanType = "free" | "starter" | "professional" | "enterprise" | "lifetime";
type IndustryType =
  | "retail"
  | "pharmacy"
  | "restaurant"
  | "supermarket"
  | "other";

const industries = [
  {
    value: "retail" as const,
    label: "Retail Store",
    icon: "🛍️",
    description: "Fashion, electronics, general merchandise",
  },
  {
    value: "pharmacy" as const,
    label: "Pharmacy",
    icon: "💊",
    description: "Healthcare retail & prescriptions",
  },
  {
    value: "restaurant" as const,
    label: "Restaurant/Cafe",
    icon: "🍽️",
    description: "Food service & hospitality",
  },
  {
    value: "supermarket" as const,
    label: "Supermarket",
    icon: "🛒",
    description: "Grocery & convenience stores",
  },
  {
    value: "other" as const,
    label: "Other",
    icon: "🏢",
    description: "Other business types",
  },
];

export function RegistrationForm({
  onSuccess,
  onCancel,
}: RegistrationFormProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanType>("free");
  const [selectedIndustry, setSelectedIndustry] =
    useState<IndustryType>("retail");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    companyName: "",
    companySlug: "",
    adminName: "",
    adminEmail: "",
    adminPassword: "",
    confirmPassword: "",
  });

  // Hardcoded pricing for now (in cents - NGN)
  const pricing = {
    free: { priceCents: 0, label: "14 days" },
    starter: { priceCents: 2000000, label: "$200/mo" }, // ~200,000 NGN
    professional: { priceCents: 5000000, label: "$500/mo" }, // ~500,000 NGN
    enterprise: { priceCents: 10000000, label: "$1000/mo" },
    lifetime: { priceCents: 50000000, label: "$5000" },
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  };

  const handleCompanyNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setFormData((prev) => ({
      ...prev,
      companyName: name,
      companySlug: generateSlug(name),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Validation
    if (!selectedIndustry) {
      toast.error("Please select your industry");
      setLoading(false);
      return;
    }

    if (!formData.companyName.trim()) {
      toast.error("Company name is required");
      setLoading(false);
      return;
    }

    if (!formData.companySlug.trim()) {
      toast.error("Company slug is required");
      setLoading(false);
      return;
    }

    if (!formData.adminName.trim()) {
      toast.error("Admin name is required");
      setLoading(false);
      return;
    }

    if (!formData.adminEmail.trim() || !formData.adminEmail.includes("@")) {
      toast.error("Valid admin email is required");
      setLoading(false);
      return;
    }

    if (!formData.adminPassword || formData.adminPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      setLoading(false);
      return;
    }

    if (formData.adminPassword !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      setLoading(false);
      return;
    }

    // Determine the correct API URL
    const apiUrl = API_URL || "https://checkout-45tb.onrender.com";
    const registrationUrl = `${apiUrl}/api/v1/platform/register`;

    console.log("[Registration] Starting registration process...");
    console.log("[Registration] API URL:", apiUrl);
    console.log("[Registration] Full URL:", registrationUrl);
    console.log("[Registration] Form data:", {
      companyName: formData.companyName.trim(),
      companySlug: formData.companySlug.trim().toLowerCase(),
      adminName: formData.adminName.trim(),
      adminEmail: formData.adminEmail.trim().toLowerCase(),
      plan: selectedPlan === "free" ? undefined : selectedPlan,
      industry: selectedIndustry,
    });

    // Check API health before attempting registration
    const isApiHealthy = await checkApiHealth(apiUrl);
    if (!isApiHealthy) {
      toast.error(
        "Unable to connect to the server. Please check your internet connection and try again.",
      );
      setLoading(false);
      return;
    }

    try {
      // Implement retry logic for network failures
      let response;
      let lastError: any;
      const maxRetries = 2;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(
            `[Registration] Attempt ${attempt}/${maxRetries} to submit registration`,
          );

          response = await axios.post(
            registrationUrl,
            {
              companyName: formData.companyName.trim(),
              companySlug: formData.companySlug.trim().toLowerCase(),
              adminName: formData.adminName.trim(),
              adminEmail: formData.adminEmail.trim().toLowerCase(),
              adminPassword: formData.adminPassword,
              plan: selectedPlan === "free" ? undefined : selectedPlan,
              industry: selectedIndustry,
            },
            {
              timeout: 30000, // 30 second timeout
              headers: {
                "Content-Type": "application/json",
              },
            },
          );

          // Success - break out of retry loop
          break;
        } catch (error: any) {
          lastError = error;

          // Only retry on network errors or timeouts, not on validation errors
          const isNetworkError =
            error.code === "ECONNABORTED" ||
            error.code === "ERR_NETWORK" ||
            error.code === "ENOTFOUND" ||
            error.code === "ECONNREFUSED" ||
            !error.response; // No response means network issue

          if (isNetworkError && attempt < maxRetries) {
            console.warn(
              `[Registration] Network error on attempt ${attempt}, retrying...`,
              error.code,
            );
            // Wait before retrying (exponential backoff: 1s, 2s)
            await new Promise((resolve) =>
              setTimeout(resolve, 1000 * attempt),
            );
            continue;
          }

          // If it's not a network error or we've exhausted retries, throw
          throw error;
        }
      }

      if (!response) {
        throw lastError || new Error("Failed to submit registration");
      }

      console.log("[Registration] API Response:", response.data);

      if (response.data.success) {
        // If payment is required, redirect to payment page
        if (response.data.requiresPayment && response.data.checkoutUrl) {
          toast.success("Registration successful! Redirecting to payment...");
          console.log(
            "[Registration] Redirecting to payment:",
            response.data.checkoutUrl,
          );
          window.location.href = response.data.checkoutUrl;
          return;
        }

        // For free trial, show success and redirect
        toast.success(
          "Registration successful! Your 14-day free trial has started.",
        );
        console.log(
          "[Registration] Free trial registration successful:",
          response.data.tenant,
        );

        if (onSuccess) {
          onSuccess();
        } else {
          // Auto-login and redirect
          console.log(
            "[Registration] Redirecting to login page for tenant:",
            response.data.tenant.slug,
          );
          navigate("/login", {
            state: {
              tenantSlug: response.data.tenant.slug,
              message:
                "Registration successful! Please log in with your credentials.",
            },
          });
        }
      } else {
        console.error(
          "[Registration] API returned success=false:",
          response.data,
        );
        toast.error(response.data.message || "Registration failed");
      }
    } catch (error: any) {
      console.error("[Registration] Registration error:", error);

      let errorMessage = "Registration failed";
      let errorField: string | undefined;
      let errorCode: string | undefined;

      if (error.code === "ECONNABORTED") {
        errorMessage =
          "Request timed out. The server took too long to respond. Please check your internet connection and try again.";
        errorCode = "TIMEOUT";
      } else if (
        error.code === "ERR_NETWORK" ||
        error.code === "ENOTFOUND" ||
        error.code === "ECONNREFUSED"
      ) {
        errorMessage =
          "Network connection failed. Please check your internet connection and try again.";
        errorCode = "NETWORK_ERROR";
      } else if (error.response) {
        // Server responded with error status
        console.error(
          "[Registration] Server error response:",
          error.response.data,
        );

        // Handle standardized error response format
        if (error.response.data?.error) {
          const errorData = error.response.data.error;
          errorCode = errorData.code;
          errorMessage = errorData.message || "Registration failed";
          errorField = errorData.field;

          // Log detailed error information
          console.error("[Registration] Structured error response:", {
            code: errorCode,
            message: errorMessage,
            field: errorField,
            details: errorData.details,
            status: error.response.status,
            timestamp: new Date().toISOString(),
          });
        } else if (error.response.data?.message) {
          errorMessage = error.response.data.message;
        } else {
          errorMessage = `Server error (${error.response.status}): ${error.response.statusText}`;
        }
      } else if (error.request) {
        // Request was made but no response received
        console.error("[Registration] No response received:", error.request);
        errorMessage =
          "No response from server. Please check your internet connection and try again.";
        errorCode = "NO_RESPONSE";
      } else {
        // Something else happened
        errorMessage = error.message || "An unexpected error occurred";
        errorCode = "UNKNOWN_ERROR";
      }

      // Log complete error context for debugging
      console.error("[Registration] Complete error context:", {
        errorCode,
        errorMessage,
        errorField,
        errorType: error.name,
        timestamp: new Date().toISOString(),
      });

      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="theme-card rounded-2xl sm:rounded-3xl border px-4 py-6 sm:px-6 sm:py-8 backdrop-blur-xl">
      <div className="mb-6 text-center">
        <h2 className="theme-text-primary text-xl sm:text-2xl font-bold mb-2">
          Start Your Free Trial
        </h2>
        <p className="theme-text-secondary text-xs sm:text-sm">
          Get 14 days free to explore all features. No credit card required.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Plan Selection */}
        <div>
          <label className="theme-text-secondary text-sm font-medium mb-2 block">
            Choose Your Plan *
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setSelectedPlan("free")}
              className={`rounded-lg border px-3 py-2 text-xs font-medium transition ${
                selectedPlan === "free"
                  ? "border-emerald-400 bg-emerald-400/20 text-emerald-300"
                  : "border-white/10 bg-white/5 text-slate-300 hover:border-white/20"
              }`}
            >
              <div>Free Trial</div>
              <div className="text-[10px] opacity-70">14 days</div>
            </button>
            <button
              type="button"
              onClick={() => setSelectedPlan("starter")}
              className={`rounded-lg border px-3 py-2 text-xs font-medium transition ${
                selectedPlan === "starter"
                  ? "border-sky-400 bg-sky-400/20 text-sky-300"
                  : "border-white/10 bg-white/5 text-slate-300 hover:border-white/20"
              }`}
            >
              <div>Starter</div>
              <div className="text-[10px] opacity-70">
                {pricing.starter.label}
              </div>
            </button>
            <button
              type="button"
              onClick={() => setSelectedPlan("professional")}
              className={`rounded-lg border px-3 py-2 text-xs font-medium transition ${
                selectedPlan === "professional"
                  ? "border-sky-400 bg-sky-400/20 text-sky-300"
                  : "border-white/10 bg-white/5 text-slate-300 hover:border-white/20"
              }`}
            >
              <div>Professional</div>
              <div className="text-[10px] opacity-70">
                {pricing.professional.label}
              </div>
            </button>
            <button
              type="button"
              onClick={() => setSelectedPlan("lifetime")}
              className={`rounded-lg border px-3 py-2 text-xs font-medium transition ${
                selectedPlan === "lifetime"
                  ? "border-purple-400 bg-purple-400/20 text-purple-300"
                  : "border-white/10 bg-white/5 text-slate-300 hover:border-white/20"
              }`}
            >
              <div>Lifetime</div>
              <div className="text-[10px] opacity-70">
                {pricing.lifetime.label}
              </div>
            </button>
          </div>
        </div>

        {/* Industry Selection */}
        <div>
          <label className="theme-text-secondary text-sm font-medium mb-2 block">
            What type of business do you run? *
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {industries.map((industry) => (
              <button
                key={industry.value}
                type="button"
                onClick={() => setSelectedIndustry(industry.value)}
                className={`rounded-xl border p-3 text-left transition ${
                  selectedIndustry === industry.value
                    ? "border-emerald-400 bg-emerald-400/20 ring-2 ring-emerald-400/50"
                    : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10"
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl flex-shrink-0">
                    {industry.icon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div
                      className={`text-sm font-semibold mb-0.5 ${
                        selectedIndustry === industry.value
                          ? "text-emerald-300"
                          : "theme-text-primary"
                      }`}
                    >
                      {industry.label}
                    </div>
                    <div className="theme-text-secondary text-xs leading-snug">
                      {industry.description}
                    </div>
                  </div>
                  {selectedIndustry === industry.value && (
                    <span className="text-emerald-400 text-lg flex-shrink-0">
                      ✓
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label
            htmlFor="companyName"
            className="theme-text-secondary text-sm font-medium mb-1 block"
          >
            Company Name *
          </label>
          <input
            id="companyName"
            type="text"
            value={formData.companyName}
            onChange={handleCompanyNameChange}
            placeholder="Acme Retail"
            className="theme-surface w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-sky-400"
            required
          />
        </div>

        <div>
          <label
            htmlFor="companySlug"
            className="theme-text-secondary text-sm font-medium mb-1 block"
          >
            Company URL *
          </label>
          <div className="flex items-center gap-2">
            <span className="theme-text-secondary text-sm">
              checkout-77d99.web.app/
            </span>
            <input
              id="companySlug"
              type="text"
              value={formData.companySlug}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  companySlug: generateSlug(e.target.value),
                }))
              }
              placeholder="acme-retail"
              pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
              className="theme-surface flex-1 rounded-xl border px-4 py-2.5 text-sm lowercase outline-none focus:ring-2 focus:ring-sky-400"
              required
            />
          </div>
          <p className="theme-text-secondary text-xs mt-1">
            Lowercase letters, numbers, and hyphens only
          </p>
        </div>

        <div>
          <label
            htmlFor="adminName"
            className="theme-text-secondary text-sm font-medium mb-1 block"
          >
            Your Name *
          </label>
          <input
            id="adminName"
            type="text"
            value={formData.adminName}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, adminName: e.target.value }))
            }
            placeholder="John Doe"
            className="theme-surface w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-sky-400"
            required
          />
        </div>

        <div>
          <label
            htmlFor="adminEmail"
            className="theme-text-secondary text-sm font-medium mb-1 block"
          >
            Email Address *
          </label>
          <input
            id="adminEmail"
            type="email"
            value={formData.adminEmail}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, adminEmail: e.target.value }))
            }
            placeholder="john@acme.com"
            className="theme-surface w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-sky-400"
            required
          />
        </div>

        <div>
          <label
            htmlFor="adminPassword"
            className="theme-text-secondary text-sm font-medium mb-1 block"
          >
            Password *
          </label>
          <input
            id="adminPassword"
            type="password"
            value={formData.adminPassword}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                adminPassword: e.target.value,
              }))
            }
            placeholder="At least 6 characters"
            minLength={6}
            className="theme-surface w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-sky-400"
            required
          />
        </div>

        <div>
          <label
            htmlFor="confirmPassword"
            className="theme-text-secondary text-sm font-medium mb-1 block"
          >
            Confirm Password *
          </label>
          <input
            id="confirmPassword"
            type="password"
            value={formData.confirmPassword}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                confirmPassword: e.target.value,
              }))
            }
            placeholder="Re-enter your password"
            className="theme-surface w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-sky-400"
            required
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 rounded-full bg-gradient-to-r from-emerald-400 via-sky-500 to-indigo-500 px-6 py-3 text-sm font-semibold text-emerald-950 shadow-[0_28px_60px_-30px_rgba(56,189,248,0.75)] transition hover:shadow-[0_30px_65px_-28px_rgba(56,189,248,0.9)] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading
              ? "Creating Account..."
              : selectedPlan === "free"
                ? "Start Free Trial"
                : "Continue to Payment"}
          </button>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white transition hover:border-white/40"
            >
              Cancel
            </button>
          )}
        </div>

        <p className="theme-text-secondary text-xs text-center mt-4">
          By registering, you agree to our Terms of Service and Privacy Policy.
        </p>
      </form>
    </div>
  );
}
