import { AdminJwtPayload, JwtPayload } from '../types/auth.types';

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
      admin?: AdminJwtPayload;
    }
  }
}
