export type DomainErrorCode =
  | "not_found"
  | "locked"
  | "invalid_input"
  | "rate_limited"
  | "file_type"
  | "file_too_large"
  | "file_empty"
  | "too_many_files"
  | "quota_exceeded";

/** Expected failures that the UI can translate (see `errors.*` in messages). */
export class DomainError extends Error {
  constructor(public readonly code: DomainErrorCode) {
    super(code);
    this.name = "DomainError";
  }
}

export const notFound = () => new DomainError("not_found");
