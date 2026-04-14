import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Hook to listen for desktop menu navigation events
 * Used when running in Electron to handle menu-triggered navigation
 */
export function useDesktopMenuNavigation() {
  const navigate = useNavigate();

  useEffect(() => {
    try {
      // Check if we're in Electron
      if (typeof window === 'undefined' || !('posApp' in window)) {
        console.log('[useDesktopMenuNavigation] Not in Electron environment, skipping');
        return;
      }

      const posApp = (window as any).posApp;
      if (!posApp) {
        console.log('[useDesktopMenuNavigation] posApp not available');
        return;
      }

      if (typeof posApp.onNavigate !== 'function') {
        console.log('[useDesktopMenuNavigation] onNavigate not a function');
        return;
      }

      // Listen for navigation events from the desktop menu
      console.log('[useDesktopMenuNavigation] Setting up navigation listener');
      const unsubscribe = posApp.onNavigate((route: string) => {
        console.log('[useDesktopMenuNavigation] Received navigate event:', route);
        try {
          navigate(route);
        } catch (navError) {
          console.error('[useDesktopMenuNavigation] Navigation failed:', navError);
        }
      });

      // Cleanup
      return () => {
        console.log('[useDesktopMenuNavigation] Cleaning up listener');
        try {
          unsubscribe();
        } catch (cleanupError) {
          console.error('[useDesktopMenuNavigation] Cleanup error:', cleanupError);
        }
      };
    } catch (error) {
      console.error('[useDesktopMenuNavigation] Error setting up navigation listener:', error);
      // Return empty cleanup function on error
      return () => {};
    }
  }, [navigate]);
}
