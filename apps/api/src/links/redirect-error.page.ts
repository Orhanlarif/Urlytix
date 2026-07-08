export type RedirectErrorCode = 'not_found' | 'inactive' | 'expired';

export class LinkRedirectException extends Error {
  constructor(
    public readonly code: RedirectErrorCode,
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = 'LinkRedirectException';
  }
}

export function renderRedirectErrorPage(
  code: RedirectErrorCode,
  message: string,
): string {
  const titles: Record<RedirectErrorCode, string> = {
    not_found: 'Link Bulunamadı',
    inactive: 'Link Devre Dışı',
    expired: 'Link Süresi Doldu',
  };

  const descriptions: Record<RedirectErrorCode, string> = {
    not_found: 'Aradığın kısa link mevcut değil veya kaldırılmış olabilir.',
    inactive: 'Bu link şu anda devre dışı bırakılmış.',
    expired: 'Bu linkin geçerlilik süresi sona ermiş.',
  };

  const title = titles[code];
  const description = descriptions[code];

  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title} — Urlytics</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #020617;
      color: #f8fafc;
      font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;
      padding: 24px;
    }
    .card {
      max-width: 440px;
      width: 100%;
      border: 1px solid #1e293b;
      background: rgba(15, 23, 42, 0.9);
      border-radius: 24px;
      padding: 32px;
      text-align: center;
      box-shadow: 0 25px 50px rgba(0, 0, 0, 0.35);
    }
    .badge {
      display: inline-block;
      border: 1px solid rgba(34, 211, 238, 0.25);
      background: rgba(34, 211, 238, 0.1);
      color: #a5f3fc;
      border-radius: 999px;
      padding: 8px 16px;
      font-size: 13px;
      margin-bottom: 20px;
    }
    h1 { font-size: 28px; font-weight: 700; margin-bottom: 12px; }
    p { color: #94a3b8; line-height: 1.6; font-size: 15px; }
    .message {
      margin-top: 16px;
      padding: 12px 16px;
      border-radius: 12px;
      background: #0f172a;
      border: 1px solid #1e293b;
      color: #cbd5e1;
      font-size: 14px;
    }
    a {
      display: inline-block;
      margin-top: 24px;
      padding: 12px 20px;
      border-radius: 12px;
      background: #22d3ee;
      color: #020617;
      text-decoration: none;
      font-weight: 600;
      font-size: 14px;
    }
    a:hover { background: #67e8f9; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">Urlytics</div>
    <h1>${title}</h1>
    <p>${description}</p>
    <div class="message">${message}</div>
    <a href="/">Ana Sayfaya Dön</a>
  </div>
</body>
</html>`;
}
