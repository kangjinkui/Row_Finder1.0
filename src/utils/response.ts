/**
 * Standard API Response Utilities
 */

import type { Context } from 'hono';
import type { ApiResponse, PaginatedResponse } from '../types/database';

export const success = <T>(c: Context, data: T, message?: string, status: number = 200) => {
  return c.json<ApiResponse<T>>({
    success: true,
    data,
    message
  }, status);
};

export const error = (c: Context, message: string, status: number = 400) => {
  return c.json<ApiResponse<never>>({
    success: false,
    error: message
  }, status);
};

export const paginated = <T>(
  c: Context,
  items: T[],
  total: number,
  page: number,
  limit: number
) => {
  const total_pages = Math.ceil(total / limit);
  
  return c.json<PaginatedResponse<T>>({
    items,
    total,
    page,
    limit,
    total_pages
  });
};

export const notFound = (c: Context, resource: string = 'Resource') => {
  return error(c, `${resource} not found`, 404);
};

export const unauthorized = (c: Context, message: string = 'Unauthorized') => {
  return error(c, message, 401);
};

export const forbidden = (c: Context, message: string = 'Forbidden') => {
  return error(c, message, 403);
};

export const serverError = (c: Context, message: string = 'Internal server error') => {
  return error(c, message, 500);
};
