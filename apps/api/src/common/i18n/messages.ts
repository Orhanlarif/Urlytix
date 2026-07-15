import type { AppLocale } from './locale';

/**
 * Canonical API messages are Turkish (existing throw sites).
 * The exception filter maps them to English when Accept-Language prefers en.
 */
const enByTr: Record<string, string> = {
  'Bir hata oluştu.': 'Something went wrong.',
  'Bu email adresi zaten kullanılıyor.':
    'This email address is already in use.',
  'Email veya şifre hatalı.': 'Invalid email or password.',
  'Doğrulama oturumu geçersiz veya süresi dolmuş.':
    'Verification session is invalid or expired.',
  'Doğrulama oturumu geçersiz.': 'Verification session is invalid.',
  'İki adımlı doğrulama etkin değil.':
    'Two-factor authentication is not enabled.',
  'Doğrulama kodu hatalı.': 'Invalid verification code.',
  'Kullanıcı bulunamadı.': 'User not found.',
  'Refresh token bulunamadı.': 'Refresh token not found.',
  'Geçersiz saat dilimi.': 'Invalid timezone.',
  'Mevcut şifre hatalı.': 'Current password is incorrect.',
  'Yeni şifre mevcut şifreden farklı olmalı.':
    'New password must be different from the current password.',
  'Oturum bulunamadı.': 'Session not found.',
  'Mevcut oturum belirlenemedi.': 'Current session could not be determined.',
  'İki adımlı doğrulama zaten etkin.':
    'Two-factor authentication is already enabled.',
  'Önce iki adımlı doğrulamayı başlatın.':
    'Start two-factor authentication setup first.',
  'Şifre hatalı.': 'Incorrect password.',
  'Token bulunamadı.': 'Token not found.',
  'Geçersiz token.': 'Invalid token.',
  'Bu kısa link zaten kullanılıyor.': 'This short link is already in use.',
  'Link bulunamadı.': 'Link not found.',
  'Bu link bir workspace’e bağlı değil.':
    'This link is not attached to a workspace.',
  'Geçerli bir bitiş tarihi gir.': 'Enter a valid expiration date.',
  'Bitiş tarihi gelecekte olmalı.': 'Expiration date must be in the future.',
  'Geçerli bir URL gir.': 'Enter a valid URL.',
  'Geçerli bir URL gir. Örnek: https://example.com':
    'Enter a valid URL. Example: https://example.com',
  'Yalnızca HTTP ve HTTPS URL kabul edilir.':
    'Only HTTP and HTTPS URLs are accepted.',
  'URL alan adı çözümlenemedi.': 'The URL hostname could not be resolved.',
  'Kısa link üretilemedi. Tekrar dene.':
    'Could not generate a short link. Try again.',
  'Kısa link sadece harf, sayı, tire ve alt çizgi içerebilir.':
    'Short links may only contain letters, numbers, hyphens, and underscores.',
  'Geçerli bir ISO tarih formatı gir.': 'Enter a valid ISO date.',
  'Status sadece ACTIVE, DISABLED veya EXPIRED olabilir.':
    'Status must be ACTIVE, DISABLED, or EXPIRED.',
  'Şifre en az bir küçük harf içermeli.':
    'Password must include at least one lowercase letter.',
  'Şifre en az bir büyük harf içermeli.':
    'Password must include at least one uppercase letter.',
  'Şifre en az bir rakam içermeli.':
    'Password must include at least one number.',
  'Şifre en az bir sembol içermeli.':
    'Password must include at least one symbol.',
  'Workspace bulunamadı.': 'Workspace not found.',
  'Onay için workspace slug değerini doğru girmeniz gerekir.':
    'Enter the workspace slug correctly to confirm.',
  'Son sahibi olduğunuz workspace silinemez. Önce başka bir workspace oluşturun.':
    'You cannot delete your last owned workspace. Create another workspace first.',
  'Kendini üye olarak ekleyemezsin.': 'You cannot add yourself as a member.',
  'Üye bulunamadı.': 'Member not found.',
  'Sahip rolü bu yolla değiştirilemez.':
    'The owner role cannot be changed this way.',
  'Kendi rolünü değiştiremezsin.': 'You cannot change your own role.',
  'Admin başka bir adminin rolünü değiştiremez.':
    'An admin cannot change another admin’s role.',
  'Workspace sahibi kaldırılamaz.': 'The workspace owner cannot be removed.',
  'Kendini bu yolla çıkaramazsın. Ayrı bir ayrılma akışı kullan.':
    'You cannot leave this way. Use a dedicated leave flow.',
  'Admin başka bir admini kaldıramaz.': 'An admin cannot remove another admin.',
  'Workspace erişim yetkin yok.': 'You do not have access to this workspace.',
  'Webhook bulunamadı.': 'Webhook not found.',
  'API anahtarı bulunamadı.': 'API key not found.',
  'Plan bulunamadı.': 'Plan not found.',
  'Bu alan adı zaten kayıtlı.': 'This domain is already registered.',
  'Alan adı bulunamadı.': 'Domain not found.',
  'Kısa link bulunamadı.': 'Short link not found.',
  'Bu linkin süresi dolmuş.': 'This link has expired.',
  'Bu link aktif değil.': 'This link is not active.',
  'Bu link şifre korumalı.': 'This link is password protected.',
  'Oturum süren doldu. Lütfen tekrar giriş yap.':
    'Your session expired. Please sign in again.',
};

export function translateMessage(message: string, locale: AppLocale): string {
  if (locale === 'tr') return message;

  if (enByTr[message]) return enByTr[message];

  // class-validator may join multiple messages with ", "
  if (message.includes(', ')) {
    return message
      .split(', ')
      .map((part) => enByTr[part] ?? part)
      .join(', ');
  }

  return enByTr[message] ?? message;
}

export function translateFallback(locale: AppLocale): string {
  return locale === 'tr' ? 'Bir hata oluştu.' : 'Something went wrong.';
}
