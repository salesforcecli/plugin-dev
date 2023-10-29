/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

// because github api isn't camelcased
/* eslint-disable camelcase */
import { Flags, SfCommand } from '@salesforce/sf-plugins-core';
import { Messages } from '@salesforce/core';
import { Octokit } from '@octokit/rest';
import { OctokitError } from '../../../types';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-dev', 'configure.repo');

export type ConfigureRepoResult = {
  botAccess: boolean;
  labels: boolean;
  prRestrictions: boolean;
  prBypass: boolean;
};

export default class ConfigureRepo extends SfCommand<ConfigureRepoResult> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');

  public static readonly flags = {
    repository: Flags.string({
      summary: messages.getMessage('flags.repository.summary'),
      char: 'r',
      required: true,
    }),
    'dry-run': Flags.boolean({
      summary: messages.getMessage('flags.dry-run.summary'),
      char: 'd',
      aliases: ['dryrun'],
    }),
    bot: Flags.string({
      summary: messages.getMessage('flags.bot.summary'),
      char: 'b',
      default: 'SF-CLI-BOT',
    }),
  };

  public async run(): Promise<ConfigureRepoResult> {
    const { flags } = await this.parse(ConfigureRepo);
    const output: ConfigureRepoResult = {
      botAccess: false,
      labels: false,
      prRestrictions: false,
      prBypass: false,
    };
    // TODO: nice error if no token exists
    const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
    const repoBase = {
      owner: flags.repository.split('/')[0],
      repo: flags.repository.split('/')[1],
    };

    // assertion : bot has write+ access to repo
    const { data: permission } = await octokit.rest.repos.getCollaboratorPermissionLevel({
      ...repoBase,
      username: flags.bot,
    });
    if (permission.permission !== 'admin') {
      this.error(
        `${flags.bot}  does not have "admin"  access to ${flags.repository}.  No further inspection is possible.`
      );
    } else {
      this.logSuccess(`✓ ${flags.bot} has necessary access to ${flags.repository}`);
      output.botAccess = true;
    }

    try {
      await octokit.rest.repos.getBranchProtection({ ...repoBase, branch: 'main' });
    } catch (e) {
      const typedError = e as OctokitError;
      if (typedError) {
        if (!flags['dry-run'] && typedError.response.data.message === 'Branch not protected') {
          this.log('setting up basic branch protection');

          await octokit.rest.repos.updateBranchProtection({
            ...repoBase,
            branch: 'main',
            required_pull_request_reviews: {
              bypass_pull_request_allowances: {
                users: [flags.bot],
              },
            },
            enforce_admins: false,
            required_status_checks: null,
            restrictions: {
              users: [flags.bot],
              teams: [],
            },
          });
        } else {
          this.warn(typedError.response.data.message);
          this.log(`see ${typedError.response.data.documentation_url}`);
        }
      } else {
        // console.log(e);
      }
    }

    let { data: protectedBranch } = await octokit.rest.repos.getBranchProtection({
      ...repoBase,
      branch: 'main',
    });

    if (
      // repo requires PR reviews but doesn't allow the bot to bypass them
      protectedBranch.required_pull_request_reviews &&
      !protectedBranch.required_pull_request_reviews.bypass_pull_request_allowances?.users?.some(
        (user) => user.login === flags.bot
      )
    ) {
      if (flags['dry-run']) {
        this.warn(`${flags.bot} needs permissions to bypass pull request requirements`);
      } else {
        this.log(`giving ${flags.bot} pull request bypass permissions`);
        const updatePayload = protectedBranch.required_pull_request_reviews.bypass_pull_request_allowances
          ? // maintain original, but append bot to users object
            {
              apps:
                protectedBranch.required_pull_request_reviews.bypass_pull_request_allowances.apps?.map(
                  (app) => app.name
                ) ?? [],
              users: [
                ...(protectedBranch.required_pull_request_reviews.bypass_pull_request_allowances.users?.map(
                  (u) => u.login
                ) ?? []),
                flags.bot,
              ],
              teams:
                protectedBranch.required_pull_request_reviews.bypass_pull_request_allowances.teams?.map(
                  (u) => u.name
                ) ?? [],
            }
          : // there was not an object, so create one
            {
              users: [flags.bot],
            };
        await octokit.rest.repos.updatePullRequestReviewProtection({
          ...repoBase,
          branch: 'main',
          bypass_pull_request_allowances: updatePayload,
        });
        output.prBypass = true;
      }
    } else {
      this.logSuccess(`✓ ${flags.bot} can bypass pull request requirements`);
      output.prBypass = true;
    }

    protectedBranch = (
      await octokit.rest.repos.getBranchProtection({
        ...repoBase,
        branch: 'main',
      })
    ).data;

    if (protectedBranch.restrictions && !protectedBranch.restrictions?.users.some((user) => user.login === flags.bot)) {
      if (flags['dry-run']) {
        this.warn('SF-CLI-BOT needs permissions to push directly to main');
      } else {
        this.log(`giving ${flags.bot} permission to push directly to main`);
        await octokit.rest.repos.addUserAccessRestrictions({
          ...repoBase,
          branch: 'main',
          users: [flags.bot],
        });
      }
      output.prRestrictions = true;
    } else {
      this.logSuccess(`✓ ${flags.bot} can push directly to main`);
      output.prRestrictions = true;
    }

    // labels setup: labels should have dependencies and the corresponding git2gus labels for bug and feature
    // TODO: git2gus labels
    const { data: labels } = await octokit.rest.issues.listLabelsForRepo({ ...repoBase });
    if (!labels.find((l) => l.name === 'dependencies')) {
      if (flags['dry-run']) {
        this.warn('missing dependencies label');
      } else {
        this.log('creating dependencies label');
        await octokit.rest.issues.createLabel({ ...repoBase, name: 'dependencies' });
        output.labels = true;
      }
    } else {
      output.labels = true;
    }

    return output;
  }
}
