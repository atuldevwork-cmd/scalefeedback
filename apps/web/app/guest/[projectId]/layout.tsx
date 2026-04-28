import { SupportChatWidget } from '@/components/support-chat/chat-widget';

export default function GuestProjectLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <SupportChatWidget />
    </>
  );
}
