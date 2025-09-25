/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ContentGenerator } from '../core/contentGenerator.js';
import { AuthType } from '../core/contentGenerator.js';
import type { Config } from '../config/config.js';
import { GoogleGenAI } from '@google/genai';

export async function createStudioContentGenerator(
  authType: AuthType,
  _config: Config,
  _sessionId?: string,
): Promise<ContentGenerator> {
  if (authType === AuthType.STUDIO) {
    const version = process.env['CLI_VERSION'] || process.version;
    const userAgent = `GeminiCLI/${version} (${process.platform}; ${process.arch})`;

    // Read auth token from environment variable
    const authToken = process.env['STUDIO_AUTH_TOKEN'];
    if (!authToken) {
      throw new Error(
        'STUDIO_AUTH_TOKEN environment variable is required for Studio authentication',
      );
    }

    console.error(
      '✓ Using Studio authentication with monospace-pa.googleapis.com',
    );

    const httpOptions = {
      baseUrl: 'https://monospace-pa.googleapis.com',
      apiVersion: 'v1',
      headers: {
        'User-Agent': `${userAgent}`,
        Authorization: `Bearer ${authToken}`,
      },
    };

    const googleGenAI = new GoogleGenAI({
      apiKey: '',
      vertexai: false,
      httpOptions,
    });

    // Studio API doesn't support countTokens, so we provide a fallback implementation
    googleGenAI.models.countTokens = async (req) => {
      // Return a reasonable estimate: ~4 chars per token, but cap at a reasonable max
      // This prevents compression attempts which aren't needed for Studio API
      const totalChars = JSON.stringify(req.contents).length;
      const estimatedTokens = Math.min(Math.ceil(totalChars / 4), 1000); // Cap at 1000 to prevent compression
      return { totalTokens: estimatedTokens };
    };

    return googleGenAI.models;
  }

  throw new Error(`Unsupported authType: ${authType}`);
}
