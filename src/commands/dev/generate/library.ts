/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { join, resolve } from 'node:path';
import { Messages } from '@salesforce/core';
import { Flags, SfCommand } from '@salesforce/sf-plugins-core';
import input from '@inquirer/input';
import { Generator } from '../../../generator.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@salesforce/plugin-dev', 'dev.generate.library');

const containsInvalidChars = (i: string): boolean =>
  i.split('').some((part) => '!#$%^&*() ?/\\,.";\':|{}[]~`'.includes(part));

export default class GenerateLibrary extends SfCommand<void> {
  public static enableJsonFlag = false;
  public static readonly hidden = true;
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');

  public static readonly flags = {
    'dry-run': Flags.boolean({
      summary: messages.getMessage('flags.dry-run.summary'),
    }),
  };

  public async run(): Promise<void> {
    const { flags } = await this.parse(GenerateLibrary);
    this.log(`Time to build a library!${flags['dry-run'] ? ' (dry-run)' : ''}`);

    const generator = new Generator({
      dryRun: flags['dry-run'],
    });

    const answers = {
      scope: await input({
        message: 'Npm Scope (should start with @)',
        default: '@salesforce',
        validate: (i: string): boolean | string => {
          if (!i) return 'You must provide a scope.';
          if (!i.startsWith('@')) return 'Scope must start with @.';
          if (containsInvalidChars(i)) return 'Scope must not contain invalid characters.';
          if (i.length < 2) return 'Scope length must be greater than one';
          return true;
        },
      }),
      name: await input({
        message: 'Name',
        validate: (i: string): boolean | string => {
          if (!i) return 'You must provide a package name.';
          if (containsInvalidChars(i)) return 'Name must not contain invalid characters.';
          else return true;
        },
      }),
      description: await input({ message: 'Description' }),
      org: await input({
        message: 'Github Org',
        default: 'forcedotcom',
        validate: (i: string): boolean | string => {
          if (!i) return 'You must provide a Github Org.';
          if (containsInvalidChars(i)) return 'Github Org must not contain invalid characters.';
          else return true;
        },
      }),
    };

    const directory = resolve(answers.name);

    generator.execute(`git clone git@github.com:forcedotcom/library-template.git ${directory}`);

    generator.cwd = join(process.cwd(), answers.name);
    await generator.remove('.git');
    generator.execute('git init');
    await generator.loadPjson();

    generator.pjson.name = `${answers.scope}/${answers.name}`;
    generator.pjson.description = answers.description;
    generator.pjson.repository = `${answers.org}/${answers.name}`;
    generator.pjson.homepage = `https://github.com/${answers.org}/${answers.name}`;
    generator.pjson.bugs = { url: `https://github.com/${answers.org}/${answers.name}/issues` };

    await generator.writePjson();

    const cwd = `${process.cwd()}/${answers.name}`;
    // Replace the message import
    generator.replace({
      files: `${cwd}/src/hello.ts`,
      from: /@salesforce\/library-template/g,
      to: `${answers.scope}/${answers.name}`,
    });

    generator.replace({
      files: `${cwd}/**/*`,
      from: /library-template/g,
      to: answers.name,
    });

    generator.replace({
      files: `${cwd}/**/*`,
      from: /forcedotcom/g,
      to: answers.org,
    });

    generator.replace({
      files: `${cwd}/README.md`,
      from: /@salesforce/g,
      to: answers.scope,
    });

    generator.execute('yarn');
    generator.execute('yarn build');
  }
}
