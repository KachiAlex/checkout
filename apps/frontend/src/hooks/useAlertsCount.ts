import { useState, useEffect } from "react";
import { useAuthStore } from "../stores/authStore";
import axios from "axios";
import { API_URL } from "../config";

export function useAlertsCount() {
  const { accessToken, user } = useAuthStore();
  const [alertCount, setAlertCount] = useState(0);
  const [criticalCount, setCriticalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!accessToken || !user?.locationId) {
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
        console.error("Failed to fetch alerts count:", error);
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

  return { alertCount, criticalCount, loading };
}
