import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.error('Error:', err);

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
      code: err.code,
    });
    return;
  }

  // Zod validation errors
  if (err.name === 'ZodError') {
    res.status(400).json({
      success: false,
      error: 'Validation error',
      details: err,
    });
    return;
  }

  // PostgreSQL errors
  if (err.code && err.code.startsWith('23')) {
    res.status(409).json({
      success: false,
      error: 'Database constraint violation',
    });
    return;
  }

  // Default error
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message,
  });
};

export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  res.status(404).json({
    success: false,
    error: `Route ${req.originalUrl} not found`,
  });
};
