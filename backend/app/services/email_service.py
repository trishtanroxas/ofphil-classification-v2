import os
import base64
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.image import MIMEImage
from email.mime.base import MIMEBase
from email import encoders
from typing import Optional, List, Dict, Any
from app.core.config import get_settings

settings = get_settings()

LOGO_URL = "https://ofphil-foundation.vercel.app/icons/ophil-logo.png"


def get_patient_welcome_email_html(patient_name: str, patient_id: str, temporary_password: str, portal_url: str) -> str:
    """Returns a clinical responsive HTML welcome email template for newly registered patients with official logo."""
    return f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to OFPHIL Patient Beneficiary Portal</title>
</head>
<body style="margin: 0; padding: 0; background-color: #FAFBF8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #10241A;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #FAFBF8; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 580px; background-color: #FFFFFF; border: 1px solid #D5E2D9; border-radius: 14px; overflow: hidden; box-shadow: 0 4px 20px rgba(6, 72, 38, 0.08);">
          <!-- Top Brand Header with Logo -->
          <tr>
            <td style="background-color: #064826; padding: 24px 32px; text-align: left;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="width: 48px; vertical-align: middle;">
                    <img src="{LOGO_URL}" alt="OFPHIL Logo" width="42" height="42" style="display: block; width: 42px; height: 42px; object-fit: contain; border-radius: 8px; background-color: #FFFFFF; padding: 3px;" />
                  </td>
                  <td style="padding-left: 14px; vertical-align: middle;">
                    <div style="font-size: 20px; font-weight: 800; color: #FFFFFF; letter-spacing: 1px; line-height: 1.2;">OFPHIL</div>
                    <div style="font-size: 11px; color: #9DBFA9; margin-top: 2px;">Ophthalmological Foundation of the Philippines</div>
                  </td>
                  <td align="right" style="vertical-align: middle;">
                    <span style="display: inline-block; background-color: rgba(255, 255, 255, 0.15); border: 1px solid rgba(255, 255, 255, 0.25); color: #86EFAC; font-size: 10.5px; font-weight: 700; padding: 4px 10px; border-radius: 999px; text-transform: uppercase;">
                      Patient Portal
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Email Content Body -->
          <tr>
            <td style="padding: 32px 32px 28px 32px;">
              <h1 style="margin: 0 0 10px 0; font-size: 22px; font-weight: 700; color: #10241A; line-height: 1.3;">
                Welcome to OFPHIL Eye Foundation, {patient_name}!
              </h1>
              <p style="margin: 0 0 20px 0; font-size: 13.5px; line-height: 1.6; color: #5A7466;">
                Your patient master profile and beneficiary portal account have been successfully registered by the clinical administration desk. You can now log in to review your assistance applications, cataract / surgery evaluation status, and required document submissions.
              </p>

              <!-- Account Credentials Box -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 22px 0; background-color: #F8FAFC; border: 1px solid #D5E2D9; border-radius: 12px; overflow: hidden;">
                <tr>
                  <td style="background-color: #E8F5EC; border-bottom: 1px solid #D5E2D9; padding: 12px 20px;">
                    <span style="font-size: 11px; font-weight: 700; color: #0B6B3A; text-transform: uppercase; letter-spacing: 0.5px;">Your Portal Login Credentials</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 18px 20px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="padding: 6px 0; font-size: 12.5px; color: #5A7466; width: 140px;">Assigned Patient ID:</td>
                        <td style="padding: 6px 0; font-size: 14px; font-weight: 700; color: #10241A; font-family: monospace;">{patient_id}</td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; font-size: 12.5px; color: #5A7466;">Temporary Password:</td>
                        <td style="padding: 6px 0; font-size: 14px; font-weight: 700; color: #064826; font-family: monospace;">{temporary_password}</td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; font-size: 12.5px; color: #5A7466;">Portal Status:</td>
                        <td style="padding: 6px 0; font-size: 12px; font-weight: 700; color: #0B6B3A;">Active · Masterlist Verified</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Login Button CTA -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 26px 0 20px 0;">
                <tr>
                  <td align="center">
                    <a href="{portal_url}" style="display: inline-block; background-color: #0B6B3A; color: #FFFFFF; font-size: 14px; font-weight: 700; text-decoration: none; padding: 13px 36px; border-radius: 8px; box-shadow: 0 3px 8px rgba(11, 107, 58, 0.25);">
                      Sign In to Patient Portal &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <div style="margin-top: 24px; padding: 14px 18px; background-color: #FFFBEB; border: 1px solid #FDE68A; border-radius: 8px; font-size: 12px; color: #92400E; line-height: 1.5;">
                <strong>Security Reminder:</strong> For your privacy, please update your temporary password after logging in by visiting <em>Settings &amp; Preferences &gt; Account Security</em>.
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #F8FAFC; border-top: 1px solid #EEF2EF; padding: 18px 32px; text-align: center; font-size: 11px; color: #8F9E96;">
              &copy; 2026 Ophthalmological Foundation of the Philippines (OFPHIL) · Medical Social Services &amp; Admissions Wing.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""


