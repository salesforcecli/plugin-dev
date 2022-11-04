/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import * as fs from 'fs';
import { join, parse, relative, resolve } from 'path';
import { Logger, Messages } from '@salesforce/core';
import { Flags, SfCommand } from '@salesforce/sf-plugins-core';
import { Duration, ThrottledPromiseAll } from '@salesforce/kit';

export type AuditResults = {
  unusedBundles: string[];
  messageState: Record<string, { found: boolean; files: string[] }>;
  missing: Record<string, { isLiteral: boolean; missing: boolean; files: string[] }>;
};

Messages.importMessagesDirectory(__dirname);
const messages = Messages.load('@salesforce/plugin-dev', 'audit.messages', [
  'summary',
  'description',
  'examples',
  'flags.messages-dir.summary',
  'flags.messages-dir.description',
  'flags.project-dir.summary',
  'flags.project-dir.description',
  'flags.source-dir.summary',
  'flags.source-dir.description',
  'missingMessagesExplanation',
  'missingMessagesNonLiteralWarning',
  'missingMessagesFound',
  'noMissingMessagesFound',
  'noUnusedBundlesFound',
  'noUnusedMessagesFound',
  'unusedBundlesFound',
  'unusedMessagesFound',
]);

export default class AuditMessages extends SfCommand<AuditResults> {
  public static summary = messages.getMessage('summary');
  public static description = messages.getMessage('description');
  public static examples = messages.getMessages('examples');

  public static flags = {
    'project-dir': Flags.directory({
      summary: messages.getMessage('flags.project-dir.summary'),
      char: 'p',
      description: messages.getMessage('flags.project-dir.description'),
      default: './',
    }),
    'messages-dir': Flags.directory({
      summary: messages.getMessage('flags.messages-dir.summary'),
      char: 'm',
      description: messages.getMessage('flags.messages-dir.description'),
      default: './messages',
    }),
    'source-dir': Flags.directory({
      summary: messages.getMessage('flags.source-dir.summary'),

      char: 's',
      description: messages.getMessage('flags.source-dir.description'),
      default: './src',
    }),
  };
  private flags: { 'source-dir': string; 'messages-dir': string };
  private messagesDirPath: string;
  private bundles: string[] = [];
  private sourceDirPath: string;
  private source: Map<string, string> = new Map();
  private auditResults: AuditResults = { unusedBundles: [], messageState: {}, missing: {} };
  private package: string;
  private projectDir: string;
  private logger: Logger;

  public async run(): Promise<AuditResults> {
    this.logger = Logger.childFromRoot(this.constructor.name);
    const { flags } = await this.parse(AuditMessages);
    this.flags = flags;
    await this.validateFlags();
    await this.loadMessages();
    await this.loadSource();
    this.auditMessages();
    this.displayResults();
    return this.auditResults;
  }

  private async validateFlags(): Promise<void> {
    this.projectDir = resolve(this.flags['project-dir'] as string);
    this.logger.debug('Loading project directory: %s', this.projectDir);
    const { name } = JSON.parse(await fs.promises.readFile(resolve(this.projectDir, 'package.json'), 'utf8')) as {
      name: string;
    };
    this.logger.debug('Loaded package name: %s', name);
    this.package = name;
  }

  private async loadMessages(): Promise<void> {
    this.messagesDirPath = resolve(this.projectDir, this.flags['messages-dir']);
    this.logger.debug('Loading messages from %s', this.messagesDirPath);
    const messagesDir = await fs.promises.readdir(this.messagesDirPath, { withFileTypes: true });
    Messages.importMessagesDirectory(this.messagesDirPath);
    this.bundles = messagesDir.filter((entry) => entry.isFile()).map((entry) => entry.name);
  }

  private async loadSource(): Promise<void> {
    this.sourceDirPath = resolve(this.projectDir, this.flags['source-dir']);
    this.logger.debug('Loading source from %s', this.sourceDirPath);
    const throttledPromise = new ThrottledPromiseAll<string, void>({ concurrency: 10, timeout: Duration.minutes(5) });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const fileProducer = async (file: string, producer: ThrottledPromiseAll<string, void>): Promise<void> => {
      this.logger.trace('Loading file %s', file);
      const fileContents = await fs.promises.readFile(file, 'utf8');
      const contents = fileContents.replace(/\n/g, ' ').replace(/\s{2,}/g, '');
      this.source.set(relative(this.projectDir, file), contents);
    };

    const dirHandler = async (dir: string, producer: ThrottledPromiseAll<string, void>): Promise<void> => {
      this.logger.debug('Loading directory %s', dir);
      const contents = await fs.promises.readdir(dir, { withFileTypes: true });
      producer.add(
        contents.filter((entry) => entry.isDirectory()).map((entry) => join(dir, entry.name)),
        dirHandler
      );

      producer.add(
        contents
          .filter((entry) => entry.isFile() && entry.name.match(/\.(?:ts|js)$/))
          .map((entry) => join(dir, entry.name)),
        fileProducer
      );
    };
    throttledPromise.add(this.sourceDirPath, dirHandler);
    await throttledPromise.all();
  }

