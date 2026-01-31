import { Request, Response, NextFunction } from 'express';
import { auditService } from '../services/audit.service';

/**
 * Middleware factory to audit specific route actions.
 * Usage: router.post('/resource', authenticate, auditLog('create', 'resource'), handler)
 */
export function auditLog(action: string, resourceType?: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const originalJson = res.json.bind(res);

    res.json = function (body: any) {
      // Only audit successful operations (2xx)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const authReq = req as any;
        const userId = authReq.user?.userId || authReq.admin?.adminId;
        const userType = authReq.admin ? 'admin' : authReq.user ? 'client' : 'system';

        auditService.log({
          userId,
          userType: userType as 'client' | 'admin' | 'system',
          action,
          resourceType,
          resourceId: req.params.id || body?.data?.id,
          newValues: ['POST', 'PUT', 'PATCH'].includes(req.method) ? req.body : undefined,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        });
      }

      return originalJson(body);
    } as any;

    next();
  };
}
