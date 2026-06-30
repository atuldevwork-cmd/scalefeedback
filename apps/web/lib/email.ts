import { Resend } from 'resend';

function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

export interface NewFeedbackEmailParams {
  to: string;
  projectName: string;
  feedbackTitle: string;
  feedbackType: string;
  reporterName?: string | null;
  pageUrl: string;
  dashboardUrl: string;
}

export interface StatusChangeEmailParams {
  to: string;
  projectName: string;
  feedbackTitle: string;
  oldStatus: string;
  newStatus: string;
  dashboardUrl: string;
}

export async function sendNewFeedbackEmail(params: NewFeedbackEmailParams) {
  if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY.startsWith('re_your')) return;

  const { to, projectName, feedbackTitle, feedbackType, reporterName, pageUrl, dashboardUrl } = params;

  await getResend().emails.send({
    from: 'Pinmarks <onboarding@resend.dev>',
    to,
    subject: `New ${feedbackType} on ${projectName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; color: #1A0A2E;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:32px;">
          <div style="width:36px;height:36px;background:#7C3AED;border-radius:8px;display:flex;align-items:center;justify-content:center;">
            <span style="color:#fff;font-weight:700;font-size:14px;">SF</span>
          </div>
          <span style="font-weight:700;font-size:18px;color:#111111;">Pinmarks</span>
        </div>

        <h2 style="font-size:20px;font-weight:700;margin-bottom:8px;">New ${feedbackType} received</h2>
        <p style="color:#6B5B8A;margin-bottom:24px;">A new ${feedbackType} was submitted on <strong>${projectName}</strong>.</p>

        <div style="background:#F0EBFF;border-radius:12px;padding:20px;margin-bottom:24px;">
          <p style="font-weight:600;margin-bottom:4px;">${feedbackTitle}</p>
          <p style="color:#6B5B8A;font-size:14px;">Page: ${pageUrl}</p>
          ${reporterName ? `<p style="color:#6B5B8A;font-size:14px;">Reporter: ${reporterName}</p>` : ''}
        </div>

        <a href="${dashboardUrl}" style="display:inline-block;background:#7C3AED;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
          View Feedback
        </a>

        <p style="margin-top:32px;color:#9CA3AF;font-size:12px;">Pinmarks — Visual feedback for your clients.</p>
      </div>
    `,
  });
}

export interface GuestCommentEmailParams {
  to: string;
  projectName: string;
  feedbackTitle: string;
  guestEmail: string;
  guestName?: string | null;
  commentBody: string;
  dashboardUrl: string;
}

export async function sendGuestCommentEmail(params: GuestCommentEmailParams) {
  if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY.startsWith('re_your')) return;

  const { to, projectName, feedbackTitle, guestEmail, guestName, commentBody, dashboardUrl } = params;
  const from = guestName ? `${guestName} (${guestEmail})` : guestEmail;

  await getResend().emails.send({
    from: 'Pinmarks <onboarding@resend.dev>',
    to,
    subject: `Guest comment on "${feedbackTitle}" — ${projectName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; color: #1A0A2E;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:32px;">
          <div style="width:36px;height:36px;background:#ff724f;border-radius:8px;display:flex;align-items:center;justify-content:center;">
            <span style="color:#fff;font-weight:700;font-size:14px;">SF</span>
          </div>
          <span style="font-weight:700;font-size:18px;color:#111111;">Pinmarks</span>
        </div>

        <h2 style="font-size:20px;font-weight:700;margin-bottom:8px;">New comment from a guest</h2>
        <p style="color:#6B5B8A;margin-bottom:4px;">
          <strong>${from}</strong> commented on a feedback item in <strong>${projectName}</strong>.
        </p>
        <p style="color:#9CA3AF;font-size:13px;margin-bottom:24px;">Feedback: ${feedbackTitle}</p>

        <div style="background:#fff3f0;border-left:4px solid #ff724f;border-radius:0 8px 8px 0;padding:16px 20px;margin-bottom:24px;">
          <p style="margin:0;font-size:15px;line-height:1.6;color:#111111;">${commentBody}</p>
        </div>

        <a href="${dashboardUrl}" style="display:inline-block;background:#ff724f;color:#111111;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
          View in Dashboard
        </a>

        <p style="margin-top:32px;color:#9CA3AF;font-size:12px;">Pinmarks — Visual feedback for your clients.</p>
      </div>
    `,
  });
}

export async function sendStatusChangeEmail(params: StatusChangeEmailParams) {
  if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY.startsWith('re_your')) return;

  const { to, projectName, feedbackTitle, oldStatus, newStatus, dashboardUrl } = params;
  const label = newStatus.replace('_', ' ');

  await getResend().emails.send({
    from: 'Pinmarks <onboarding@resend.dev>',
    to,
    subject: `Feedback status updated to "${label}" on ${projectName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; color: #1A0A2E;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:32px;">
          <div style="width:36px;height:36px;background:#7C3AED;border-radius:8px;display:flex;align-items:center;justify-content:center;">
            <span style="color:#fff;font-weight:700;font-size:14px;">SF</span>
          </div>
          <span style="font-weight:700;font-size:18px;color:#111111;">Pinmarks</span>
        </div>

        <h2 style="font-size:20px;font-weight:700;margin-bottom:8px;">Status updated</h2>
        <p style="color:#6B5B8A;margin-bottom:24px;">
          Feedback on <strong>${projectName}</strong> changed from
          <strong>${oldStatus.replace('_', ' ')}</strong> → <strong>${label}</strong>.
        </p>

        <div style="background:#F0EBFF;border-radius:12px;padding:20px;margin-bottom:24px;">
          <p style="font-weight:600;">${feedbackTitle}</p>
        </div>

        <a href="${dashboardUrl}" style="display:inline-block;background:#7C3AED;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
          View Feedback
        </a>

        <p style="margin-top:32px;color:#9CA3AF;font-size:12px;">Pinmarks — Visual feedback for your clients.</p>
      </div>
    `,
  });
}
