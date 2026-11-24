/**
 * Base64 cho GitHub Contents API (SPEC §6): mã hóa **UTF-8** — tiếng Việt có dấu.
 * KHÔNG dùng `btoa(chuoi)` trực tiếp (lỗi với ký tự ngoài Latin-1).
 * Chạy được trong trình duyệt, Service Worker và Node (vitest).
 */
const CHUNK = 0x8000;

export function bytesToBase64(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(bin);
}

export function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64.replace(/\s+/g, '')); // GitHub trả base64 có xuống dòng
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}

export function utf8ToBase64(text: string): string {
  return bytesToBase64(new TextEncoder().encode(text));
}

export function base64ToUtf8(b64: string): string {
  return new TextDecoder().decode(base64ToBytes(b64));
}
