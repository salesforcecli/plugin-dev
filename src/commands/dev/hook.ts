/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Args, Hook as OclifHook } from '@oclif/core';
import { Messages } from '@salesforce/core';
import { SfCommand, SfHook, Flags } from '@salesforce/sf-plugins-core';
import { AnyJson } from '@salesforce/ts-types';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.load('@salesforce/plugin-dev', 'dev.hook', ['summary', 'flags.plugin.summary']);

export default class Hook extends SfCommand<OclifHook.Result<unknown>> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly examples = [
    {
      description: 'Execute a hook by name:',
      command: '<%= config.bin %> <%= command.id %> sf:env:list',
    },
    {
      description: 'Execute a hook by name in a specific plugin:',
      command: '<%= config.bin %> <%= command.id %> sf:env:list --plugin env',
    },
  ];

  public static readonly flags = {
    plugin: Flags.string({
      summary: messages.getMessage('flags.plugin.summary'),
      char: 'p',
    }),
  };

  public static args = {
    hook: Args.string({
      description: 'Name of hook to execute.',
      required: true,
    }),
  };

  public async run(): Promise<OclifHook.Result<unknown>> {
    const { args, flags } = await this.parse(Hook);
    if (flags.plugin) {
      // if a plugin is specified, delete the hook in all the other plugins so that
      // it doesn't run in those.
      this.config.plugins.forEach((plugin) => {
        if ((plugin?.hooks ?? {})[args.hook]) {
          if (plugin.name !== flags.plugin) delete plugin.hooks[args.hook];
        }
      });
    }
    const results = await SfHook.run(this.config, args.hook, {});
    if (!this.jsonEnabled()) {
      results.successes.forEach(({ result, plugin }) => {
        this.styledHeader(plugin.name);
        this.styledJSON(result as AnyJson);
      });

      results.failures.forEach(({ error, plugin }) => {
        this.styledHeader(plugin.name);
        this.styledJSON(error as unknown as AnyJson);
      });
    }
    return results;
  }
}
