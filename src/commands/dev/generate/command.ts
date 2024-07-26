/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { dirname, join, relative, sep } from 'node:path';
import { Messages } from '@salesforce/core';
import { SfCommand, Flags } from '@salesforce/sf-plugins-core';
import defaultsDeep from 'lodash.defaultsdeep';
import { pascalCase } from 'change-case';
import { set } from '@salesforce/kit';
import { get } from '@salesforce/ts-types';
import { Generator } from '../../../generator.js';
import { Topic } from '../../../types.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@salesforce/plugin-dev', 'dev.generate.command');

/** returns the modifications that need to be made for the oclif pjson topics information.  Returns an empty object for "don't change anything" */
export function addTopics(
  newCmd: string,
  existingTopics: Record<string, Topic>,
  commands: string[] = []
): Record<string, Topic> {
  const updated: Record<string, Topic> = {};

  const paths = newCmd
    .split(':')
    // omit last word since it's not a topic, it's the command name
    .slice(0, -1)
    .map((_, index, array) => array.slice(0, index + 1).join('.'))
    // reverse to build up the object from most specific to least
    .reverse();

  for (const p of paths) {
    const pDepth = p.split('.').length;
    // if new command if foo.bar and there are any commands in the foo topic, this should be marked external.
    // if new command if foo.bar.baz and there are any commands in the foo.bar subtopic, it should be marked external.
    const isExternal = commands.some((c) => c.split('.').slice(0, pDepth).join('.') === p);
    const existing = get(updated, p);
    if (existing) {
      const merged = isExternal
        ? {
            external: true,
            subtopics: existing,
          }
        : {
            description: get(existingTopics, `${p}.description`, `description for ${p}`),
            subtopics: existing,
          };
      set(updated, p, merged);
    } else {
      const entry = isExternal
        ? { external: true }
        : { description: get(existingTopics, `${p}.description`, `description for ${p}`) };
      set(updated, p, entry);
    }
  }

  return updated;
}

export default class GenerateCommand extends SfCommand<void> {
  public static readonly enableJsonFlag = false;
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');

  public static readonly flags = {
    name: Flags.string({
      required: true,
      summary: messages.getMessage('flags.name.summary'),
      char: 'n',
    }),
    force: Flags.boolean({
      summary: messages.getMessage('flags.force.summary'),
    }),
    'dry-run': Flags.boolean({
      summary: messages.getMessage('flags.dry-run.summary'),
    }),
    nuts: Flags.boolean({
      summary: messages.getMessage('flags.nuts.summary'),
      allowNo: true,
      default: true,
    }),
    unit: Flags.boolean({
      summary: messages.getMessage('flags.unit.summary'),
      allowNo: true,
      default: true,
    }),
  };

  public async run(): Promise<void> {
    const { flags } = await this.parse(GenerateCommand);

    const generator = new Generator({
      force: flags.force,
      dryRun: flags['dry-run'],
    });
    await generator.loadPjson();
    if (!generator.pjson) throw messages.createError('errors.InvalidDir');

    this.log(`Adding a command to ${generator.pjson.name}!`);

    if (Object.keys(generator.pjson.devDependencies).includes('@salesforce/plugin-command-reference')) {
      // Get a list of all commands in `sf`. We will use this to determine if a topic is internal or external.
      const commands = this.config.commandIDs.map((command) => command.replace(/:/g, '.').replace(/ /g, '.'));
      const newTopics = addTopics(flags.name, generator.pjson.oclif.topics, commands);
      defaultsDeep(generator.pjson.oclif.topics, newTopics);
    } else {
      const newTopics = addTopics(flags.name, generator.pjson.oclif.topics);
      defaultsDeep(generator.pjson.oclif.topics, newTopics);
    }

    await generator.writePjson();

    const cmdPath = flags.name.split(':').join('/');
    const commandPath = `src/commands/${cmdPath}.ts`;
    const className = pascalCase(flags.name);
    const opts = {
      className,
      returnType: `${className}Result`,
      commandPath,
      year: new Date().getFullYear(),
      pluginName: generator.pjson.name,
      messageFile: flags.name.replace(/:/g, '.'),
    };

    // generate the command file
    await generator.render(
      generator.pjson.type === 'module' ? 'src/esm-command.ts.ejs' : 'src/cjs-command.ts.ejs',
      commandPath,
      opts
    );

    // generate the message file
    await generator.render('messages/message.md.ejs', `messages/${flags.name.replace(/:/g, '.')}.md`);

    // generate the nuts file
    if (flags.nuts) {
      await generator.render('test/command.nut.ts.ejs', `test/commands/${cmdPath}.nut.ts`, {
        cmd: flags.name.replace(/:/g, ' '),
        year: new Date().getFullYear(),
        pluginName: generator.pjson.name,
        messageFile: flags.name.replace(/:/g, '.'),
      });
    }

    // generate the unit test file
    if (flags.unit) {
      const unitPath = `test/commands/${cmdPath}.test.ts`;
      const relativeCmdPath = relative(dirname(unitPath), commandPath).replace('.ts', '').replaceAll(sep, '/');
      await generator.render(
        generator.pjson.type === 'module' ? 'test/esm-command.test.ts.ejs' : 'test/cjs-command.test.ts.ejs',
        `test/commands/${cmdPath}.test.ts`,
        {
          className,
          commandPath,
          relativeCmdPath,
          name: flags.name.replace(/:/g, ' '),
          year: new Date().getFullYear(),
          pluginName: generator.pjson.name,
        }
      );
    }

    // run the format, lint, and compile scripts
    generator.execute('yarn format');
    generator.execute('yarn lint -- --fix');
    generator.execute('yarn compile');

    const localExecutable = process.platform === 'win32' ? join('bin', 'dev.cmd') : join('bin', 'dev.js');

    if (generator.pjson.scripts['test:deprecation-policy']) {
      generator.execute(`${localExecutable} snapshot:generate`);
    }

    if (generator.pjson.scripts['test:json-schema']) {
      generator.execute(`${localExecutable} schema:generate`);
    }
  }
}
