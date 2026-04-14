import { useState, useEffect } from "react";
import { useAuthStore } from "../stores/authStore";
import axios from "axios";
import { API_URL } from "../config";

export function useAlertsCount() {
  try {
    const authState = useAuthStore();
    const { accessToken, user } = authState || {};
    const [alertCount, setAlertCount] = useState(0);
    const [criticalCount, setCriticalCount] = useState(0);
    const [loading, setLoading] = useState(true);

    console.log("[useAlertsCount] Initialized");

    useEffect(() => {
      if (!accessToken || !user?.locationId) {
        console.log("[useAlertsCount] Skipping fetch - no token or locationId");
        setAlertCount(0);
        setCriticalCount(0);
        setLoading(false);
        return;
      }

      if (!API_URL) {
        console.error("[useAlertsCount] API_URL is not configured!");
        setAlertCount(0);
        setCriticalCount(0);
        setLoading(false);
        return;
      }

      let mounted = true;
      const fetchAlerts = async () => {
        try {
          const response = await axios.get(
            `${API_URL}/api/v1/reports/alerts?location_id=${user.locationId}`,
            { headers: { Authorization: `Bearer ${accessToken}` } },
          );

        if (mounted) {
          const alerts = response.data?.alerts || [];
          const critical = alerts.filter(
            (a: any) => a.severity === "critical",
          ).length;
          setAlertCount(alerts.length);
          setCriticalCount(critical);
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error("[useAlertsCount] Failed to fetch alerts:", errorMsg);
        if (mounted) {
          setAlertCount(0);
          setCriticalCount(0);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchAlerts();

    // Refresh every 30 seconds
    const interval = setInterval(fetchAlerts, 30000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [accessToken, user?.locationId]);

    return { alertCount: 0, criticalCount: 0, loading: false };
  } catch (error) {
    console.error("[useAlertsCount] Fatal error:", error);
    return { alertCount: 0, criticalCount: 0, loading: false };
  }
}
