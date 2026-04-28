'use client';

import { usePathname } from 'next/navigation';
import { SupportChatWidget } from './chat-widget';

export function SupportChatWidgetWrapper() {
  const pathname = usePathname();
  if (pathname.startsWith('/support')) return null;
  return <SupportChatWidget />;
}
