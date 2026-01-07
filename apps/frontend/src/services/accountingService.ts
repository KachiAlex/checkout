import axios from "axios";
import { API_URL } from "../config";

export interface AccountingAccount {
  id: string;
  code: string;
  name: string;
  type: string;
  isActive: boolean;
  isSystem?: boolean;
}

export interface AccountingMapping {
  id: string;
  eventType: string;
  branchId?: string | null;
  debitAccountId: string;
  creditAccountId: string;
  isActive: boolean;
}

export interface JournalLine {
  id: string;
  accountId: string;
  description?: string | null;
  debitCents: number;
  creditCents: number;
  taxRuleId?: string | null;
}

export interface JournalEntry {
  id: string;
  locationId?: string | null;
  source: string;
  sourceId: string;
  reference?: string | null;
  memo?: string | null;
  status: string;
  currency: string;
  postedAt?: string | null;
  createdAt: string;
  lines: JournalLine[];
}

export const accountingService = {
  async listAccounts(): Promise<AccountingAccount[]> {
    const res = await axios.get(`${API_URL}/api/v1/admin/accounting/accounts`);
    return res.data || [];
  },

  async listMappings(): Promise<AccountingMapping[]> {
    const res = await axios.get(`${API_URL}/api/v1/admin/accounting/mappings`);
    return res.data || [];
  },

  async upsertMapping(eventType: string, input: {
    debitAccountId: string;
    creditAccountId: string;
    branchId?: string;
    isActive?: boolean;
  }): Promise<AccountingMapping> {
    const res = await axios.put(
      `${API_URL}/api/v1/admin/accounting/mappings/${encodeURIComponent(eventType)}`,
      input,
    );
    return res.data;
  },

  async listJournals(params: {
    locationId?: string;
    source?: string;
    status?: string;
    from?: string;
    to?: string;
  }): Promise<JournalEntry[]> {
    const res = await axios.get(`${API_URL}/api/v1/admin/accounting/journals`, {
      params,
    });
    return res.data || [];
  },

  async getJournal(id: string): Promise<JournalEntry> {
    const res = await axios.get(`${API_URL}/api/v1/admin/accounting/journals/${id}`);
    return res.data;
  },

  async generalLedger(params: {
    accountId: string;
    locationId?: string;
    from?: string;
    to?: string;
  }): Promise<any> {
    const res = await axios.get(
      `${API_URL}/api/v1/admin/accounting/reports/general-ledger`,
      { params },
    );
    return res.data;
  },

  async trialBalance(params: {
    locationId?: string;
    from?: string;
    to?: string;
  }): Promise<any> {
    const res = await axios.get(
      `${API_URL}/api/v1/admin/accounting/reports/trial-balance`,
      { params },
    );
    return res.data;
  },

  async profitAndLoss(params: {
    locationId?: string;
    from?: string;
    to?: string;
  }): Promise<any> {
    const res = await axios.get(
      `${API_URL}/api/v1/admin/accounting/reports/profit-loss`,
      { params },
    );
    return res.data;
  },

  async balanceSheet(params: {
    locationId?: string;
    asOf?: string;
  }): Promise<any> {
    const res = await axios.get(
      `${API_URL}/api/v1/admin/accounting/reports/balance-sheet`,
      { params },
    );
    return res.data;
  },
};
