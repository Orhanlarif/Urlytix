import { resolveLocale } from './locale';
import { translateFallback, translateMessage } from './messages';

describe('api i18n', () => {
  it('prefers Turkish from Accept-Language', () => {
    expect(resolveLocale('tr-TR,tr;q=0.9,en;q=0.8')).toBe('tr');
    expect(resolveLocale('en-US,en;q=0.9')).toBe('en');
    expect(resolveLocale(undefined)).toBe('en');
  });

  it('translates known Turkish messages to English', () => {
    expect(translateMessage('Link bulunamadı.', 'en')).toBe('Link not found.');
    expect(translateMessage('Link bulunamadı.', 'tr')).toBe('Link bulunamadı.');
    expect(translateFallback('en')).toBe('Something went wrong.');
  });

  it('translates joined validation messages', () => {
    expect(
      translateMessage(
        'Şifre en az bir küçük harf içermeli., Şifre en az bir rakam içermeli.',
        'en',
      ),
    ).toBe(
      'Password must include at least one lowercase letter., Password must include at least one number.',
    );
  });
});
