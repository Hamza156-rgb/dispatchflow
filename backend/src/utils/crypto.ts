import crypto from 'crypto';

// Symmetric encryption for third-party credentials we must be able to replay
// (load-board logins). Hashing isn't an option — we need the plaintext to
// authenticate against the provider on the user's behalf.
//
// Key comes from ENCRYPTION_KEY. If that's unset we derive one from JWT_SECRET
// so local dev works out of the box, but production should set it explicitly:
// rotating JWT_SECRET would otherwise orphan every stored credential.
const keyMaterial = () => {
  const secret = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET;
  if (!secret) throw new Error('ENCRYPTION_KEY (or JWT_SECRET) must be set to store load-board credentials');
  return crypto.scryptSync(secret, 'dispatchflow.loadboard.v1', 32);
};

/** AES-256-GCM → "iv:authTag:ciphertext", all base64. */
export const encrypt = (plain: string): string => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', keyMaterial(), iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return [iv.toString('base64'), cipher.getAuthTag().toString('base64'), enc.toString('base64')].join(':');
};

export const decrypt = (payload: string): string => {
  const [iv, tag, data] = payload.split(':');
  if (!iv || !tag || !data) throw new Error('Malformed ciphertext');
  const decipher = crypto.createDecipheriv('aes-256-gcm', keyMaterial(), Buffer.from(iv, 'base64'));
  decipher.setAuthTag(Buffer.from(tag, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(data, 'base64')), decipher.final()]).toString('utf8');
};

/** "dispatch@acme.com" → "d••••••@acme.com" — safe to show in the UI. */
export const maskAccount = (value: string): string => {
  const [name, domain] = value.split('@');
  if (!domain) return value.slice(0, 2) + '•'.repeat(Math.max(0, value.length - 2));
  return `${name.slice(0, 1)}${'•'.repeat(Math.max(1, name.length - 1))}@${domain}`;
};
