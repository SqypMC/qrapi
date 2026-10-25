import { VercelRequest, VercelResponse } from '@vercel/node';
import { validateQRParams, buildCacheKey, getMimeType, getCacheHeaders } from '../validation';
import { generateQRCode } from '../generator';
import { ParsedQRParams } from '../types';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({
      error: 'Method Not Allowed',
      message: 'Only GET requests are supported.',
    });
    return;
  }

  const validation = validateQRParams(req.query);

  if (!validation.valid) {
    res.status(400).json({
      error: 'Bad Request',
      message: validation.error,
    });
    return;
  }

  const params = validation.params!;
  const cacheKey = buildCacheKey(params);
  const mimeType = getMimeType(params.format);
  const cacheHeaders = getCacheHeaders();

  Object.entries(cacheHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  res.setHeader('Content-Type', mimeType);
  res.setHeader('ETag', `"${Buffer.from(cacheKey).toString('base64url')}"`);

  try {
    const result = await generateQRCode(params);
    res.status(200).send(result.buffer);
  } catch (error) {
    console.error('QR generation error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to generate QR code. Please try again.',
    });
  }
}

export const config = {
  api: {
    responseLimit: '8mb',
  },
};