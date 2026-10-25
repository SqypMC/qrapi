export interface QRCodeOptions {
  text: string;
  size?: number;
  format?: 'png' | 'svg';
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  margin?: number;
  color?: {
    dark?: string;
    light?: string;
  };
}

export interface ParsedQRParams {
  text: string;
  size: number;
  format: 'png' | 'svg';
  errorCorrectionLevel: 'L' | 'M' | 'Q' | 'H';
  margin: number;
  darkColor: string;
  lightColor: string;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
  params?: ParsedQRParams;
}

export interface HealthResponse {
  status: 'ok';
  version: string;
  timestamp: string;
}

export interface APIInfo {
  name: string;
  version: string;
  description: string;
  endpoints: EndpointInfo[];
}

export interface EndpointInfo {
  path: string;
  method: string;
  description: string;
  parameters: ParameterInfo[];
  examples: string[];
}

export interface ParameterInfo {
  name: string;
  type: string;
  required: boolean;
  default?: string;
  description: string;
  validation?: string;
}

export const CONSTANTS = {
  DEFAULT_SIZE: 256,
  MAX_SIZE: 1024,
  MIN_SIZE: 64,
  DEFAULT_FORMAT: 'png' as const,
  DEFAULT_ERROR_CORRECTION: 'M' as const,
  DEFAULT_MARGIN: 4,
  MAX_TEXT_LENGTH: 2953,
  SUPPORTED_FORMATS: ['png', 'svg'] as const,
  SUPPORTED_ERROR_LEVELS: ['L', 'M', 'Q', 'H'] as const,
  CACHE_TTL_SECONDS: 86400,
  STALE_WHILE_REVALIDATE_SECONDS: 604800,
} as const;

export type SupportedFormat = typeof CONSTANTS.SUPPORTED_FORMATS[number];
export type SupportedErrorLevel = typeof CONSTANTS.SUPPORTED_ERROR_LEVELS[number];