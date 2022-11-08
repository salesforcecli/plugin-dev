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
import { MultiDirectedGraph } from 'graphology';

export type AuditResults = {
  unusedBundles: string[];
  unusedMessages: Array<{ Bundle: string; Name: string }>;
  missingMessages: Array<{ File: string; Name: string; SourceVar: string; Bundle: string; IsLiteral: boolean }>;
};

type NodeType = {
  type: 'bundle' | 'source' | 'message' | 'messageReference' | 'bundleReference';
};

type FileNode = NodeType & {
  path: string;
};

type BundleNode = NodeType & {
  name: string;
};

type BundleRefNode = NodeType & {
  variable: string;
  name: string;
};

type MessageNode = NodeType & {
  key: string;
};

type MessageRefNode = NodeType & {
  key: string;
  isLiteral: boolean;
};

type Node = FileNode | BundleNode | MessageNode | MessageRefNode | BundleRefNode;

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
  private auditResults: AuditResults = { unusedBundles: [], unusedMessages: [], missingMessages: [] };
  private package: string;
  private projectDir: string;
  private logger: Logger;
  private graph: MultiDirectedGraph<Node> = new MultiDirectedGraph<Node>();

  public async run(): Promise<AuditResults> {
    this.logger = Logger.childFromRoot(this.constructor.name);
    const { flags } = await this.parse(AuditMessages);
    this.flags = flags;
    await this.validateFlags();
    await this.loadMessages();
    await this.loadSource();
    this.auditMessages();
    this.buildAuditResults();
    this.displayResults();
    return this.auditResults;
  }

  private async validateFlags(): Promise<void> {
    this.projectDir = resolve(this.flags['project-dir'] as string);
    this.logger.debug(`Loading project directory: ${this.projectDir}`);
    const { name } = JSON.parse(await fs.promises.readFile(resolve(this.projectDir, 'package.json'), 'utf8')) as {
      name: string;
    };
    this.logger.debug(`Loaded package name: ${name}`);
    this.package = name;
  }

  private async loadMessages(): Promise<void> {
    this.messagesDirPath = resolve(this.projectDir, this.flags['messages-dir']);
    this.logger.debug(`Loading messages from ${this.messagesDirPath}`);
    const messagesDir = await fs.promises.readdir(this.messagesDirPath, { withFileTypes: true });
    Messages.importMessagesDirectory(this.messagesDirPath);
    this.bundles = messagesDir.filter((entry) => entry.isFile()).map((entry) => entry.name);
    this.logger.debug(`Loaded ${this.bundles.length} bundles with names ${this.bundles.toString()}`);
  }

  private async loadSource(): Promise<void> {
    this.sourceDirPath = resolve(this.projectDir, this.flags['source-dir']);
    this.logger.debug(`Loading source from ${this.sourceDirPath}`);
    const throttledPromise = new ThrottledPromiseAll<string, void>({ concurrency: 10, timeout: Duration.minutes(5) });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const fileProducer = async (file: string, producer: ThrottledPromiseAll<string, void>): Promise<void> => {
      this.logger.trace(`Loading file ${file}`);
      const fileContents = await fs.promises.readFile(file, 'utf8');
      const contents = fileContents.replace(/\n/g, ' ').replace(/\s{2,}/g, '');
      this.source.set(relative(this.projectDir, file), contents);
    };

    const dirHandler = async (dir: string, producer: ThrottledPromiseAll<string, void>): Promise<void> => {
      this.logger.debug(`Loading directory ${dir}`);
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
        this.auditResults.unusedBundles.map((Bundle) => ({ Bundle })),
        { Bundle: { header: 'Bundle' } }
      );
    }
    this.log();
    if (this.auditResults.unusedMessages.length === 0) {
      this.styledHeader(messages.getMessage('noUnusedMessagesFound'));
    } else {
      this.styledHeader(messages.getMessage('unusedMessagesFound'));
      this.table(this.auditResults.unusedMessages, { Bundle: { header: 'Bundle' }, Name: { header: 'Name' } });
    }
    const hasNonLiteralReferences = this.auditResults.missingMessages.some((msg) => !msg.IsLiteral);
    this.log();
    if (this.auditResults.missingMessages.length === 0) {
      this.styledHeader(messages.getMessage('noMissingMessagesFound'));
    } else {
      this.styledHeader(messages.getMessage('missingMessagesFound'));
      this.info(messages.getMessage('missingMessagesExplanation'));
      if (hasNonLiteralReferences) {
        this.log();
        this.warn(messages.getMessage('missingMessagesNonLiteralWarning'));
        this.log();
      }
      const data = this.auditResults.missingMessages.map(({ File, SourceVar, Name, IsLiteral, Bundle }) => ({
        File,
        SourceVar,
        Name,
        IsLiteral: IsLiteral ? '' : '*',
        Bundle,
      }));
      this.table(
        data,
        {
          File: { header: 'File' },
          SourceVar: { header: 'Message Bundle Var' },
          Name: { header: 'Name' },
          IsLiteral: { header: '*' },
          Bundle: { header: 'Referenced Bundle' },
        },
        { 'no-truncate': true }
      );
    }
  }

  private auditMessages(): void {
    this.logger.debug('Auditing messages');
    const re = /(#?\w+?)\.(?:getMessage|getMessages|getMessageWithMap|createError|createWarn|createInfo)\((.*?)\)/g;

    // create bundle/message nodes add edges between them
    this.bundles.forEach((bundleFileName) => {
      this.logger.trace(`Adding bundle ${bundleFileName} to graph`);
      const bundle: Messages<string> = Messages.loadMessages(this.package, parse(bundleFileName).name);
      const bundleName = parse(bundleFileName).name;
      this.graph.addNode(bundleName, { type: 'bundle', name: bundleFileName });
      /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const keys: string[] = [...bundle.messages.keys()] as string[];
      keys.forEach((key) => {
        this.logger.trace(`Adding message ${key} to graph with key ${bundleName}:${key}`);
        this.graph.addNode(`${bundleName}:${key}`, { type: 'message', key });
        this.graph.addEdge(bundleName, `${bundleName}:${key}`);
      });
    });
    [...this.source.entries()].forEach(([file, contents]) => {
      this.logger.trace(`Auditing file ${file} to graph`);
      this.graph.addNode(file, { type: 'source', name: file });
      // find and record references to bundles
      const bundleRegexp = new RegExp('.*?\\s+(.\\w+?) = Messages.load(Messages)?\\((.*?)\\)', 'g');
      const bundleMatches = [...contents.matchAll(bundleRegexp)];
      bundleMatches.forEach((match) => {
        const [, bundleName] = match[3].split(',');
        const bundle = bundleName.trim().replace(/['"]/g, '');
        const bundleVar = match[1].trim();
        const bundleRefKey = `${file}:${bundleVar}`;
        this.logger.trace(`Adding bundle reference ${bundleRefKey} to graph`);
        if (!this.graph.hasNode(bundleRefKey)) {
          this.graph.addNode(bundleRefKey, { type: 'bundleReference', variable: bundleVar, name: bundle });
        }
        this.graph.addEdge(file, bundleRefKey);
        if (this.graph.hasNode(bundle)) {
          this.graph.addEdge(bundleRefKey, bundle);
        }
      });
      [...contents.matchAll(re)]
        .filter((m) => m?.[2]) // filter out function calls with no parameters
        .forEach(([, bundleVar, paramString]) => {
          this.logger.trace(`Processing Message class function references in ${file}`);

          const params = paramString.split(',');
          const isLiteral = /^['"]/.test(params[0]);
          const key = params[0].replace(/['"]/g, '');
          this.logger.trace(`Found message ${key} in file ${file} and isLiteral is ${isLiteral}`);
          const mesageRefNodeKey = `${file}:${bundleVar}:${key}`;
          if (!this.graph.hasNode(mesageRefNodeKey)) {
            this.graph.addNode(mesageRefNodeKey, { type: 'messageReference', key, isLiteral });
          }
          if (!this.graph.hasNode(`${file}:${bundleVar}`)) {
            this.graph.addNode(`${file}:${bundleVar}`, { type: 'bundleReference', name: 'unknown', variable: key });
          }
          this.graph.addEdge(`${file}:${bundleVar}`, mesageRefNodeKey);
          if (isLiteral) {
            const bundleRefNode = this.graph.getNodeAttributes(`${file}:${bundleVar}`) as BundleRefNode;
            if (this.graph.hasNode(`${bundleRefNode.name}:${key}`)) {
              this.logger.trace(
                `Try to add edge from message ref ${mesageRefNodeKey} to message ${bundleRefNode.name}:${key}`
              );
              this.graph.addEdge(mesageRefNodeKey, `${bundleRefNode.name}:${key}`);
            }
          }
        });
    });
  }

  private buildAuditResults(): void {
    // find unused bundles
    this.auditResults.unusedBundles = this.graph
      .filterNodes((node, attrs) => attrs.type === 'bundle' && this.graph.inDegree(node) === 0)
      .sort();

    // find unused messages that are not part of an unused bundle
    this.auditResults.unusedMessages = this.graph
      .filterNodes((node, attrs) => {
        if (attrs.type !== 'message') {
          return false;
        }
        const inboundMessageRefs = this.graph.filterInboundNeighbors(node, (inboundNode, inboundAttrs) => {
          return inboundAttrs.type === 'messageReference';
        });
        return inboundMessageRefs.length === 0;
      })
      .map((key) => {
        const [Bundle, Name] = key.split(':');
        return { Bundle, Name };
      })
      .filter((unused) => !this.auditResults.unusedBundles.includes(unused.Bundle))
      .sort((a, b) => {
        return a.Bundle.localeCompare(b.Bundle) || a.Name.localeCompare(b.Name);
      });

    // find message references there are no outbound edges to messages
    this.auditResults.missingMessages = this.graph
      .filterNodes(
        (node, attrs) =>
          attrs.type === 'messageReference' &&
          this.graph.filterOutboundNeighbors(node, (msgNode, msgAtrs) => {
            return msgAtrs.type === 'message';
          }).length === 0
      )
      .map((key) => {
        const bundleRef = this.graph.findInboundNeighbor(key, (node, attrs) => {
          return attrs.type === 'bundleReference';
        });
        if (!bundleRef) {
          throw new Error(`Unable to find bundle reference for ${key}`);
        }
        const bundle = this.graph.getNodeAttributes(bundleRef) as BundleRefNode;
        const messageRef = this.graph.getNodeAttributes(key) as MessageRefNode;
        const [File, SourceVar, Name] = key.split(':');
        return { File, SourceVar, Name, IsLiteral: messageRef.isLiteral, Bundle: bundle.name };
      })
      .sort((a, b) => {
        const fileCompare = a.File.localeCompare(b.File);
        const nameCompare = a.Name.localeCompare(b.Name);
        const sourceVarCompare = a.SourceVar.localeCompare(b.SourceVar);
        if (fileCompare === 0) {
          if (sourceVarCompare === 0) {
            return nameCompare;
          }
          return sourceVarCompare;
        }
        return fileCompare;
      });
  }
}
