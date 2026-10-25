import QRCode from 'qrcode';
import { ParsedQRParams } from './types';

export interface QRCodeResult {
  buffer: Buffer;
  mimeType: string;
}

export async function generateQRCode(params: ParsedQRParams): Promise<QRCodeResult> {
  const options = {
    errorCorrectionLevel: params.errorCorrectionLevel,
    margin: params.margin,
    width: params.size,
    color: {
      dark: params.darkColor,
      light: params.lightColor,
    },
  };

  if (params.format === 'svg') {
    const svgString = await QRCode.toString(params.text, {
      ...options,
      type: 'svg',
    });
    return {
      buffer: Buffer.from(svgString, 'utf-8'),
      mimeType: 'image/svg+xml',
    };
  }

  const buffer = await QRCode.toBuffer(params.text, {
    ...options,
    type: 'png',
  });

  return {
    buffer,
    mimeType: 'image/png',
  };
}