def send_patient_welcome_email(to_email: str, patient_name: str, patient_id: str, temporary_password: str, portal_url: Optional[str] = None) -> bool:
    """Dispatches welcome credential email with OFPHIL logo to a registered patient."""
    if not settings.MAIL_SERVER or not settings.MAIL_USERNAME or not settings.MAIL_PASSWORD:
        return False

    target_url = portal_url or f"{settings.FRONTEND_URL}/login-patient"
    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"OFPHIL Eye Foundation - Patient Account Registered ({patient_id})"
    sender = settings.MAIL_DEFAULT_SENDER or settings.MAIL_USERNAME
    msg["From"] = f"OFPHIL Foundation <{sender}>"
    msg["To"] = to_email

    html_content = get_patient_welcome_email_html(
        patient_name=patient_name,
        patient_id=patient_id,
        temporary_password=temporary_password,
        portal_url=target_url,
    )
    msg.attach(MIMEText(f"Welcome to OFPHIL, {patient_name}! Patient ID: {patient_id}", "plain", "utf-8"))
    msg.attach(MIMEText(html_content, "html", "utf-8"))

    try:
        server = smtplib.SMTP(settings.MAIL_SERVER, settings.MAIL_PORT or 587, timeout=10)
        if settings.MAIL_USE_TLS:
            server.starttls()
        server.login(settings.MAIL_USERNAME, settings.MAIL_PASSWORD)
        server.sendmail(sender, [to_email], msg.as_string())
        server.quit()
        return True
    except Exception as e:
        print(f"[Brevo SMTP Error] Failed to send patient welcome email: {e}")
        return False


def get_email_html_template(role_title: str, recipient_identifier: str, reset_link: str, code: str) -> str:
    """Returns a clinical responsive HTML email template for password reset with official OFPHIL logo."""
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
          <!-- Top Brand Header with Logo -->
          <tr>
            <td style="background-color: #064826; padding: 24px 32px; text-align: left;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="width: 48px; vertical-align: middle;">
                    <img src="{LOGO_URL}" alt="OFPHIL Logo" width="42" height="42" style="display: block; width: 42px; height: 42px; object-fit: contain; border-radius: 8px; background-color: #FFFFFF; padding: 3px;" />
                  </td>
                  <td style="padding-left: 14px; vertical-align: middle;">
                    <div style="font-size: 20px; font-weight: 700; color: #FFFFFF; letter-spacing: 1px; line-height: 1.2;">OFPHIL</div>
                    <div style="font-size: 11px; color: #9DBFA9; margin-top: 2px;">Ophthalmological Foundation of the Philippines</div>
                  </td>
                  <td align="right" style="vertical-align: middle;">
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
    """Dispatches a password reset email via configured Brevo SMTP credentials with OFPHIL logo."""
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
        code=code,
    )
    msg.attach(MIMEText(f"OFPHIL Password Reset Verification Code: {code}", "plain", "utf-8"))
    msg.attach(MIMEText(html_content, "html", "utf-8"))

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


