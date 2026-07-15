export type PasswordResetEmailLocale = 'en' | 'tr';

export function buildPasswordResetEmail(input: {
  locale: string;
  resetUrl: string;
  expiresMinutes: number;
  userName?: string | null;
}) {
  const locale: PasswordResetEmailLocale = input.locale
    ?.toLowerCase()
    .startsWith('tr')
    ? 'tr'
    : 'en';

  if (locale === 'tr') {
    const greeting = input.userName ? `Merhaba ${input.userName},` : 'Merhaba,';
    const subject = 'Urlytix şifre sıfırlama';
    const text = [
      greeting,
      '',
      'Hesabınız için bir şifre sıfırlama talebi aldık.',
      `Bu bağlantı ${input.expiresMinutes} dakika geçerlidir:`,
      input.resetUrl,
      '',
      'Bu talebi siz yapmadıysanız bu e-postayı yok sayabilirsiniz.',
      '',
      '— Urlytix',
    ].join('\n');
    const html = `
<!DOCTYPE html>
<html lang="tr">
  <body style="margin:0;padding:0;background:#f4f6f8;font-family:Segoe UI,Helvetica,Arial,sans-serif;color:#111827;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:12px;padding:32px;border:1px solid #e5e7eb;">
            <tr><td style="font-size:20px;font-weight:700;padding-bottom:8px;">Urlytix</td></tr>
            <tr><td style="font-size:16px;line-height:1.5;padding-bottom:16px;">${greeting}</td></tr>
            <tr><td style="font-size:15px;line-height:1.6;padding-bottom:24px;">Hesabınız için bir şifre sıfırlama talebi aldık. Bağlantı ${input.expiresMinutes} dakika geçerlidir.</td></tr>
            <tr>
              <td style="padding-bottom:24px;">
                <a href="${input.resetUrl}" style="display:inline-block;background:#0f766e;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;">Şifreyi sıfırla</a>
              </td>
            </tr>
            <tr><td style="font-size:13px;line-height:1.5;color:#6b7280;padding-bottom:8px;">Buton çalışmazsa bu bağlantıyı tarayıcınıza yapıştırın:</td></tr>
            <tr><td style="font-size:12px;line-height:1.5;word-break:break-all;color:#0f766e;padding-bottom:24px;">${input.resetUrl}</td></tr>
            <tr><td style="font-size:13px;line-height:1.5;color:#6b7280;">Bu talebi siz yapmadıysanız bu e-postayı yok sayabilirsiniz.</td></tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`.trim();

    return { subject, text, html };
  }

  const greeting = input.userName ? `Hi ${input.userName},` : 'Hi,';
  const subject = 'Reset your Urlytix password';
  const text = [
    greeting,
    '',
    'We received a request to reset your Urlytix password.',
    `This link expires in ${input.expiresMinutes} minutes:`,
    input.resetUrl,
    '',
    'If you did not request this, you can ignore this email.',
    '',
    '— Urlytix',
  ].join('\n');
  const html = `
<!DOCTYPE html>
<html lang="en">
  <body style="margin:0;padding:0;background:#f4f6f8;font-family:Segoe UI,Helvetica,Arial,sans-serif;color:#111827;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:12px;padding:32px;border:1px solid #e5e7eb;">
            <tr><td style="font-size:20px;font-weight:700;padding-bottom:8px;">Urlytix</td></tr>
            <tr><td style="font-size:16px;line-height:1.5;padding-bottom:16px;">${greeting}</td></tr>
            <tr><td style="font-size:15px;line-height:1.6;padding-bottom:24px;">We received a request to reset your Urlytix password. This link expires in ${input.expiresMinutes} minutes.</td></tr>
            <tr>
              <td style="padding-bottom:24px;">
                <a href="${input.resetUrl}" style="display:inline-block;background:#0f766e;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;">Reset password</a>
              </td>
            </tr>
            <tr><td style="font-size:13px;line-height:1.5;color:#6b7280;padding-bottom:8px;">If the button does not work, paste this link into your browser:</td></tr>
            <tr><td style="font-size:12px;line-height:1.5;word-break:break-all;color:#0f766e;padding-bottom:24px;">${input.resetUrl}</td></tr>
            <tr><td style="font-size:13px;line-height:1.5;color:#6b7280;">If you did not request this, you can ignore this email.</td></tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`.trim();

  return { subject, text, html };
}
