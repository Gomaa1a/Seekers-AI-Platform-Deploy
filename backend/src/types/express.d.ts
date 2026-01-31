// Express Request type augmentation
import { AdminJwtPayload, JwtPayload } from './auth.types';

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
      admin?: AdminJwtPayload;
    }
  }
}

export {};
