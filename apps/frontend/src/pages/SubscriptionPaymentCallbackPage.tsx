import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { API_URL } from "../config";
import axios from "axios";
import { BrandMark } from "../components/BrandMark";

export function SubscriptionPaymentCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "failed">(
    "loading",
  );
  const tenantId = searchParams.get("tenantId");
  const paymentId = searchParams.get("paymentId");

  useEffect(() => {
    const checkPaymentStatus = async () => {
      if (!tenantId || !paymentId) {
        setStatus("failed");
        toast.error("Invalid payment callback parameters");
        return;
      }

      try {
        // Check payment status with backend
        const response = await axios.get(
          `${API_URL}/api/v1/platform/subscriptions/${tenantId}/payment/status/${paymentId}`,
        );

        if (response.data.status === "completed") {
          setStatus("success");
          toast.success("Payment successful! Your subscription is now active.");

          // Redirect to login after 3 seconds
          setTimeout(() => {
            // Extract tenant slug from response or use tenantId
            const tenantSlug = response.data.tenantSlug || tenantId;
            navigate(`/${tenantSlug}/login`);
          }, 3000);
        } else if (response.data.status === "failed") {
          setStatus("failed");
          toast.error("Payment failed. Please try again.");
        } else {
          // Still processing, check again after a delay
          setTimeout(checkPaymentStatus, 2000);
        }
      } catch (error: any) {
        console.error("Payment status check error:", error);
        setStatus("failed");
        toast.error("Unable to verify payment status. Please contact support.");
      }
    };

    checkPaymentStatus();
  }, [tenantId, paymentId, navigate]);

  return (
    <div className="min-h-screen theme-bg flex items-center justify-center p-4">
      <div className="max-w-md w-full theme-surface rounded-2xl border theme-border p-8 text-center">
        <BrandMark className="mx-auto mb-6" />

        {status === "loading" && (
          <>
            <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-sky-400 border-t-transparent mb-4" />
            <h2 className="text-xl font-semibold theme-text-primary mb-2">
              Verifying Payment...
            </h2>
            <p className="theme-text-secondary text-sm">
              Please wait while we confirm your payment.
            </p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="text-6xl mb-4">✅</div>
            <h2 className="text-xl font-semibold theme-text-primary mb-2">
              Payment Successful!
            </h2>
            <p className="theme-text-secondary text-sm mb-4">
              Your subscription has been activated. Redirecting to login...
            </p>
          </>
        )}

        {status === "failed" && (
          <>
            <div className="text-6xl mb-4">❌</div>
            <h2 className="text-xl font-semibold theme-text-primary mb-2">
              Payment Failed
            </h2>
            <p className="theme-text-secondary text-sm mb-4">
              We couldn't process your payment. Please try again or contact
              support.
            </p>
            <button
              onClick={() => navigate("/")}
              className="rounded-full bg-gradient-to-r from-emerald-400 via-sky-500 to-indigo-500 px-6 py-3 text-sm font-semibold text-emerald-950"
            >
              Return to Home
            </button>
          </>
        )}
      </div>
    </div>
  );
}
