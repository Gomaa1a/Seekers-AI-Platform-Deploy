import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationChain } from 'express-validator';
import { z, ZodSchema, ZodError } from 'zod';
import { ValidationError } from './errorHandler';

/**
 * Express-validator middleware
 */
export const validate = (validations: ValidationChain[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Run all validations
    await Promise.all(validations.map(validation => validation.run(req)));

    const errors = validationResult(req);

    if (errors.isEmpty()) {
      next();
      return;
    }

    const formattedErrors = errors.array().map(err => ({
      field: (err as any).path || (err as any).param || 'unknown',
      message: err.msg,
    }));

    res.status(400).json({
      success: false,
      error: 'Validation failed',
      errors: formattedErrors,
    });
  };
};

/**
 * Zod schema validation middleware
 */
export const validateSchema = <T>(schema: ZodSchema<T>, source: 'body' | 'query' | 'params' = 'body') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const data = source === 'body' ? req.body : source === 'query' ? req.query : req.params;
      const validated = schema.parse(data);
      
      if (source === 'body') {
        req.body = validated;
      } else if (source === 'query') {
        (req as any).validatedQuery = validated;
      } else {
        (req as any).validatedParams = validated;
      }
      
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedErrors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          errors: formattedErrors,
        });
        return;
      }
      
      next(error);
    }
  };
};

// ============================================
// Common Validation Schemas
// ============================================

export const schemas = {
  // UUID validation
  uuid: z.string().uuid('Invalid UUID format'),

  // Email validation
  email: z.string().email('Invalid email address').toLowerCase().trim(),

  // Password validation
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password too long')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),

  // Phone validation
  phone: z
    .string()
    .regex(/^[0-9+\-\s()]+$/, 'Invalid phone number format')
    .optional(),

  // URL validation
  url: z.string().url('Invalid URL format'),

  // Pagination
  pagination: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  }),

  // Date range
  dateRange: z.object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
  }),

  // Registration
  register: z.object({
    email: z.string().email().toLowerCase().trim(),
    password: z
      .string()
      .min(8)
      .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
    fullName: z.string().min(2).max(100).trim(),
    organizationName: z.string().min(2).max(200).trim(),
    phone: z.string().optional(),
    industry: z.string().optional(),
  }),

  // Login
  login: z.object({
    email: z.string().email().toLowerCase().trim(),
    password: z.string().min(1, 'Password is required'),
  }),

  // Knowledge base
  createKnowledgeBase: z.object({
    name: z.string().min(1).max(255).trim(),
    description: z.string().max(1000).optional(),
    type: z.enum(['chatbot', 'comments']),
    content: z.string().min(1),
    contentFormat: z.enum(['text', 'markdown', 'json']).default('text'),
  }),

  updateKnowledgeBase: z.object({
    name: z.string().min(1).max(255).trim().optional(),
    description: z.string().max(1000).optional(),
    content: z.string().min(1).optional(),
    contentFormat: z.enum(['text', 'markdown', 'json']).optional(),
    isActive: z.boolean().optional(),
    changeReason: z.string().max(500).optional(),
  }),

  // Workflow request
  createWorkflowRequest: z.object({
    requestType: z.enum(['chatbot', 'comments', 'both']),
    title: z.string().min(1).max(255).trim(),
    description: z.string().min(10).max(5000).trim(),
    platforms: z.array(
      z.enum(['facebook_messenger', 'instagram_dm', 'facebook_comments', 'instagram_comments'])
    ).min(1),
  }),

  // Add-on request
  createAddonRequest: z.object({
    workflowRequestId: z.string().uuid().optional(),
    addonType: z.enum([
      'google_sheets',
      'whatsapp_notification',
      'email_notification',
      'crm_integration',
      'slack_notification',
      'telegram_notification',
      'custom_webhook',
      'analytics_export',
      'lead_scoring',
    ]),
    addonName: z.string().min(1).max(255).trim(),
    description: z.string().max(2000).optional(),
    configuration: z.record(z.any()).optional(),
  }),

  // Admin - assign webhook
  assignWebhook: z.object({
    organizationId: z.string().uuid(),
    workflowRequestId: z.string().uuid(),
    workflowType: z.enum(['facebook_comments', 'instagram_comments', 'messenger', 'instagram_dm']),
    n8nWebhookUrl: z.string().url(),
    n8nWorkflowId: z.string().optional(),
    knowledgeBaseId: z.string().uuid().optional(),
    connectToPages: z.array(z.string().uuid()).optional(),
    connectToInstagram: z.array(z.string().uuid()).optional(),
  }),
};

export default validate;
