import { test, describe } from "node:test";
import assert from "node:assert/strict";

describe("Security Rules & Path Traversal Prevention", () => {
  function validateProofPath(path: string, orderId: string): { valid: boolean; reason?: string } {
    if (
      !path ||
      !path.includes("/") ||
      path.includes("..") ||
      path.includes("\\") ||
      path.startsWith("/") ||
      !/^[a-zA-Z0-9_\-\/.]+\.(jpg|jpeg|png|webp)$/i.test(path)
    ) {
      return { valid: false, reason: "Jalur file bukti pembayaran tidak valid." };
    }

    if (orderId && !path.startsWith(`${orderId}/`)) {
      return { valid: false, reason: "Jalur file bukti pembayaran tidak sesuai dengan ID pesanan ini." };
    }

    return { valid: true };
  }

  const validOrderId = "386dd7f5-3c9a-4525-b3b9-9e18a822b4f6";

  test("accepts properly formatted proof path matching order_id", () => {
    const validPath = `${validOrderId}/a8f276c1-d412-4f32-843b-7489a7f34289.jpg`;
    assert.deepEqual(validateProofPath(validPath, validOrderId), { valid: true });
  });

  test("rejects directory traversal attempts with ..", () => {
    const maliciousPaths = [
      `../other-folder/file.jpg`,
      `${validOrderId}/../../etc/passwd.jpg`,
      `..\\windows\\system32\\calc.png`,
      `/${validOrderId}/file.jpg`,
    ];

    for (const p of maliciousPaths) {
      const res = validateProofPath(p, validOrderId);
      assert.equal(res.valid, false, `Failed to reject: ${p}`);
      assert.equal(res.reason, "Jalur file bukti pembayaran tidak valid.");
    }
  });

  test("rejects IDOR cross-order path tampering (attempting to link another order's file)", () => {
    const attackerOrderId = "99999999-9999-9999-9999-999999999999";
    const victimOrderId = validOrderId;
    const pathWithAttackerPrefix = `${attackerOrderId}/receipt.jpg`;

    const res = validateProofPath(pathWithAttackerPrefix, victimOrderId);
    assert.equal(res.valid, false);
    assert.equal(
      res.reason,
      "Jalur file bukti pembayaran tidak sesuai dengan ID pesanan ini."
    );
  });

  test("rejects disallowed file extensions in payment proof", () => {
    const dangerousPaths = [
      `${validOrderId}/payload.exe`,
      `${validOrderId}/script.js`,
      `${validOrderId}/shell.php`,
      `${validOrderId}/archive.zip`,
      `${validOrderId}/image.svg`, // SVG can carry XSS payloads
    ];

    for (const p of dangerousPaths) {
      const res = validateProofPath(p, validOrderId);
      assert.equal(res.valid, false, `Failed to reject: ${p}`);
    }
  });
});
