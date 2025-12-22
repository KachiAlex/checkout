import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuthStore } from "../stores/authStore";
import axios from "axios";
import { API_URL } from "../config";

interface Alert {
  type: string;
  severity: "critical" | "warning" | "info";
  title: string;
  message: string;
  productId?: string;
  productName?: string;
  currentStock?: number;
}

export function AlertBanner() {
  const { accessToken, user } = useAuthStore();
  const [criticalAlerts, setCriticalAlerts] = useState<Alert[]>([]);
  const [lowStockAlerts, setLowStockAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!accessToken || !user?.locationId) {
      setLoading(false);
      return;
    }

    const fetchAlerts = async () => {
      try {
        const response = await axios.get(
          `${API_URL}/api/v1/reports/alerts?location_id=${user.locationId}`,
          { headers: { Authorization: `Bearer ${accessToken}` } },
        );

        const alerts = response.data?.alerts || [];
        const critical = alerts.filter((a: Alert) => a.severity === "critical");
        const lowStock = alerts.filter(
          (a: Alert) =>
            (a.type === "low_stock" || a.type === "stockout") &&
            a.severity !== "critical",
        );

        setCriticalAlerts(critical);
        setLowStockAlerts(lowStock);
      } catch (error) {
        console.error("Failed to fetch alerts:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAlerts();
    const interval = setInterval(fetchAlerts, 60000); // Refresh every minute

    return () => clearInterval(interval);
  }, [accessToken, user?.locationId]);

  if (loading || (criticalAlerts.length === 0 && lowStockAlerts.length === 0)) {
    return null;
  }

  return (
    <div className="space-y-2 mb-4">
      {/* Critical Alerts */}
      {criticalAlerts.length > 0 && (
        <Link to="/reports?tab=alerts" className="block animate-pulse">
          <div className="bg-red-600/30 border-2 border-red-500/70 rounded-xl p-4 shadow-lg shadow-red-500/20 hover:bg-red-600/40 transition">
            <div className="flex items-center gap-3">
              <span className="text-2xl animate-bounce">🚨</span>
              <div className="flex-1">
                <p className="font-bold text-red-200 text-sm sm:text-base">
                  {criticalAlerts.length} Critical Alert
                  {criticalAlerts.length > 1 ? "s" : ""} - Action Required!
                </p>
                <p className="text-xs sm:text-sm text-red-300/80 mt-1">
                  {criticalAlerts[0].title} - Click to view all alerts
                </p>
              </div>
              <span className="text-red-200 text-xl">→</span>
            </div>
          </div>
        </Link>
      )}

      {/* Low Stock Alerts */}
      {lowStockAlerts.length > 0 && (
        <Link to="/reports?tab=alerts" className="block">
          <div className="bg-orange-500/30 border-2 border-orange-500/70 rounded-xl p-4 shadow-lg shadow-orange-500/20 hover:bg-orange-500/40 transition">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚠️</span>
              <div className="flex-1">
                <p className="font-bold text-orange-200 text-sm sm:text-base">
                  {lowStockAlerts.length} Low Stock Alert
                  {lowStockAlerts.length > 1 ? "s" : ""}
                </p>
                <p className="text-xs sm:text-sm text-orange-300/80 mt-1">
                  {lowStockAlerts[0].title} - Click to view all alerts
                </p>
              </div>
              <span className="text-orange-200 text-xl">→</span>
            </div>
          </div>
        </Link>
      )}
    </div>
  );
}
