"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LicenseInputScreen = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const lucide_react_1 = require("lucide-react");
const LicenseInputScreen = ({ onActivate, onSkip, error: initialError, }) => {
    const [licenseKey, setLicenseKey] = (0, react_1.useState)('');
    const [loading, setLoading] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)(initialError || null);
    const [success, setSuccess] = (0, react_1.useState)(false);
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            if (!licenseKey.trim()) {
                throw new Error('Please enter a license key');
            }
            await onActivate(licenseKey);
            setSuccess(true);
            setTimeout(() => {
                // License activation successful - the app will reload or navigate
            }, 2000);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to activate license');
        }
        finally {
            setLoading(false);
        }
    };
    const handleSkip = () => {
        if (onSkip) {
            onSkip();
        }
        else {
            // Default behavior - allow offline access
            setLicenseKey('');
        }
    };
    return ((0, jsx_runtime_1.jsxs)("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950", children: [(0, jsx_runtime_1.jsxs)("div", { className: "absolute inset-0 overflow-hidden", children: [(0, jsx_runtime_1.jsx)("div", { className: "absolute -top-1/2 -left-1/2 w-full h-full bg-blue-500/5 rounded-full blur-3xl animate-pulse" }), (0, jsx_runtime_1.jsx)("div", { className: "absolute -bottom-1/2 -right-1/2 w-full h-full bg-purple-500/5 rounded-full blur-3xl animate-pulse" })] }), (0, jsx_runtime_1.jsx)("div", { className: "relative w-full max-w-md px-6 py-8", children: (0, jsx_runtime_1.jsxs)("div", { className: "rounded-2xl border border-white/10 bg-slate-900/80 backdrop-blur-xl shadow-2xl p-8", children: [(0, jsx_runtime_1.jsxs)("div", { className: "mb-8", children: [(0, jsx_runtime_1.jsx)("h1", { className: "text-3xl font-bold text-white mb-2", children: "\uD83D\uDD10 License Activation" }), (0, jsx_runtime_1.jsx)("p", { className: "text-slate-400 text-sm", children: "Enter your license key to unlock the full application" })] }), success ? ((0, jsx_runtime_1.jsxs)("div", { className: "space-y-4", children: [(0, jsx_runtime_1.jsxs)("div", { className: "rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-4 flex items-start gap-3", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.CheckCircle, { className: "w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("h3", { className: "font-semibold text-emerald-400", children: "License Activated!" }), (0, jsx_runtime_1.jsx)("p", { className: "text-sm text-emerald-300 mt-1", children: "Your license has been successfully activated. The app will reload shortly." })] })] }), (0, jsx_runtime_1.jsx)("div", { className: "flex justify-center", children: (0, jsx_runtime_1.jsx)(lucide_react_1.Loader, { className: "w-5 h-5 text-sky-400 animate-spin" }) })] })) : ((0, jsx_runtime_1.jsxs)("form", { onSubmit: handleSubmit, className: "space-y-6", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("label", { className: "block text-sm font-medium text-slate-300 mb-2", children: "License Key" }), (0, jsx_runtime_1.jsx)("input", { type: "text", value: licenseKey, onChange: (e) => setLicenseKey(e.target.value.toUpperCase()), placeholder: "LICENSE-XXXXX-XXXXX-XXXXX", disabled: loading, className: "w-full px-4 py-3 rounded-xl border border-white/10 bg-slate-800/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed font-mono text-sm tracking-widest" }), (0, jsx_runtime_1.jsx)("p", { className: "mt-2 text-xs text-slate-400", children: "Your license key is case-insensitive and will be validated with your hardware." })] }), error && ((0, jsx_runtime_1.jsxs)("div", { className: "rounded-xl bg-red-500/10 border border-red-500/30 p-4 flex items-start gap-3", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.AlertCircle, { className: "w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("h3", { className: "font-semibold text-red-400", children: "Activation Failed" }), (0, jsx_runtime_1.jsx)("p", { className: "text-sm text-red-300 mt-1", children: error })] })] })), (0, jsx_runtime_1.jsx)("div", { className: "rounded-xl bg-sky-500/10 border border-sky-500/30 p-4", children: (0, jsx_runtime_1.jsxs)("p", { className: "text-sm text-sky-300", children: [(0, jsx_runtime_1.jsx)("strong", { children: "Need a license?" }), " Visit our website to purchase or obtain a trial license."] }) }), (0, jsx_runtime_1.jsxs)("div", { className: "space-y-3", children: [(0, jsx_runtime_1.jsx)("button", { type: "submit", disabled: loading || !licenseKey.trim(), className: "w-full px-6 py-3 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 text-white font-semibold transition hover:shadow-lg hover:shadow-sky-500/50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2", children: loading ? ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Loader, { className: "w-4 h-4 animate-spin" }), "Activating..."] })) : ('Activate License') }), onSkip && ((0, jsx_runtime_1.jsx)("button", { type: "button", onClick: handleSkip, disabled: loading, className: "w-full px-6 py-3 rounded-xl border border-white/20 text-slate-300 font-semibold transition hover:border-white/40 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed", children: "Continue Offline (14-day trial)" }))] }), (0, jsx_runtime_1.jsx)("p", { className: "text-center text-xs text-slate-500", children: "Your license information is encrypted and stored locally." })] }))] }) })] }));
};
exports.LicenseInputScreen = LicenseInputScreen;
exports.default = exports.LicenseInputScreen;
//# sourceMappingURL=LicenseInputScreen.js.map