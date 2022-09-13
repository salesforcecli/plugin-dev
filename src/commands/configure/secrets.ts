/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as fs from 'fs';
import { SfCommand, Flags } from '@salesforce/sf-plugins-core';
import { Messages } from '@salesforce/core';

import { Octokit } from 'octokit';
import { exec } from 'shelljs';
import * as yaml from 'js-yaml';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.load('@salesforce/plugin-dev', 'configure.secrets', [
  'summary',
  'description',
  'examples',
  'flags.repository.summary',
  'flags.dryRun.summary',
]);

type SecretClassification =
  | 'not needed'
  | 'overridden by repo'
  | 'shared to repo by org'
  | 'exists, but not shared with repo'
  | 'does not exist in org'
  | 'unable to check';

type GhaJob = {
  uses: string;
  with: {
    ctc: boolean;
    sign: boolean;
  };
};
export type SecretsResult = {
  AWS_ACCESS_KEY_ID: SecretClassification;
  AWS_SECRET_ACCESS_KEY: SecretClassification;
  NPM_TOKEN: SecretClassification;
  TESTKIT_AUTH_URL: SecretClassification;
  SF_CLI_BOT_GITHUB_TOKEN: SecretClassification;
  SF_CHANGE_CASE_SFDX_AUTH_URL: SecretClassification;
};

export default class ConfigureSecrets extends SfCommand<SecretsResult> {
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

  public async run(): Promise<SecretsResult> {
    const { flags } = await this.parse(ConfigureSecrets);
    const output: SecretsResult = {
      AWS_ACCESS_KEY_ID: 'not needed',
      AWS_SECRET_ACCESS_KEY: 'not needed',
      NPM_TOKEN: 'not needed',
      TESTKIT_AUTH_URL: 'not needed',
      SF_CLI_BOT_GITHUB_TOKEN: 'not needed',
      SF_CHANGE_CASE_SFDX_AUTH_URL: 'not needed',
    };

    // TODO: nice error if no token exists
    const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

    const repoBase = {
      owner: flags.repository.split('/')[0],
      repo: flags.repository.split('/')[1],
    };
    // make sure repo got removed from previous attempt
    exec(`rm -rf ${repoBase.repo}`);

    // clone repo so we can review its yaml
    exec(`git clone https://github.com/${flags.repository} --depth 1`);

    // part 1: what secrets does this repo need?
    const publish = yaml.load(
      await fs.promises.readFile(`${repoBase.repo}/.github/workflows/onRelease.yml`, 'utf8')
    ) as {
      jobs: {
        [key: string]: GhaJob;
      };
    };

    const publishJob = Object.values(publish.jobs).find((job) =>
      job.uses.includes('salesforcecli/github-workflows/.github/workflows/npmPublish')
    );

    if (!publishJob) {
      return output;
    } else {
      // NPM: if uses npm publish
      output.NPM_TOKEN = await secretCheck(octokit, repoBase, 'NPM_TOKEN');

      // AWS: if sign:true on publish
      if (publishJob.with.sign) {
        output.AWS_ACCESS_KEY_ID = await secretCheck(octokit, repoBase, 'AWS_ACCESS_KEY_ID');
        output.AWS_SECRET_ACCESS_KEY = await secretCheck(octokit, repoBase, 'AWS_SECRET_ACCESS_KEY');
      }

      if (publishJob.with.ctc) {
        output.SF_CHANGE_CASE_SFDX_AUTH_URL = await secretCheck(octokit, repoBase, 'SF_CHANGE_CASE_SFDX_AUTH_URL');
      }
    }

    const release = yaml.load(
      await fs.promises.readFile(`${repoBase.repo}/.github/workflows/onPushToMain.yml`, 'utf8')
    ) as {
      jobs: {
        [key: string]: GhaJob;
      };
    };

    const releaseJob = Object.values(release.jobs).find((job) =>
      job.uses.includes('salesforcecli/github-workflows/.github/workflows/githubRelease')
    );

    if (releaseJob) {
      output.SF_CLI_BOT_GITHUB_TOKEN = await secretCheck(octokit, repoBase, 'SF_CLI_BOT_GITHUB_TOKEN');
    }

    const test = yaml.load(await fs.promises.readFile(`${repoBase.repo}/.github/workflows/test.yml`, 'utf8')) as {
      jobs: {
        [key: string]: GhaJob;
      };
    };
    const testJob = Object.values(test.jobs).find(
      (job) =>
        job.uses.includes('salesforcecli/github-workflows/.github/workflows/nut') ||
        job.uses.includes('salesforcecli/github-workflows/.github/workflows/externalNut')
    );
    if (testJob) {
      output.TESTKIT_AUTH_URL = await secretCheck(octokit, repoBase, 'TESTKIT_AUTH_URL');
    }

    this.styledJSON(output);

    exec(`rm -rf ${repoBase.repo}`);
    return output;
  }
}

const secretCheck = async (
  octokit: Octokit,
  repoBase: { owner: string; repo: string },
  secretName: string
): Promise<SecretClassification> => {
  // is it overridden locally?
  try {
    const { data: localSecret } = await octokit.rest.actions.getRepoSecret({
      ...repoBase,
      secret_name: secretName,
    });

    if (localSecret) {
      return 'overridden by repo';
    }
  } catch (e) {
    // if (e.response.data) {
    //   console.log(`check repo secrets for ${secretName}: ${e.response.data.message}`);
    // }
    // secret doesn't exist locally, keep looking.
  }

  // is it in the org?
  try {
    const { data: secret } = await octokit.rest.actions.getOrgSecret({
      org: repoBase.owner,
      secret_name: secretName,
    });
    if (secret.visibility === 'all') {
      return 'shared to repo by org';
    }

    const { data: repositoriesForSecret } = await octokit.rest.actions.listSelectedReposForOrgSecret({
      org: repoBase.owner,
      secret_name: secretName,
      per_page: 100,
    });

    if (repositoriesForSecret) {
      if (repositoriesForSecret.repositories.some((r) => r.name === repoBase.repo)) {
        // if so, is it shared with this repo?
        return 'shared to repo by org';
      } else {
        return 'exists, but not shared with repo';
      }
    }
  } catch (e) {
    if (e.response.data) {
      console.log(`check org secrets for ${secretName}: ${e.response.data.message}`);
    }
    return 'does not exist in org';
  }

  return 'does not exist in org';
};
