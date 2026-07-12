export type RedirectErrorCode =
  | 'not_found'
  | 'inactive'
  | 'expired'
  | 'password_required'
  | 'password_invalid';

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

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function renderRedirectErrorPage(
  code: RedirectErrorCode,
  message: string,
): string {
  const titles: Record<RedirectErrorCode, string> = {
    not_found: 'Link Bulunamadı',
    inactive: 'Link Devre Dışı',
    expired: 'Link Süresi Doldu',
    password_required: 'Şifre Gerekli',
    password_invalid: 'Şifre Hatalı',
  };

  const descriptions: Record<RedirectErrorCode, string> = {
    not_found: 'Aradığın kısa link mevcut değil veya kaldırılmış olabilir.',
    inactive: 'Bu link şu anda devre dışı bırakılmış.',
    expired: 'Bu linkin geçerlilik süresi sona ermiş.',
    password_required: 'Bu linke erişmek için şifre girmen gerekiyor.',
    password_invalid: 'Girdiğin şifre hatalı. Tekrar dene.',
  };

  const title = titles[code];
  const description = descriptions[code];
  const safeMessage = escapeHtml(message);

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
    <div class="message">${safeMessage}</div>
    <a href="/">Ana Sayfaya Dön</a>
  </div>
</body>
</html>`;
}

export function renderPasswordGatePage(
  shortCode: string,
  errorMessage?: string,
): string {
  const safeCode = escapeHtml(shortCode);
  const safeError = errorMessage ? escapeHtml(errorMessage) : '';

  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Şifre Gerekli — Urlytics</title>
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
    p { color: #94a3b8; line-height: 1.6; font-size: 15px; margin-bottom: 20px; }
    label { display: block; text-align: left; font-size: 14px; color: #cbd5e1; margin-bottom: 8px; }
    input {
      width: 100%;
      border-radius: 12px;
      border: 1px solid #334155;
      background: #020617;
      color: #f8fafc;
      padding: 12px 14px;
      font-size: 15px;
      outline: none;
    }
    input:focus { border-color: #22d3ee; box-shadow: 0 0 0 3px rgba(34, 211, 238, 0.15); }
    .error {
      margin-top: 12px;
      padding: 10px 12px;
      border-radius: 12px;
      background: rgba(248, 113, 113, 0.1);
      border: 1px solid rgba(248, 113, 113, 0.3);
      color: #fecaca;
      font-size: 13px;
    }
    button {
      width: 100%;
      margin-top: 16px;
      padding: 12px 20px;
      border: none;
      border-radius: 12px;
      background: #22d3ee;
      color: #020617;
      font-weight: 700;
      font-size: 14px;
      cursor: pointer;
    }
    button:hover { background: #67e8f9; }
    .hint { margin-top: 16px; font-size: 12px; color: #64748b; text-align: center; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">Urlytics</div>
    <h1>Şifre Gerekli</h1>
    <p>Bu kısa linke devam etmek için şifreyi gir.</p>
    <form method="POST" action="/api/r/${safeCode}" autocomplete="current-password">
      <label for="password">Şifre</label>
      <input id="password" name="password" type="password" required minlength="1" maxlength="72" autofocus />
      ${safeError ? `<div class="error">${safeError}</div>` : ''}
      <button type="submit">Devam Et</button>
    </form>
    <p class="hint">/${safeCode}</p>
  </div>
</body>
</html>`;
}
