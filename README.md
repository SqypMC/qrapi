# QR Code Generator API

A free, public QR code generation API with no authentication, no API keys, and no registration required. Designed to run entirely within Vercel's Hobby tier free limits.

## Features

- **Zero cost** - Runs on Vercel Hobby tier
- **No authentication** - Public API, no keys required
- **Multiple formats** - PNG (default) and SVG output
- **Customizable** - Size, error correction, margin, colors
- **Aggressive caching** - CDN-cached responses with proper headers
- **Standards compliant** - RFC 3986 URL encoding, Unicode support
- **Fast** - Sub-100ms responses on cache hit

## Live Demo

```
https://qr.tomaseu.pw/qr?text=https://google.com
https://qr.tomaseu.pw/qr?text=Hello%20World&size=512
https://qr.tomaseu.pw/qr?text=mailto:test@example.com&format=svg
```

## API Endpoints

### Generate QR Code

```
GET /qr?text=YOUR_DATA
```

Returns the QR code image directly with appropriate `Content-Type` header.

#### Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `text` | string | Yes | - | Data to encode. Max 2953 chars. URL-encode special characters. |
| `size` | integer | No | 256 | Image size in pixels (width = height). Range: 64-1024. |
| `format` | string | No | `png` | Output format: `png` or `svg`. |
| `errorCorrectionLevel` | string | No | `M` | Error correction: `L` (7%), `M` (15%), `Q` (25%), `H` (30%). |
| `margin` | integer | No | 4 | Quiet zone in modules. Range: 0-50. |
| `color.dark` | string | No | `#000000` | Foreground color in hex (`#RRGGBB`). |
| `color.light` | string | No | `#FFFFFF` | Background color in hex (`#RRGGBB`). Must differ from dark. |

#### Examples

```bash
# Basic URL
curl "https://qr.tomaseu.pw/qr?text=https%3A%2F%2Fgoogle.com" --output qr.png

# Custom size
curl "https://qr.tomaseu.pw/qr?text=https://example.com&size=512" --output qr.png

# SVG format
curl "https://qr.tomaseu.pw/qr?text=Hello%20World&format=svg" --output qr.svg

# High error correction, small margin
curl "https://qr.tomaseu.pw/qr?text=data&errorCorrectionLevel=H&margin=2" --output qr.png

# Custom colors
curl "https://qr.tomaseu.pw/qr?text=test&color.dark=%231a1a2e&color.light=%23f5f5f5" --output qr.png

# Email link
curl "https://qr.tomaseu.pw/qr?text=mailto%3Atest%40example.com" --output qr.png

# Phone link
curl "https://qr.tomaseu.pw/qr?text=tel%3A%2B421900123456" --output qr.png
```

#### Browser Usage

```html
<img src="https://qr.tomaseu.pw/qr?text=https://google.com" alt="QR Code">
<img src="https://qr.tomaseu.pw/qr?text=Hello%20World&size=300" alt="QR Code">
```

### Health Check

```
GET /health
```

Returns service status.

