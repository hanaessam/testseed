import type { RegistrationOtpEmailMessage } from "@testseed/core";
import nodemailer from "nodemailer";

export interface SmtpEmailConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
}

export function createRegistrationOtpEmailSender(config: SmtpEmailConfig) {
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass
    }
  });

  return async function sendRegistrationOtpEmail(
    message: RegistrationOtpEmailMessage
  ): Promise<void> {
    await transporter.sendMail({
      from: config.from,
      to: message.email,
      subject: "Verify your TestSeed account",
      text: buildTextEmail(message),
      html: buildHtmlEmail(message)
    });
  };
}

function buildTextEmail(message: RegistrationOtpEmailMessage): string {
  return [
    "Verify your TestSeed account",
    "",
    `Your verification code is ${message.otp}.`,
    `It expires at ${message.expiresAt.toISOString()}.`,
    "",
    "If you did not request this account, ignore this email."
  ].join("\n");
}

function buildHtmlEmail(message: RegistrationOtpEmailMessage): string {
  const expiresAt = message.expiresAt.toLocaleString("en", {
    dateStyle: "medium",
    timeStyle: "short"
  });

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Verify your TestSeed account</title>
  </head>
  <body style="margin:0;background:#09090B;color:#FAFAFA;font-family:Inter,Arial,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#09090B;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:#111113;border:1px solid #27272A;">
            <tr>
              <td style="padding:28px 28px 18px;border-bottom:1px solid #27272A;">
                <div style="font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:14px;letter-spacing:.04em;color:#FAFAFA;">
                  <span style="display:inline-block;width:8px;height:8px;background:#4ADE80;margin-right:10px;"></span>TestSeed
                </div>
                <h1 style="margin:24px 0 0;font-size:24px;line-height:1.25;font-weight:600;color:#FAFAFA;">Verify your account</h1>
                <p style="margin:10px 0 0;font-size:14px;line-height:1.7;color:#A1A1AA;">Enter this code in TestSeed to finish creating your account.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                <div style="background:#09090B;border:1px solid #27272A;padding:22px;text-align:center;">
                  <div style="font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:34px;line-height:1;letter-spacing:.22em;color:#4ADE80;">${message.otp}</div>
                </div>
                <p style="margin:18px 0 0;font-size:13px;line-height:1.7;color:#A1A1AA;">This code expires at <strong style="color:#FAFAFA;">${expiresAt}</strong>. For your security, never share it with anyone.</p>
                <p style="margin:18px 0 0;font-size:12px;line-height:1.7;color:#71717A;">If you did not request a TestSeed account, you can safely ignore this email.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
