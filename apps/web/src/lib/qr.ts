import QRCode from 'qrcode';

export const QR_DEFAULT_DARK = '#0f172a';
export const QR_DEFAULT_LIGHT = '#ffffff';
export const QR_DEFAULT_WIDTH = 512;

export const QR_SIZE_PRESETS = [256, 512, 1024] as const;

export type QrSizePreset = (typeof QR_SIZE_PRESETS)[number];

export type QrCodeOptions = {
  dark?: string;
  light?: string;
  width?: QrSizePreset | number;
};

export async function createQrCodeDataUrl(
  value: string,
  options: QrCodeOptions = {},
) {
  return QRCode.toDataURL(value, {
    width: options.width ?? QR_DEFAULT_WIDTH,
    margin: 2,
    errorCorrectionLevel: 'M',
    color: {
      dark: options.dark ?? QR_DEFAULT_DARK,
      light: options.light ?? QR_DEFAULT_LIGHT,
    },
  });
}
