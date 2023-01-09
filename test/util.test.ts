/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as os from 'os';
import * as sinon from 'sinon';
import { expect } from 'chai';
import { FlagBuilder, validatePluginName } from '../src/util';
import { FlagAnswers } from '../src/types';

const templateCommand = `
/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { SfCommand, Flags } from '@salesforce/sf-plugins-core';
import { Messages } from '@salesforce/core';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.load('@salesforce/plugin-rosie', 'hello.world', [
  'summary',
  'description',
  'examples',
  'flags.name.summary',
  'info.hello',
]);

export type HelloWorldResult = {
  name: string;
  time: string;
};

export default class World extends SfCommand<HelloWorldResult> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');

  public static flags = {
    name: Flags.string({
      char: 'n',
      summary: messages.getMessage('flags.name.summary'),
      default: 'World',
    }),
  };

  public async run(): Promise<HelloWorldResult> {
    const { flags } = await this.parse(World);
    const time = new Date().toDateString();
    this.log(messages.getMessage('info.hello', [flags.name, time]));
    return {
      name: flags.name,
      time,
    };
  }
}

`.replace(/\n/g, os.EOL);

const templateCommandNoFlags = `
/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { SfCommand } from '@salesforce/sf-plugins-core';
import { Messages } from '@salesforce/core';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.load('@salesforce/plugin-rosie', 'hello.world', [
  'summary',
  'description',
  'examples',
  'info.hello',
]);

export type HelloWorldResult = {
  name: string;
  time: string;
};

export default class World extends SfCommand<HelloWorldResult> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');


  public async run(): Promise<HelloWorldResult> {
    return { name: 'Astro', time };
  }
}

`.replace(/\n/g, os.EOL);

const templateCommandOclifFlags = `
/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Flags } from '@oclif/core';
import { SfCommand } from '@salesforce/sf-plugins-core';
import { Messages } from '@salesforce/core';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.load('@salesforce/plugin-rosie', 'hello.world', [
  'summary',
  'description',
  'examples',
  'flags.name.summary',
  'info.hello',
]);

export type HelloWorldResult = {
  name: string;
  time: string;
};

export default class World extends SfCommand<HelloWorldResult> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');

  public static flags = {
    name: Flags.string({
      char: 'n',
      summary: messages.getMessage('flags.name.summary'),
      default: 'World',
    }),
  };

  public async run(): Promise<HelloWorldResult> {
    const { flags } = await this.parse(World);
    const time = new Date().toDateString();
    this.log(messages.getMessage('info.hello', [flags.name, time]));
    return {
      name: flags.name,
      time,
    };
  }
}

`.replace(/\n/g, os.EOL);

const templateCommandOclifFlagsWithMultipleImports = `
/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Flags, Interfaces } from '@oclif/core';
import { SfCommand } from '@salesforce/sf-plugins-core';
import { Messages } from '@salesforce/core';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.load('@salesforce/plugin-rosie', 'hello.world', [
  'summary',
  'description',
  'examples',
  'flags.name.summary',
  'info.hello',
]);

export type HelloWorldResult = {
  name: string;
  time: string;
};

export default class World extends SfCommand<HelloWorldResult> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');

  public static flags = {
    name: Flags.string({
      char: 'n',
      summary: messages.getMessage('flags.name.summary'),
      default: 'World',
    }),
  };

  public async run(): Promise<HelloWorldResult> {
    const { flags } = await this.parse(World);
    const time = new Date().toDateString();
    this.log(messages.getMessage('info.hello', [flags.name, time]));
    return {
      name: flags.name,
      time,
    };
  }
}

`.replace(/\n/g, os.EOL);

const templateCommandSingleLineMessages = `
/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { SfCommand } from '@salesforce/sf-plugins-core';
import { Messages } from '@salesforce/core';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.load('@salesforce/plugin-rosie', 'hello.world', ['summary', 'description', 'examples', 'info.hello']);

export type HelloWorldResult = {
  name: string;
  time: string;
};

export default class World extends SfCommand<HelloWorldResult> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');


  public async run(): Promise<HelloWorldResult> {
    return { name: 'Astro', time };
  }
}

`.replace(/\n/g, os.EOL);

