// Gzip-compress arbitrary JSON-serializable data using the native browser
// CompressionStream API. JSON typically compresses 8-12x, turning a 4MB
// payload into ~400KB — needed to stay under Vercel's 4.5MB request body cap.
// Returns base64-encoded gzip, or null if CompressionStream is unavailable.
export async function gzipToBase64(data: unknown): Promise<string | null> {
  if (typeof CompressionStream === 'undefined') return null;
  try {
    const json = JSON.stringify(data);
    const bytes = new TextEncoder().encode(json);
    const cs = new CompressionStream('gzip');
    const writer = cs.writable.getWriter();
    writer.write(bytes);
    writer.close();
    const compressed = await new Response(cs.readable).arrayBuffer();
    // Chunk-encode to avoid call-stack overflow on large arrays
    const arr = new Uint8Array(compressed);
    let binary = '';
    for (let i = 0; i < arr.length; i += 8192) {
      binary += String.fromCharCode(...arr.subarray(i, i + 8192));
    }
    return btoa(binary);
  } catch {
    return null;
  }
}
