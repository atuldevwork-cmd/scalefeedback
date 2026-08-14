export function parseBrowser(raw: string): string {
  if (!raw || !raw.startsWith('Mozilla')) return raw;
  if (raw.includes('Edg/')) {
    const m = raw.match(/Edg\/([\d.]+)/);
    return `Edge ${m ? m[1].split('.').slice(0, 2).join('.') : ''}`.trim();
  }
  if (raw.includes('Chrome/')) {
    const m = raw.match(/Chrome\/([\d.]+)/);
    return `Chrome ${m ? m[1].split('.').slice(0, 2).join('.') : ''}`.trim();
  }
  if (raw.includes('Firefox/')) {
    const m = raw.match(/Firefox\/([\d.]+)/);
    return `Firefox ${m ? m[1].split('.').slice(0, 2).join('.') : ''}`.trim();
  }
  if (raw.includes('Safari/') && !raw.includes('Chrome')) {
    const m = raw.match(/Version\/([\d.]+)/);
    return `Safari ${m ? m[1].split('.').slice(0, 2).join('.') : ''}`.trim();
  }
  return raw;
}

export function parseOS(raw: string): string {
  if (!raw) return raw;
  if (raw.includes('Windows NT 10.0')) return 'Windows 10/11';
  if (raw.includes('Windows NT')) return 'Windows';
  if (raw.includes('Mac OS X')) {
    const m = raw.match(/Mac OS X ([\d_]+)/);
    return `macOS ${m ? m[1].replace(/_/g, '.').split('.').slice(0, 2).join('.') : ''}`.trim();
  }
  if (raw === 'MacIntel' || raw === 'MacPPC') return 'macOS';
  if (raw === 'Win32' || raw === 'Win64') return 'Windows';
  if (raw.includes('iPhone')) return 'iOS (iPhone)';
  if (raw.includes('iPad')) return 'iOS (iPad)';
  if (raw.includes('Android')) {
    const m = raw.match(/Android ([\d.]+)/);
    return `Android ${m ? m[1] : ''}`.trim();
  }
  if (raw.includes('Linux')) return 'Linux';
  return raw;
}

export interface ConsoleLogEntry {
  level: 'log' | 'info' | 'warn' | 'error';
  message: string;
  timestamp?: number;
}

/** Summarise a console log array into "X errors · Y warnings · Z info · W logs", omitting zero counts. */
export function summariseConsoleLogs(logs?: ConsoleLogEntry[]): string | null {
  if (!logs?.length) return null;
  const counts = { error: 0, warn: 0, info: 0, log: 0 };
  for (const l of logs) counts[l.level] = (counts[l.level] ?? 0) + 1;
  const parts: string[] = [];
  if (counts.error) parts.push(`❌ ${counts.error} error${counts.error === 1 ? '' : 's'}`);
  if (counts.warn) parts.push(`⚠️ ${counts.warn} warning${counts.warn === 1 ? '' : 's'}`);
  if (counts.info) parts.push(`ℹ️ ${counts.info} info`);
  if (counts.log) parts.push(`📄 ${counts.log} log${counts.log === 1 ? '' : 's'}`);
  return parts.length ? parts.join(' · ') : null;
}