def send_inquiry_submission_email(
    inquiry_id: str,
    sender_name: str,
    sender_email: str,
    subject_category: str,
    message_text: str,
    attachment_names: Optional[list] = None,
    attachments: Optional[List[Dict[str, Any]]] = None,
) -> bool:
    """Dispatches real Brevo SMTP email notifications with the full OFPHIL HTML Email Template AND real viewable MIME file attachments
    when a Public Inquiry Form is submitted."""
    if not settings.MAIL_SERVER or not settings.MAIL_USERNAME or not settings.MAIL_PASSWORD:
        return False

    clinic_sender = settings.MAIL_DEFAULT_SENDER or settings.MAIL_USERNAME

    recipients = []
    if sender_email and "@" in sender_email:
        recipients.append(sender_email.strip())
    if clinic_sender and "@" in clinic_sender and clinic_sender.strip().lower() not in [r.lower() for r in recipients]:
        recipients.append(clinic_sender.strip())

    if not recipients:
        return False

    # Prepare decoded attachment binaries and HTML summary rows first
    decoded_files: List[Dict[str, Any]] = []
    card_rows: List[str] = []

    if attachments and len(attachments) > 0:
        for idx, att in enumerate(attachments):
            if not isinstance(att, dict):
                continue
            name = str(att.get("name") or f"Attachment_{idx + 1}").strip()
            data_url = str(att.get("dataUrl") or att.get("url") or "").strip()
            size_str = str(att.get("size") or "").strip()

            raw_bytes: Optional[bytes] = None
            mime_main = "application"
            mime_sub = "octet-stream"

            if data_url.startswith("data:") and "," in data_url:
                header, b64_data = data_url.split(",", 1)
                try:
                    raw_bytes = base64.b64decode(b64_data)
                    mime_part = header.split(";")[0].replace("data:", "").strip()
                    if "/" in mime_part:
                        mime_main, mime_sub = mime_part.split("/", 1)
                except Exception:
                    pass

            if raw_bytes:
                decoded_files.append({
                    "name": name,
                    "bytes": raw_bytes,
                    "mime_main": mime_main,
                    "mime_sub": mime_sub,
                })

            icon_label = "PDF" if (mime_sub == "pdf" or name.lower().endswith(".pdf")) else "IMG"
            card_rows.append(
                f"""<tr>
                  <td style="padding: 9px 14px; border-bottom: 1px solid #D5E2D9; font-family: monospace; font-size: 12px; color: #064826; font-weight: 700;">
                    [{icon_label}] {name} {f'<span style="color:#5A7466; font-weight:normal;">({size_str})</span>' if size_str else ''}
                  </td>
                  <td align="right" style="padding: 9px 14px; border-bottom: 1px solid #D5E2D9; font-size: 11px; color: #0B6B3A; font-weight: 700;">
                    &#10003; Viewable in Attachments Below
                  </td>
                </tr>"""
            )
    elif attachment_names:
        for name in attachment_names:
            icon_label = "PDF" if str(name).lower().endswith(".pdf") else "FILE"
            card_rows.append(
                f"""<tr>
                  <td style="padding: 9px 14px; border-bottom: 1px solid #D5E2D9; font-family: monospace; font-size: 12px; color: #064826; font-weight: 700;">
                    [{icon_label}] {name}
                  </td>
                  <td align="right" style="padding: 9px 14px; border-bottom: 1px solid #D5E2D9; font-size: 11px; color: #0B6B3A; font-weight: 700;">
                    &#10003; Attached
                  </td>
                </tr>"""
            )

    att_cards_html = ""
    if card_rows:
        att_cards_html = f"""
        <div style="margin-top: 16px; background-color: #E8F5EC; border: 1px solid #A7F3D0; border-radius: 10px; overflow: hidden;">
          <div style="padding: 10px 14px; background-color: #D1FAE5; font-size: 11px; font-weight: 700; color: #064826; text-transform: uppercase;">
            Attached Documents &amp; Photos ({len(card_rows)})
          </div>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            {''.join(card_rows)}
          </table>
        </div>
        """

    html_body = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>OFPHIL Public Inquiry Confirmation ({inquiry_id})</title>
