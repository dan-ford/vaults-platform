import { PostgrestError } from "@supabase/supabase-js";

/**
 * User-friendly error messages for common Supabase error codes
 */
const ERROR_MESSAGES: Record<string, string> = {
  "23505": "This record already exists. Please use a different value.",
  "23503": "Cannot delete this record because it is referenced by other data.",
  "23502": "Required field is missing. Please fill in all required fields.",
  "42501": "Permission denied. You don't have access to perform this action.",
  "42P01": "Database table not found. Please contact support.",
  "22P02": "Invalid data format. Please check your input.",
  PGRST116: "The record you're trying to access was not found.",
  PGRST301: "You don't have permission to access this resource.",
};

/**
 * Convert a Supabase error into a user-friendly message
 */
export function getSupabaseErrorMessage(error: PostgrestError | Error | null): string {
  if (!error) return "An unknown error occurred.";

  // Handle PostgrestError (Supabase errors)
  if ("code" in error && error.code) {
    const message = ERROR_MESSAGES[error.code];
    if (message) return message;
  }

  // Handle generic Error objects
  if (error.message) {
    // Don't expose raw error messages in production
    if (process.env.NODE_ENV === "production") {
      return "An error occurred while processing your request. Please try again.";
    }
    return error.message;
  }

  return "An unexpected error occurred. Please try again.";
}

/**
 * Log errors consistently with context
 */
export function logError(
  error: Error | PostgrestError | null,
  context: {
    action: string;
    resource?: string;
    userId?: string;
    orgId?: string;
  }
) {
  console.error("[Error]", {
    ...context,
    error: error?.message || "Unknown error",
    code: "code" in (error || {}) ? (error as PostgrestError).code : undefined,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Check if an error is a permission error
 */
export function isPermissionError(error: PostgrestError | Error | null): boolean {
  if (!error) return false;
  if ("code" in error) {
    return error.code === "42501" || error.code === "PGRST301";
  }
  return false;
}

/**
 * Check if an error is a not found error
 */
export function isNotFoundError(error: PostgrestError | Error | null): boolean {
  if (!error) return false;
  if ("code" in error) {
    return error.code === "PGRST116";
  }
  return false;
}

/**
 * Check if an error is a duplicate/conflict error
 */
export function isDuplicateError(error: PostgrestError | Error | null): boolean {
  if (!error) return false;
  if ("code" in error) {
    return error.code === "23505";
  }
  return false;
}
