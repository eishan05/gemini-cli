/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  IdeClient,
  IdeConnectionEvent,
  IdeConnectionType,
  logIdeConnection,
  type Config,
  AuthType,
} from '@google/gemini-cli-core';
import { type LoadedSettings } from '../config/settings.js';
import { performInitialAuth } from './auth.js';
import { validateTheme } from './theme.js';

export interface InitializationResult {
  authError: string | null;
  themeError: string | null;
  shouldOpenAuthDialog: boolean;
  geminiMdFileCount: number;
}

/**
 * Orchestrates the application's startup initialization.
 * This runs BEFORE the React UI is rendered.
 * @param config The application config.
 * @param settings The loaded application settings.
 * @returns The results of the initialization.
 */
export async function initializeApp(
  config: Config,
  settings: LoadedSettings,
): Promise<InitializationResult> {
  const authError = await performInitialAuth(
    config,
    settings.merged.security?.auth?.selectedType,
  );
  const themeError = validateTheme(settings);

  const selectedAuthType = settings.merged.security?.auth?.selectedType;
  console.log('INIT DEBUG: selectedAuthType =', selectedAuthType);
  console.log('INIT DEBUG: AuthType.STUDIO =', AuthType.STUDIO);
  console.log('INIT DEBUG: authError =', authError);

  const shouldOpenAuthDialog =
    (selectedAuthType === undefined || !!authError) &&
    selectedAuthType !== AuthType.STUDIO;

  console.log('INIT DEBUG: shouldOpenAuthDialog =', shouldOpenAuthDialog);

  if (config.getIdeMode()) {
    const ideClient = await IdeClient.getInstance();
    await ideClient.connect();
    logIdeConnection(config, new IdeConnectionEvent(IdeConnectionType.START));
  }

  return {
    authError,
    themeError,
    shouldOpenAuthDialog,
    geminiMdFileCount: config.getGeminiMdFileCount(),
  };
}
