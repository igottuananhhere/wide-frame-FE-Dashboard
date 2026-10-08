import { MOCK_AUTH_USERS } from "../../data/mock/authUsers";
import type { UserProfile } from "./types";

/** Compares against client-side demo credentials; this is not real authentication. */
export function authenticateMockUser(
  username: string,
  password: string,
): UserProfile | null {
  const normalizedUsername = username.trim().toLowerCase();
  const account = MOCK_AUTH_USERS.find(
    (candidate) =>
      candidate.username.toLowerCase() === normalizedUsername &&
      candidate.password === password,
  );

  if (!account) {
    return null;
  }

  return {
    displayName: account.displayName,
    username: account.username,
    role: account.role,
  };
}
