import QRCode from 'qrcode';

export async function createQrCodeDataUrl(value: string) {
  return QRCode.toDataURL(value, {
    width: 512,
    margin: 2,
    errorCorrectionLevel: 'M',
    color: {
      dark: '#0f172a',
      light: '#ffffff',
    },
  });
}