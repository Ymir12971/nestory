// Generic API envelope — all endpoints return this shape

export interface ApiResponse<T> {
  data: T;
  meta?: { timestamp: string };
}

export interface ApiError {
  error: {
    code: ApiErrorCode;
    message: string;
    statusCode: number;
  };
}

export interface Pagination {
  hasMore: boolean;
  nextCursor: string | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: Pagination;
}

export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'EMPTY_MEMORY'
  | 'UNAUTHORIZED'
  | 'HIGHLIGHT_LIMIT_REACHED'
  | 'PROFILE_SWITCH_RESTRICTED'
  | 'MEMORY_EDIT_RESTRICTED'
  | 'STORY_READ_ONLY'
  | 'NOT_FOUND'
  | 'STORY_ALREADY_EXISTS'
  | 'FILE_TOO_LARGE'
  | 'INVALID_FILE_TYPE'
  | 'INVALID_CAPTURED_AT_FUTURE'
  | 'INTERNAL_ERROR';
