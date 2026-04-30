import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

export async function POST(req: NextRequest) {
  const { to, subject, message } = await req.json() as {
    to: string;
    subject: string;
    message: string;
  };

  if (!to?.trim() || !message?.trim()) {
    return NextResponse.json({ error: 'Recipient email and message are required.' }, { status: 400 });
  }

  try {
    const { data, error } = await getResend().emails.send({
      from: 'ScaleFeedback <hello@scalefeedback.io>',
      to: [to.trim()],
      subject: subject || 'Can you install this widget on our website?',
      html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
        <div style="background:#300a46;border-radius:12px 12px 0 0;padding:20px 24px">
          <p style="color:white;font-size:18px;font-weight:600;margin:0">ScaleFeedback Widget Installation</p>
        </div>
        <div style="background:#f9fafb;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;padding:24px">
          <pre style="font-family:inherit;white-space:pre-wrap;font-size:14px;line-height:1.6;color:#374151;margin:0">${message.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
        </div>
        <p style="font-size:12px;color:#9ca3af;margin-top:16px;text-align:center">Sent via ScaleFeedback</p>
      </div>`,
    });

    if (error) {
      console.error('[send-to-developer] Resend error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('[send-to-developer] Sent:', data?.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[send-to-developer] Exception:', err);
    return NextResponse.json({ error: 'Failed to send email.' }, { status: 500 });
  }
}
