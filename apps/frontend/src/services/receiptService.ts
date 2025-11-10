import axios from 'axios';
import { API_URL } from '../config';
const PRINT_PROXY_URL = import.meta.env.VITE_PRINT_PROXY_URL || 'ws://localhost:8080';

export class ReceiptService {
  private ws: WebSocket | null = null;

  async getReceipt(orderId: string): Promise<string> {
    const response = await axios.get(`${API_URL}/api/v1/receipts/${orderId}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('auth-storage')?.match(/"accessToken":"([^"]+)"/)?.[1]}`,
      },
    });
    return response.data.receipt;
  }

  async sendEmailReceipt(orderId: string, email: string): Promise<boolean> {
    const response = await axios.post(
      `${API_URL}/api/v1/receipts/${orderId}/email`,
      { email },
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('auth-storage')?.match(/"accessToken":"([^"]+)"/)?.[1]}`,
        },
      },
    );
    return response.data.success;
  }

  async printReceipt(orderId: string, printerId?: string): Promise<boolean> {
    try {
      // Get receipt in ESC/POS format
      const response = await axios.get(`${API_URL}/api/v1/receipts/${orderId}/print`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('auth-storage')?.match(/"accessToken":"([^"]+)"/)?.[1]}`,
        },
      });

      const { escpos } = response.data;

      // Connect to print proxy
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        this.ws = new WebSocket(PRINT_PROXY_URL);
        await this.waitForConnection();
      }

      // Send print job
      const defaultPrinterId = printerId || 'default-printer';
      this.ws.send(
        JSON.stringify({
          type: 'print',
          printerId: defaultPrinterId,
          data: escpos,
          format: 'escpos',
        }),
      );

      return true;
    } catch (error) {
      console.error('Failed to print receipt:', error);
      return false;
    }
  }

  private waitForConnection(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.ws) {
        reject(new Error('WebSocket not initialized'));
        return;
      }

      if (this.ws.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      this.ws.onopen = () => resolve();
      this.ws.onerror = (error) => reject(error);

      setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, 5000);
    });
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
