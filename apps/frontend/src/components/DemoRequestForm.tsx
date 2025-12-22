import { useState } from "react";
import toast from "react-hot-toast";
import axios from "axios";
import { API_URL } from "../config";

interface DemoRequestFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function DemoRequestForm({ onSuccess, onCancel }: DemoRequestFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    companyName: "",
    industry: "retail",
    message: "",
  });

  const industries = [
    { value: "retail", label: "Retail Store" },
    { value: "pharmacy", label: "Pharmacy" },
    { value: "restaurant", label: "Restaurant/Cafe" },
    { value: "supermarket", label: "Supermarket" },
    { value: "other", label: "Other" },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Validation
    if (!formData.name.trim()) {
      toast.error("Name is required");
      setLoading(false);
      return;
    }

    if (!formData.email.trim() || !formData.email.includes("@")) {
      toast.error("Valid email is required");
      setLoading(false);
      return;
    }

    if (!formData.companyName.trim()) {
      toast.error("Company name is required");
      setLoading(false);
      return;
    }

    try {
      // Send email via backend
      const emailContent = `
New Demo Request

Name: ${formData.name}
Email: ${formData.email}
Phone: ${formData.phone || "Not provided"}
Company: ${formData.companyName}
Industry: ${formData.industry}

Message:
${formData.message || "No additional message"}

---
Sent from Checkout POS Demo Request Form
      `.trim();

      await axios.post(`${API_URL}/api/v1/contact/demo-request`, {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
        companyName: formData.companyName.trim(),
        industry: formData.industry,
        message: formData.message.trim(),
        recipientEmail: "akoma@kreatixtech.com",
        subject: `Demo Request from ${formData.name} - ${formData.companyName}`,
        content: emailContent,
      });

      toast.success("Demo request sent! We'll contact you soon.");

      // Reset form
      setFormData({
        name: "",
        email: "",
        phone: "",
        companyName: "",
        industry: "retail",
        message: "",
      });

      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      const message =
        error.response?.data?.error ||
        error.message ||
        "Failed to send request";
      toast.error(message);
      console.error("Demo request error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="theme-card rounded-2xl sm:rounded-3xl border px-4 py-6 sm:px-6 sm:py-8 backdrop-blur-xl max-w-2xl">
      <div className="mb-6 text-center">
        <h2 className="theme-text-primary text-xl sm:text-2xl font-bold mb-2">
          Schedule a Demo
        </h2>
        <p className="theme-text-secondary text-xs sm:text-sm">
          Fill out the form below and we'll get in touch to schedule your
          personalized demo.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="name"
              className="theme-text-secondary text-sm font-medium mb-1 block"
            >
              Full Name *
            </label>
            <input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder="John Doe"
              className="theme-surface w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-sky-400"
              required
            />
          </div>

          <div>
            <label
              htmlFor="email"
              className="theme-text-secondary text-sm font-medium mb-1 block"
            >
              Email Address *
            </label>
            <input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, email: e.target.value }))
              }
              placeholder="john@company.com"
              className="theme-surface w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-sky-400"
              required
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="phone"
              className="theme-text-secondary text-sm font-medium mb-1 block"
            >
              Phone Number
            </label>
            <input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, phone: e.target.value }))
              }
              placeholder="+234 XXX XXX XXXX"
              className="theme-surface w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-sky-400"
            />
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
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  companyName: e.target.value,
                }))
              }
              placeholder="Acme Store"
              className="theme-surface w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-sky-400"
              required
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="industry"
            className="theme-text-secondary text-sm font-medium mb-1 block"
          >
            Industry Type *
          </label>
          <select
            id="industry"
            value={formData.industry}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, industry: e.target.value }))
            }
            className="theme-surface w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-sky-400"
            required
          >
            {industries.map((industry) => (
              <option key={industry.value} value={industry.value}>
                {industry.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="message"
            className="theme-text-secondary text-sm font-medium mb-1 block"
          >
            Additional Information (Optional)
          </label>
          <textarea
            id="message"
            value={formData.message}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, message: e.target.value }))
            }
            placeholder="Tell us about your business needs, number of locations, etc."
            rows={4}
            className="theme-surface w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-sky-400 resize-none"
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 rounded-full bg-gradient-to-r from-emerald-400 via-sky-500 to-indigo-500 px-6 py-3 text-sm font-semibold text-white shadow-[0_28px_60px_-30px_rgba(56,189,248,0.75)] transition hover:shadow-[0_30px_65px_-28px_rgba(56,189,248,0.9)] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? "Sending..." : "Request Demo"}
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
          We'll contact you within 24 hours to schedule your demo.
        </p>
      </form>
    </div>
  );
}
