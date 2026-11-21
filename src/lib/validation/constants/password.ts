/** Must match `minimum_password_length` in Supabase Auth (local config.toml and the hosted project). */
export const PASSWORD_MIN_LENGTH = 8;
/** bcrypt (used by Supabase Auth) only considers the first 72 bytes. */
export const PASSWORD_MAX_LENGTH = 72;
export const EMAIL_MAX_LENGTH = 254;
