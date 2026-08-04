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
    from: 'Pinmarks <noreply@pinmarks.in>',
    to,
    subject: `New ${feedbackType} on ${projectName}`,
    html: `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 16px;font-family:sans-serif;">
        <tr>
          <td align="center">
            <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #ececec;">
              <tr>
                <td style="background:#111111;padding:32px 40px;">
                  <table role="presentation" cellpadding="0" cellspacing="0">
                    <tr>
                      <td width="36" height="36" style="width:36px;height:36px;background:#ff724f;border-radius:8px;text-align:center;" valign="middle">
                        <span style="color:#ffffff;font-weight:700;font-size:16px;line-height:36px;">P</span>
                      </td>
                      <td style="padding-left:10px;font-weight:700;font-size:18px;color:#ffffff;" valign="middle">Pinmarks</td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="padding:40px;">
                  <h1 style="margin:0 0 12px;font-size:22px;font-weight:800;color:#111111;">New ${feedbackType} received</h1>
                  <p style="margin:0 0 24px;color:#555555;font-size:15px;line-height:1.6;">A new ${feedbackType} was submitted on <strong>${projectName}</strong>.</p>

                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fff8f6;border-radius:12px;margin-bottom:28px;">
                    <tr>
                      <td style="padding:20px 24px;">
                        <p style="margin:0 0 6px;font-weight:700;font-size:15px;color:#111111;">${feedbackTitle}</p>
                        <p style="margin:0;color:#555555;font-size:13px;">Page: ${pageUrl}</p>
                        ${reporterName ? `<p style="margin:4px 0 0;color:#555555;font-size:13px;">Reporter: ${reporterName}</p>` : ''}
                      </td>
                    </tr>
                  </table>

                  <table role="presentation" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="border-radius:10px;background:#ff724f;">
                        <a href="${dashboardUrl}" style="display:inline-block;padding:14px 28px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;">View Feedback →</a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
            <p style="margin:24px 0 0;color:#9CA3AF;font-size:12px;text-align:center;">Pinmarks — Visual feedback for your clients.</p>
          </td>
        </tr>
      </table>
    `,
  });
}

export interface WelcomeEmailParams {
  to: string;
  name?: string | null;
  dashboardUrl: string;
}

