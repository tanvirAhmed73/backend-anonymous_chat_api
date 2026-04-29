/** Authenticated user attached to the request after session validation. */
export interface SessionUser {
  id: string;
  username: string;
  /** ISO 8601 UTC string */
  createdAt: string;
}
