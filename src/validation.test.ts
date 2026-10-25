import { validateQRParams, parseCompactQuery, buildCacheKey, getMimeType, getCacheHeaders } from './validation';
import { generateQRCode } from './generator';
import { ParsedQRParams, CONSTANTS } from './types';
import QRCode from 'qrcode';

jest.mock('qrcode', () => ({
  toBuffer: jest.fn().mockImplementation((text: string) => Promise.resolve(Buffer.from(`fake-png-${text}`))),
  toString: jest.fn().mockImplementation((text: string) => Promise.resolve(`<svg>fake-svg-${text}</svg>`)),
}));

describe('Validation', () => {
  describe('parseCompactQuery', () => {
    it('should parse compact query syntax', () => {
      expect(parseCompactQuery('=google.com')).toBe('google.com');
      expect(parseCompactQuery('= hello world')).toBe('hello world');
      expect(parseCompactQuery('=https%3A%2F%2Fexample.com')).toBe('https://example.com');
    });

    it('should return null for non-matching queries', () => {
      expect(parseCompactQuery('text=hello')).toBeNull();
      expect(parseCompactQuery('hello')).toBeNull();
      expect(parseCompactQuery('')).toBeNull();
    });
  });

  describe('validateQRParams', () => {
    it('should accept valid text parameter', () => {
      const result = validateQRParams({ text: 'hello world' });
      expect(result.valid).toBe(true);
      expect(result.params?.text).toBe('hello world');
    });

    it('should accept URL-encoded text', () => {
      const result = validateQRParams({ text: 'https%3A%2F%2Fgoogle.com' });
      expect(result.valid).toBe(true);
      expect(result.params?.text).toBe('https://google.com');
    });

    it('should reject missing text', () => {
      const result = validateQRParams({});
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Missing or empty');
    });

    it('should reject empty text', () => {
      const result = validateQRParams({ text: '' });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Missing or empty');
    });

    it('should reject whitespace-only text', () => {
      const result = validateQRParams({ text: '   ' });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Missing or empty');
    });

    it('should reject oversized text', () => {
      const longText = 'a'.repeat(CONSTANTS.MAX_TEXT_LENGTH + 1);
      const result = validateQRParams({ text: longText });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('exceeds maximum length');
    });

    it('should accept max length text', () => {
      const maxText = 'a'.repeat(CONSTANTS.MAX_TEXT_LENGTH);
      const result = validateQRParams({ text: maxText });
      expect(result.valid).toBe(true);
    });

    it('should use default size', () => {
      const result = validateQRParams({ text: 'test' });
      expect(result.valid).toBe(true);
      expect(result.params?.size).toBe(CONSTANTS.DEFAULT_SIZE);
    });

    it('should accept valid size', () => {
      const result = validateQRParams({ text: 'test', size: '512' });
      expect(result.valid).toBe(true);
      expect(result.params?.size).toBe(512);
    });

    it('should reject invalid size (too small)', () => {
      const result = validateQRParams({ text: 'test', size: '32' });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('size');
    });

    it('should reject invalid size (too large)', () => {
      const result = validateQRParams({ text: 'test', size: '2048' });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('size');
    });

    it('should reject non-integer size', () => {
      const result = validateQRParams({ text: 'test', size: 'abc' });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('size');
    });

    it('should use default format', () => {
      const result = validateQRParams({ text: 'test' });
      expect(result.valid).toBe(true);
      expect(result.params?.format).toBe('png');
    });

    it('should accept png format', () => {
      const result = validateQRParams({ text: 'test', format: 'png' });
      expect(result.valid).toBe(true);
      expect(result.params?.format).toBe('png');
    });

    it('should accept svg format', () => {
      const result = validateQRParams({ text: 'test', format: 'svg' });
      expect(result.valid).toBe(true);
      expect(result.params?.format).toBe('svg');
    });

    it('should reject invalid format', () => {
      const result = validateQRParams({ text: 'test', format: 'jpg' });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('format');
    });

    it('should use default error correction level', () => {
      const result = validateQRParams({ text: 'test' });
      expect(result.valid).toBe(true);
      expect(result.params?.errorCorrectionLevel).toBe('M');
    });

    it('should accept valid error correction levels', () => {
      for (const level of ['L', 'M', 'Q', 'H']) {
        const result = validateQRParams({ text: 'test', errorCorrectionLevel: level });
        expect(result.valid).toBe(true);
        expect(result.params?.errorCorrectionLevel).toBe(level);
      }
    });

    it('should accept ecl alias', () => {
      const result = validateQRParams({ text: 'test', ecl: 'H' });
      expect(result.valid).toBe(true);
      expect(result.params?.errorCorrectionLevel).toBe('H');
    });

    it('should reject invalid error correction level', () => {
      const result = validateQRParams({ text: 'test', errorCorrectionLevel: 'X' });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('errorCorrectionLevel');
    });

    it('should use default margin', () => {
      const result = validateQRParams({ text: 'test' });
      expect(result.valid).toBe(true);
      expect(result.params?.margin).toBe(CONSTANTS.DEFAULT_MARGIN);
    });

    it('should accept valid margin', () => {
      const result = validateQRParams({ text: 'test', margin: '2' });
      expect(result.valid).toBe(true);
      expect(result.params?.margin).toBe(2);
    });

    it('should reject negative margin', () => {
      const result = validateQRParams({ text: 'test', margin: '-1' });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('margin');
    });

    it('should reject too large margin', () => {
      const result = validateQRParams({ text: 'test', margin: '100' });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('margin');
    });

    it('should use default colors', () => {
      const result = validateQRParams({ text: 'test' });
      expect(result.valid).toBe(true);
      expect(result.params?.darkColor).toBe('#000000');
      expect(result.params?.lightColor).toBe('#FFFFFF');
    });

    it('should accept valid dark color', () => {
      const result = validateQRParams({ text: 'test', 'color.dark': '#ff0000' });
      expect(result.valid).toBe(true);
      expect(result.params?.darkColor).toBe('#ff0000');
    });

    it('should accept valid light color', () => {
      const result = validateQRParams({ text: 'test', 'color.light': '#ffff00' });
      expect(result.valid).toBe(true);
      expect(result.params?.lightColor).toBe('#ffff00');
    });

    it('should accept dark/light aliases', () => {
      const result = validateQRParams({ text: 'test', dark: '#123456', light: '#abcdef' });
      expect(result.valid).toBe(true);
      expect(result.params?.darkColor).toBe('#123456');
      expect(result.params?.lightColor).toBe('#abcdef');
    });

    it('should reject invalid hex color', () => {
      const result = validateQRParams({ text: 'test', 'color.dark': 'red' });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('color.dark');
    });

    it('should reject same dark and light colors', () => {
      const result = validateQRParams({ text: 'test', 'color.dark': '#ff0000', 'color.light': '#ff0000' });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('different');
    });

    it('should accept compact query syntax with = prefix', () => {
      const result = validateQRParams({ '': '=google.com' });
      expect(result.valid).toBe(true);
      expect(result.params?.text).toBe('google.com');
    });

    it('should prioritize text over compact query', () => {
      const result = validateQRParams({ text: 'explicit', '': '=compact' });
      expect(result.valid).toBe(true);
      expect(result.params?.text).toBe('explicit');
    });

    it('should handle array parameters (first value wins)', () => {
      const result = validateQRParams({ text: ['first', 'second'], size: ['100', '200'] });
      expect(result.valid).toBe(true);
      expect(result.params?.text).toBe('first');
      expect(result.params?.size).toBe(100);
    });

    it('should support unicode text', () => {
      const result = validateQRParams({ text: 'Hello 世界 🌍' });
      expect(result.valid).toBe(true);
      expect(result.params?.text).toBe('Hello 世界 🌍');
    });

    it('should support special URL characters', () => {
      const result = validateQRParams({ text: 'https://example.com/path?query=value&other=123' });
      expect(result.valid).toBe(true);
      expect(result.params?.text).toBe('https://example.com/path?query=value&other=123');
    });
  });

  describe('buildCacheKey', () => {
    it('should generate consistent keys for identical params', () => {
      const params: ParsedQRParams = {
        text: 'test',
        size: 256,
        format: 'png',
        errorCorrectionLevel: 'M',
        margin: 4,
        darkColor: '#000000',
        lightColor: '#FFFFFF',
      };
      const key1 = buildCacheKey(params);
      const key2 = buildCacheKey(params);
      expect(key1).toBe(key2);
    });

    it('should generate different keys for different params', () => {
      const base: ParsedQRParams = {
        text: 'test',
        size: 256,
        format: 'png',
        errorCorrectionLevel: 'M',
        margin: 4,
        darkColor: '#000000',
        lightColor: '#FFFFFF',
      };
      const key1 = buildCacheKey(base);
      const key2 = buildCacheKey({ ...base, size: 512 });
      const key3 = buildCacheKey({ ...base, format: 'svg' });
      const key4 = buildCacheKey({ ...base, errorCorrectionLevel: 'H' });
      const key5 = buildCacheKey({ ...base, margin: 2 });
      const key6 = buildCacheKey({ ...base, darkColor: '#ff0000' });
      const key7 = buildCacheKey({ ...base, lightColor: '#ffff00' });
      const key8 = buildCacheKey({ ...base, text: 'different' });

      expect(new Set([key1, key2, key3, key4, key5, key6, key7, key8]).size).toBe(8);
    });
  });

  describe('getMimeType', () => {
    it('should return correct MIME type for png', () => {
      expect(getMimeType('png')).toBe('image/png');
    });

    it('should return correct MIME type for svg', () => {
      expect(getMimeType('svg')).toBe('image/svg+xml');
    });
  });

  describe('getCacheHeaders', () => {
    it('should return correct cache headers', () => {
      const headers = getCacheHeaders();
      expect(headers['Cache-Control']).toContain('public');
      expect(headers['Cache-Control']).toContain(`s-maxage=${CONSTANTS.CACHE_TTL_SECONDS}`);
      expect(headers['Cache-Control']).toContain(`stale-while-revalidate=${CONSTANTS.STALE_WHILE_REVALIDATE_SECONDS}`);
      expect(headers['X-Content-Type-Options']).toBe('nosniff');
    });
  });
});