describe('FlagBuilder', () => {
  let sandbox: sinon.SinonSandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('build', () => {
    describe('string', () => {
      it('should build a flag with all the options', async () => {
        const answers: FlagAnswers = {
          type: 'string',
          name: 'my-flag',
          summary: 'Summary of string flag.',
          char: 's',
          required: true,
          multiple: true,
        };

        sandbox.stub(FlagBuilder.prototype, 'readFile').resolves(templateCommand);
        const flagBuilder = new FlagBuilder(answers, 'test.ts');
        const flag = flagBuilder.build();

        expect(flag).to.deep.equal([
          "    'my-flag': Flags.string({",
          "      summary: messages.getMessage('flags.my-flag.summary'),",
          "      char: 's',",
          '      required: true,',
          '      multiple: true,',
          '    }),',
        ]);

        const updatedFile = await flagBuilder.apply(flag);
        expect(updatedFile).to.include("'flags.my-flag.summary',");
        expect(updatedFile).to.include("'my-flag': Flags.string({");
      });
    });

    describe('boolean', () => {
      it('should build a flag with all the options', async () => {
        const answers: FlagAnswers = {
          type: 'boolean',
          name: 'my-flag',
          summary: 'Summary of flag.',
          char: 's',
          required: true,
        };

        sandbox.stub(FlagBuilder.prototype, 'readFile').resolves(templateCommand);
        const flagBuilder = new FlagBuilder(answers, 'test.ts');
        const flag = flagBuilder.build();

        expect(flag).to.deep.equal([
          "    'my-flag': Flags.boolean({",
          "      summary: messages.getMessage('flags.my-flag.summary'),",
          "      char: 's',",
          '      required: true,',
          '    }),',
        ]);

        const updatedFile = await flagBuilder.apply(flag);
        expect(updatedFile).to.include("'flags.my-flag.summary',");
        expect(updatedFile).to.include("'my-flag': Flags.boolean({");
      });
    });

    describe('directory', () => {
      it('should build a flag with all the options', async () => {
        const answers: FlagAnswers = {
          type: 'directory',
          name: 'my-flag',
          summary: 'Summary of flag.',
          char: 's',
          required: true,
          multiple: true,
          fileOrDirExists: true,
        };

        sandbox.stub(FlagBuilder.prototype, 'readFile').resolves(templateCommand);
        const flagBuilder = new FlagBuilder(answers, 'test.ts');
        const flag = flagBuilder.build();

        expect(flag).to.deep.equal([
          "    'my-flag': Flags.directory({",
          "      summary: messages.getMessage('flags.my-flag.summary'),",
          "      char: 's',",
          '      required: true,',
          '      multiple: true,',
          '      exists: true,',
          '    }),',
        ]);

        const updatedFile = await flagBuilder.apply(flag);
        expect(updatedFile).to.include("'flags.my-flag.summary',");
        expect(updatedFile).to.include("'my-flag': Flags.directory({");
      });
    });

    describe('file', () => {
      it('should build a flag with all the options', async () => {
        const answers: FlagAnswers = {
          type: 'file',
          name: 'my-flag',
          summary: 'Summary of flag.',
          char: 's',
          required: true,
          multiple: true,
          fileOrDirExists: true,
        };

        sandbox.stub(FlagBuilder.prototype, 'readFile').resolves(templateCommand);
        const flagBuilder = new FlagBuilder(answers, 'test.ts');
        const flag = flagBuilder.build();

        expect(flag).to.deep.equal([
          "    'my-flag': Flags.file({",
          "      summary: messages.getMessage('flags.my-flag.summary'),",
          "      char: 's',",
          '      required: true,',
          '      multiple: true,',
          '      exists: true,',
          '    }),',
        ]);

        const updatedFile = await flagBuilder.apply(flag);
        expect(updatedFile).to.include("'flags.my-flag.summary',");
        expect(updatedFile).to.include("'my-flag': Flags.file({");
      });
    });

    describe('enum', () => {
      it('should build a flag with all the options', async () => {
        const answers: FlagAnswers = {
          type: 'enum',
          name: 'my-flag',
          summary: 'Summary of flag.',
          char: 's',
          required: true,
          multiple: true,
        };

        sandbox.stub(FlagBuilder.prototype, 'readFile').resolves(templateCommand);
        const flagBuilder = new FlagBuilder(answers, 'test.ts');
        const flag = flagBuilder.build();

        expect(flag).to.deep.equal([
          "    'my-flag': Flags.enum({",
          "      summary: messages.getMessage('flags.my-flag.summary'),",
          "      char: 's',",
          '      required: true,',
          '      multiple: true,',
          '      options: [],',
          '    }),',
        ]);

        const updatedFile = await flagBuilder.apply(flag);
        expect(updatedFile).to.include("'flags.my-flag.summary',");
        expect(updatedFile).to.include("'my-flag': Flags.enum({");
      });
    });

    describe('integer', () => {
      it('should build a flag with all the options', async () => {
        const answers: FlagAnswers = {
          type: 'integer',
          name: 'my-flag',
          summary: 'Summary of flag.',
          char: 's',
          required: true,
          integerMin: 1,
          integerMax: 10,
          integerDefault: 5,
        };

        sandbox.stub(FlagBuilder.prototype, 'readFile').resolves(templateCommand);
        const flagBuilder = new FlagBuilder(answers, 'test.ts');
        const flag = flagBuilder.build();

        expect(flag).to.deep.equal([
          "    'my-flag': Flags.integer({",
          "      summary: messages.getMessage('flags.my-flag.summary'),",
          "      char: 's',",
          '      required: true,',
          '      min: 1,',
          '      max: 10,',
          '      default: 5,',
          '    }),',
        ]);

        const updatedFile = await flagBuilder.apply(flag);
        expect(updatedFile).to.include("'flags.my-flag.summary',");
        expect(updatedFile).to.include("'my-flag': Flags.integer({");
      });

      it('should build a flag with multiple=true', async () => {
        const answers: FlagAnswers = {
          type: 'integer',
          name: 'my-flag',
          summary: 'Summary of flag.',
          char: 's',
          required: true,
          multiple: true,
          integerMin: 1,
          integerMax: 10,
          integerDefault: 5,
        };

        sandbox.stub(FlagBuilder.prototype, 'readFile').resolves(templateCommand);
        const flagBuilder = new FlagBuilder(answers, 'test.ts');
        const flag = flagBuilder.build();

        expect(flag).to.deep.equal([
          "    'my-flag': Flags.integer({",
          "      summary: messages.getMessage('flags.my-flag.summary'),",
          "      char: 's',",
          '      required: true,',
          '      multiple: true,',
          '      min: 1,',
          '      max: 10,',
          '      default: [5],',
          '    }),',
        ]);

        const updatedFile = await flagBuilder.apply(flag);
        expect(updatedFile).to.include("'flags.my-flag.summary',");
        expect(updatedFile).to.include("'my-flag': Flags.integer({");
      });
    });

    describe('url', () => {
      it('should build a flag with all the options', async () => {
        const answers: FlagAnswers = {
          type: 'url',
          name: 'my-flag',
          summary: 'Summary of flag.',
          char: 's',
          required: true,
          multiple: true,
        };

        sandbox.stub(FlagBuilder.prototype, 'readFile').resolves(templateCommand);
        const flagBuilder = new FlagBuilder(answers, 'test.ts');
        const flag = flagBuilder.build();

        expect(flag).to.deep.equal([
          "    'my-flag': Flags.url({",
          "      summary: messages.getMessage('flags.my-flag.summary'),",
          "      char: 's',",
          '      required: true,',
          '      multiple: true,',
          '    }),',
        ]);

        const updatedFile = await flagBuilder.apply(flag);
        expect(updatedFile).to.include("'flags.my-flag.summary',");
        expect(updatedFile).to.include("'my-flag': Flags.url({");
      });
    });

    describe('duration', () => {
      it('should build a flag with all the options', async () => {
        const answers: FlagAnswers = {
          type: 'duration',
          name: 'my-flag',
          summary: 'Summary of flag.',
          char: 's',
          required: true,
          multiple: true,
          durationUnit: 'minutes',
          durationDefaultValue: 5,
          durationMax: 10,
          durationMin: 1,
        };

        sandbox.stub(FlagBuilder.prototype, 'readFile').resolves(templateCommand);
        const flagBuilder = new FlagBuilder(answers, 'test.ts');
        const flag = flagBuilder.build();

        expect(flag).to.deep.equal([
          "    'my-flag': Flags.duration({",
          "      summary: messages.getMessage('flags.my-flag.summary'),",
          "      char: 's',",
          '      required: true,',
          '      multiple: true,',
          "      unit: 'minutes',",
          '      defaultValue: 5,',
          '      min: 1,',
          '      max: 10,',
          '    }),',
        ]);

        const updatedFile = await flagBuilder.apply(flag);
        expect(updatedFile).to.include("'flags.my-flag.summary',");
        expect(updatedFile).to.include("'my-flag': Flags.duration({");
      });
    });

    describe('salesforceId', () => {
      it('should build a flag with all the options', async () => {
        const answers: FlagAnswers = {
          type: 'salesforceId',
          name: 'my-flag',
          summary: 'Summary of flag.',
          char: 's',
          required: true,
          multiple: true,
          salesforceIdStartsWith: '00D',
          salesforceIdLength: '18',
        };

        sandbox.stub(FlagBuilder.prototype, 'readFile').resolves(templateCommand);
        const flagBuilder = new FlagBuilder(answers, 'test.ts');
        const flag = flagBuilder.build();

        expect(flag).to.deep.equal([
          "    'my-flag': Flags.salesforceId({",
          "      summary: messages.getMessage('flags.my-flag.summary'),",
          "      char: 's',",
          '      required: true,',
          '      multiple: true,',
          '      length: 18,',
          "      startsWith: '00D',",
          '    }),',
        ]);

        const updatedFile = await flagBuilder.apply(flag);
        expect(updatedFile).to.include("'flags.my-flag.summary',");
        expect(updatedFile).to.include("'my-flag': Flags.salesforceId({");
      });

      it('should build a flag without specified length', async () => {
        const answers: FlagAnswers = {
          type: 'salesforceId',
          name: 'my-flag',
          summary: 'Summary of flag.',
          char: 's',
          required: true,
          salesforceIdStartsWith: '00D',
        };

        sandbox.stub(FlagBuilder.prototype, 'readFile').resolves(templateCommand);
        const flagBuilder = new FlagBuilder(answers, 'test.ts');
        const flag = flagBuilder.build();

        expect(flag).to.deep.equal([
          "    'my-flag': Flags.salesforceId({",
          "      summary: messages.getMessage('flags.my-flag.summary'),",
          "      char: 's',",
          '      required: true,',
          "      startsWith: '00D',",
          '    }),',
        ]);

        const updatedFile = await flagBuilder.apply(flag);
        expect(updatedFile).to.include("'flags.my-flag.summary',");
        expect(updatedFile).to.include("'my-flag': Flags.salesforceId({");
      });
    });

    describe('orgApiVersion', () => {
      it('should build a flag with all the options', async () => {
        const answers: FlagAnswers = {
          type: 'orgApiVersion',
          name: 'my-flag',
          summary: 'Summary of flag.',
          char: 's',
          required: true,
          multiple: true,
        };

        sandbox.stub(FlagBuilder.prototype, 'readFile').resolves(templateCommand);
        const flagBuilder = new FlagBuilder(answers, 'test.ts');
        const flag = flagBuilder.build();

        expect(flag).to.deep.equal([
          "    'my-flag': Flags.orgApiVersion({",
          "      summary: messages.getMessage('flags.my-flag.summary'),",
          "      char: 's',",
          '      required: true,',
          '      multiple: true,',
          '    }),',
        ]);

        const updatedFile = await flagBuilder.apply(flag);
        expect(updatedFile).to.include("'flags.my-flag.summary',");
        expect(updatedFile).to.include("'my-flag': Flags.orgApiVersion({");
      });
    });

    describe('requiredOrg', () => {
      it('should build a flag with all the options', async () => {
        const answers: FlagAnswers = {
          type: 'requiredOrg',
          name: 'my-flag',
          summary: 'Summary of flag.',
          char: 's',
          required: true,
        };

        sandbox.stub(FlagBuilder.prototype, 'readFile').resolves(templateCommand);
        const flagBuilder = new FlagBuilder(answers, 'test.ts');
        const flag = flagBuilder.build();

        expect(flag).to.deep.equal([
          "    'my-flag': Flags.requiredOrg({",
          "      summary: messages.getMessage('flags.my-flag.summary'),",
          "      char: 's',",
          '      required: true,',
          '    }),',
        ]);

        const updatedFile = await flagBuilder.apply(flag);
        expect(updatedFile).to.include("'flags.my-flag.summary',");
        expect(updatedFile).to.include("'my-flag': Flags.requiredOrg({");
      });
    });

    describe('optionalOrg', () => {
      it('should build a flag with all the options', async () => {
        const answers: FlagAnswers = {
          type: 'optionalOrg',
          name: 'my-flag',
          summary: 'Summary of flag.',
          char: 's',
          required: true,
        };

        sandbox.stub(FlagBuilder.prototype, 'readFile').resolves(templateCommand);
        const flagBuilder = new FlagBuilder(answers, 'test.ts');
        const flag = flagBuilder.build();

        expect(flag).to.deep.equal([
          "    'my-flag': Flags.optionalOrg({",
          "      summary: messages.getMessage('flags.my-flag.summary'),",
          "      char: 's',",
          '      required: true,',
          '    }),',
        ]);

        const updatedFile = await flagBuilder.apply(flag);
        expect(updatedFile).to.include("'flags.my-flag.summary',");
        expect(updatedFile).to.include("'my-flag': Flags.optionalOrg({");
      });
    });

    describe('requiredHub', () => {
      it('should build a flag with all the options', async () => {
        const answers: FlagAnswers = {
          type: 'requiredHub',
          name: 'my-flag',
          summary: 'Summary of flag.',
          char: 's',
          required: true,
        };

        sandbox.stub(FlagBuilder.prototype, 'readFile').resolves(templateCommand);
        const flagBuilder = new FlagBuilder(answers, 'test.ts');
        const flag = flagBuilder.build();

        expect(flag).to.deep.equal([
          "    'my-flag': Flags.requiredHub({",
          "      summary: messages.getMessage('flags.my-flag.summary'),",
          "      char: 's',",
          '      required: true,',
          '    }),',
        ]);

        const updatedFile = await flagBuilder.apply(flag);
        expect(updatedFile).to.include("'flags.my-flag.summary',");
        expect(updatedFile).to.include("'my-flag': Flags.requiredHub({");
      });
    });
  });

  describe('apply', () => {
    it('should add a flag when no flags exist', async () => {
      const answers: FlagAnswers = {
        type: 'string',
        name: 'my-flag',
        summary: 'Summary of string flag.',
      };

      sandbox.stub(FlagBuilder.prototype, 'readFile').resolves(templateCommandNoFlags);
      const flagBuilder = new FlagBuilder(answers, 'test.ts');
      const flag = flagBuilder.build();
      const updated = await flagBuilder.apply(flag);

      expect(updated).to.include("import { SfCommand , Flags} from '@salesforce/sf-plugins-core';");
      expect(updated).to.include('public static readonly flags = {');
    });

    it('should remove Flags import from @oclif/core and replace with @salesforce/sf-plugins-core', async () => {
      const answers: FlagAnswers = {
        type: 'string',
        name: 'my-flag',
        summary: 'Summary of string flag.',
      };

      sandbox.stub(FlagBuilder.prototype, 'readFile').resolves(templateCommandOclifFlags);
      const flagBuilder = new FlagBuilder(answers, 'test.ts');
      const flag = flagBuilder.build();
      const updated = await flagBuilder.apply(flag);

      expect(updated).to.not.include('@oclif/core');
      expect(updated).to.include("import { SfCommand , Flags} from '@salesforce/sf-plugins-core';");
    });

    it('should remove Flags import from @oclif/core and replace with @salesforce/sf-plugins-core and maintain existing @oclif/core imports', async () => {
      const answers: FlagAnswers = {
        type: 'string',
        name: 'my-flag',
        summary: 'Summary of string flag.',
      };

      sandbox.stub(FlagBuilder.prototype, 'readFile').resolves(templateCommandOclifFlagsWithMultipleImports);
      const flagBuilder = new FlagBuilder(answers, 'test.ts');
      const flag = flagBuilder.build();
      const updated = await flagBuilder.apply(flag);

      expect(updated).to.include("import {  Interfaces } from '@oclif/core';");
      expect(updated).to.include("import { SfCommand , Flags} from '@salesforce/sf-plugins-core';");
    });

    it('should handle messages being on a single line', async () => {
      const answers: FlagAnswers = {
        type: 'string',
        name: 'my-flag',
        summary: 'Summary of string flag.',
      };

      sandbox.stub(FlagBuilder.prototype, 'readFile').resolves(templateCommandSingleLineMessages);
      const flagBuilder = new FlagBuilder(answers, 'test.ts');
      const flag = flagBuilder.build();
      const updated = await flagBuilder.apply(flag);

      expect(updated).to.include(
        "const messages = Messages.load('@salesforce/plugin-rosie', 'hello.world', ['summary', 'description', 'examples', 'info.hello', 'flags.my-flag.summary']);"
      );
    });
  });
});

