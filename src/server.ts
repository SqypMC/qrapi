import { createServer } from 'http';
import { parse } from 'url';
import { validateQRParams, buildCacheKey, getMimeType, getCacheHeaders } from './validation';
import { generateQRCode } from './generator';
import { ParsedQRParams } from './types';

const PORT = process.env.PORT || 3000;

function parseQuery(queryString: string): Record<string, string | string[]> {
  const params: Record<string, string | string[]> = {};
  if (!queryString) return params;

  const pairs = queryString.split('&');
  for (const pair of pairs) {
    const [key, value] = pair.split('=');
    const decodedKey = decodeURIComponent(key);
    const decodedValue = decodeURIComponent(value || '');
    if (params[decodedKey]) {
      if (Array.isArray(params[decodedKey])) {
        (params[decodedKey] as string[]).push(decodedValue);
      } else {
        params[decodedKey] = [params[decodedKey] as string, decodedValue];
      }
    } else {
      params[decodedKey] = decodedValue;
    }
  }
  return params;
}

async function handleRequest(req: any, res: any): Promise<void> {
  const parsedUrl = parse(req.url || '', true);
  const pathname = parsedUrl.pathname || '/';
  const query = parsedUrl.query;

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    return res.end();
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET, OPTIONS');
    res.statusCode = 405;
    return res.end(JSON.stringify({ error: 'Method Not Allowed', message: 'Only GET requests are supported.' }));
  }

  if (pathname === '/health') {
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 200;
    return res.end(JSON.stringify({
      status: 'ok',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    }));
  }

  if (pathname === '/' || pathname === '/index') {
    const accept = req.headers.accept || '';
    const wantsJson = accept.includes('application/json');

    if (wantsJson) {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
      res.statusCode = 200;
      return res.end(JSON.stringify({
        name: 'QR Code Generator API',
        version: '1.0.0',
        description: 'Free, public QR code generation API. No authentication, no API keys, no registration required.',
      }));
    }

    const baseUrl = `http://localhost:${PORT}`;
    const html = generateHTML(baseUrl);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    res.statusCode = 200;
    return res.end(html);
  }

  if (pathname === '/qr') {
    const validation = validateQRParams(query);

    if (!validation.valid) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ error: 'Bad Request', message: validation.error }));
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
      res.statusCode = 200;
      return res.end(result.buffer);
    } catch (error) {
      console.error('QR generation error:', error);
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ error: 'Internal Server Error', message: 'Failed to generate QR code.' }));
    }
  }

  res.statusCode = 404;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ error: 'Not Found', message: 'Endpoint not found.' }));
}

function generateHTML(baseUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>QR Code Generator API</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; max-width: 900px; margin: 0 auto; padding: 2rem; color: #333; }
    h1 { color: #1a1a2e; border-bottom: 2px solid #1a1a2e; padding-bottom: 0.5rem; }
    code { background: #f5f5f5; padding: 0.2rem 0.4rem; border-radius: 4px; font-family: 'Monaco', 'Consolas', monospace; }
    a { color: #0066cc; }
    .endpoint { margin-bottom: 2rem; padding: 1rem; border: 1px solid #e0e0e0; border-radius: 8px; }
    .footer { margin-top: 3rem; padding-top: 1rem; border-top: 1px solid #e0e0e0; font-size: 0.9rem; color: #666; }
    table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
    th, td { padding: 0.5rem; text-align: left; border-bottom: 1px solid #eee; }
    th { background: #f5f5f5; }
  </style>
</head>
<body>
  <h1>QR Code Generator API <span style="font-weight: normal; font-size: 0.7em;">v1.0.0</span></h1>
  <p>Free, public QR code generation API. No authentication, no API keys, no registration required.</p>
  <p><strong>Base URL:</strong> <code>${baseUrl}</code></p>

  <div class="endpoint">
    <h2>GET /qr</h2>
    <p>Generate a QR code image. Returns the image directly with appropriate Content-Type header.</p>
    <table>
      <thead><tr><th>Parameter</th><th>Type</th><th>Required</th><th>Default</th><th>Description</th><th>Validation</th></tr></thead>
      <tbody>
        <tr><td><code>text</code></td><td>string</td><td>Yes</td><td>-</td><td>Data to encode (URL, text, mailto:, tel:, etc.)</td><td>Max 2953 chars, URL-encoded</td></tr>
        <tr><td><code>size</code></td><td>integer</td><td>No</td><td>256</td><td>Image size in pixels</td><td>64-1024</td></tr>
        <tr><td><code>format</code></td><td>string</td><td>No</td><td>png</td><td>Output format</td><td>png or svg</td></tr>
        <tr><td><code>errorCorrectionLevel</code></td><td>string</td><td>No</td><td>M</td><td>Error correction</td><td>L, M, Q, H</td></tr>
        <tr><td><code>margin</code></td><td>integer</td><td>No</td><td>4</td><td>Quiet zone margin</td><td>0-50</td></tr>
        <tr><td><code>color.dark</code></td><td>string</td><td>No</td><td>#000000</td><td>Foreground color</td><td>Hex #RRGGBB</td></tr>
        <tr><td><code>color.light</code></td><td>string</td><td>No</td><td>#FFFFFF</td><td>Background color</td><td>Hex #RRGGBB, ≠ dark</td></tr>
      </tbody>
    </table>
    <h3>Examples:</h3>
    <ul>
      <li><code>${baseUrl}/qr?text=https%3A%2F%2Fgoogle.com</code></li>
      <li><code>${baseUrl}/qr?text=Hello%20World</code></li>
      <li><code>${baseUrl}/qr?text=mailto%3Atest%40example.com</code></li>
      <li><code>${baseUrl}/qr?text=tel%3A%2B421900123456</code></li>
      <li><code>${baseUrl}/qr?text=https%3A%2F%2Fexample.com&size=512</code></li>
      <li><code>${baseUrl}/qr?text=https%3A%2F%2Fexample.com&format=svg</code></li>
      <li><code>${baseUrl}/qr?text=https%3A%2F%2Fexample.com&errorCorrectionLevel=H&margin=2</code></li>
      <li><code>${baseUrl}/qr?text=https%3A%2F%2Fexample.com&color.dark=%231a1a2e&color.light=%23f5f5f5</code></li>
    </ul>
  </div>

  <div class="endpoint">
    <h2>GET /health</h2>
    <p>Health check endpoint.</p>
    <ul><li><code>${baseUrl}/health</code></li></ul>
  </div>

  <div class="footer">
    <p>This API is free to use. No authentication, no API keys, no registration required.</p>
    <p>Hosted on Vercel. Subject to Vercel Hobby tier limits.</p>
  </div>
</body>
</html>`;
}

const server = createServer(handleRequest);

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`QR endpoint: http://localhost:${PORT}/qr?text=Hello%20World`);
  console.log(`Health endpoint: http://localhost:${PORT}/health`);
  console.log(`Docs endpoint: http://localhost:${PORT}/`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down...');
  server.close(() => {
    process.exit(0);
  });
});