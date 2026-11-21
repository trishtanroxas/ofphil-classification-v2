import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional
from app.core.config import get_settings

settings = get_settings()

def get_email_html_template(role_title: str, recipient_identifier: str, reset_link: str, code: str) -> str:
    """Returns a clinical responsive HTML email template for password reset."""
    return f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>OFPHIL Security - Password Reset Request</title>
</head>
<body style="margin: 0; padding: 0; background-color: #FAFBF8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #10241A;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #FAFBF8; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 560px; background-color: #FFFFFF; border: 1px solid #D5E2D9; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 16px rgba(6, 72, 38, 0.06);">
          <!-- Top Brand Header -->
          <tr>
            <td style="background-color: #064826; padding: 24px 32px; text-align: left;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <div style="font-size: 20px; font-weight: 700; color: #FFFFFF; letter-spacing: 1px; line-height: 1.2;">OFPHIL</div>
                    <div style="font-size: 11px; color: #9DBFA9; margin-top: 2px;">Ophthalmological Foundation of the Philippines</div>
                  </td>
                  <td align="right">
                    <span style="display: inline-block; background-color: rgba(255, 255, 255, 0.15); border: 1px solid rgba(255, 255, 255, 0.25); color: #86EFAC; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 999px; text-transform: uppercase;">
                      {role_title}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Email Content Body -->
          <tr>
            <td style="padding: 32px;">
              <h1 style="margin: 0 0 12px 0; font-size: 22px; font-weight: 700; color: #10241A; line-height: 1.3;">
                Password Reset Verification
              </h1>
              <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #5A7466;">
                A password reset was requested for your account (<strong>{recipient_identifier}</strong>). Use the secure one-time verification code below or click the reset button to establish a new password.
              </p>

              <!-- One-Time PIN Card -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 24px 0;">
                <tr>
                  <td style="background-color: #E8F5EC; border: 1px dashed #0B6B3A; border-radius: 10px; padding: 18px 24px; text-align: center;">
                    <div style="font-size: 12px; font-weight: 600; color: #0B6B3A; text-transform: uppercase; letter-spacing: 0.5px;">Your Security Verification Code</div>
                    <div style="font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #064826; margin: 8px 0; font-family: monospace;">{code}</div>
                    <div style="font-size: 11px; color: #5A7466;">This code expires in 15 minutes. Never share this code with anyone.</div>
                  </td>
                </tr>
              </table>

              <!-- Direct CTA Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 28px 0 20px 0;">
                <tr>
                  <td align="center">
                    <a href="{reset_link}" style="display: inline-block; background-color: #0B6B3A; color: #FFFFFF; font-size: 14px; font-weight: 600; text-decoration: none; padding: 12px 32px; border-radius: 8px; box-shadow: 0 2px 6px rgba(11, 107, 58, 0.25);">
                      Reset Password Now &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 24px 0 0 0; font-size: 12px; line-height: 1.6; color: #8F9E96;">
                If you did not request this password reset, please contact the clinic administrator immediately or disregard this email. Your password remains safe.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #F8FAFC; border-top: 1px solid #EEF2EF; padding: 18px 32px; text-align: center; font-size: 11px; color: #8F9E96;">
              &copy; 2026 Ophthalmological Foundation of the Philippines (OFPHIL). Secure Clinical Network.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""

def send_password_reset_email(to_email: str, role_title: str, identifier: str, reset_link: str, code: str = "729415") -> bool:
    """Dispatches a password reset email via configured Brevo SMTP credentials."""
    if not settings.MAIL_SERVER or not settings.MAIL_USERNAME or not settings.MAIL_PASSWORD:
        return False

    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"OFPHIL - Password Reset Verification ({role_title})"
    sender = settings.MAIL_DEFAULT_SENDER or settings.MAIL_USERNAME
    msg["From"] = f"OFPHIL Foundation <{sender}>"
    msg["To"] = to_email

    html_content = get_email_html_template(
        role_title=role_title,
        recipient_identifier=identifier,
        reset_link=reset_link,
        code=code
    )
    msg.attach(MIMEText(html_content, "html"))

    try:
        server = smtplib.SMTP(settings.MAIL_SERVER, settings.MAIL_PORT or 587, timeout=10)
        if settings.MAIL_USE_TLS:
            server.starttls()
        server.login(settings.MAIL_USERNAME, settings.MAIL_PASSWORD)
        server.sendmail(sender, [to_email], msg.as_string())
        server.quit()
        return True
    except Exception as e:
        print(f"[Brevo SMTP Error] Failed to dispatch email: {e}")
        return False
