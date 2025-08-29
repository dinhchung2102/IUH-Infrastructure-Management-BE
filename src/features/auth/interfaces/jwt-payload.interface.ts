export interface JwtPayload {
  sub: string; // accountId
  role: string; // Single role name like "ADMIN" or "USER"
  permissions: string[]; // Array of permissions like ["ACCOUNT:READ", "ROLE:CREATE"]
  iat?: number;
  exp?: number;
}
