/**
 * Generate SHA-256 hash for content immutability verification
 * Used for published reports and board packs to ensure content integrity
 */
export async function generateContentHash(content: string): Promise<string> {
  // Use Web Crypto API (available in both browser and Node.js 15+)
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

/**
 * Verify content against stored hash
 */
export async function verifyContentHash(content: string, expectedHash: string): Promise<boolean> {
  const actualHash = await generateContentHash(content);
  return actualHash === expectedHash;
}
