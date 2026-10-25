import { VercelRequest, VercelResponse } from '@vercel/node';
import { HealthResponse } from '../types';

const VERSION = process.env.npm_package_version || '1.0.0';

export default function handler(req: VercelRequest, res: VercelResponse): void {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({
      error: 'Method Not Allowed',
      message: 'Only GET requests are supported.',
    });
    return;
  }

  const response: HealthResponse = {
    status: 'ok',
    version: VERSION,
    timestamp: new Date().toISOString(),
  };

  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
  res.setHeader('Content-Type', 'application/json');
  res.status(200).json(response);
}