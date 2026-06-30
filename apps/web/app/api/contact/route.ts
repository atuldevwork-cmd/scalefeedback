import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

export async function POST(req: NextRequest) {
  const { name, email, subject, topic, message } = await req.json() as {
    name: string;
    email: string;
    subject: string;
    topic: string;
    message: string;
  };

  if (!name?.trim() || !email?.trim() || !message?.trim()) {
    return NextResponse.json({ error: 'Name, email, and message are required.' }, { status: 400 });
  }

  try {
    await getResend().emails.send({
      from: 'Pinmarks Contact <hello@pinmarks.io>',
      to: ['atul@scalestation.io'],
      replyTo: email,
      subject: `[Contact] ${topic ? `${topic}: ` : ''}${subject || '(no subject)'}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
          <div style="background:#111111;border-radius:12px 12px 0 0;padding:24px">
            <div style="display:flex;align-items:center;gap:10px">
              <div style="background:#ff724f;border-radius:8px;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-weight:700;color:#fff;font-size:13px">SF</div>
              <span style="color:#fff;font-weight:700;font-size:16px">Pinmarks</span>
            </div>
            <h2 style="color:#fff;margin:16px 0 4px;font-size:20px">New Contact Form Submission</h2>
            <p style="color:#c4a8d8;margin:0;font-size:14px">Someone reached out via the contact page</p>
          </div>
          <div style="background:#f9f7fc;border:1px solid #e8e0f0;border-top:none;border-radius:0 0 12px 12px;padding:24px">
            <table style="width:100%;border-collapse:collapse">
              <tr><td style="padding:8px 0;font-size:13px;color:#666;width:100px">Name</td><td style="padding:8px 0;font-size:14px;color:#111111;font-weight:600">${name}</td></tr>
              <tr><td style="padding:8px 0;font-size:13px;color:#666">Email</td><td style="padding:8px 0;font-size:14px;color:#111111"><a href="mailto:${email}" style="color:#ff724f">${email}</a></td></tr>
              <tr><td style="padding:8px 0;font-size:13px;color:#666">Topic</td><td style="padding:8px 0;font-size:14px;color:#111111">${topic || '—'}</td></tr>
              <tr><td style="padding:8px 0;font-size:13px;color:#666">Subject</td><td style="padding:8px 0;font-size:14px;color:#111111">${subject || '—'}</td></tr>
            </table>
            <div style="margin-top:16px;padding:16px;background:#fff;border-radius:8px;border:1px solid #e8e0f0">
              <p style="font-size:13px;color:#666;margin:0 0 8px;font-weight:600">Message</p>
              <p style="font-size:14px;color:#111111;margin:0;white-space:pre-wrap;line-height:1.6">${message.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
            </div>
          </div>
        </div>
      `,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[contact]', err);
    return NextResponse.json({ error: 'Failed to send. Please try again.' }, { status: 500 });
  }
}
