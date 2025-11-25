import axios from 'axios';
import { API_URL } from '../config';
import { useAuthStore } from '../stores/authStore';

const isLocalEnvironment = () => {
  if (typeof window === 'undefined') {
    return false;
  }

  const host = window.location.hostname;
  return (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host.endsWith('.local') ||
    host === 'capacitor://localhost'
  );
};

const getPrintProxyUrl = (): string => {
  if (typeof window === 'undefined') {
    return '';
  }

  const stored = localStorage.getItem('printProxyUrl');
  if (stored && stored.trim() !== '') {
    return stored;
  }

  const defaultUrl = import.meta.env.VITE_PRINT_PROXY_URL || 'ws://localhost:8080';
  // Only use default URL automatically in local environments
  if (isLocalEnvironment()) {
    return defaultUrl;
  }

  // On production domains, do not auto-connect unless user explicitly configures URL
  return '';
};

export interface Printer {
  id: string;
  type: 'serial' | 'network';
  config: {
    path?: string;
    host?: string;
    port?: number;
    baudRate?: number;
  };
}

export class ReceiptService {
  private ws: WebSocket | null = null;
  private connectionPromise: Promise<void> | null = null;
  private registeredPrinters: Map<string, Printer> = new Map();
  private messageHandlers: Map<string, (data: any) => void> = new Map();

