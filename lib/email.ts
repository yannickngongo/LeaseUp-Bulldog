import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export async function sendInviteEmail({
  to,
  inviteUrl,
  orgName,
  role,
  invitedBy,
}: {
  to: string;
  inviteUrl: string;
  orgName: string;
  role: string;
  invitedBy: string;
}) {
  const subject = `You've been invited to join ${orgName} on LeaseUp Bulldog`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #111;">
      <div style="background: #C8102E; padding: 24px 32px; border-radius: 12px 12px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 22px;">LeaseUp Bulldog</h1>
      </div>
      <div style="background: #f9f9f9; padding: 32px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 12px 12px;">
        <p style="font-size: 16px; margin-top: 0;">Hi there,</p>
        <p style="font-size: 15px; color: #444;">
          <strong>${invitedBy}</strong> has invited you to join <strong>${orgName}</strong> as a <strong>${role}</strong>.
        </p>
        <a href="${inviteUrl}" style="display: inline-block; margin: 24px 0; background: #C8102E; color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-size: 15px; font-weight: 600;">
          Accept Invitation →
        </a>
        <p style="font-size: 13px; color: #888;">This invitation expires in 7 days. If you didn't expect this, you can ignore this email.</p>
        <p style="font-size: 12px; color: #bbb; margin-bottom: 0;">Or copy this link: ${inviteUrl}</p>
      </div>
    </div>
  `;

  await transporter.sendMail({
    from: `"LeaseUp Bulldog" <${process.env.GMAIL_USER}>`,
    to,
    subject,
    html,
  });
}
