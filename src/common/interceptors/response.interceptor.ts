import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

interface ErrorResponse {
  statusCode: number;
  message: string | string[];
  error?: string;
  timestamp: string;
  path: string;
}

interface SuccessResponse<T = any> {
  statusCode: number;
  message: string;
  data?: T;
}

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url } = request;

    return next.handle().pipe(
      map((data) => {
        const statusCode = context.switchToHttp().getResponse().statusCode || HttpStatus.OK;

        // If data already has statusCode, it's a custom response
        if (data && typeof data === 'object' && 'statusCode' in data) {
          return data;
        }

        return {
          statusCode,
          message: data?.message || 'Success',
          data: data?.data || data,
          timestamp: new Date().toISOString(),
        } as SuccessResponse;
      }),
      catchError((error) => {
        const response = context.switchToHttp().getResponse();
        const request = context.switchToHttp().getRequest();

        let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
        let message: string | string[] = 'Internal server error';
        let errorType = 'InternalServerError';

        // Handle HttpException
        if (error instanceof HttpException) {
          statusCode = error.getStatus();
          const exceptionResponse = error.getResponse();

          if (typeof exceptionResponse === 'object') {
            const { message: msg, error: err } = exceptionResponse as any;
            message = msg || error.message;
            errorType = err || error.constructor.name;
          } else {
            message = exceptionResponse as string;
          }
        }
        // Handle Prisma validation errors
        else if (error.code === 'P2025') {
          statusCode = HttpStatus.NOT_FOUND;
          message = 'Resource not found';
          errorType = 'NotFound';
        }
        // Handle Prisma unique constraint errors
        else if (error.code === 'P2002') {
          statusCode = HttpStatus.CONFLICT;
          message = `Unique constraint failed on ${error.meta?.target?.join(', ')}`;
          errorType = 'Conflict';
        }
        // Handle validation errors
        else if (error instanceof BadRequestException) {
          statusCode = HttpStatus.BAD_REQUEST;
          message = error.getResponse() as any;
        } else {
          message = error.message || 'Internal server error';
        }

        const errorResponse: ErrorResponse = {
          statusCode,
          message,
          error: errorType,
          timestamp: new Date().toISOString(),
          path: request.url,
        };

        response.status(statusCode).json(errorResponse);

        return throwError(() => error);
      }),
    );
  }
}