  /**
   * Get receipt text
   */
  async getReceipt(orderId: string): Promise<string> {
    const accessToken = useAuthStore.getState().accessToken;
    if (!accessToken) {
      throw new Error('Not authenticated');
    }

    const response = await axios.get(`${API_URL}/api/v1/receipts/${orderId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    return response.data.receipt;
  }

  /**
   * Send receipt via email
   */
  async sendEmailReceipt(orderId: string, email: string): Promise<boolean> {
    const accessToken = useAuthStore.getState().accessToken;
    if (!accessToken) {
      throw new Error('Not authenticated');
    }

    try {
      const response = await axios.post(
        `${API_URL}/api/v1/receipts/${orderId}/email`,
        { email },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );
      return response.data.success;
    } catch (error) {
      console.error('Failed to send email receipt:', error);
      return false;
    }
  }

  /**
   * Connect to print proxy WebSocket
   */
  private async connect(): Promise<void> {
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return Promise.resolve();
    }

    this.connectionPromise = new Promise((resolve, reject) => {
      try {
        const proxyUrl = getPrintProxyUrl();
        // Only attempt connection if URL is valid (not empty)
        if (!proxyUrl || proxyUrl.trim() === '') {
          this.connectionPromise = null;
          reject(new Error('Print proxy URL not configured'));
          return;
        }
        this.ws = new WebSocket(proxyUrl);

        this.ws.onopen = () => {
          console.log('Connected to print proxy');
          this.connectionPromise = null;
          resolve();
        };

        this.ws.onerror = (error) => {
          // Silently handle connection errors - print proxy may not be running
          // Only log in debug mode
          if (import.meta.env.DEV) {
            console.debug('Print proxy connection error (expected if server not running):', error);
          }
          this.connectionPromise = null;
          reject(new Error('Failed to connect to print proxy'));
        };

        this.ws.onclose = () => {
          // Silently handle disconnection - print proxy may not be running
          if (import.meta.env.DEV) {
            console.debug('Disconnected from print proxy');
          }
          this.ws = null;
          this.connectionPromise = null;
        };

        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('Failed to parse print proxy message:', error);
          }
        };

        // Timeout after 5 seconds
        setTimeout(() => {
          if (this.ws?.readyState !== WebSocket.OPEN) {
            this.connectionPromise = null;
            reject(new Error('Connection timeout'));
          }
        }, 5000);
      } catch (error) {
        this.connectionPromise = null;
        reject(error);
      }
    });

    return this.connectionPromise;
  }

  /**
   * Handle messages from print proxy
   */
  private handleMessage(message: any): void {
    if (message.error) {
      console.error('Print proxy error:', message.error);
      return;
    }

    // Handle registered printer responses
    if (message.success && message.message?.includes('registered')) {
      console.log('Printer registered:', message.message);
    }

    // Call registered message handlers
    if (message.type && this.messageHandlers.has(message.type)) {
      const handler = this.messageHandlers.get(message.type)!;
      handler(message);
    }
  }

  /**
   * Register a printer with the print proxy
   */
  async registerPrinter(printerId: string, type: 'serial' | 'network', config: Printer['config']): Promise<boolean> {
    try {
      await this.connect();

      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        throw new Error('Not connected to print proxy');
      }

      return new Promise((resolve) => {
        const handler = (message: any) => {
          if (message.success) {
            this.registeredPrinters.set(printerId, { id: printerId, type, config });
            resolve(true);
          } else {
            resolve(false);
          }
          this.messageHandlers.delete(`register-${printerId}`);
        };

        this.messageHandlers.set(`register-${printerId}`, handler);

        if (this.ws) {
          this.ws.send(
            JSON.stringify({
              type: 'register-printer',
              printerId,
              printerType: type,
              config,
            }),
          );
        }

        // Timeout after 5 seconds
        setTimeout(() => {
          if (this.messageHandlers.has(`register-${printerId}`)) {
            this.messageHandlers.delete(`register-${printerId}`);
            resolve(false);
          }
        }, 5000);
      });
    } catch (error) {
      console.error('Failed to register printer:', error);
      return false;
    }
  }

  /**
   * List registered printers
   */
  async listPrinters(): Promise<Printer[]> {
    try {
      await this.connect();

      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        throw new Error('Not connected to print proxy');
      }

      return new Promise((resolve) => {
        const handler = (message: any) => {
          if (message.success && message.printers) {
            resolve(message.printers);
          } else {
            resolve([]);
          }
          this.messageHandlers.delete('list-printers');
        };

        this.messageHandlers.set('list-printers', handler);

        this.ws!.send(
          JSON.stringify({
            type: 'list-printers',
          }),
        );

        // Timeout after 5 seconds
        setTimeout(() => {
          if (this.messageHandlers.has('list-printers')) {
            this.messageHandlers.delete('list-printers');
            resolve([]);
          }
        }, 5000);
      });
    } catch (error) {
      console.error('Failed to list printers:', error);
      return [];
    }
  }

  /**
   * Print receipt using print proxy (ESC/POS printer)
   */
  async printReceipt(orderId: string, printerId?: string): Promise<boolean> {
    try {
      const accessToken = useAuthStore.getState().accessToken;
      if (!accessToken) {
        throw new Error('Not authenticated');
      }

      // Get receipt in ESC/POS format
      const response = await axios.get(`${API_URL}/api/v1/receipts/${orderId}/print`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const { escpos } = response.data;

      // Connect to print proxy
      await this.connect();

      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        throw new Error('Not connected to print proxy');
      }

      // Use default printer if none specified
      const targetPrinterId = printerId || 'default-printer';

      // Send print job
      return new Promise((resolve) => {
        const handler = (message: any) => {
          if (message.success) {
            resolve(true);
          } else {
            resolve(false);
          }
          this.messageHandlers.delete(`print-${orderId}`);
        };

        this.messageHandlers.set(`print-${orderId}`, handler);

        this.ws!.send(
          JSON.stringify({
            type: 'print',
            printerId: targetPrinterId,
            data: escpos,
            format: 'escpos',
          }),
        );

        // Timeout after 10 seconds
        setTimeout(() => {
          if (this.messageHandlers.has(`print-${orderId}`)) {
            this.messageHandlers.delete(`print-${orderId}`);
            resolve(false);
          }
        }, 10000);
      });
    } catch (error) {
      console.error('Failed to print receipt:', error);
      return false;
    }
  }

  /**
   * Print receipt using browser print dialog (fallback)
   */
  async printReceiptBrowser(orderId: string): Promise<boolean> {
    try {
      const receipt = await this.getReceipt(orderId);
      
      // Create a new window for printing
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        throw new Error('Popup blocked. Please allow popups to print receipts.');
      }

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Receipt - Order ${orderId}</title>
            <style>
              @media print {
                @page {
                  size: 80mm auto;
                  margin: 0;
                }
                body {
                  margin: 0;
                  padding: 10mm;
                  font-family: 'Courier New', monospace;
                  font-size: 12px;
                  line-height: 1.4;
                }
              }
              body {
                font-family: 'Courier New', monospace;
                font-size: 12px;
                line-height: 1.4;
                padding: 20px;
                white-space: pre-wrap;
                max-width: 80mm;
                margin: 0 auto;
              }
            </style>
          </head>
          <body>
            <pre>${receipt.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
            <script>
              window.onload = function() {
                window.print();
                window.onafterprint = function() {
                  window.close();
                };
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();

      return true;
    } catch (error) {
      console.error('Failed to print receipt via browser:', error);
      return false;
    }
  }

  /**
   * Check if print proxy is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const url = getPrintProxyUrl();
      if (!url) {
        return false;
      }
      await this.connect();
      return this.ws?.readyState === WebSocket.OPEN;
    } catch (error) {
      return false;
    }
  }

  hasConfiguredProxy(): boolean {
    const url = getPrintProxyUrl();
    return Boolean(url && url.trim() !== '');
  }

  /**
   * Disconnect from print proxy
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.connectionPromise = null;
    this.messageHandlers.clear();
  }
}

// Export singleton instance
export const receiptService = new ReceiptService();