export async function sendWelcomeEmail(params: WelcomeEmailParams) {
  if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY.startsWith('re_your')) return false;

  const { to, name, dashboardUrl } = params;
  const greetingName = name ? name.split(' ')[0] : 'there';

  const { error } = await getResend().emails.send({
    from: 'Pinmarks <noreply@pinmarks.in>',
    to,
    subject: 'Welcome to Pinmarks 🎉',
    html: `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 16px;font-family:sans-serif;">
        <tr>
          <td align="center">
            <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #ececec;">
              <tr>
                <td style="background:#111111;padding:32px 40px;">
                  <table role="presentation" cellpadding="0" cellspacing="0">
                    <tr>
                      <td width="36" height="36" style="width:36px;height:36px;background:#ff724f;border-radius:8px;text-align:center;" valign="middle">
                        <span style="color:#ffffff;font-weight:700;font-size:16px;line-height:36px;">P</span>
                      </td>
                      <td style="padding-left:10px;font-weight:700;font-size:18px;color:#ffffff;" valign="middle">Pinmarks</td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="padding:40px;">
                  <h1 style="margin:0 0 12px;font-size:24px;font-weight:800;color:#111111;">Welcome aboard, ${greetingName}! 👋</h1>
                  <p style="margin:0 0 28px;color:#555555;font-size:15px;line-height:1.6;">
                    Thanks for signing up for Pinmarks. You can now embed the widget on any site to start
                    collecting annotated screenshots, console logs, and feedback straight into your dashboard.
                  </p>

                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fff8f6;border-radius:12px;margin-bottom:28px;">
                    <tr>
                      <td style="padding:22px 24px;">
                        <p style="margin:0 0 14px;font-weight:700;font-size:12px;letter-spacing:0.06em;color:#ff724f;text-transform:uppercase;">Quick start</p>
                        <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                          <tr>
                            <td width="24" valign="top" style="padding-bottom:12px;">
                              <span style="display:inline-block;width:20px;height:20px;background:#ff724f;border-radius:50%;color:#ffffff;font-size:11px;font-weight:700;text-align:center;line-height:20px;">1</span>
                            </td>
                            <td valign="top" style="padding-bottom:12px;padding-left:10px;font-size:14px;color:#333333;">Create a project</td>
                          </tr>
                          <tr>
                            <td width="24" valign="top" style="padding-bottom:12px;">
                              <span style="display:inline-block;width:20px;height:20px;background:#ff724f;border-radius:50%;color:#ffffff;font-size:11px;font-weight:700;text-align:center;line-height:20px;">2</span>
                            </td>
                            <td valign="top" style="padding-bottom:12px;padding-left:10px;font-size:14px;color:#333333;">Copy the widget install snippet from Project Settings</td>
                          </tr>
                          <tr>
                            <td width="24" valign="top">
                              <span style="display:inline-block;width:20px;height:20px;background:#ff724f;border-radius:50%;color:#ffffff;font-size:11px;font-weight:700;text-align:center;line-height:20px;">3</span>
                            </td>
                            <td valign="top" style="padding-left:10px;font-size:14px;color:#333333;">Paste it on your site before &lt;/body&gt;</td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>

                  <table role="presentation" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="border-radius:10px;background:#ff724f;">
                        <a href="${dashboardUrl}" style="display:inline-block;padding:14px 28px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;">Go to Dashboard →</a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
            <p style="margin:24px 0 0;color:#9CA3AF;font-size:12px;text-align:center;">Pinmarks — Visual feedback for your clients.</p>
          </td>
        </tr>
      </table>
    `,
  });

  if (error) {
    console.error('Welcome email failed:', error);
    return false;
  }
  return true;
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
    from: 'Pinmarks <noreply@pinmarks.in>',
    to,
    subject: `Guest comment on "${feedbackTitle}" — ${projectName}`,
    html: `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 16px;font-family:sans-serif;">
        <tr>
          <td align="center">
            <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #ececec;">
              <tr>
                <td style="background:#111111;padding:32px 40px;">
                  <table role="presentation" cellpadding="0" cellspacing="0">
                    <tr>
                      <td width="36" height="36" style="width:36px;height:36px;background:#ff724f;border-radius:8px;text-align:center;" valign="middle">
                        <span style="color:#ffffff;font-weight:700;font-size:16px;line-height:36px;">P</span>
                      </td>
                      <td style="padding-left:10px;font-weight:700;font-size:18px;color:#ffffff;" valign="middle">Pinmarks</td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="padding:40px;">
                  <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#111111;">New comment from a guest</h1>
                  <p style="margin:0 0 4px;color:#555555;font-size:15px;line-height:1.6;">
                    <strong>${from}</strong> commented on a feedback item in <strong>${projectName}</strong>.
                  </p>
                  <p style="margin:0 0 24px;color:#9CA3AF;font-size:13px;">Feedback: ${feedbackTitle}</p>

                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fff8f6;border-radius:0 12px 12px 0;margin-bottom:28px;border-left:4px solid #ff724f;">
                    <tr>
                      <td style="padding:18px 22px;">
                        <p style="margin:0;font-size:15px;line-height:1.6;color:#111111;">${commentBody}</p>
                      </td>
                    </tr>
                  </table>

                  <table role="presentation" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="border-radius:10px;background:#ff724f;">
                        <a href="${dashboardUrl}" style="display:inline-block;padding:14px 28px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;">View in Dashboard →</a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
            <p style="margin:24px 0 0;color:#9CA3AF;font-size:12px;text-align:center;">Pinmarks — Visual feedback for your clients.</p>
          </td>
        </tr>
      </table>
    `,
  });
}

export async function sendStatusChangeEmail(params: StatusChangeEmailParams) {
  if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY.startsWith('re_your')) return;

  const { to, projectName, feedbackTitle, oldStatus, newStatus, dashboardUrl } = params;
  const label = newStatus.replace('_', ' ');

  await getResend().emails.send({
    from: 'Pinmarks <noreply@pinmarks.in>',
    to,
    subject: `Feedback status updated to "${label}" on ${projectName}`,
    html: `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 16px;font-family:sans-serif;">
        <tr>
          <td align="center">
            <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #ececec;">
              <tr>
                <td style="background:#111111;padding:32px 40px;">
                  <table role="presentation" cellpadding="0" cellspacing="0">
                    <tr>
                      <td width="36" height="36" style="width:36px;height:36px;background:#ff724f;border-radius:8px;text-align:center;" valign="middle">
                        <span style="color:#ffffff;font-weight:700;font-size:16px;line-height:36px;">P</span>
                      </td>
                      <td style="padding-left:10px;font-weight:700;font-size:18px;color:#ffffff;" valign="middle">Pinmarks</td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="padding:40px;">
                  <h1 style="margin:0 0 12px;font-size:22px;font-weight:800;color:#111111;">Status updated</h1>
                  <p style="margin:0 0 24px;color:#555555;font-size:15px;line-height:1.6;">
                    Feedback on <strong>${projectName}</strong> changed from
                    <strong>${oldStatus.replace('_', ' ')}</strong> → <strong>${label}</strong>.
                  </p>

                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fff8f6;border-radius:12px;margin-bottom:28px;">
                    <tr>
                      <td style="padding:20px 24px;">
                        <p style="margin:0;font-weight:700;font-size:15px;color:#111111;">${feedbackTitle}</p>
                      </td>
                    </tr>
                  </table>

                  <table role="presentation" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="border-radius:10px;background:#ff724f;">
                        <a href="${dashboardUrl}" style="display:inline-block;padding:14px 28px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;">View Feedback →</a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
            <p style="margin:24px 0 0;color:#9CA3AF;font-size:12px;text-align:center;">Pinmarks — Visual feedback for your clients.</p>
          </td>
        </tr>
      </table>
    `,
  });
}
