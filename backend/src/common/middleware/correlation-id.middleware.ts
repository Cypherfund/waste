import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    // Priority: X-Request-Id → X-Correlation-ID → generate UUID v4
    const requestId = (req.headers['x-request-id'] as string) || 
                     (req.headers['x-correlation-id'] as string) || 
                     uuidv4();
    
    // Store both in request headers for downstream use
    req.headers['x-request-id'] = requestId;
    req.headers['x-correlation-id'] = requestId;
    
    // Return both headers in response for backward compatibility
    res.setHeader('X-Request-Id', requestId);
    res.setHeader('X-Correlation-ID', requestId);
    
    next();
  }
}