</head>
<body style="margin: 0; padding: 0; background-color: #FAFBF8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #10241A;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #FAFBF8; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 580px; background-color: #FFFFFF; border: 1px solid #D5E2D9; border-radius: 14px; overflow: hidden; box-shadow: 0 4px 20px rgba(6, 72, 38, 0.08);">
          <!-- Top Brand Header with Official OFPHIL Logo -->
          <tr>
            <td style="background-color: #064826; padding: 22px 28px; text-align: left;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="width: 48px; vertical-align: middle;">
                    <img src="{LOGO_URL}" alt="OFPHIL Logo" width="42" height="42" style="display: block; width: 42px; height: 42px; object-fit: contain; border-radius: 8px; background-color: #FFFFFF; padding: 3px;" />
                  </td>
                  <td style="padding-left: 14px; vertical-align: middle;">
                    <div style="font-size: 20px; font-weight: 800; color: #FFFFFF; letter-spacing: 1px; line-height: 1.2;">OFPHIL</div>
                    <div style="font-size: 11px; color: #9DBFA9; margin-top: 2px;">Ophthalmological Foundation of the Philippines · Public Inquiries Desk</div>
                  </td>
                  <td align="right" style="vertical-align: middle;">
                    <span style="display: inline-block; background-color: rgba(255, 255, 255, 0.15); border: 1px solid rgba(255, 255, 255, 0.25); color: #86EFAC; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 999px;">
                      {inquiry_id}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 28px 32px;">
              <h1 style="margin: 0 0 10px 0; font-size: 20px; font-weight: 700; color: #10241A;">
                Public Inquiry Received
              </h1>
              <p style="margin: 0 0 18px 0; font-size: 13.5px; line-height: 1.6; color: #5A7466;">
                Good day <strong>{sender_name}</strong>, we have received your inquiry submitted through the OFPHIL Public Inquiry Form. Our clinical and medical social work team will review your message and attached files below.
              </p>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F8FAFC; border: 1px solid #D5E2D9; border-radius: 12px; overflow: hidden;">
                <tr>
                  <td style="background-color: #E8F5EC; border-bottom: 1px solid #D5E2D9; padding: 10px 18px;">
                    <span style="font-size: 11px; font-weight: 700; color: #0B6B3A; text-transform: uppercase;">Inquiry Summary · {inquiry_id}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 16px 18px; font-size: 13px; line-height: 1.6; color: #10241A;">
                    <div><strong>Sender Name:</strong> {sender_name}</div>
                    <div><strong>Email Address:</strong> {sender_email}</div>
                    <div><strong>Inquiry Category:</strong> {subject_category}</div>
                    <hr style="border: 0; border-top: 1px solid #E2E8F0; margin: 12px 0;" />
                    <div style="font-weight: 700; color: #064826; margin-bottom: 4px;">Submitted Message:</div>
                    <div style="white-space: pre-wrap; color: #334155; background: #FFFFFF; padding: 12px; border-radius: 8px; border: 1px solid #EEF2EF;">{message_text}</div>
                    {att_cards_html}
                  </td>
                </tr>
              </table>

              <p style="margin: 20px 0 0 0; font-size: 12px; color: #64748B; line-height: 1.5;">
                Our Medical Social Services &amp; Clinic Reception Desk typically responds within 24 to 48 business hours.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #F8FAFC; border-top: 1px solid #EEF2EF; padding: 16px 28px; text-align: center; font-size: 11px; color: #8F9E96;">
              &copy; 2026 Ophthalmological Foundation of the Philippines (OFPHIL) · Clinical Correspondence Desk
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""

    plain_fallback = (
        f"OFPHIL Public Inquiry Received ({inquiry_id})\n"
        f"Sender Name: {sender_name}\n"
        f"Email Address: {sender_email}\n"
        f"Inquiry Category: {subject_category}\n\n"
        f"Submitted Message:\n{message_text}\n"
    )

    try:
        server = smtplib.SMTP(settings.MAIL_SERVER, settings.MAIL_PORT or 587, timeout=15)
        if settings.MAIL_USE_TLS:
            server.starttls()
        server.login(settings.MAIL_USERNAME, settings.MAIL_PASSWORD)

        for target_to in recipients:
            # IMPORTANT: Put multipart/alternative (plain + html) FIRST inside multipart/mixed,
            # THEN attach the uploaded files AFTER so Gmail always renders the full HTML email template!
            msg = MIMEMultipart("mixed")
            msg["Subject"] = f"OFPHIL Inquiry Received [{inquiry_id}]: {subject_category} — {sender_name}"
            msg["From"] = f"OFPHIL Foundation <{clinic_sender}>"
            msg["To"] = target_to
            msg["Reply-To"] = sender_email if (sender_email and "@" in sender_email) else clinic_sender

            body_alt = MIMEMultipart("alternative")
            body_alt.attach(MIMEText(plain_fallback, "plain", "utf-8"))
            body_alt.attach(MIMEText(html_body, "html", "utf-8"))
            msg.attach(body_alt)

            # Attach ONLY the user's uploaded files (so the OFPHIL logo never appears as a downloadable attachment)
            for f_item in decoded_files:
                file_part = MIMEBase(f_item["mime_main"], f_item["mime_sub"])
                file_part.set_payload(f_item["bytes"])
                encoders.encode_base64(file_part)
                file_part.add_header("Content-Disposition", f'attachment; filename="{f_item["name"]}"')
                msg.attach(file_part)

            server.sendmail(clinic_sender, [target_to], msg.as_string())

        server.quit()
        return True
    except Exception as e:
        print(f"[Brevo SMTP Error] Failed to send inquiry email: {e}")
        return False


