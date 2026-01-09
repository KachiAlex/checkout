import axios from "axios";
import { API_URL } from "../config";

export type SupportRequestInput = {
  subject: string;
  module?: string;
  message: string;
};

export const supportService = {
  async submitSupportRequest(input: SupportRequestInput): Promise<{ success: boolean; message: string }> {
    const res = await axios.post(`${API_URL}/api/v1/contact/support-request`, input);
    return res.data;
  },
};
