export type Ok<T>  = { ok: true;  data: T }
export type Err<E> = { ok: false; error: E }
export type Result<T, E = AppError> = Ok<T> | Err<E>

export function ok<T>(data: T): Ok<T>    { return { ok: true,  data  } }
export function err<E>(error: E): Err<E> { return { ok: false, error } }

export const ErrorCode = {
  UNAUTHORISED:           'UNAUTHORISED',
  FORBIDDEN:              'FORBIDDEN',
  TOKEN_EXPIRED:          'TOKEN_EXPIRED',
  INVALID_CREDENTIALS:    'INVALID_CREDENTIALS',
  VALIDATION_ERROR:       'VALIDATION_ERROR',
  DUPLICATE_RECORD:       'DUPLICATE_RECORD',
  NEAR_DUPLICATE_WARNING: 'NEAR_DUPLICATE_WARNING',
  BUDGET_EXCEEDED:        'BUDGET_EXCEEDED',
  MATCH_EXCEPTION:        'MATCH_EXCEPTION',
  WORKFLOW_INVALID_STATE: 'WORKFLOW_INVALID_STATE',
  APPROVAL_NOT_ALLOWED:   'APPROVAL_NOT_ALLOWED',
  NOT_FOUND:              'NOT_FOUND',
  CONFLICT:               'CONFLICT',
  DATABASE_ERROR:         'DATABASE_ERROR',
  CACHE_ERROR:            'CACHE_ERROR',
  INTERNAL_ERROR:         'INTERNAL_ERROR',
} as const

export type ErrorCodeType = typeof ErrorCode[keyof typeof ErrorCode]

export interface AppError {
  code:        ErrorCodeType
  message:     string
  details?:    Record<string, unknown>
  httpStatus?: number
}

export const Errors = {
  notFound: (entity: string, id?: string): AppError => ({
    code: ErrorCode.NOT_FOUND,
    message: id ? `${entity} '${id}' not found` : `${entity} not found`,
    httpStatus: 404,
  }),
  validationError: (details: Record<string, string>): AppError => ({
    code: ErrorCode.VALIDATION_ERROR,
    message: 'Validation failed',
    details,
    httpStatus: 400,
  }),
  duplicateRecord: (entity: string, field: string, value: string): AppError => ({
    code: ErrorCode.DUPLICATE_RECORD,
    message: `${entity} with ${field} '${value}' already exists`,
    details: { field, value },
    httpStatus: 409,
  }),
  nearDuplicateWarning: (matches: unknown[]): AppError => ({
    code: ErrorCode.NEAR_DUPLICATE_WARNING,
    message: 'Similar records found — please confirm this is not a duplicate',
    details: { matches: matches as Record<string, unknown>[] },
    httpStatus: 409,
  }),
  budgetExceeded: (available: number, requested: number): AppError => ({
    code: ErrorCode.BUDGET_EXCEEDED,
    message: `Requested ₹${requested.toLocaleString('en-IN')} exceeds available budget ₹${available.toLocaleString('en-IN')}`,
    details: { available, requested },
    httpStatus: 422,
  }),
  unauthorised: (reason?: string): AppError => ({
    code: ErrorCode.UNAUTHORISED,
    message: reason ?? 'Authentication required',
    httpStatus: 401,
  }),
  forbidden: (action?: string): AppError => ({
    code: ErrorCode.FORBIDDEN,
    message: action ? `You do not have permission to ${action}` : 'Access denied',
    httpStatus: 403,
  }),
  internal: (cause?: unknown): AppError => ({
    code: ErrorCode.INTERNAL_ERROR,
    message: 'An unexpected error occurred',
    details: process.env.NODE_ENV !== 'production' ? { cause: String(cause) } : undefined,
    httpStatus: 500,
  }),
} as const
