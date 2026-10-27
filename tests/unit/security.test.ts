import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { checkFile, sanitizeFileName } from "@/server/security/file-validation";
import { hit } from "@/server/security/rate-limit";
import {
  decryptToken,
  encryptToken,
  generateToken,
  hashToken,
  TOKEN_PATTERN,
} from "@/server/security/tokens";

describe("tokens", () => {
  it("generates unguessable URL-safe tokens", () => {
    const a = generateToken();
    const b = generateToken();
    expect(a).toMatch(TOKEN_PATTERN);
    expect(a).not.toBe(b);
  });

  it("hashes deterministically without revealing the token", () => {
    const token = generateToken();
    expect(hashToken(token)).toBe(hashToken(token));
    expect(hashToken(token)).not.toContain(token);
    expect(hashToken(token)).toHaveLength(64);
  });

  it("encrypts tokens so only the server can show them again", () => {
    const token = generateToken();
    const sealed = encryptToken(token);
    expect(sealed).not.toContain(token);
    expect(decryptToken(sealed)).toBe(token);
    const tampered = sealed.slice(0, -2) + (sealed.endsWith("A") ? "BB" : "AA");
    expect(decryptToken(tampered)).toBeNull();
  });
});

describe("checkFile", () => {
  const MB = 1024 * 1024;

  it("accepts real images", async () => {
    const png = await sharp({ create: { width: 4, height: 4, channels: 3, background: "#000" } })
      .png()
      .toBuffer();
    expect(await checkFile(png, ["image"], MB)).toEqual({ ok: true, mime: "image/png", ext: "png" });
  });

  it("detects the type from the bytes, not the name", async () => {
    const exe = Buffer.concat([Buffer.from("MZ"), Buffer.alloc(300)]);
    expect(await checkFile(exe, ["image", "pdf"], MB)).toEqual({ ok: false, error: "file_type" });
    const html = Buffer.from("<html><script>alert(1)</script></html>");
    expect(await checkFile(html, ["image", "svg", "pdf"], MB)).toEqual({ ok: false, error: "file_type" });
  });

  it("recognises SVG only where it is allowed", async () => {
    const svg = Buffer.from(
      '<?xml version="1.0"?>\n<!-- logo --><svg xmlns="http://www.w3.org/2000/svg"></svg>',
    );
    expect(await checkFile(svg, ["image", "svg"], MB)).toMatchObject({ ok: true, mime: "image/svg+xml" });
    expect(await checkFile(svg, ["image"], MB)).toEqual({ ok: false, error: "file_type" });
  });

  it("enforces size limits and rejects empty files", async () => {
    const pdf = Buffer.concat([Buffer.from("%PDF-1.4\n"), Buffer.alloc(2 * MB)]);
    expect(await checkFile(pdf, ["pdf"], MB)).toEqual({ ok: false, error: "file_too_large" });
    expect(await checkFile(Buffer.alloc(0), ["pdf"], MB)).toEqual({ ok: false, error: "file_empty" });
  });
});

describe("sanitizeFileName", () => {
  it("strips path separators and control characters", () => {
    expect(sanitizeFileName("../../etc/passwd")).toBe("....etcpasswd");
    expect(sanitizeFileName("logo\u0000.png")).toBe("logo.png");
    expect(sanitizeFileName("   ")).toBe("file");
  });
});

describe("rate limiter", () => {
  it("blocks after the limit within a window and resets afterwards", () => {
    const key = `test-${Math.random()}`;
    const now = 1_000_000;
    expect(hit(key, 2, 1000, now)).toBe(true);
    expect(hit(key, 2, 1000, now + 1)).toBe(true);
    expect(hit(key, 2, 1000, now + 2)).toBe(false);
    expect(hit(key, 2, 1000, now + 1001)).toBe(true);
  });
});
