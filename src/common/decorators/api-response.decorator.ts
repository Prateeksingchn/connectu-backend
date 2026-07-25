import { applyDecorators, Type } from '@nestjs/common';
import { ApiExtraModels, ApiResponse, getSchemaPath } from '@nestjs/swagger';

/**
 * Every successful response passes through ResponseInterceptor, which wraps
 * the controller's return value as { success: true, data: <value> }. These
 * helpers document that actual wire shape instead of the raw DTO.
 */
interface WrappedResponseOptions {
  status?: number;
  description?: string;
  isArray?: boolean;
}

export const ApiWrappedResponse = <TModel extends Type<unknown>>(
  model: TModel,
  options: WrappedResponseOptions = {},
) => {
  const { status = 200, description, isArray = false } = options;
  return applyDecorators(
    ApiExtraModels(model),
    ApiResponse({
      status,
      description,
      schema: {
        properties: {
          success: { type: 'boolean', example: true },
          data: isArray
            ? { type: 'array', items: { $ref: getSchemaPath(model) } }
            : { $ref: getSchemaPath(model) },
        },
      },
    }),
  );
};

interface WrappedPrimitiveOptions {
  status?: number;
  description?: string;
  example: Record<string, unknown> | unknown[] | string | number | boolean;
}

/** For handlers that return plain objects/arrays with no dedicated DTO class. */
export const ApiWrappedOkResponse = (options: WrappedPrimitiveOptions) => {
  const { status = 200, description, example } = options;
  return ApiResponse({
    status,
    description,
    schema: {
      properties: {
        success: { type: 'boolean', example: true },
        data: { example },
      },
    },
  });
};

/**
 * Every thrown HttpException passes through HttpExceptionFilter, which
 * responds with { success: false, statusCode, message }.
 */
export const ApiErrorResponse = (
  status: number,
  description: string,
  exampleMessage: string | string[],
) =>
  ApiResponse({
    status,
    description,
    schema: {
      properties: {
        success: { type: 'boolean', example: false },
        statusCode: { type: 'number', example: status },
        message: Array.isArray(exampleMessage)
          ? {
              type: 'array',
              items: { type: 'string' },
              example: exampleMessage,
            }
          : { type: 'string', example: exampleMessage },
      },
    },
  });