describe('validatePluginName', () => {
  describe('2PP', () => {
    it('should return true for valid plugin name', () => {
      expect(validatePluginName('plugin-test', '2PP')).to.be.true;
    });

    it('should return true for valid plugin name with multiple hyphens', () => {
      expect(validatePluginName('plugin-test-with-hyphens', '2PP')).to.be.true;
    });

    it('should return false for empty plugin name', () => {
      expect(validatePluginName('', '2PP')).to.be.false;
    });

    it('should return false for plugin name with number', () => {
      expect(validatePluginName('plugin-test2', '2PP')).to.be.false;
    });

    it('should return false for plugin name that does not start with plugin-', () => {
      expect(validatePluginName('my-plugin', '2PP')).to.be.false;
    });

    it('should return false for plugin name that contains special characters', () => {
      expect(validatePluginName('plugin-test!', '2PP')).to.be.false;
    });
  });

  describe('3PP', () => {
    it('should return true for valid plugin name', () => {
      expect(validatePluginName('my-plugin', '3PP')).to.be.true;
    });

    it('should return true for valid plugin name with multiple hyphens', () => {
      expect(validatePluginName('my-plugin-with-hyphens', '3PP')).to.be.true;
    });

    it('should return true for valid plugin name with underscores', () => {
      expect(validatePluginName('my_plugin', '3PP')).to.be.true;
    });

    it('should return true for valid plugin name with period', () => {
      expect(validatePluginName('my.plugin', '3PP')).to.be.true;
    });

    it('should return true for valid plugin name with numbers', () => {
      expect(validatePluginName('my-plugin-123', '3PP')).to.be.true;
    });

    it('should return true for valid plugin name that starts with @', () => {
      expect(validatePluginName('@me/my-plugin', '3PP')).to.be.true;
    });

    it('should return false for empty plugin name', () => {
      expect(validatePluginName('', '3PP')).to.be.false;
    });

    it('should return false for valid plugin name that starts with period', () => {
      expect(validatePluginName('.my-plugin', '3PP')).to.be.false;
    });

    it('should return false for valid plugin name that starts with underscore', () => {
      expect(validatePluginName('_my-plugin', '3PP')).to.be.false;
    });

    it('should return false for valid plugin name that contains capitals', () => {
      expect(validatePluginName('my-Plugin', '3PP')).to.be.false;
    });

    it('should return false for plugin name that contains special characters', () => {
      const specialCharacters = [
        ' ',
        '!',
        '#',
        '$',
        '%',
        '^',
        '&',
        '*',
        '(',
        ')',
        '+',
        '=',
        '{',
        '}',
        '[',
        ']',
        '|',
        '\\',
        ':',
        ';',
        '"',
        "'",
        '<',
        '>',
        ',',
        '?',
        '/',
      ];

      for (const char of specialCharacters) {
        expect(validatePluginName(`plugin-test${char}`, '3PP'), `expect name to be invalid with ${char} at end`).to.be
          .false;
        expect(validatePluginName(`plugin${char}test`, '3PP'), `expect name to be invalid with ${char} at middle`).to
          .false;
        expect(validatePluginName(`${char}plugin-test`, '3PP'), `expect name to be invalid with ${char} at beginning`)
          .to.be.false;
      }
    });
  });
});
