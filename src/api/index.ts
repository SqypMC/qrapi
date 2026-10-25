import { VercelRequest, VercelResponse } from '@vercel/node';
import { APIInfo, EndpointInfo, ParameterInfo } from '../types';

const VERSION = process.env.npm_package_version || '1.0.0';

const API_INFO: APIInfo = {
  name: 'QR Code Generator API',
  version: VERSION,
  description: 'Free, public QR code generation API. No authentication, no API keys, no registration required.',
  endpoints: [
    {
      path: '/qr',
      method: 'GET',
      description: 'Generate a QR code image. Returns the image directly with appropriate Content-Type header.',
      parameters: [
        {
          name: 'text',
          type: 'string',
          required: true,
          description: 'The data to encode in the QR code. Supports URLs, plain text, email (mailto:), phone (tel:), etc.',
          validation: 'Max 2953 characters. Must be URL-encoded.',
        },
        {
          name: 'size',
          type: 'integer',
          required: false,
          default: '256',
          description: 'Image size in pixels (width and height).',
          validation: 'Integer between 64 and 1024.',
        },
        {
          name: 'format',
          type: 'string',
          required: false,
          default: 'png',
          description: 'Output image format.',
          validation: 'png or svg.',
        },
        {
          name: 'errorCorrectionLevel',
          type: 'string',
          required: false,
          default: 'M',
          description: 'QR code error correction level.',
          validation: 'L (7%), M (15%), Q (25%), H (30%).',
        },
        {
          name: 'margin',
          type: 'integer',
          required: false,
          default: '4',
          description: 'Quiet zone margin in modules.',
          validation: 'Integer between 0 and 50.',
        },
        {
          name: 'color.dark',
          type: 'string',
          required: false,
          default: '#000000',
          description: 'Foreground (dark module) color in hex.',
          validation: 'Hex color format #RRGGBB.',
        },
        {
          name: 'color.light',
          type: 'string',
          required: false,
          default: '#FFFFFF',
          description: 'Background (light module) color in hex.',
          validation: 'Hex color format #RRGGBB. Must differ from dark color.',
        },
      ],
      examples: [
        '/qr?text=https%3A%2F%2Fgoogle.com',
        '/qr?text=Hello%20World',
        '/qr?text=mailto%3Atest%40example.com',
        '/qr?text=tel%3A%2B421900123456',
        '/qr?text=https%3A%2F%2Fexample.com&size=512',
        '/qr?text=https%3A%2F%2Fexample.com&format=svg',
        '/qr?text=https%3A%2F%2Fexample.com&errorCorrectionLevel=H&margin=2',
        '/qr?text=https%3A%2F%2Fexample.com&color.dark=%231a1a2e&color.light=%23f5f5f5',
      ],
    },
    {
      path: '/health',
      method: 'GET',
      description: 'Health check endpoint. Returns service status and version.',
      parameters: [],
      examples: ['/health'],
    },
    {
      path: '/',
      method: 'GET',
      description: 'API documentation and usage examples.',
      parameters: [],
      examples: ['/'],
    },
  ],
};

export default function handler(req: VercelRequest, res: VercelResponse): void {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({
      error: 'Method Not Allowed',
      message: 'Only GET requests are supported.',
    });
    return;
  }

  const accept = req.headers.accept || '';
  const wantsJson = accept.includes('application/json');

  if (wantsJson) {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    res.status(200).json(API_INFO);
    return;
  }

  const baseUrl = `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}`;
  const html = generateHTML(API_INFO, baseUrl);

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  res.status(200).send(html);
}

function generateHTML(info: APIInfo, baseUrl: string): string {
  const endpointRows = info.endpoints
    .map(
      (ep) => `
    <section style="margin-bottom: 2rem; padding: 1rem; border: 1px solid #e0e0e0; border-radius: 8px;">
      <h2 style="margin-top: 0; color: #333;">${ep.method} ${ep.path}</h2>
      <p>${ep.description}</p>
      ${ep.parameters.length > 0 ? `
        <table style="width: 100%; border-collapse: collapse; margin: 1rem 0;">
          <thead>
            <tr style="background: #f5f5f5;">
              <th style="padding: 0.5rem; text-align: left; border-bottom: 1px solid #ddd;">Parameter</th>
              <th style="padding: 0.5rem; text-align: left; border-bottom: 1px solid #ddd;">Type</th>
              <th style="padding: 0.5rem; text-align: left; border-bottom: 1px solid #ddd;">Required</th>
              <th style="padding: 0.5rem; text-align: left; border-bottom: 1px solid #ddd;">Default</th>
              <th style="padding: 0.5rem; text-align: left; border-bottom: 1px solid #ddd;">Description</th>
              <th style="padding: 0.5rem; text-align: left; border-bottom: 1px solid #ddd;">Validation</th>
            </tr>
          </thead>
          <tbody>
            ${ep.parameters
              .map(
                (p) => `
              <tr>
                <td style="padding: 0.5rem; border-bottom: 1px solid #eee; font-family: monospace;">${p.name}</td>
                <td style="padding: 0.5rem; border-bottom: 1px solid #eee;">${p.type}</td>
                <td style="padding: 0.5rem; border-bottom: 1px solid #eee;">${p.required ? 'Yes' : 'No'}</td>
                <td style="padding: 0.5rem; border-bottom: 1px solid #eee;">${p.default || '-'}</td>
                <td style="padding: 0.5rem; border-bottom: 1px solid #eee;">${p.description}</td>
                <td style="padding: 0.5rem; border-bottom: 1px solid #eee; font-size: 0.85rem;">${p.validation || '-'}</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
      ` : ''}
      <h3 style="margin-bottom: 0.5rem;">Examples:</h3>
      <ul style="margin: 0; padding-left: 1.5rem;">
        ${ep.examples
          .map(
            (ex) => `
          <li><code>${baseUrl}${ex}</code></li>
        `
          )
          .join('')}
      </ul>
    </section>
  `
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${info.name} v${info.version}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; max-width: 900px; margin: 0 auto; padding: 2rem; color: #333; }
    h1 { color: #1a1a2e; border-bottom: 2px solid #1a1a2e; padding-bottom: 0.5rem; }
    code { background: #f5f5f5; padding: 0.2rem 0.4rem; border-radius: 4px; font-family: 'Monaco', 'Consolas', monospace; }
    a { color: #0066cc; }
    .footer { margin-top: 3rem; padding-top: 1rem; border-top: 1px solid #e0e0e0; font-size: 0.9rem; color: #666; }
  </style>
</head>
<body>
  <h1>${info.name} <span style="font-weight: normal; font-size: 0.7em;">v${info.version}</span></h1>
  <p>${info.description}</p>
  <p><strong>Base URL:</strong> <code>${baseUrl}</code></p>
  ${endpointRows}
  <div class="footer">
    <p>This API is free to use. No authentication, no API keys, no registration required.</p>
    <p>Hosted on Vercel. Subject to Vercel Hobby tier limits.</p>
  </div>
</body>
</html>`;
}