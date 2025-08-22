export interface JwtPayload {
  sub: string; // accountId
  roles: string[]; // Array of role names like ["ADMIN", "USER"]
  permissions: string[]; // Array of permissions like ["ACCOUNT:READ", "ROLE:CREATE"]
  iat?: number;
  exp?: number;
}
