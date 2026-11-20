// A short blocklist of the passwords attackers try first. Not exhaustive -
// just enough to stop the most obvious choices minimum-length rules alone let
// through (e.g. "password" and "12345678" both pass a bare length check).
const COMMON_PASSWORDS = new Set([
  "password",
  "password1",
  "password123",
  "12345678",
  "123456789",
  "1234567890",
  "qwertyui",
  "qwertyuiop",
  "letmein11",
  "welcome123",
  "iloveyou1",
  "admin1234",
  "changeme1",
]);

/** Returns an error message if the password is too weak, or null if it's fine. */
export function passwordStrengthError(password: string): string | null {
  if (typeof password !== "string" || new TextEncoder().encode(password).length > 72) {
    return "Password must contain no more than 72 bytes.";
  }
  if (password.length < 8) {
    return "Password must be at least 8 characters.";
  }
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    return "Password must include at least one letter and one number.";
  }
  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    return "That password is too common. Please choose a less predictable one.";
  }
  return null;
}