def send_inquiry_reply_email(
    to_email: str,
    inquiry_id: str,
    subject: str,
    reply_body: str,
    patient_name: str = "Patient",
    attachment_name: Optional[str] = None,
    attachment_data_url: Optional[str] = None,
) -> bool:
    """Dispatches an official clinic reply or urgent notice email via Brevo SMTP with OFPHIL logo and real file attachment."""
    if not settings.MAIL_SERVER or not settings.MAIL_USERNAME or not settings.MAIL_PASSWORD:
        return False
    if not to_email or "@" not in to_email:
        return False

    clinic_sender = settings.MAIL_DEFAULT_SENDER or settings.MAIL_USERNAME
    msg = MIMEMultipart("mixed")
    msg["Subject"] = subject or f"OFPHIL Clinic Response ({inquiry_id})"
    msg["From"] = f"OFPHIL Foundation <{clinic_sender}>"
    msg["To"] = to_email.strip()

    att_banner = ""
    if attachment_name:
        att_banner = f"""
        <div style="margin-top: 16px; padding: 12px 16px; background-color: #E8F5EC; border: 1px solid #A7F3D0; border-radius: 10px; font-size: 12.5px; color: #064826;">
          <strong>&#10003; Attached Clinic File:</strong> {attachment_name} (View or download from email attachments below)
        </div>
        """

    html_body = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #FAFBF8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #10241A;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #FAFBF8; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 580px; background-color: #FFFFFF; border: 1px solid #D5E2D9; border-radius: 14px; overflow: hidden; box-shadow: 0 4px 20px rgba(6, 72, 38, 0.08);">
          <!-- Top Brand Header with Official OFPHIL Logo -->
          <tr>
            <td style="background-color: #064826; padding: 22px 28px; text-align: left;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="width: 48px; vertical-align: middle;">
                    <img src="{LOGO_URL}" alt="OFPHIL Logo" width="42" height="42" style="display: block; width: 42px; height: 42px; object-fit: contain; border-radius: 8px; background-color: #FFFFFF; padding: 3px;" />
                  </td>
                  <td style="padding-left: 14px; vertical-align: middle;">
                    <div style="font-size: 20px; font-weight: 800; color: #FFFFFF; letter-spacing: 1px; line-height: 1.2;">OFPHIL</div>
                    <div style="font-size: 11px; color: #9DBFA9; margin-top: 2px;">Ophthalmological Foundation of the Philippines · Clinical Desk Response</div>
                  </td>
                  <td align="right" style="vertical-align: middle;">
                    <span style="display: inline-block; background-color: rgba(255, 255, 255, 0.15); border: 1px solid rgba(255, 255, 255, 0.25); color: #86EFAC; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 999px;">
                      {inquiry_id}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 28px 32px;">
              <div style="font-size: 11px; font-weight: 700; color: #0B6B3A; text-transform: uppercase; margin-bottom: 6px;">Reference: {inquiry_id}</div>
              <h1 style="margin: 0 0 14px 0; font-size: 19px; font-weight: 700; color: #10241A;">{subject}</h1>
              <div style="white-space: pre-wrap; font-size: 13.5px; line-height: 1.65; color: #24352B; background-color: #F8FAFC; border: 1px solid #D5E2D9; border-radius: 12px; padding: 18px;">{reply_body}</div>
              {att_banner}
            </td>
          </tr>
          <tr>
            <td style="background-color: #F8FAFC; border-top: 1px solid #EEF2EF; padding: 16px 28px; text-align: center; font-size: 11px; color: #8F9E96;">
              &copy; 2026 Ophthalmological Foundation of the Philippines (OFPHIL) · Official Clinic Dispatch
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""

    body_alt = MIMEMultipart("alternative")
    body_alt.attach(MIMEText(reply_body, "plain", "utf-8"))
    body_alt.attach(MIMEText(html_body, "html", "utf-8"))
    msg.attach(body_alt)

    if attachment_name and attachment_data_url and attachment_data_url.startswith("data:") and "," in attachment_data_url:
        header, b64_data = attachment_data_url.split(",", 1)
        try:
            raw_bytes = base64.b64decode(b64_data)
            mime_part = header.split(";")[0].replace("data:", "").strip()
            mime_main, mime_sub = mime_part.split("/", 1) if "/" in mime_part else ("application", "octet-stream")
            part = MIMEBase(mime_main, mime_sub)
            part.set_payload(raw_bytes)
            encoders.encode_base64(part)
            part.add_header("Content-Disposition", f'attachment; filename="{attachment_name}"')
            msg.attach(part)
        except Exception:
            pass

    try:
        server = smtplib.SMTP(settings.MAIL_SERVER, settings.MAIL_PORT or 587, timeout=15)
        if settings.MAIL_USE_TLS:
            server.starttls()
        server.login(settings.MAIL_USERNAME, settings.MAIL_PASSWORD)
        server.sendmail(clinic_sender, [to_email.strip()], msg.as_string())
        server.quit()
        return True
    except Exception as e:
        print(f"[Brevo SMTP Error] Failed to send inquiry reply email: {e}")
        return False


