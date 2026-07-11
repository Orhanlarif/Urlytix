'use client';

import { Bell, Globe2, ShieldCheck } from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardHeader } from '@/components/ui/card';
import { LanguageToggle } from '@/components/ui/language-toggle';
import { PageHeader } from '@/components/ui/page-header';
import { Select } from '@/components/ui/select';
import { useLanguage } from '@/i18n/language-provider';

export default function SettingsPage() {
  const { locale } = useLanguage();
  const copy = locale === 'tr' ? tr : en;

  return (
    <AppShell>
      <PageHeader badge={copy.badge} title={copy.title} description={copy.description} />
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title={copy.language} description={copy.languageDesc} />
          <div className="mt-6 flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 p-4">
            <div className="flex items-center gap-3">
              <Globe2 className="h-5 w-5 text-cyan-300" />
              <span className="text-sm text-slate-300">{copy.interfaceLanguage}</span>
            </div>
            <LanguageToggle size="sm" />
          </div>
        </Card>
        <Card>
          <CardHeader title={copy.preferences} description={copy.preferencesDesc} />
          <div className="mt-6 space-y-5">
            <Select label={copy.timezone} defaultValue="auto">
              <option value="auto">{copy.automatic}</option>
              <option value="utc">UTC</option>
              <option value="europe-istanbul">Europe/Istanbul</option>
            </Select>
            <div className="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-950 p-4">
              <Bell className="mt-0.5 h-5 w-5 text-slate-400" />
              <div><p className="text-sm font-medium">{copy.notifications}</p><p className="mt-1 text-xs text-slate-500">{copy.notificationsDesc}</p></div>
            </div>
          </div>
        </Card>
        <Card className="lg:col-span-2">
          <div className="flex items-start gap-4">
            <div className="rounded-xl bg-emerald-400/10 p-3 text-emerald-300"><ShieldCheck className="h-6 w-6" /></div>
            <div><h2 className="font-semibold">{copy.security}</h2><p className="mt-1 text-sm text-slate-400">{copy.securityDesc}</p></div>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}

const tr = {
  badge: 'Hesap', title: 'Ayarlar', description: 'Arayüz ve hesap tercihlerini yönet.',
  language: 'Dil', languageDesc: 'Urlytics arayüz dilini seç.', interfaceLanguage: 'Arayüz dili',
  preferences: 'Tercihler', preferencesDesc: 'Yerel görüntüleme ayarların.', timezone: 'Saat dilimi',
  automatic: 'Otomatik', notifications: 'Bildirimler', notificationsDesc: 'E-posta bildirimleri yakında kullanıma açılacak.',
  security: 'Güvenli oturum', securityDesc: 'Kimlik doğrulama cookie tabanlı oturumları tercih eder; eski API sürümleri için token uyumluluğu korunur.',
};
const en = {
  badge: 'Account', title: 'Settings', description: 'Manage interface and account preferences.',
  language: 'Language', languageDesc: 'Choose the Urlytics interface language.', interfaceLanguage: 'Interface language',
  preferences: 'Preferences', preferencesDesc: 'Your local display preferences.', timezone: 'Time zone',
  automatic: 'Automatic', notifications: 'Notifications', notificationsDesc: 'Email notifications will be available soon.',
  security: 'Secure session', securityDesc: 'Authentication prefers cookie sessions while keeping token compatibility for older API versions.',
};
