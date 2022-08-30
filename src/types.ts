/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

export type Topic = {
  description?: string;
  external?: boolean;
  subtopics: Topic;
};

export type NYC = {
  extends: string;
  lines: number;
  statements: number;
  branches: number;
  functions: number;
};

export type PackageJson = {
  name: string;
  devDependencies: Record<string, string>;
  dependencies: Record<string, string>;
  files: string[];
  oclif: {
    bin: string;
    dirname: string;
    hooks: Record<string, string | string[]>;
    topics: Record<string, Topic>;
  };
  repository: string;
  homepage: string;
  bugs: string;
  author: string;
  description: string;
  scripts: {
    posttest: string;
    'test:command-reference': string;
    'test:deprecation-policy': string;
    'test:json-schema': string;
  };
};

export enum Hook {
  'sf:env:list' = 'sf env list',
  'sf:env:display' = 'sf env display',
  'sf:deploy' = 'sf deploy',
  'sf:logout' = 'sf logout',
}
