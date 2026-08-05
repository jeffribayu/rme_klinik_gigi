import { ZodError } from 'zod';
import { AppError } from '../utils/AppError.js';

export function validateBody(schema) {
  return (req, res, next) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (e) {
      if (e instanceof ZodError) {
        return next(
          new AppError('Validasi gagal', 422, e.flatten().fieldErrors)
        );
      }
      next(e);
    }
  };
}

export function validateQuery(schema) {
  return (req, res, next) => {
    try {
      req.query = schema.parse(req.query);
      next();
    } catch (e) {
      if (e instanceof ZodError) {
        return next(
          new AppError('Query tidak valid', 422, e.flatten().fieldErrors)
        );
      }
      next(e);
    }
  };
}
