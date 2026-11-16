import type { SupabaseClient } from '@supabase/supabase-js';

type Auth = Pick<SupabaseClient['auth'], 'signUp' | 'signInWithPassword' | 'updateUser'>;

function validateNewPassword(password: string, confirmation: string) {
  if (password.length < 8) throw new Error('Use at least 8 characters for your password.');
  if (password !== confirmation) throw new Error('Passwords do not match.');
}

export async function passwordAuth(auth: Auth, input: { email: string; password: string; confirmation: string; creating: boolean }) {
  const credentials = { email: input.email.trim(), password: input.password };
  if (input.creating) {
    validateNewPassword(input.password, input.confirmation);
    const { data, error } = await auth.signUp(credentials);
    if (error) throw error;
    if (!data.session) throw new Error('Account creation requires an email confirmation. Ask the project owner to turn off Confirm email in Supabase to enable password-only signup.');
  } else {
    const { error } = await auth.signInWithPassword(credentials);
    if (error) throw error;
  }
}

export async function changePassword(auth: Auth, password: string, confirmation: string) {
  validateNewPassword(password, confirmation);
  const { error } = await auth.updateUser({ password });
  if (error) throw error;
}
