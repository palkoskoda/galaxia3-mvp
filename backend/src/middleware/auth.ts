import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { createError } from '../utils/errors';
import { JwtPayload, User } from '../types';
import { query } from '../db';

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export const generateToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
};

export const verifyToken = (token: string): JwtPayload => {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
};

// Helper to transform user from DB format
const transformUser = (user: any): User => ({
  id: user.id,
  email: user.email,
  firstName: user.first_name,
  lastName: user.last_name,
  phone: user.phone,
  address: user.address,
  role: user.role,
  isActive: user.is_active === 1,
  createdAt: user.created_at,
  updatedAt: user.updated_at,
});

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      return next(createError('Access token required', 401));
    }

    try {
      const decoded = verifyToken(token);
      
      // Fetch full user from database
      const result = await query<any>(
        'SELECT id, email, first_name, last_name, phone, address, role, is_active, created_at, updated_at FROM users WHERE id = $1',
        [decoded.userId]
      );

      if (result.rows.length === 0) {
        return next(createError('User not found', 401));
      }

      const userRow = result.rows[0];
      
      if (userRow.is_active !== 1) {
        return next(createError('Account is deactivated', 401));
      }

      req.user = transformUser(userRow);
      next();
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        next(createError('Invalid token', 401));
      } else {
        next(error);
      }
    }
  } catch (error) {
    next(error);
  }
};

export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(createError('Authentication required', 401));
      return;
    }

    if (!roles.includes(req.user.role)) {
      next(createError('Insufficient permissions', 403));
      return;
    }

    next();
  };
};
