import { db, logger } from '../config';

export interface AuditLogEntry {
  userId?: string;
  userType: 'client' | 'admin' | 'system';
  action: string;
  resourceType?: string;
  resourceId?: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuditLogRecord extends AuditLogEntry {
  id: string;
  createdAt: Date;
}

export class AuditService {
  async log(entry: AuditLogEntry): Promise<void> {
    try {
      await db.query(
        `INSERT INTO audit_logs (user_id, user_type, action, resource_type, resource_id, old_values, new_values, ip_address, user_agent)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          entry.userId || null,
          entry.userType,
          entry.action,
          entry.resourceType || null,
          entry.resourceId || null,
          entry.oldValues ? JSON.stringify(entry.oldValues) : null,
          entry.newValues ? JSON.stringify(entry.newValues) : null,
          entry.ipAddress || null,
          entry.userAgent || null,
        ]
      );
    } catch (error) {
      // Don't let audit logging failures break the application
      logger.error('Failed to write audit log', { error, entry });
    }
  }

  async getAuditLogs(filters: {
    userId?: string;
    userType?: string;
    action?: string;
    resourceType?: string;
    resourceId?: string;
    from?: Date;
    to?: Date;
    limit?: number;
    offset?: number;
  }): Promise<{ logs: AuditLogRecord[]; total: number }> {
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIdx = 1;

    if (filters.userId) {
      conditions.push(`user_id = $${paramIdx++}`);
      params.push(filters.userId);
    }
    if (filters.userType) {
      conditions.push(`user_type = $${paramIdx++}`);
      params.push(filters.userType);
    }
    if (filters.action) {
      conditions.push(`action ILIKE $${paramIdx++}`);
      params.push(`%${filters.action}%`);
    }
    if (filters.resourceType) {
      conditions.push(`resource_type = $${paramIdx++}`);
      params.push(filters.resourceType);
    }
    if (filters.resourceId) {
      conditions.push(`resource_id = $${paramIdx++}`);
      params.push(filters.resourceId);
    }
    if (filters.from) {
      conditions.push(`created_at >= $${paramIdx++}`);
      params.push(filters.from);
    }
    if (filters.to) {
      conditions.push(`created_at <= $${paramIdx++}`);
      params.push(filters.to);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = filters.limit || 50;
    const offset = filters.offset || 0;

    const [rows, countResult] = await Promise.all([
      db.queryAll<{
        id: string;
        user_id: string;
        user_type: string;
        action: string;
        resource_type: string;
        resource_id: string;
        old_values: any;
        new_values: any;
        ip_address: string;
        user_agent: string;
        created_at: Date;
      }>(
        `SELECT * FROM audit_logs ${where}
         ORDER BY created_at DESC
         LIMIT ${limit} OFFSET ${offset}`,
        params
      ),
      db.queryOne<{ count: string }>(
        `SELECT COUNT(*) as count FROM audit_logs ${where}`,
        params
      ),
    ]);

    return {
      logs: rows.map(r => ({
        id: r.id,
        userId: r.user_id,
        userType: r.user_type as 'client' | 'admin' | 'system',
        action: r.action,
        resourceType: r.resource_type,
        resourceId: r.resource_id,
        oldValues: r.old_values,
        newValues: r.new_values,
        ipAddress: r.ip_address,
        userAgent: r.user_agent,
        createdAt: r.created_at,
      })),
      total: parseInt(countResult?.count || '0'),
    };
  }

  async getAuditLogsForResource(
    resourceType: string,
    resourceId: string
  ): Promise<AuditLogRecord[]> {
    const result = await this.getAuditLogs({ resourceType, resourceId, limit: 100 });
    return result.logs;
  }
}

export const auditService = new AuditService();
export default auditService;
