/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { Messages } from '@salesforce/core';
import { Flags, SfCommand } from '@salesforce/sf-plugins-core';
import { ProxyAgent } from 'proxy-agent';
import shelljs from 'shelljs';
import got from 'got';
import confirm from '@inquirer/confirm';
import input from '@inquirer/input';
import select from '@inquirer/select';
import { Generator } from '../../../generator.js';
import { validatePluginName } from '../../../util.js';
import { stringToChoice } from '../../../prompts/functions.js';
import { NYC, PackageJson } from '../../../types.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@salesforce/plugin-dev', 'dev.generate.plugin');
const generateMessages = Messages.loadMessages('@salesforce/plugin-dev', 'plugin.generator');

async function fetchGithubUserFromAPI(): Promise<{ login: string; name: string } | undefined> {
  const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
  if (!token) return;

  const headers = {
    Accept: 'application/vnd.github.v3+json',
    Authorization: `Bearer ${token}`,
  };

  try {
    const { login, name } = await got('https://api.github.com/user', {
      headers,
      agent: { https: new ProxyAgent() },
    }).json<{
      login: string;
      name: string;
    }>();
    return { login, name };
  } catch {
    // ignore
  }
}

function fetchGithubUserFromGit(): string | undefined {
  try {
    const result = shelljs.exec('git config --get user.name', { silent: true });
    return result.stdout.trim();
  } catch {
    // ignore
  }
}

async function fetchGithubUser(): Promise<{ login?: string; name: string | undefined } | undefined> {
  return (await fetchGithubUserFromAPI()) ?? { name: fetchGithubUserFromGit() };
}

function determineDefaultAuthor(
  user: { login?: string; name: string | undefined } | undefined,
  defaultValue: string
): string {
  const { login, name } = user ?? { login: undefined, name: undefined };
  if (name && login) return `${name} @${login}`;
  if (name) return name;
  if (login) return `@${login}`;
  return defaultValue;
}

export default class GeneratePlugin extends SfCommand<void> {
  public static enableJsonFlag = false;
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');
  public static readonly aliases = ['plugins:generate'];
  public static readonly deprecateAliases = true;
  public static readonly flags = {
    'dry-run': Flags.boolean({
      summary: messages.getMessage('flags.dry-run.summary'),
    }),
  };

  public async run(): Promise<void> {
    const { flags } = await this.parse(GeneratePlugin);
    this.log(`Time to build a plugin!${flags['dry-run'] ? ' (dry-run)' : ''}`);

    const generator = new Generator({
      dryRun: flags['dry-run'],
    });

    const githubUsername = await fetchGithubUser();
    const internal = await confirm({ message: generateMessages.getMessage('question.internal') });

    const answers = {
      internal,
      name: await input({
        message: generateMessages.getMessage(internal ? 'question.internal.name' : 'question.external.name'),
        validate: (i: string): boolean | string => {
          const result = validatePluginName(i, internal ? '2PP' : '3PP');
          if (result) return true;

          return generateMessages.getMessage(internal ? 'error.Invalid2ppName' : 'error.Invalid3ppName');
        },
      }),
      description: await input({ message: generateMessages.getMessage('question.description') }),
      ...(!internal
        ? {
            author: await input({
              message: generateMessages.getMessage('question.author'),
              default: determineDefaultAuthor(githubUsername, 'Author Name'),
            }),
            codeCoverage: await select({
              message: generateMessages.getMessage('question.code-coverage'),
              default: '50%',
              choices: ['0%', '25%', '50%', '75%', '90%', '100%'].map(stringToChoice),
            }),
          }
        : {}),
    };

    const directory = resolve(answers.name);
    const templateRepo = answers.internal
      ? 'git clone https://github.com/salesforcecli/plugin-template-sf.git'
      : 'git clone https://github.com/salesforcecli/plugin-template-sf-external.git';

    generator.execute(`${templateRepo} "${directory}"`);

    generator.cwd = directory;
    await generator.remove('.git');
    await generator.loadPjson();

    generator.execute('git init');

    const updated: Partial<PackageJson> = answers.internal
      ? {
          name: `@salesforce/${answers.name}`,
          repository: `salesforcecli/${answers.name}`,
          homepage: `https://github.com/salesforcecli/${answers.name}`,
        }
      : {
          name: answers.name,
        };

    updated.version = '1.0.0';
    updated.description = answers.description;

    if (answers.author) {
      updated.author = answers.author;
    }

    generator.pjson = {
      ...generator.pjson,
      ...updated,
    };

    await generator.writePjson();

    if (!answers.internal && answers.codeCoverage) {
      const nycConfig = await generator.readJson<NYC>('.nycrc');
      const codeCoverage = Number.parseInt(answers.codeCoverage.replace('%', ''), 10);
      nycConfig['check-coverage'] = true;
      nycConfig.lines = codeCoverage;
      nycConfig.statements = codeCoverage;
      nycConfig.functions = codeCoverage;
      nycConfig.branches = codeCoverage;
      await generator.writeJson('.nycrc', nycConfig);
    }

    generator.replace({
      files: `${generator.cwd}/**/*`,
      from: answers.internal ? /plugin-template-sf/g : /plugin-template-sf-external/g,
      to: answers.name,
    });

    if (!answers.internal) {
      await generator.remove('CODE_OF_CONDUCT.md');
      await generator.remove('LICENSE.txt');
    }

    try {
      // Try to dedupe yarn.lock before installing dependencies.
      const require = createRequire(import.meta.url);
      const yarnDedupePath = require.resolve('.bin/yarn-deduplicate');
      generator.execute(yarnDedupePath);
    } catch {
      // do nothing
    }

    try {
      generator.execute('yarn install');
    } catch (e) {
      // Run yarn install in case dev-scripts detected changes during yarn build.
      generator.execute('yarn install');
    }

    generator.execute('yarn build');

    if (answers.internal) {
      const dev = process.platform === 'win32' ? 'dev.cmd' : 'dev.js';
      generator.execute(`${join(resolve(generator.cwd), 'bin', dev)} schema generate`);
    }
  }
}