def send_appointment_schedule_email(
    to_email: str,
    appointment_id: str,
    patient_name: str,
    patient_id: str,
    appointment_type: str,
    appointment_date: str,
    appointment_time: str,
    assigned_doctor: str,
    clinic_room: str,
    notes: str = "",
    subject: Optional[str] = None,
    custom_body: Optional[str] = None,
) -> bool:
    """Dispatches an official OFPHIL Clinic Appointment & Schedule email with the OFPHIL logo via Brevo SMTP."""
    if not settings.MAIL_SERVER or not settings.MAIL_USERNAME or not settings.MAIL_PASSWORD:
        return False
    if not to_email or "@" not in to_email:
        return False

    clinic_sender = settings.MAIL_DEFAULT_SENDER or settings.MAIL_USERNAME
    notes_html = ""
    if notes and notes.strip():
        notes_html = f"""
        <div style="margin-top: 16px; padding: 14px 16px; background-color: #FFFBEB; border: 1px solid #FDE68A; border-radius: 10px; font-size: 12.5px; color: #92400E; line-height: 1.55;">
          <div style="font-weight: 700; text-transform: uppercase; font-size: 11px; margin-bottom: 4px;">Pre-Visit Instructions &amp; Clinical Notes:</div>
          <div style="white-space: pre-wrap;">{notes.strip()}</div>
        </div>
        """

    custom_body_html = ""
    if custom_body and custom_body.strip():
        custom_body_html = f"""
        <div style="margin-bottom: 18px; padding: 14px 18px; background-color: #F8FAFC; border: 1px solid #D5E2D9; border-left: 4px solid #0B6B3A; border-radius: 8px; font-size: 13px; color: #10241A; line-height: 1.6; white-space: pre-wrap;">
          {custom_body.strip()}
        </div>
        """

    html_body = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>OFPHIL Clinic Appointment Schedule ({appointment_id})</title>