  private displayResults(): void {
    this.log();
    if (this.auditResults.unusedBundles.length === 0) {
      this.styledHeader(messages.getMessage('noUnusedBundlesFound'));
    } else {
      this.styledHeader(messages.getMessage('unusedBundlesFound'));
      this.table(
        this.auditResults.unusedBundles.sort().map((Bundle) => ({ Bundle })),
        { Bundle: { header: 'Bundle' } }
      );
    }
    const unusedMessages = [...Object.entries(this.auditResults.messageState)]
      .filter(([, { found }]) => !found)
      .map(([key]) => {
        const [Bundle, Name] = key.split(':');
        return { Bundle, Name };
      })
      .filter((unused) => !this.auditResults.unusedBundles.includes(unused.Bundle))
      .sort((a, b) => {
        return a.Bundle.localeCompare(b.Bundle) || a.Name.localeCompare(b.Name);
      });
    this.log();
    if (unusedMessages.length === 0) {
      this.styledHeader(messages.getMessage('noUnusedMessagesFound'));
    } else {
      this.styledHeader(messages.getMessage('unusedMessagesFound'));
      this.table(unusedMessages, { Bundle: { header: 'Bundle' }, Name: { header: 'Name' } });
    }
    const hasNonLiteralReferences = Object.values(this.auditResults.missing).some((missing) => !missing.isLiteral);
    const missingMessages = [...Object.entries(this.auditResults.missing)]
      .filter(([, { missing }]) => missing)
      .sort((a, b) => {
        const [akey] = a[0];
        const [bkey] = b[0];
        return akey.localeCompare(bkey);
      })
      .map((entry) => {
        const [key, { isLiteral, files }] = entry;
        return { Name: key, isLiteral: isLiteral ? '' : '*', Files: files.sort().join('\n') };
      });
    this.log();
    if (missingMessages.length === 0) {
      this.styledHeader(messages.getMessage('noMissingMessagesFound'));
    } else {
      this.styledHeader(messages.getMessage('missingMessagesFound'));
      this.info(messages.getMessage('missingMessagesExplanation'));
      if (hasNonLiteralReferences) {
        this.log();
        this.warn(messages.getMessage('missingMessagesNonLiteralWarning'));
        this.log();
      }
      this.table(
        missingMessages,
        { Name: { header: 'Name' }, isLiteral: { header: '*' }, Files: { header: 'Files' } },
        { 'no-truncate': true }
      );
    }
  }

  private auditMessages(): void {
    this.bundles.forEach((bundleName) => {
      const bundle: Messages<string> = Messages.loadMessages(this.package, parse(bundleName).name);
      /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const keys: string[] = [...bundle.messages.keys()] as string[];
      // audits bundle for unused keys
      const loadBundleRegex = new RegExp(`Messages.load(Messages)?\\(.*?${parse(bundleName).name}.*?\\)`);
      keys.forEach((key) => {
        const messageKeyRegex = `\\.(?:getMessage|getMessages|getMessageWithMap|createError|createWarn|createInfo)\\(['"]?(${key})['"]?.*?\\)`;
        const re = new RegExp(messageKeyRegex, 'g');
        const keyFound: { found: boolean; files: string[] } = { found: false, files: [] };
        [...this.source.entries()]
          .filter(([, contents]) => loadBundleRegex.test(contents))
          .forEach(([file, contents]) => {
            const matches = [...contents.matchAll(re)];
            matches.forEach(() => {
              keyFound.found = true;
              keyFound.files.push(file);
            });
          });

        this.auditResults.messageState = Object.assign(this.auditResults.messageState, {
          [`${bundleName}:${key}`]: keyFound,
        });
      });
      // audits bundle this is not used
      const allMessagesNotFound = [...Object.entries(this.auditResults.messageState)]
        .filter(([key]) => {
          const [bundlePart] = key.split(':');
          return bundlePart === bundleName;
        })
        .every(([, { found }]) => !found);
      if (allMessagesNotFound) {
        this.auditResults.unusedBundles.push(bundleName);
      }

      // audits source for missing messages
      [...this.source.entries()]
        .filter(([, contents]) => loadBundleRegex.test(contents))
        .forEach(([file, contents]) => {
          const reString =
            '\\.(?:getMessage|getMessages|getMessageWithMap|createError|createWarn|createInfo)\\((.*?)\\)';
          const re = new RegExp(reString, 'g');
          const matches = [...contents.matchAll(re)];
          matches
            .filter((m) => m?.[1])
            .forEach((match) => {
              const params = match[1].split(',');
              const isLiteral = /^['"]/.test(params[0]);
              const key = params[0].replace(/['"]/g, '');
              const missingKey = this.auditResults.missing[key] || { isLiteral, missing: true, files: [] };
              if (keys.includes(key)) {
                missingKey.missing = false;
              }
              if (!missingKey.files.includes(file)) {
                missingKey.files.push(file);
              }
              this.auditResults.missing = Object.assign(this.auditResults.missing, { [key]: missingKey });
            });
        });
    });
  }
}
