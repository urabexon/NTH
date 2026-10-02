import { snapshotSchema, type Snapshot } from './schema';

export const STATE_PARAM = 's';

export function encodeSnapshot(snapshot: Snapshot): string {
  const json = JSON.stringify(snapshot);
  const bytes = new TextEncoder().encode(json);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

export function decodeSnapshot(encoded: string): Snapshot {
  const base64 = encoded.replaceAll('-', '+').replaceAll('_', '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  const json = new TextDecoder().decode(bytes);
  return snapshotSchema.parse(JSON.parse(json));
}

export function shareUrl(base: string, snapshot: Snapshot): string {
  const url = new URL(base);
  url.search = '';
  url.searchParams.set(STATE_PARAM, encodeSnapshot(snapshot));
  return url.toString();
}

export function snapshotFromSearch(search: string): Snapshot | null {
  const encoded = new URLSearchParams(search).get(STATE_PARAM);
  if (!encoded) return null;
  try {
    return decodeSnapshot(encoded);
  } catch {
    return null;
  }
}