```json
{
  "status": "ok",
  "version": "1.0.0",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### API Documentation

```
GET /
```

Returns HTML documentation (or JSON if `Accept: application/json`).

## Caching Strategy

Responses are aggressively cached via Vercel's CDN:

```
Cache-Control: public, s-maxage=86400, stale-while-revalidate=604800
```

- **s-maxage=86400** (24 hours): CDN caches successful responses
- **stale-while-revalidate=604800** (7 days): Stale content served while revalidating
- **Cache key** includes all parameters affecting output: text, size, format, error correction, margin, colors
- **ETag** header enables conditional requests
- **No cookies** or user-specific headers

### Cache Behavior

| Scenario | Behavior |
|----------|----------|
| First request | Cache MISS - generates QR, caches result |
| Repeat within 24h | Cache HIT - serves from CDN edge |
| After 24h, within 7d | STALE - serves cached, revalidates in background |
| After 7d | Cache MISS - regenerates |

**Note**: Vercel's CDN may evict entries before TTL. This is not a persistent key-value store.

## Limits

| Limit | Value |
|-------|-------|
| Max input length | 2,953 characters |
| Max image size | 1,024 × 1,024 px |
| Min image size | 64 × 64 px |
| Max margin | 50 modules |
| Function timeout | 10 seconds |
| Function memory | 128 MB (default) |
| Response size | 8 MB (Vercel limit) |

## Error Responses

All errors return JSON:

```json
{
  "error": "Bad Request",
  "message": "Descriptive error message"
}
```

| Status | Cause |
|--------|-------|
| 400 | Invalid/missing parameters |
| 405 | Non-GET method |
| 413 | Input exceeds limits |
| 500 | Internal generation failure |

## Deployment

### Prerequisites

- Node.js 18+
- Vercel account (free)
- GitHub account (for CI/CD)

### Quick Deploy

```bash
# Clone and install
git clone <your-repo>
cd qr-api
npm install

# Local development
npm run dev

# Deploy to Vercel
vercel --prod
```

### Manual Vercel Deployment

1. Push to GitHub
2. Import project in Vercel dashboard
3. Framework preset: **Other**
4. Build command: `npm run build`
5. Output directory: `dist` (not used - serverless functions)
6. Deploy

### Custom Domain

1. In Vercel project → Settings → Domains
2. Add `qr.yourdomain.com`
3. Vercel provides DNS target (e.g., `cname.vercel-dns.com`)
4. Add CNAME record at your DNS provider:
   ```
   qr  CNAME  cname.vercel-dns.com
   ```
5. Wait for DNS propagation (usually < 5 min)
6. Vercel provisions HTTPS automatically
7. Test: `https://qr.yourdomain.com/qr?text=test`

**Important**: Use the exact DNS target shown in your Vercel project dashboard.

## Vercel Free Tier Limits

| Resource | Hobby Limit |
|----------|-------------|
| Function executions | 100 GB-hours/month |
| Bandwidth | 100 GB/month |
| Function duration | 10s max |
| Concurrent executions | 1,000 |
| Edge cache | Automatic, no config |

**Cost risk**: If traffic exceeds limits, Vercel may throttle or require upgrade. Monitor usage in Vercel dashboard.

**Mitigation**:
- Caching reduces function executions significantly
- Set budget alerts in Vercel
- Consider rate limiting via Vercel Edge Middleware (requires Pro)

## Architecture

```
Client → Vercel CDN → Serverless Function (Node.js 18)
                    ↓
              QRCode.js library
                    ↓
              Returns PNG/SVG buffer
```

- **Runtime**: Node.js 18.x on Vercel
- **QR Library**: `qrcode` (pure JS, no native deps)
- **Caching**: Vercel CDN (automatic for GET responses with Cache-Control)
- **No database, Redis, or external services**

## Development

```bash
# Install dependencies
npm install

# Type checking
npm run typecheck

# Linting
npm run lint

# Run tests
npm test

# Build for production
npm run build

# Local server (requires vercel cli)
npm run dev
```

## Testing

```bash
# Unit tests with coverage
npm test

# Watch mode
npm run test:watch
```

Tests cover:
- Parameter validation (all edge cases)
- QR generation (PNG/SVG, all options)
- Cache key uniqueness
- Deterministic output
- Integration flows

## Security

- **No SSRF** - Never fetches URLs, only encodes provided text
- **Input validation** - Strict limits on all parameters
- **No secrets exposed** - Error messages don't leak internals
- **Security headers** - `X-Content-Type-Options: nosniff`, CORS configured
- **No authentication** - By design, public API

## License

MIT License - see [LICENSE](LICENSE) file.

## Contributing

1. Fork the repository
2. Create feature branch
3. Run tests: `npm test`
4. Submit PR

## Support

- Issues: GitHub Issues
- Documentation: `GET /` on deployed API
- Health check: `GET /health`