describe('QR Code Generation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const baseParams: ParsedQRParams = {
    text: 'https://example.com',
    size: 256,
    format: 'png',
    errorCorrectionLevel: 'M',
    margin: 4,
    darkColor: '#000000',
    lightColor: '#FFFFFF',
  };

  it('should generate PNG buffer', async () => {
    const result = await generateQRCode(baseParams);
    expect(result.buffer).toBeInstanceOf(Buffer);
    expect(result.mimeType).toBe('image/png');
  });

  it('should generate SVG string', async () => {
    const params = { ...baseParams, format: 'svg' as const };
    const result = await generateQRCode(params);
    expect(result.buffer).toBeInstanceOf(Buffer);
    expect(result.mimeType).toBe('image/svg+xml');
  });

  it('should pass correct options to qrcode library', async () => {
    await generateQRCode(baseParams);
    const { toBuffer } = require('qrcode');
    expect(toBuffer).toHaveBeenCalledWith('https://example.com', expect.objectContaining({
      errorCorrectionLevel: 'M',
      margin: 4,
      width: 256,
      color: { dark: '#000000', light: '#FFFFFF' },
      type: 'png',
    }));
  });

  it('should pass correct options for SVG', async () => {
    await generateQRCode({ ...baseParams, format: 'svg' });
    const { toString } = require('qrcode');
    expect(toString).toHaveBeenCalledWith('https://example.com', expect.objectContaining({
      type: 'svg',
    }));
  });

  it('should produce deterministic output for same inputs', async () => {
    const result1 = await generateQRCode(baseParams);
    const result2 = await generateQRCode(baseParams);
    expect(result1.buffer).toEqual(result2.buffer);
  });

  it('should call qrcode with different text for different inputs', async () => {
    await generateQRCode({ ...baseParams, text: 'text1' });
    await generateQRCode({ ...baseParams, text: 'text2' });
    const { toBuffer } = require('qrcode');
    expect(toBuffer).toHaveBeenCalledTimes(2);
    expect(toBuffer).toHaveBeenNthCalledWith(1, 'text1', expect.any(Object));
    expect(toBuffer).toHaveBeenNthCalledWith(2, 'text2', expect.any(Object));
  });

  it('should call qrcode with different size for different inputs', async () => {
    await generateQRCode({ ...baseParams, size: 256 });
    await generateQRCode({ ...baseParams, size: 512 });
    const { toBuffer } = require('qrcode');
    expect(toBuffer).toHaveBeenCalledTimes(2);
    expect(toBuffer).toHaveBeenNthCalledWith(1, expect.any(String), expect.objectContaining({ width: 256 }));
    expect(toBuffer).toHaveBeenNthCalledWith(2, expect.any(String), expect.objectContaining({ width: 512 }));
  });

  it('should call qrcode with different error correction for different inputs', async () => {
    await generateQRCode({ ...baseParams, errorCorrectionLevel: 'L' });
    await generateQRCode({ ...baseParams, errorCorrectionLevel: 'H' });
    const { toBuffer } = require('qrcode');
    expect(toBuffer).toHaveBeenCalledTimes(2);
    expect(toBuffer).toHaveBeenNthCalledWith(1, expect.any(String), expect.objectContaining({ errorCorrectionLevel: 'L' }));
    expect(toBuffer).toHaveBeenNthCalledWith(2, expect.any(String), expect.objectContaining({ errorCorrectionLevel: 'H' }));
  });

  it('should call qrcode with different colors for different inputs', async () => {
    await generateQRCode({ ...baseParams, darkColor: '#ff0000' });
    await generateQRCode({ ...baseParams, darkColor: '#00ff00' });
    const { toBuffer } = require('qrcode');
    expect(toBuffer).toHaveBeenCalledTimes(2);
    expect(toBuffer).toHaveBeenNthCalledWith(1, expect.any(String), expect.objectContaining({ color: { dark: '#ff0000', light: '#FFFFFF' } }));
    expect(toBuffer).toHaveBeenNthCalledWith(2, expect.any(String), expect.objectContaining({ color: { dark: '#00ff00', light: '#FFFFFF' } }));
  });
});

