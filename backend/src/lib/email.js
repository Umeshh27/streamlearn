import nodemailer from "nodemailer";

/**
 * Creates and returns a Nodemailer transporter based on environment variables.
 */
const createTransporter = () => {
  const user = process.env.EMAIL_USER?.trim();
  const pass = process.env.EMAIL_PASS ? process.env.EMAIL_PASS.replace(/\s+/g, "").trim() : null;

  if (!user || !pass) {
    return null;
  }

  // If custom SMTP host is specified
  if (process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_PORT === "465",
      auth: { user, pass },
    });
  }

  // Default to standard service (e.g. Gmail)
  return nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || "gmail",
    auth: { user, pass },
  });
};

/**
 * Generates the responsive, branded HTML email template for LangBridge verification.
 */
const getVerificationEmailHtml = (code, fullName = "Learner") => {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify your LangBridge Email</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 0;
      background-color: #0f172a;
      color: #e2e8f0;
    }
    .wrapper {
      max-width: 560px;
      margin: 40px auto;
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.4);
    }
    .header {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      padding: 32px 24px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      color: #ffffff;
      font-size: 26px;
      font-weight: 800;
      letter-spacing: 1px;
    }
    .header p {
      margin: 6px 0 0 0;
      color: rgba(255, 255, 255, 0.85);
      font-size: 13px;
    }
    .content {
      padding: 36px 28px;
    }
    .greeting {
      font-size: 18px;
      font-weight: 700;
      color: #f8fafc;
      margin-bottom: 12px;
    }
    .text {
      font-size: 14px;
      line-height: 1.6;
      color: #94a3b8;
      margin: 0 0 24px 0;
    }
    .code-box {
      background: #0f172a;
      border: 2px dashed #10b981;
      border-radius: 12px;
      padding: 20px;
      text-align: center;
      margin: 28px 0;
    }
    .code {
      font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace;
      font-size: 36px;
      font-weight: 800;
      letter-spacing: 8px;
      color: #10b981;
      margin: 0;
    }
    .expires {
      font-size: 12px;
      color: #64748b;
      margin-top: 8px;
    }
    .notice {
      background: rgba(245, 158, 11, 0.1);
      border-left: 4px solid #f59e0b;
      padding: 12px 16px;
      border-radius: 6px;
      font-size: 12px;
      color: #fbbf24;
      margin: 24px 0;
    }
    .footer {
      border-top: 1px solid #334155;
      padding: 20px 24px;
      text-align: center;
      font-size: 11px;
      color: #64748b;
      background: #0f172a;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>LangBridge</h1>
      <p>Global Language Exchange & Community</p>
    </div>
    <div class="content">
      <div class="greeting">Welcome to LangBridge, ${fullName}!</div>
      <p class="text">
        Thank you for joining our language learning community. To confirm that you are a genuine user and activate your account, please enter the 6-digit verification code below:
      </p>

      <div class="code-box">
        <div class="code">${code}</div>
        <div class="expires">Valid for 15 minutes</div>
      </div>

      <div class="notice">
        <strong>Security Notice:</strong> Never share this verification code with anyone. LangBridge team members will never ask for your code or password.
      </div>

      <p class="text" style="margin-bottom: 0;">
        If you did not sign up for a LangBridge account, you can safely ignore this email.
      </p>
    </div>
    <div class="footer">
      &copy; ${new Date().getFullYear()} LangBridge. Dedicated to safe, respectful language learning for ages 14+.
    </div>
  </div>
</body>
</html>
  `;
};

/**
 * Sends a 6-digit verification email to the user.
 * Falls back gracefully to console logging in development or if SMTP is not configured.
 */
export const sendVerificationEmail = async ({ email, code, fullName = "Learner" }) => {
  const transporter = createTransporter();

  // Highlighted console log for seamless development & verification
  console.log("──────────────────────────────────────────────────");
  console.log(`📧 [LANGBRIDGE VERIFICATION CODE]`);
  console.log(`To:   ${email} (${fullName})`);
  console.log(`Code: >>> ${code} <<<`);
  console.log(`Expires in: 15 minutes`);
  console.log("──────────────────────────────────────────────────");

  if (!transporter) {
    console.warn(
      "[Nodemailer] EMAIL_USER and EMAIL_PASS not configured in backend/.env. Using console fallback above for testing."
    );
    return { success: true, mode: "console_fallback" };
  }

  try {
    const fromAddress = process.env.EMAIL_FROM || `"LangBridge" <${process.env.EMAIL_USER}>`;

    const info = await transporter.sendMail({
      from: fromAddress,
      to: email,
      subject: `LangBridge: Your Verification Code is ${code}`,
      text: `Welcome to LangBridge, ${fullName}!\n\nYour 6-digit verification code is: ${code}\n\nThis code will expire in 15 minutes.\n\nIf you did not request this, please ignore this email.`,
      html: getVerificationEmailHtml(code, fullName),
    });

    console.log(`[Nodemailer] Verification email sent to ${email} (Message ID: ${info.messageId})`);
    return { success: true, messageId: info.messageId, mode: "smtp" };
  } catch (error) {
    console.error(`[Nodemailer] Failed to send email to ${email}:`, error.message || error);
    return { success: false, error: error.message, mode: "error" };
  }
};
