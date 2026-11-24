import { base64ToBytes, base64ToUtf8 } from './base64';
import { errorFromStatus, SyncError } from './errors';

export interface GitHubConfig {
  token: string;
  /** "owner/name" — mặc định `datnho0804-gif/Ri6-data`. */
  repo: string;
  branch: string;
}

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

const API = 'https://api.github.com';

export interface RepoCheck {
  private: boolean;
  canPush: boolean;
  /** Dung lượng repo (KB, theo GitHub). */
  sizeKB: number;
  defaultBranch: string;
}

/** Ngưỡng cảnh báo dung lượng `Ri6-data` (DESIGN §5). */
export const REPO_SIZE_WARN_KB = 800 * 1024;

/**
 * Client GitHub Contents API tối giản cho đồng bộ (SPEC §6).
 * `fetch` được truyền vào để test và để chạy trong Service Worker.
 * Token chỉ nằm trong header, không bao giờ ghi log.
 */
export function createGitHubClient(cfg: GitHubConfig, fetchFn: FetchLike = (i, init) => fetch(i, init)) {
  if (!cfg.token || !/^[\w.-]+\/[\w.-]+$/.test(cfg.repo)) throw new SyncError('config', 'Chưa cài đặt đồng bộ (token / repo)');

  const headers = (extra: Record<string, string> = {}): HeadersInit => ({
    Authorization: `Bearer ${cfg.token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    ...extra,
  });

  async function call(path: string, init: RequestInit = {}): Promise<Response> {
    let res: Response;
    try {
      res = await fetchFn(`${API}${path}`, { ...init, headers: headers(init.headers as Record<string, string>) });
    } catch {
      throw new SyncError('network', 'Lỗi mạng: chưa kết nối được GitHub');
    }
    return res;
  }

  const contentsPath = (p: string) => `/repos/${cfg.repo}/contents/${p.split('/').map(encodeURIComponent).join('/')}`;

  return {
    config: cfg,

    /** Kiểm tra kết nối: báo lỗi nếu không có quyền push; trả về `private` để UI cảnh báo đỏ nếu repo công khai. */
    async checkRepo(): Promise<RepoCheck> {
      const res = await call(`/repos/${cfg.repo}`);
      if (!res.ok) throw errorFromStatus(res.status, res.headers);
      const j = (await res.json()) as { private: boolean; size: number; default_branch: string; permissions?: { push?: boolean } };
      return { private: j.private, canPush: j.permissions?.push === true, sizeKB: j.size, defaultBranch: j.default_branch };
    },

    /** Đọc file văn bản UTF-8. `null` nếu chưa có (404). File > 1 MB đọc qua Git Blobs API. */
    async getText(path: string): Promise<{ text: string; sha: string } | null> {
      const res = await call(`${contentsPath(path)}?ref=${encodeURIComponent(cfg.branch)}`);
      if (res.status === 404) return null;
      if (!res.ok) throw errorFromStatus(res.status, res.headers);
      const j = (await res.json()) as { sha: string; content?: string; encoding?: string };
      if (j.encoding === 'base64' && j.content !== undefined) return { text: base64ToUtf8(j.content), sha: j.sha };
      // encoding "none": file > 1 MB → lấy qua blob theo sha.
      const blob = await call(`/repos/${cfg.repo}/git/blobs/${j.sha}`);
      if (!blob.ok) throw errorFromStatus(blob.status, blob.headers);
      const b = (await blob.json()) as { content: string };
      return { text: base64ToUtf8(b.content), sha: j.sha };
    },

    /** Đọc file nhị phân (ảnh). `null` nếu không có. */
    async getBytes(path: string): Promise<Uint8Array | null> {
      const res = await call(`${contentsPath(path)}?ref=${encodeURIComponent(cfg.branch)}`, {
        headers: { Accept: 'application/vnd.github.raw+json' },
      });
      if (res.status === 404) return null;
      if (!res.ok) throw errorFromStatus(res.status, res.headers);
      return new Uint8Array(await res.arrayBuffer());
    },

    /**
     * Ghi file (base64). Có `sha` → cập nhật; không có → tạo mới.
     * Lệch sha (409/422) → `SyncError('conflict')` để engine đọc lại và thử lại.
     */
    async putBase64(path: string, contentBase64: string, message: string, sha?: string): Promise<string> {
      const res = await call(contentsPath(path), {
        method: 'PUT',
        body: JSON.stringify({ message, content: contentBase64, branch: cfg.branch, ...(sha && { sha }) }),
      });
      if (!res.ok) throw errorFromStatus(res.status, res.headers);
      const j = (await res.json()) as { content: { sha: string } };
      return j.content.sha;
    },

    /**
     * Tải ảnh lên (bất biến). Nếu file đã tồn tại (máy khác/lần trước đã tải) → coi là thành công.
     */
    async putImmutable(path: string, contentBase64: string, message: string): Promise<void> {
      try {
        await this.putBase64(path, contentBase64, message);
      } catch (e) {
        if (e instanceof SyncError && e.kind === 'conflict') return; // 422: "sha wasn't supplied" — đã có file
        throw e;
      }
    },
  };
}

export type GitHubClient = ReturnType<typeof createGitHubClient>;

/** Dùng lại cho ảnh từ base64 (tiện cho UI). */
export { base64ToBytes };
