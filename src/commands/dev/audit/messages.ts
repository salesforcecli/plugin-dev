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
import { Interfaces } from '@oclif/core';

export type AuditResults = {
  unusedBundles: string[];
  unusedMessages: Array<{ Bundle: string; Name: string }>;
  missingBundles: Array<{ Bundle: string; File: string; SourceVar: string }>;
  missingMessages: Array<{ File: string; Name: string; SourceVar: string; Bundle: string; IsLiteral: boolean }>;
};

type NodeType = {
  type: 'bundle' | 'source' | 'message' | 'messageReference' | 'bundleReference';
  x: number;
  y: number;
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
  'duplicateBundles',
  'flags.messages-dir.summary',
  'flags.messages-dir.description',
  'flags.project-dir.summary',
  'flags.project-dir.description',
  'flags.source-dir.summary',
  'flags.source-dir.description',
  'missingBundlesFound',
  'missingMessagesExplanation',
  'missingMessagesNonLiteralWarning',
  'missingMessagesFound',
  'noMissingBundlesFound',
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
      default: '.',
      aliases: ['projectdir'],
    }),
    'messages-dir': Flags.directory({
      summary: messages.getMessage('flags.messages-dir.summary'),
      char: 'm',
      description: messages.getMessage('flags.messages-dir.description'),
      default: 'messages',
      aliases: ['messagesdir'],
    }),
    'source-dir': Flags.directory({
      summary: messages.getMessage('flags.source-dir.summary'),
      char: 's',
      description: messages.getMessage('flags.source-dir.description'),
      default: 'src',
      aliases: ['sourcedir'],
    }),
  };
  private flags: Interfaces.InferredFlags<typeof AuditMessages.flags>;
  private messagesDirPath: string;
  private bundles: string[] = [];
  private sourceDirPath: string;
  private source: Map<string, string> = new Map();
  private auditResults: AuditResults = {
    unusedBundles: [],
    unusedMessages: [],
    missingBundles: [],
    missingMessages: [],
  };
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
    this.determineExitCode();
    return this.auditResults;
  }

  private async validateFlags(): Promise<void> {
    this.projectDir = resolve(this.flags['project-dir']);
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
    const bundleMap = this.bundles.reduce((m, bundle) => {
      const count = m.get(parse(bundle).name) || 0;
      m.set(parse(bundle).name, count + 1);
      return m;
    }, new Map<string, number>());
    if ([...bundleMap.values()].some((count) => count > 1)) {
      const duplicates = [...bundleMap.entries()].filter(([, count]) => count > 1);
      throw messages.createError('duplicateBundles', [
        duplicates.map(([name, count]) => `${name}:${count}`).join(', '),
      ]);
    }
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

    this.log();
    if (this.auditResults.unusedMessages.length === 0) {
      this.styledHeader(messages.getMessage('noUnusedMessagesFound'));
    } else {
      this.styledHeader(messages.getMessage('unusedMessagesFound'));
      this.table(this.auditResults.unusedMessages, {
        Bundle: { header: 'Bundle' },
        Name: { header: 'Name' },
        ReferencedInNonLiteral: { header: '*' },
      });
    }

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
    if (this.auditResults.missingBundles.length === 0) {
      this.styledHeader(messages.getMessage('noMissingBundlesFound'));
    } else {
      this.styledHeader(messages.getMessage('missingBundlesFound'));
      this.table(this.auditResults.missingBundles, {
        File: { header: 'File' },
        SourceVar: { header: 'Message Bundle Var' },
        Bundle: { header: 'Bundle' },
      });
    }
  }

  private auditMessages(): void {
    this.logger.debug('Auditing messages');
    const re = /(#?\w+?)\.(?:getMessage|getMessages|getMessageWithMap|createError|createWarn|createInfo)\((.*?)\)/g;

    // create bundle/message nodes add edges between them
    this.bundles.forEach((bundleFileName) => {
      this.logger.trace(`Adding bundle ${bundleFileName} to graph`);
      // load the bundle and add its node in the graph
      const bundle: Messages<string> = Messages.loadMessages(this.package, parse(bundleFileName).name);
      const bundleName = parse(bundleFileName).name;
      this.graph.addNode(bundleName, { type: 'bundle', name: bundleFileName, x: 1, y: 1 });
      // add the messages nodes and edges to the graph
      /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const keys: string[] = [...bundle.messages.keys()] as string[];
      keys.forEach((key) => {
        this.logger.trace(`Adding message ${key} to graph with key ${bundleName}:${key}`);
        this.graph.addNode(`${bundleName}:${key}`, { type: 'message', key, x: 1, y: 1 });
        this.graph.addEdge(bundleName, `${bundleName}:${key}`);
      });
    });
    // let's find all the references to messages
    [...this.source.entries()].forEach(([file, contents]) => {
      this.logger.trace(`Auditing file ${file} to graph`);
      this.graph.addNode(file, { type: 'source', name: file, x: 1, y: 1 });
      // find and record references to bundles
      const bundleRegexp = new RegExp('.*?\\s+(.\\w+?) = Messages.load(Messages)?\\((.*?)\\)', 'g');
      const bundleMatches = [...contents.matchAll(bundleRegexp)];
      // for each bundle reference, add a bundle ref node to the graph and add an edge from the source file to the bundle reference
      bundleMatches.forEach((match) => {
        // the bundle name is the third capture group
        const [, bundleName] = match[3].split(',');
        const bundle = bundleName.trim().replace(/['"]/g, '');
        // the source variable name is the first capture group
        const bundleVar = match[1].trim();
        // create unique key to bundle ref node - file name plus bundle var name used to reference the bundle
        const bundleRefKey = `${file}:${bundleVar}`;
        this.logger.trace(`Adding bundle reference ${bundleRefKey} to graph`);
        if (!this.graph.hasNode(bundleRefKey)) {
          this.graph.addNode(bundleRefKey, { type: 'bundleReference', variable: bundleVar, name: bundle, x: 1, y: 1 });
        }
        // add an edge from the source file to the bundle reference
        this.graph.addEdge(file, bundleRefKey);
        // add an edge from the bundle reference to the bundle (only if necessary)
        if (this.graph.hasNode(bundle)) {
          this.graph.addEdge(bundleRefKey, bundle);
        }
      });
      // now find and record references to messages
      [...contents.matchAll(re)]
        .filter((m) => m?.[2]) // filter out function calls with no parameters
        .forEach(([, bundleVar, paramString]) => {
          this.logger.trace(`Processing Message class function references in ${file}`);
          // parse the parameters to capture the message name
          const params = paramString.split(',');
          // check to see if this is a literal or a variable or some other expression
          const isLiteral = /^['"]/.test(params[0]);
          const key = params[0].replace(/['"]/g, '');
          this.logger.trace(`Found message ${key} in file ${file} and isLiteral is ${isLiteral}`);
          const mesageRefNodeKey = `${file}:${bundleVar}:${key}`;
          // add message reference node to the graph
          if (!this.graph.hasNode(mesageRefNodeKey)) {
            this.graph.addNode(mesageRefNodeKey, { type: 'messageReference', key, isLiteral, x: 1, y: 1 });
          }
          // this is a case where we have a reference to a bundle in source, but is not loaded in this source file
          if (!this.graph.hasNode(`${file}:${bundleVar}`)) {
            this.graph.addNode(`${file}:${bundleVar}`, {
              type: 'bundleReference',
              name: 'unknown',
              variable: key,
              x: 1,
              y: 1,
            });
          }
          // add an edge from bundle reference to the message reference
          this.graph.addEdge(`${file}:${bundleVar}`, mesageRefNodeKey);
          if (isLiteral) {
            const bundleRefNode = this.graph.getNodeAttributes(`${file}:${bundleVar}`) as BundleRefNode;
            if (this.graph.hasNode(`${bundleRefNode.name}:${key}`)) {
              this.logger.trace(
                `Try to add edge from message ref ${mesageRefNodeKey} to message ${bundleRefNode.name}:${key}`
              );
              // add an edge from the message reference to the message
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

    // find missing bundles
    this.auditResults.missingBundles = this.graph
      .filterNodes((node, attrs) => attrs.type === 'bundleReference' && this.graph.outDegree(node) === 0)
      .map((node) => {
        const bundleRefNode = this.graph.getNodeAttributes(node) as BundleRefNode;
        const [File] = node.split(':');
        return { Bundle: bundleRefNode.name, File, SourceVar: bundleRefNode.variable };
      })
      .sort((a, b) => {
        const fileCompare = a.File.localeCompare(b.File);
        const sourceVarCompare = a.SourceVar.localeCompare(b.SourceVar);
        if (fileCompare === 0) {
          return sourceVarCompare;
        }
        return fileCompare;
      });

    // find message references where are no outbound edges to messages
    this.auditResults.missingMessages = this.graph
      .filterNodes(
        (node, attrs) =>
          attrs.type === 'messageReference' &&
          !this.graph.someOutboundNeighbor(node, (msgNode, msgAtrs) => {
            return msgAtrs.type === 'message';
          })
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

    const nonLiteralMessageBundleRefs = this.auditResults.missingMessages
      .filter((m) => !m.IsLiteral)
      .map((m) => m.Bundle)
      .reduce((acc, bundle) => acc.add(bundle), new Set<string>());

    // find unused messages that are not part of an unused bundle
    this.auditResults.unusedMessages = this.graph
      // looking for message nodes that do not have any incoming edges from message reference nodes
      .filterNodes(
        (node, attrs) =>
          attrs.type === 'message' &&
          !this.graph.someInboundNeighbor(node, (inboundNode, inboundAttrs) => {
            return inboundAttrs.type === 'messageReference';
          })
      )
      .map((key) => {
        const [Bundle, Name] = key.split(':');
        return { Bundle, Name, ReferencedInNonLiteral: nonLiteralMessageBundleRefs.has(Bundle) ? '*' : '' };
      })
      // filter out messages that are part of an unused bundle
      .filter((unused) => !this.auditResults.unusedBundles.includes(unused.Bundle))
      .sort((a, b) => {
        return a.Bundle.localeCompare(b.Bundle) || a.Name.localeCompare(b.Name);
      });

    const snowflakeMessages = this.auditResults.unusedMessages.filter(
      (m) =>
        m.Name.endsWith('.actions') &&
        !this.auditResults.unusedMessages.some((m2) => m2.Name === m.Name.replace('.actions', ''))
    );
    this.auditResults.unusedMessages = this.auditResults.unusedMessages.filter(
      (m) => !snowflakeMessages.some((msg) => msg.Name.endsWith('.actions') && m.Bundle === msg.Bundle)
    );
  }

  /**
   * Calculates the exit code based on the audit results
   * The exit code is a sum of the following:
   * exit code = unusedBundles
   * + unusedMessages
   * + missingBundles
   * + missingMessages
   * - non-literal missing messages
   * - unused messages bundles when the bundle is referenced in non-literal message references
   *
   * Given the possibility of false positives due to non-literal message key references, the exit code calculation
   * removes the count of non-literal missing messages
   * removes the count of unused messages that are part of a bundle that is referenced in non-literal message references
   *
   * @private
   */
  private determineExitCode(): void {
    const { unusedBundles, unusedMessages, missingBundles, missingMessages } = this.auditResults;

    const nonLiteralBundleRefs = missingMessages.filter((msg) => !msg.IsLiteral).map((msg) => msg.Bundle);
    const unusedMessagesInNonLiteralBundleRefs = unusedMessages.filter((msg) =>
      nonLiteralBundleRefs.includes(msg.Bundle)
    );

    process.exitCode =
      unusedBundles.length +
      missingBundles.length +
      unusedMessages.length +
      missingMessages.length -
      unusedMessagesInNonLiteralBundleRefs.length -
      nonLiteralBundleRefs.length;
  }
}
