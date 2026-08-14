// Strips anything from a rrweb-snapshot serialized DOM tree that could
// execute code once rebuilt in the render page. This is the primary defense
// against the untrusted-HTML-in-a-real-browser risk: the tree comes from an
// arbitrary customer site via the widget, and it gets rebuilt into a real
// document server-side.
//
// Even though the render route also disables JavaScript on the page after
// rebuild, some attributes (onload on <img>/<body>, autoplaying <video>,
// meta-refresh redirects) can fire the moment a node is inserted — while JS
// is still enabled for our OWN trusted rebuild call — so they must be
// stripped from the tree itself, not just blocked afterward.

const DROP_TAGS = new Set(['script', 'noscript', 'iframe', 'object', 'embed', 'applet']);
const DANGEROUS_ATTR_PREFIX = /^on/i;
const DANGEROUS_URL_SCHEME = /^\s*(javascript|data:text\/html|vbscript):/i;

export interface RawNode {
  type: number;
  tagName?: string;
  attributes?: Record<string, unknown>;
  childNodes?: RawNode[];
  [key: string]: unknown;
}

const ELEMENT_TYPE = 2;

function sanitizeNode(node: RawNode): RawNode | null {
  if (node.type === ELEMENT_TYPE) {
    const tagName = (node.tagName ?? '').toLowerCase();
    if (DROP_TAGS.has(tagName)) return null;

    if (node.attributes) {
      const clean: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(node.attributes)) {
        if (DANGEROUS_ATTR_PREFIX.test(key)) continue; // onload, onclick, onerror, ...
        if (key.toLowerCase() === 'srcdoc') continue; // inline iframe document
        if (typeof value === 'string' && DANGEROUS_URL_SCHEME.test(value)) continue;
        if (tagName === 'meta' && (node.attributes['http-equiv'] as string | undefined)?.toLowerCase() === 'refresh') continue;
        clean[key] = value;
      }
      node.attributes = clean;
    }
  }

  if (Array.isArray(node.childNodes)) {
    node.childNodes = node.childNodes
      .map((child) => sanitizeNode(child))
      .filter((child): child is RawNode => child !== null);
  }

  return node;
}

export function sanitizeSnapshotTree<T extends RawNode>(tree: T): T {
  return sanitizeNode(tree) as T;
}
