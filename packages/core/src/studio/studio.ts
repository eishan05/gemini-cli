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
    const authToken =
      'ya29.c.c0ASRK0GbrNEz9iIdXs0O1ou53wxLWqoCdkUOt1F1Z6OjV7ZuRyCJl0fI5Ppb0uLFKX0cH31_ODQde2zQVQx4-M0gZ_NkLkc5JCggCxyTly_DWSUNB0rZBpLTDSP8xiJDBcbQvbBB4he3DXGdDniNd39q-ojlzwyPHBP9pbl5HYZrLTdKkyRiEiwJ3X_RJyMY3u4vpguwhpBiObOzi9J04tqVAEomAjFsv4Qwj_9QWQvBfoxWtDKm1VN9DaUi2ufSJ4hilqlG_o8UhurgDbqCBbxt-ZJgJJlDWEPSLkRtWbySXfY8klcYwQKza5BUCqV-BSLXYhW0g5TXRoXqZ_0gLFxuv5-v48phIv8XnKzrUa_hPcT6eCtxh1AYIeAWhE389Kpgs1SbRpSaWRxOkikceIp6RioUvlZ01t7QmfvStOzme53-37FpkZqtwYe1w0J8tywrdl97xmFykkQY2-qq4Rh00sdpI-o3xSpunfRbihO6y3s4i7VrsxtMSjy2rXtoRxI1jdBWIZt-lZ0Y2p6xastIJjh8j2n7QwUqJ6_gqSgjZwSuWFhY0j_R0tJe8ajZvOddouYX90iV3dOskFRbnJ-JSkyyp_FVjJt6OFkYmyhjZZqaBkWhryfXzkugVOpxl-l998he2b_daQpdRlqU96p2x0r84WtudSQ64h3e22VYs_wVSjIuw1I7S_cF_oxbSaRe1e_4nYacZowkz3_O9JpJcWvMbXcgqd-3FUhXX1BFIUaF8Qo9r6a-Z2QgSue6m2i33QRWoVvSh8z0RrJhe8vkIVMR29ujFf9xvdaSqwbngzvrk3Z1Oidojz0ZS2Qvuv-8i8S0zWQ-Xa0BazIkdu9oV77d9r8mOqYbjo2rV39MMcqM0uijwfRXfstaqJyhMgpYahqSOkJiJ09dJbQqQygIqxvJ0O_t1tan1nS6Vf_nX5W9mhUr1fI6gs_zmQg2VbooXFR1X9twc7gbfd3l-auMVRV7tiFj4jtYX1wBt-IffUQfWnplUdau';

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