</head>
<body style="margin: 0; padding: 0; background-color: #FAFBF8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #10241A;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #FAFBF8; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 580px; background-color: #FFFFFF; border: 1px solid #D5E2D9; border-radius: 14px; overflow: hidden; box-shadow: 0 4px 20px rgba(6, 72, 38, 0.08);">
          <!-- Top Brand Header with Official OFPHIL Logo -->
          <tr>
            <td style="background-color: #064826; padding: 22px 28px; text-align: left;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="width: 48px; vertical-align: middle;">
                    <img src="{LOGO_URL}" alt="OFPHIL Logo" width="42" height="42" style="display: block; width: 42px; height: 42px; object-fit: contain; border-radius: 8px; background-color: #FFFFFF; padding: 3px;" />
                  </td>
                  <td style="padding-left: 14px; vertical-align: middle;">
                    <div style="font-size: 20px; font-weight: 800; color: #FFFFFF; letter-spacing: 1px; line-height: 1.2;">OFPHIL</div>
                    <div style="font-size: 11px; color: #9DBFA9; margin-top: 2px;">Ophthalmological Foundation of the Philippines · Clinic Scheduling Desk</div>
                  </td>
                  <td align="right" style="vertical-align: middle;">
                    <span style="display: inline-block; background-color: rgba(255, 255, 255, 0.15); border: 1px solid rgba(255, 255, 255, 0.25); color: #86EFAC; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 999px;">
                      {appointment_id}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 28px 32px;">
              <h1 style="margin: 0 0 10px 0; font-size: 21px; font-weight: 700; color: #10241A;">
                Official Clinic Appointment &amp; Schedule Notice
              </h1>
              {custom_body_html}
              <p style="margin: 0 0 18px 0; font-size: 13.5px; line-height: 1.6; color: #5A7466;">
                Good day <strong>{patient_name}</strong> (Patient ID: <strong style="font-family: monospace; color: #064826;">{patient_id}</strong>), your ophthalmic clinic appointment at the OFPHIL Eye Center has been officially scheduled. Please review your schedule details below:
              </p>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F8FAFC; border: 1px solid #D5E2D9; border-radius: 12px; overflow: hidden;">
                <tr>
                  <td style="background-color: #E8F5EC; border-bottom: 1px solid #D5E2D9; padding: 11px 18px;">
                    <span style="font-size: 11px; font-weight: 700; color: #0B6B3A; text-transform: uppercase; letter-spacing: 0.5px;">Appointment Schedule Slip · {appointment_id}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 18px 20px; font-size: 13px; line-height: 1.75; color: #10241A;">
                    <div><strong>Patient Name:</strong> {patient_name} ({patient_id})</div>
                    <div><strong>Consultation / Procedure Type:</strong> <span style="color: #0B6B3A; font-weight: 700;">{appointment_type}</span></div>
                    <div><strong>Scheduled Date:</strong> <strong>{appointment_date}</strong></div>
                    <div><strong>Scheduled Time Slot:</strong> <strong>{appointment_time}</strong></div>
                    <div><strong>Attending Ophthalmologist / Specialist:</strong> {assigned_doctor}</div>
                    <div><strong>Clinic Room / Wing:</strong> {clinic_room}</div>
                    <div><strong>Appointment Status:</strong> {('<span style="display: inline-block; background: #FFFBEB; color: #B45309; font-weight: 700; font-size: 11px; padding: 2px 8px; border-radius: 6px; border: 1px solid #FDE68A;">PENDING NURSE APPROVAL</span>' if 'Pending Nurse Approval' in appointment_type else '<span style="display: inline-block; background: #ECFDF5; color: #047857; font-weight: 700; font-size: 11px; padding: 2px 8px; border-radius: 6px; border: 1px solid #A7F3D0;">CONFIRMED SCHEDULE</span>')}</div>
                  </td>
                </tr>
              </table>

              {notes_html}

              <p style="margin: 20px 0 0 0; font-size: 12px; color: #64748B; line-height: 1.55;">
                Please arrive at the OFPHIL Clinic Admissions Desk at least <strong>30 minutes prior</strong> to your scheduled time and bring your valid government ID and previous eye examination records.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #F8FAFC; border-top: 1px solid #EEF2EF; padding: 16px 28px; text-align: center; font-size: 11px; color: #8F9E96;">
              &copy; 2026 Ophthalmological Foundation of the Philippines (OFPHIL) · Clinic Scheduling &amp; Admissions Wing
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""

    plain_fallback = ""
    if custom_body and custom_body.strip():
        plain_fallback += f"{custom_body.strip()}\n\n"
    plain_fallback += (
        f"OFPHIL Clinic Appointment Confirmed ({appointment_id})\n"
        f"Patient: {patient_name} ({patient_id})\n"
        f"Type: {appointment_type}\n"
        f"Date & Time: {appointment_date} at {appointment_time}\n"
        f"Doctor: {assigned_doctor}\n"
        f"Location: {clinic_room}\n"
        f"Notes: {notes}\n"
    )

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject.strip() if subject and subject.strip() else f"OFPHIL Clinic Appointment Schedule [{appointment_id}]: {appointment_type} on {appointment_date}"
    msg["From"] = f"OFPHIL Foundation <{clinic_sender}>"
    msg["To"] = to_email.strip()
    msg.attach(MIMEText(plain_fallback, "plain", "utf-8"))
    msg.attach(MIMEText(html_body, "html", "utf-8"))

    try:
        server = smtplib.SMTP(settings.MAIL_SERVER, settings.MAIL_PORT or 587, timeout=15)
        if settings.MAIL_USE_TLS:
            server.starttls()
        server.login(settings.MAIL_USERNAME, settings.MAIL_PASSWORD)
        server.sendmail(clinic_sender, [to_email.strip()], msg.as_string())
        server.quit()
        return True
    except Exception as e:
        print(f"[Brevo SMTP Error] Failed to send appointment schedule email: {e}")
        return False
