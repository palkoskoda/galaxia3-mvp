import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../db';
import { generateToken, authenticate } from '../middleware/auth';
import { loginSchema, registerSchema } from '../utils/validators';
import { ValidationError, ConflictError } from '../utils/errors';
import { AuthResponse, ApiResponse, User } from '../types';

const router = Router();

// Helper to transform user from DB format
const transformUser = (user: any): User => ({
  id: user.id,
  email: user.email,
  firstName: user.first_name,
  lastName: user.last_name,
  phone: user.phone,
  address: user.address,
  role: user.role,
  isSenior: user.is_senior === 1,
  isActive: user.is_active === 1,
  createdAt: user.created_at,
  updatedAt: user.updated_at,
});

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = registerSchema.parse(req.body);
    
    // Check if email exists
    const existing = await query('SELECT id FROM users WHERE email = $1', [validated.email]);
    if (existing.rows.length > 0) {
      throw new ConflictError('Email already registered');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(validated.password, 10);

    // Create user with explicit ID
    const userId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const result = await query<any>(
      `INSERT INTO users (id, email, password_hash, first_name, last_name, phone, address, role)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'customer')
       RETURNING id, email, first_name, last_name, phone, address, role, is_active, created_at, updated_at`,
      [userId, validated.email, passwordHash, validated.firstName, validated.lastName, validated.phone, validated.address]
    );

    const user = transformUser(result.rows[0]);
    const token = generateToken({ userId: user.id, email: user.email, role: user.role });

    const response: ApiResponse<AuthResponse> = {
      success: true,
      data: { user, token },
    };

    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = loginSchema.parse(req.body);

    // Find user
    const result = await query<any>(
      'SELECT * FROM users WHERE email = $1',
      [validated.email]
    );

    if (result.rows.length === 0) {
      throw new ValidationError('Invalid credentials');
    }

    const userRow = result.rows[0];

    if (userRow.is_active !== 1) {
      throw new ValidationError('Account is deactivated');
    }

    // Verify password
    const isValid = await bcrypt.compare(validated.password, userRow.password_hash);
    if (!isValid) {
      throw new ValidationError('Invalid credentials');
    }

    const user = transformUser(userRow);
    const token = generateToken({ userId: user.id, email: user.email, role: user.role });

    const response: ApiResponse<AuthResponse> = {
      success: true,
      data: { user, token },
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const response: ApiResponse<User> = {
      success: true,
      data: req.user,
    };
    res.json(response);
  } catch (error) {
    next(error);
  }
});

// PUT /api/auth/profile
router.put('/profile', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { firstName, lastName, phone, address } = req.body;

    const result = await query<any>(
      `UPDATE users 
       SET first_name = COALESCE($1, first_name),
           last_name = COALESCE($2, last_name),
           phone = COALESCE($3, phone),
           address = COALESCE($4, address)
       WHERE id = $5
       RETURNING id, email, first_name, last_name, phone, address, role, is_active, created_at, updated_at`,
      [firstName, lastName, phone, address, req.user!.id]
    );

    const user = transformUser(result.rows[0]);

    const response: ApiResponse<User> = {
      success: true,
      data: user,
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

export default router;
