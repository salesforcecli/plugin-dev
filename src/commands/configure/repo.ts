/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { SfCommand, Flags } from '@salesforce/sf-plugins-core';
import { Messages } from '@salesforce/core';
import { Octokit } from 'octokit';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.load('@salesforce/plugin-dev', 'configure.repo', [
  'summary',
  'description',
  'examples',
  'flags.repository.summary',
  'flags.dryRun.summary',
]);

export type ConfigureRepoResult = {
  path: string;
};

const BOT_LOGIN = 'SF-CLI-BOT';

export default class ConfigureRepo extends SfCommand<ConfigureRepoResult> {
  public static summary = messages.getMessage('summary');
  public static description = messages.getMessage('description');
  public static examples = messages.getMessages('examples');

  public static flags = {
    repository: Flags.string({
      summary: messages.getMessage('flags.repository.summary'),
      char: 'r',
      required: true,
    }),
    'dry-run': Flags.boolean({
      summary: messages.getMessage('flags.dryRun.summary'),
      char: 'c',
    }),
  };

  public async run(): Promise<ConfigureRepoResult> {
    const { flags } = await this.parse(ConfigureRepo);
    // TODO: nice error if no token exists
    const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
    const repoBase = {
      owner: flags.repository.split('/')[0],
      repo: flags.repository.split('/')[1],
    };

    // assertion : bot has write+ access to repo
    const { data: collaborators } = await octokit.rest.repos.listCollaborators({ ...repoBase });
    if (!collaborators.find((c) => c.login === BOT_LOGIN)?.permissions.admin) {
      this.error(
        `${BOT_LOGIN}  does not have "admin"  access to ${flags.repository}.  No further inspection is possible.`
      );
    } else {
      this.logSuccess(`✓ ${BOT_LOGIN} has necessary access to ${flags.repository}`);
    }

    try {
      await octokit.rest.repos.getBranchProtection({ ...repoBase, branch: 'main' });
      // this.styledJSON(protectedBranch);
    } catch (e) {
      if (e.response.data) {
        if (!flags['dry-run'] && e.response.data.message === 'Branch not protected') {
          this.log(`setting up basic branch protection`);

          await octokit.rest.repos.updateBranchProtection({
            ...repoBase,
            branch: 'main',
            required_pull_request_reviews: {
              bypass_pull_request_allowances: {
                users: [BOT_LOGIN],
              },
            },
            enforce_admins: false,
            required_status_checks: null,
            restrictions: {
              users: [BOT_LOGIN],
              teams: [],
            },
          });
        } else {
          this.warn(e.response.data.message);
          this.log(`see ${e.response.data.documentation_url}`);
        }
      } else {
        console.log(e);
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
        (user) => user.login === BOT_LOGIN
      )
    ) {
      if (flags['dry-run']) {
        this.warn(`${BOT_LOGIN} needs permissions to bypass pull request requirements`);
      } else {
        this.log(`giving ${BOT_LOGIN} pull request bypass permissions`);
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
                BOT_LOGIN,
              ],
              teams:
                protectedBranch.required_pull_request_reviews.bypass_pull_request_allowances.teams?.map(
                  (u) => u.name
                ) ?? [],
            }
          : // there was not an object, so create one
            {
              users: [BOT_LOGIN],
            };
        await octokit.rest.repos.updatePullRequestReviewProtection({
          ...repoBase,
          branch: 'main',
          bypass_pull_request_allowances: updatePayload,
        });
      }
    } else {
      this.logSuccess(`✓ ${BOT_LOGIN} can bypass pull request requirements`);
    }

    protectedBranch = (
      await octokit.rest.repos.getBranchProtection({
        ...repoBase,
        branch: 'main',
      })
    ).data;

    if (protectedBranch.restrictions && !protectedBranch.restrictions?.users.some((user) => user.login === BOT_LOGIN)) {
      if (flags['dry-run']) {
        this.warn('SF-CLI-BOT needs permissions to push directly to main');
      } else {
        this.log(`giving ${BOT_LOGIN} permission to push directly to main`);
        await octokit.rest.repos.addUserAccessRestrictions({
          ...repoBase,
          branch: 'main',
          users: [BOT_LOGIN],
        });
      }
    } else {
      this.logSuccess(`✓ ${BOT_LOGIN} can push directly to main`);
    }

    //// secret stuff--there's not a good way to ask, "what organizational secrets are shared with this repo?"
    // has secrets for dependabot
    // has secrets for npm publish
    // if sign, has aws secrets
    // if nuts, has nuts auth secrets

    // labels setup: labels should have dependencies and the corresponding git2gus labels for bug and feature
    const { data: labels } = await octokit.rest.issues.listLabelsForRepo({ ...repoBase });
    if (!labels.find((l) => l.name === 'dependencies')) {
      if (flags['dry-run']) {
        this.warn('missing dependencies label');
      } else {
        this.log(`creating dependencies label`);
        await octokit.rest.issues.createLabel({ ...repoBase, name: 'dependencies' });
      }
    }
    return { path: '' };
  }
}
