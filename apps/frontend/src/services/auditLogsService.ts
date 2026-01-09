import axios from "axios";
import { API_URL } from "../config";

export type ComplianceAuditLog = {
  id: string;
  tenantId: string;
  actorId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  beforeJson?: any;
  afterJson?: any;
  source?: string | null;
  deviceId?: string | null;
  metadata?: any;
  createdAt: string;
};

export type ListAuditLogsResponse = {
  items: ComplianceAuditLog[];
  total: number;
  take: number;
  skip: number;
};

export const auditLogsService = {
  async list(params: {
    take?: number;
    skip?: number;
    from?: string;
    to?: string;
    entity?: string;
    entityId?: string;
    action?: string;
    actorId?: string;
  }): Promise<ListAuditLogsResponse> {
    const res = await axios.get(`${API_URL}/api/v1/audit-logs`, { params });
    return res.data;
  },

  async getById(id: string): Promise<ComplianceAuditLog | null> {
    const res = await axios.get(`${API_URL}/api/v1/audit-logs/${id}`);
    return res.data;
  },
};
