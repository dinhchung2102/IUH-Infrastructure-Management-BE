export interface ErrorConfig {
  message: string;
  errorCode: string;
}

export interface SuccessResponseConfig {
  defaultMessage: string;
  includeTimestamp: boolean;
  includePath: boolean;
}

export const ERROR_CONFIGS: Map<string, ErrorConfig> = new Map([
  [
    'ThrottlerException',
    {
      message: 'Quá nhiều yêu cầu. Vui lòng thử lại sau',
      errorCode: 'TOO_MANY_REQUESTS',
    },
  ],
  [
    'ForbiddenException',
    {
      message: 'Bạn không đủ quyền để thực hiện hành động này',
      errorCode: 'FORBIDDEN_RESOURCE',
    },
  ],
  [
    'ValidationException',
    {
      message: 'Dữ liệu không hợp lệ',
      errorCode: 'VALIDATION_ERROR',
    },
  ],
]);

export const DEFAULT_ERROR: ErrorConfig = {
  message: 'Lỗi máy chủ nội bộ',
  errorCode: 'INTERNAL_ERROR',
};

export const SUCCESS_RESPONSE_CONFIG: SuccessResponseConfig = {
  defaultMessage: 'Thành công',
  includeTimestamp: true,
  includePath: true,
};

export const STATUS_ERROR_MAP: Record<number, string> = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  422: 'UNPROCESSABLE_ENTITY',
  429: 'TOO_MANY_REQUESTS',
  500: 'INTERNAL_SERVER_ERROR',
};
