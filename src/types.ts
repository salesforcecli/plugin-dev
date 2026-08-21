/*
 * Copyright 2025, Salesforce, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Duration } from '@salesforce/kit';
import { Flags } from '@salesforce/sf-plugins-core';

export type Topic = {
  description?: string;
  external?: boolean;
  subtopics?: Record<string, Topic>;
};

export type NYC = {
  extends: string;
  lines: number;
  statements: number;
  branches: number;
  functions: number;
  'check-coverage': boolean;
};

export type PackageJson = {
  name: string;
  version: string;
  devDependencies: Record<string, string>;
  dependencies: Record<string, string>;
  files: string[];
  oclif: {
    bin: string;
    dirname: string;
    topics: Record<string, Topic>;
  };
  repository: string;
  homepage: string;
  bugs:
    | string
    | {
        url: string;
      };
  author: string;
  description: string;
  scripts: {
    posttest: string;
    'test:command-reference': string;
    'test:deprecation-policy': string;
    'test:json-schema': string;
  };
  wireit: {
    test: {
      dependencies: string;
    };
  };
  type?: string;
};

export type FlagAnswers = {
  char?: string;
  type: keyof typeof Flags;
  name: string;
  summary?: string;
  required?: boolean;
  multiple?: boolean;
  durationUnit?: Lowercase<keyof typeof Duration.Unit>;
  durationDefaultValue?: number;
  durationMin?: number;
  durationMax?: number;
  salesforceIdLength?: 'Both' | '15' | '18' | 'None';
  salesforceIdStartsWith?: string;
  fileOrDirExists?: boolean;
  integerMin?: number;
  integerMax?: number;
  integerDefault?: number;
  options?: string[];
};

export type OctokitError = {
  response: {
    data: {
      message: string;

      documentation_url: string;
    };
  };
};
