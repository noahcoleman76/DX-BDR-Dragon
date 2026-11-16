import test from 'node:test';
import assert from 'node:assert/strict';
import { passwordAuth, changePassword } from '../src/data/passwordAuth.ts';

function fixture() {
  const calls: unknown[] = [];
  let error: Error | null = null;
  let session: object | null = {};
  const auth = {
    async signUp(value: unknown) { calls.push(['signup', value]); return { data: { session }, error }; },
    async signInWithPassword(value: unknown) { calls.push(['signin', value]); return { error }; },
    async updateUser(value: unknown) { calls.push(['update', value]); return { error }; },
  } as unknown as Parameters<typeof passwordAuth>[0];
  return { auth, calls, fail: () => { error = new Error('Denied'); }, requireConfirmation: () => { session = null; } };
}
const input = { email: ' user@example.com ', password: ' password ', confirmation: ' password ', creating: true };

test('signup and login send passwords unchanged and trim only the email', async () => {
  const f = fixture();
  await passwordAuth(f.auth, input);
  await passwordAuth(f.auth, { ...input, creating: false });
  assert.deepEqual(f.calls, [['signup', { email: 'user@example.com', password: ' password ' }], ['signin', { email: 'user@example.com', password: ' password ' }]]);
});
test('invalid new passwords never reach the auth service', async () => {
  const f = fixture();
  await assert.rejects(passwordAuth(f.auth, { ...input, confirmation: 'different' }), /do not match/);
  await assert.rejects(changePassword(f.auth, 'short', 'short'), /8 characters/);
  await assert.rejects(changePassword(f.auth, 'longpassword', 'different'), /do not match/);
  assert.deepEqual(f.calls, []);
});
test('password updates use the authenticated user endpoint and propagate failures', async () => {
  const f = fixture();
  await changePassword(f.auth, 'new password', 'new password');
  assert.deepEqual(f.calls, [['update', { password: 'new password' }]]);
  f.fail();
  await assert.rejects(changePassword(f.auth, 'new password', 'new password'), /Denied/);
  await assert.rejects(passwordAuth(f.auth, { ...input, creating: false }), /Denied/);
  await assert.rejects(passwordAuth(f.auth, input), /Denied/);
});
test('signup without a session reports configuration rather than claiming success', async () => {
  const f = fixture(); f.requireConfirmation();
  await assert.rejects(passwordAuth(f.auth, input), /Confirm email/);
});
