/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ContentGenerator } from '../core/contentGenerator.js';
import { AuthType } from '../core/contentGenerator.js';
import type { Config } from '../config/config.js';
import { GoogleGenAI } from '@google/genai';
import { request } from 'undici';

interface ExchangeVmJwtForServiceAccountTokenResponse {
  token: string;
  expires_in: number;
}

export async function createStudioContentGenerator(
  authType: AuthType,
  _config: Config,
  _sessionId?: string,
): Promise<ContentGenerator> {
  if (authType === AuthType.STUDIO) {
    const version = process.env['CLI_VERSION'] || process.version;
    const userAgent = `GeminiCLI/${version} (${process.platform}; ${process.arch})`;

    const token = await getIdToken();

    const jwtResponse = await fetchJwtToken(
      'https://monospace-pa.googleapis.com/v1/serviceAccounts:exchangeVmJwtForToken',
      token,
      process.env['API_KEY'] || '',
    );
    // Read auth token from environment variable
    const authToken = jwtResponse.token;
    if (!authToken) {
      throw new Error('Studio auth token is not set or empty');
    }

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

async function fetchJwtToken(
  endpointURL: string,
  idToken: string,
  apiKey: string,
): Promise<ExchangeVmJwtForServiceAccountTokenResponse> {
  try {
    const { statusCode, body } = await request(endpointURL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        Accept: 'application/json',
        'X-Idx-Idtoken': idToken,
        'X-Goog-Api-Key': apiKey,
      },
    });
    if (statusCode !== 200) {
      const errorBody = await body.text();
      await body.dump(); // Consume the body
      throw new Error(
        `ExchangeVmJwtForServiceAccountToken error(${statusCode}): ${getStatusText(statusCode)}, body: ${errorBody}`,
      );
    }
    const response = await body.json();
    await body.dump(); // Consume the body to prevent resource leaks
    return response as ExchangeVmJwtForServiceAccountTokenResponse;
  } catch (error) {
    // Re-throw to be handled by the caller, similar to Go's return fmt.Errorf
    throw new Error(
      `Failed to send ExchangeVmJwtForServiceAccountToken request: ${error}`,
    );
  }
}

function getStatusText(statusCode: number): string {
  switch (statusCode) {
    case 200:
      return 'OK';
    case 400:
      return 'Bad Request';
    case 401:
      return 'Unauthorized';
    case 403:
      return 'Forbidden';
    case 404:
      return 'Not Found';
    case 500:
      return 'Internal Server Error';
    default:
      return `Unknown Status ${statusCode}`;
  }
}

async function callMetadataServer(
  url: string,
  params: Record<string, string>,
): Promise<string> {
  const maxRetries = 5;
  const retryInterval = 500; // milliseconds

  for (let i = 0; i <= maxRetries; i++) {
    try {
      const urlObj = new URL(url);
      for (const key in params) {
        urlObj.searchParams.set(key, params[key]);
      }

      const { statusCode, body } = await request(urlObj.toString(), {
        method: 'GET',
        headers: {
          'Metadata-Flavor': 'Google',
        },
      });

      if (statusCode && statusCode >= 200 && statusCode < 300) {
        const textBody = await body.text();
        // Important: consume the body to prevent resource leaks
        await body.dump();
        return textBody;
      } else {
        // For non-2xx statuses, consume the body and then throw an error
        const errorBody = await body.text();
        await body.dump();
        throw new Error(
          `HTTP error! status: ${statusCode}, body: ${errorBody}`,
        );
      }
    } catch (error) {
      if (i < maxRetries) {
        console.warn(`Retry attempt ${i + 1} for ${url}. Error: ${error}`);
        await new Promise((resolve) => setTimeout(resolve, retryInterval));
      } else {
        throw new Error(
          `Failed to get metadata from metadata server after ${maxRetries} retries: ${error}`,
        );
      }
    }
  }
  throw new Error(
    'Reached unexpected end of retry logic in callMetadataServer',
  );
}

async function getIdToken(): Promise<string> {
  const audience = 'firebase-studio';
  const idTokenURL =
    'http://metadata.google.internal:8080/computeMetadata/v1/instance/service-accounts/default/identity';

  return callMetadataServer(idTokenURL, { audience, format: 'full' });
}