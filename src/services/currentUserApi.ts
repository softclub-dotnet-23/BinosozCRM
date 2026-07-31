import { decodeAccessTokenClaims } from "./jwt";
import { readAccessToken } from "./tokenStorage";
import type { BackendRole } from "./types";

/**
 * VERIFIED GAP: the backend has no GET /users/me and no UsersController at all (confirmed by
 * grepping every controller and the JWT claim list — Infrastructure/Auth/JwtTokenService.cs only
 * puts userId/companyId/role/forcePasswordChange in the token, nothing else). There is currently
 * no backend-supported way to fetch the logged-in user's own display name, phone-as-stored,
 * email, or account metadata beyond what already came back from POST /auth/login.
 *
 * This module intentionally does NOT call a nonexistent endpoint. It only re-derives what's
 * already been proven safe to trust (the JWT this exact session was issued). If the backend ever
 * adds a real current-user endpoint, this is the one file that should start calling it — nothing
 * else in the app should reach into decodeAccessTokenClaims directly.
 */
export interface CurrentUserClaims {
  userId: string | null;
  companyId: string | null;
}

export function getCurrentUserClaims(): CurrentUserClaims {
  const token = readAccessToken();
  if (!token) return { userId: null, companyId: null };
  return decodeAccessTokenClaims(token);
}

/** role/forcePasswordChange are already known in full from the login/refresh response itself
 * (AuthTokensDto) — surfaced here only as a read-only type alias so consumers don't need to
 * import services/types.ts directly just to reference it. */
export type CurrentUserRole = BackendRole;
