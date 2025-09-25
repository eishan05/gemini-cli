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

    // TODO: Replace with proper authentication mechanism
    // This hardcoded token is expired and causing invalid_grant errors
    const authToken = '';

    const httpOptions = {
      baseUrl: 'https://monospace-pa.googleapis.com',
      apiVersion: 'v1',
      headers: {
        'User-Agent': `${userAgent}`,
        Authorization: `Bearer ${authToken}`,
      },
    };

    console.log(
      '[STUDIO API DEBUG] Using auth token (first 20 chars):',
      authToken.substring(0, 20) + '...',
    );

    console.log(
      '[STUDIO API DEBUG] HTTP Options:',
      JSON.stringify(httpOptions, null, 2),
    );

    const googleGenAI = new GoogleGenAI({
      apiKey: '123',
      vertexai: false,
      httpOptions,
    });

    console.log(
      '[STUDIO API DEBUG] GoogleGenAI instance created with baseUrl:',
      httpOptions.baseUrl,
    );

    // Test the GoogleGenAI instance directly
    console.log('[STUDIO API DEBUG] Testing direct GoogleGenAI call...');
    try {
      const testResponse = await googleGenAI.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ role: 'user', parts: [{ text: 'test' }] }],
      });
      console.log(
        '[STUDIO API DEBUG] Direct call SUCCESS:',
        typeof testResponse,
      );
    } catch (error) {
      console.log('[STUDIO API DEBUG] Direct call ERROR:', error);
      console.log('[STUDIO API DEBUG] Error type:', typeof error);
      console.log(
        '[STUDIO API DEBUG] Error constructor:',
        error?.constructor?.name,
      );
      if (error && typeof error === 'object' && 'message' in error) {
        console.log('[STUDIO API DEBUG] Error message:', error.message);
      }
    }

    return googleGenAI.models;
  }

  throw new Error(`Unsupported authType: ${authType}`);
}
