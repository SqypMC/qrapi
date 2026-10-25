import {
  ParsedQRParams,
  ValidationResult,
  CONSTANTS,
  SupportedFormat,
  SupportedErrorLevel,
} from './types';

const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;
const COMPACT_QUERY_REGEX = /^\s*=\s*(.+?)\s*$/;

type QueryParams = Record<string, string | string[] | undefined>;

function isValidHexColor(color: string): boolean {
  return HEX_COLOR_REGEX.test(color);
}

function isValidSize(size: number): boolean {
  return Number.isInteger(size) && size >= CONSTANTS.MIN_SIZE && size <= CONSTANTS.MAX_SIZE;
}

function isValidMargin(margin: number): boolean {
  return Number.isInteger(margin) && margin >= 0 && margin <= 50;
}

function isValidFormat(format: string): format is SupportedFormat {
  return CONSTANTS.SUPPORTED_FORMATS.includes(format as SupportedFormat);
}

function isValidErrorLevel(level: string): level is SupportedErrorLevel {
  return CONSTANTS.SUPPORTED_ERROR_LEVELS.includes(level as SupportedErrorLevel);
}

function decodeText(text: string): string {
  try {
    return decodeURIComponent(text);
  } catch {
    return text;
  }
}

function getFirstParam(params: QueryParams, key: string): string | undefined {
  const value = params[key];
  if (value === undefined) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

export function parseCompactQuery(query: string): string | null {
  const match = query.match(COMPACT_QUERY_REGEX);
  if (match) {
    return decodeText(match[1]);
  }
  return null;
}

export function validateQRParams(params: QueryParams): ValidationResult {
  let text = '';

  const textParam = getFirstParam(params, 'text');
  if (textParam) {
    text = decodeText(textParam);
  }

  if (!text) {
    const compactParam = getFirstParam(params, '');
    if (compactParam) {
      const compactText = parseCompactQuery(compactParam);
      if (compactText !== null) {
        text = compactText;
      }
    }
  }

  if (!text || text.trim() === '') {
    return {
      valid: false,
      error: 'Missing or empty "text" parameter. Provide the data to encode in the QR code.',
    };
  }

  if (text.length > CONSTANTS.MAX_TEXT_LENGTH) {
    return {
      valid: false,
      error: `Input text exceeds maximum length of ${CONSTANTS.MAX_TEXT_LENGTH} characters.`,
    };
  }

  let size: number = CONSTANTS.DEFAULT_SIZE;
  const sizeParam = getFirstParam(params, 'size');
  if (sizeParam) {
    const parsedSize = parseInt(sizeParam, 10);
    if (isNaN(parsedSize) || !isValidSize(parsedSize)) {
      return {
        valid: false,
        error: `Invalid "size" parameter. Must be an integer between ${CONSTANTS.MIN_SIZE} and ${CONSTANTS.MAX_SIZE}.`,
      };
    }
    size = parsedSize;
  }

  let format: SupportedFormat = CONSTANTS.DEFAULT_FORMAT;
  const formatParam = getFirstParam(params, 'format');
  if (formatParam) {
    if (!isValidFormat(formatParam)) {
      return {
        valid: false,
        error: `Invalid "format" parameter. Supported formats: ${CONSTANTS.SUPPORTED_FORMATS.join(', ')}.`,
      };
    }
    format = formatParam;
  }

  let errorCorrectionLevel: SupportedErrorLevel = CONSTANTS.DEFAULT_ERROR_CORRECTION;
  const eclParam = getFirstParam(params, 'errorCorrectionLevel') ?? getFirstParam(params, 'ecl');
  if (eclParam) {
    if (!isValidErrorLevel(eclParam)) {
      return {
        valid: false,
        error: `Invalid "errorCorrectionLevel" parameter. Supported levels: ${CONSTANTS.SUPPORTED_ERROR_LEVELS.join(', ')}.`,
      };
    }
    errorCorrectionLevel = eclParam;
  }

  let margin: number = CONSTANTS.DEFAULT_MARGIN;
  const marginParam = getFirstParam(params, 'margin');
  if (marginParam) {
    const parsedMargin = parseInt(marginParam, 10);
    if (isNaN(parsedMargin) || !isValidMargin(parsedMargin)) {
      return {
        valid: false,
        error: `Invalid "margin" parameter. Must be an integer between 0 and 50.`,
      };
    }
    margin = parsedMargin;
  }

  let darkColor = '#000000';
  const darkParam = getFirstParam(params, 'color.dark') ?? getFirstParam(params, 'dark');
  if (darkParam) {
    if (!isValidHexColor(darkParam)) {
      return {
        valid: false,
        error: 'Invalid "color.dark" parameter. Must be a hex color like #000000.',
      };
    }
    darkColor = darkParam;
  }

  let lightColor = '#FFFFFF';
  const lightParam = getFirstParam(params, 'color.light') ?? getFirstParam(params, 'light');
  if (lightParam) {
    if (!isValidHexColor(lightParam)) {
      return {
        valid: false,
        error: 'Invalid "color.light" parameter. Must be a hex color like #FFFFFF.',
      };
    }
    lightColor = lightParam;
  }

  if (darkColor.toLowerCase() === lightColor.toLowerCase()) {
    return {
      valid: false,
      error: 'Foreground and background colors must be different.',
    };
  }

  return {
    valid: true,
    params: {
      text,
      size,
      format,
      errorCorrectionLevel,
      margin,
      darkColor,
      lightColor,
    },
  };
}

export function buildCacheKey(params: ParsedQRParams): string {
  return [
    params.text,
    params.size,
    params.format,
    params.errorCorrectionLevel,
    params.margin,
    params.darkColor,
    params.lightColor,
  ].join('|');
}

export function getMimeType(format: SupportedFormat): string {
  return format === 'png' ? 'image/png' : 'image/svg+xml';
}

export function getCacheHeaders(): Record<string, string> {
  return {
    'Cache-Control': `public, s-maxage=${CONSTANTS.CACHE_TTL_SECONDS}, stale-while-revalidate=${CONSTANTS.STALE_WHILE_REVALIDATE_SECONDS}`,
    'X-Content-Type-Options': 'nosniff',
  };
}