describe('Integration: Full Request Flow', () => {
  it('should validate and generate QR code for basic text', async () => {
    const validation = validateQRParams({ text: 'Hello World' });
    expect(validation.valid).toBe(true);

    const result = await generateQRCode(validation.params!);
    expect(result.buffer).toBeInstanceOf(Buffer);
    expect(result.mimeType).toBe('image/png');
  });

  it('should validate and generate QR code for URL', async () => {
    const validation = validateQRParams({ text: 'https://google.com' });
    expect(validation.valid).toBe(true);

    const result = await generateQRCode(validation.params!);
    expect(result.buffer).toBeInstanceOf(Buffer);
  });

  it('should validate and generate QR code for mailto', async () => {
    const validation = validateQRParams({ text: 'mailto:test@example.com' });
    expect(validation.valid).toBe(true);

    const result = await generateQRCode(validation.params!);
    expect(result.buffer).toBeInstanceOf(Buffer);
  });

  it('should validate and generate QR code for tel', async () => {
    const validation = validateQRParams({ text: 'tel:+421900123456' });
    expect(validation.valid).toBe(true);

    const result = await generateQRCode(validation.params!);
    expect(result.buffer).toBeInstanceOf(Buffer);
  });

  it('should generate SVG with correct MIME type', async () => {
    const validation = validateQRParams({ text: 'test', format: 'svg' });
    expect(validation.valid).toBe(true);

    const result = await generateQRCode(validation.params!);
    expect(result.mimeType).toBe('image/svg+xml');
  });

  it('should include cache headers', () => {
    const headers = getCacheHeaders();
    expect(headers['Cache-Control']).toContain('public');
    expect(headers['Cache-Control']).toContain('s-maxage=86400');
    expect(headers['Cache-Control']).toContain('stale-while-revalidate=604800');
  });
});