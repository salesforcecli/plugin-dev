# plugin-dev

[![NPM](https://img.shields.io/npm/v/@salesforce/plugin-dev.svg?label=@salesforce/plugin-dev)](https://www.npmjs.com/package/@salesforce/plugin-dev) [![Downloads/week](https://img.shields.io/npm/dw/@salesforce/plugin-dev.svg)](https://npmjs.org/package/@salesforce/plugin-dev) [![License](https://img.shields.io/badge/License-BSD%203--Clause-brightgreen.svg)](https://raw.githubusercontent.com/salesforcecli/plugin-dev/main/LICENSE.txt)

- [plugin-dev](#plugin-dev)
  - [Install](#install)
  - [Usage](#usage)
    - [Generate a new `sf` plugin](#generate-a-new-sf-plugin)
    - [Generate a new `sf` command in your plugin](#generate-a-new-sf-command-in-your-plugin)
    - [Generate a hook that will be used for existing `sf` commands](#generate-a-hook-that-will-be-used-for-existing-sf-commands)
  - [Issues](#issues)
  - [Contributing](#contributing)
    - [CLA](#cla)
    - [Build](#build)
  - [Commands](#commands)
  - [`sf dev generate command`](#sf-dev-generate-command)
  - [`sf dev generate flag`](#sf-dev-generate-flag)
  - [`sf dev generate hook`](#sf-dev-generate-hook)
  - [`sf dev generate library`](#sf-dev-generate-library)
  - [`sf dev generate plugin`](#sf-dev-generate-plugin)
  - [`sf dev hook HOOK`](#sf-dev-hook-hook)

## Install

```bash
sf plugins install @salesforce/plugin-dev@x.y.z
```

## Usage

### Generate a new `sf` plugin

```
sf dev generate plugin
```

This will generate a new `sf` plugin based on our [plugin template](https://github.com/salesforcecli/plugin-template-sf).

### Generate a new `sf` command in your plugin

```
sf dev generate command --name create:awesome:stuff
```

This will generate the following:

- a new `sf` command
- a markdown file that will be used for all your command's message (e.g. command summary, flag descriptions, examples, error messages, etc...)
- a `.nut` test file (See docs for [Non-Unit-Tests](https://github.com/salesforcecli/cli-plugins-testkit#description))
- a unit test file (if the `--unit` flag is provided)

### Generate a hook that will be used for existing `sf` commands

```
sf dev generate hook --event sf:env:list
```

This will generate a `sf` hook that can be used to extend the functionality of an existing `sf` command. For example, if you want a new environment type to be shown in `sf env list`.

## Issues

Please report any issues at https://github.com/forcedotcom/cli/issues

## Contributing

1. Please read our [Code of Conduct](CODE_OF_CONDUCT.md)
2. Create a new issue before starting your project so that we can keep track of
   what you are trying to add/fix. That way, we can also offer suggestions or
   let you know if there is already an effort in progress.
3. Fork this repository.
4. [Build the plugin locally](#build)
5. Create a _topic_ branch in your fork. Note, this step is recommended but technically not required if contributing using a fork.
6. Edit the code in your fork.
7. Write appropriate tests for your changes. Try to achieve at least 95% code coverage on any new code. No pull request will be accepted without unit tests.
8. Sign CLA (see [CLA](#cla) below).
9. Send us a pull request when you are done. We'll review your code, suggest any needed changes, and merge it in.

### CLA

External contributors will be required to sign a Contributor's License
Agreement. You can do so by going to https://cla.salesforce.com/sign-cla.

### Build

To build the plugin locally, make sure to have yarn installed and run the following commands:

```bash
# Clone the repository
git clone git@github.com:salesforcecli/plugin-dev

# Install the dependencies and compile
yarn && yarn build
```

To use your plugin, run using the local `./bin/dev.js` or `./bin/dev.cmd` file.

```bash
# Run using local run file.
./bin/dev hello world
```

There should be no differences when running via the Salesforce CLI or using the local run file. However, it can be useful to link the plugin to do some additional testing or run your commands from anywhere on your machine.

```bash
# Link your plugin to the sf cli
sf plugins link .
# To verify
sf plugins
```

## Commands

<!-- commands -->

- [`sf dev audit messages`](#sf-dev-audit-messages)
- [`sf dev configure repo`](#sf-dev-configure-repo)
- [`sf dev configure secrets`](#sf-dev-configure-secrets)
- [`sf dev convert messages`](#sf-dev-convert-messages)
- [`sf dev convert script`](#sf-dev-convert-script)
- [`sf dev generate command`](#sf-dev-generate-command)
- [`sf dev generate flag`](#sf-dev-generate-flag)
- [`sf dev generate library`](#sf-dev-generate-library)
- [`sf dev generate plugin`](#sf-dev-generate-plugin)

## `sf dev audit messages`

Audit messages in a plugin's messages directory to locate unused messages and missing messages that have references in source code.

```
USAGE
  $ sf dev audit messages [--json] [-p <value>] [-m <value>] [-s <value>]

FLAGS
  -m, --messages-dir=<value>  [default: messages] Directory that contains the plugin's message files.
  -p, --project-dir=<value>   [default: .] Location of the project where messages are to be audited.
  -s, --source-dir=<value>    [default: src] Directory that contains the plugin's source code.

GLOBAL FLAGS
  --json  Format output as json.

EXAMPLES
  Audit messages using default directories:

    $ sf dev audit messages

  Audit messages in the "messages" directory in the current working directory; the plugin's source directory is in
  "src":

    $ sf dev audit messages --messages-dir ./messages --source-dir ./src

FLAG DESCRIPTIONS
  -m, --messages-dir=<value>  Directory that contains the plugin's message files.

    The default is the "messages" directory in the current working directory.

  -s, --source-dir=<value>  Directory that contains the plugin's source code.

    The default is the "src" directory in the current working directory.
```

_See code: [lib/commands/dev/audit/messages.ts](https://github.com/salesforcecli/plugin-dev/blob/2.1.4/lib/commands/dev/audit/messages.ts)_

## `sf dev configure repo`

Configure a GitHub repo for the GitHub Actions pipeline.

```
USAGE
  $ sf dev configure repo -r <value> [--json] [-d] [-b <value>]

FLAGS
  -b, --bot=<value>         [default: SF-CLI-BOT] GitHub login/username for the bot.
  -d, --dry-run             Make no changes.
  -r, --repository=<value>  (required) GitHub owner/repo for which you want to configure GitHub Actions.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Configure a GitHub repo for the GitHub Actions pipeline.

  Sets up labels and exempts the CLI bot for branch protection and PR rules.

EXAMPLES
  Configure the repo "testPackageRelease", with owner "salesforcecli", for GitHub Actions.

    $ sf dev configure repo --repository salesforcecli/testPackageRelease
```

_See code: [lib/commands/dev/configure/repo.ts](https://github.com/salesforcecli/plugin-dev/blob/2.1.4/lib/commands/dev/configure/repo.ts)_

## `sf dev configure secrets`

Ensures a GitHub repo has correct access to secrets based on its workflows.

```
USAGE
  $ sf dev configure secrets -r <value> [--json] [-d]

FLAGS
  -d, --dry-run             Make no changes.
  -r, --repository=<value>  (required) Github owner/repo.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Ensures a GitHub repo has correct access to secrets based on its workflows.

  Inspects a repo's yaml files and verifies that secrets required are available for the repo (either set at the repo
  level or shared via organization-level secrets).

  This command requires scope:admin permissions to inspect the org secrets and admin access to the repo to inspect the
  repo secrets.

EXAMPLES
  Ensure secrets access for the repo "testPackageRelease", with owner "salesforcecli":

  $ sf dev configure secrets --repository salesforcecli/testPackageRelease
```

_See code: [lib/commands/dev/configure/secrets.ts](https://github.com/salesforcecli/plugin-dev/blob/2.1.4/lib/commands/dev/configure/secrets.ts)_

## `sf dev convert messages`

Convert a .json messages file into Markdown.

```
USAGE
  $ sf dev convert messages -f <value> [--json] [-p <value>]

FLAGS
  -f, --file-name=<value>...  (required) Filename to convert.
  -p, --project-dir=<value>   [default: .] Location of the project whose messages are to be converted.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Convert a .json messages file into Markdown.

  Preserves the filename and the original messages file, then creates a new file with the Markdown extension and
  standard headers for the command and flag summaries, descriptions, and so on. After you review the new Markdown file,
  delete the old .json file.

EXAMPLES
  Convert the my-command.json message file into my-command.md with the standard messages headers:

    $ sf dev convert messages --filename my-command.json

  Similar to previous example, but specify the plugin project directory:

  $ sf dev convert messages --project-dir ./path/to/plugin --filename my-command.json
```

_See code: [lib/commands/dev/convert/messages.ts](https://github.com/salesforcecli/plugin-dev/blob/2.1.4/lib/commands/dev/convert/messages.ts)_

## `sf dev convert script`

Convert a script file that contains deprecated sfdx-style commands to use the new sf-style commands instead.

```
USAGE
  $ sf dev convert script -s <value> [--json]

FLAGS
  -s, --script=<value>  (required) Filepath to the script you want to convert.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Convert a script file that contains deprecated sfdx-style commands to use the new sf-style commands instead.

  Important: Use this command only to get started on the sfdx->sf script migration. We don't guarantee that the new
  sf-style command replacements work correctly or as you expect. You must test, and probably update, the new script
  before putting it into production. We also don't guarantee that the JSON results are the same as before.

  This command can convert a large part of your script, but possibly not all. There are some sfdx-style commands that
  don't have an obvious sf-style equivalent. In this case, this command doesn't replace the sfdx-style command but
  instead adds a comment to remind you that you must convert it manually. See the Salesforce CLI Command Reference for
  migration information about each deprecated sfdx-style command:
  https://developer.salesforce.com/docs/atlas.en-us.sfdx_cli_reference.meta/sfdx_cli_reference/cli_reference.htm.

  This command is interactive; as it scans your script, it prompts you when it finds an sfdx-style command or flag and
  asks if you want to convert it to the displayed suggestion. The command doesn't update the script file directly;
  rather, it creates a new file whose name is the original name but with "-converted" appended to it. The script
  replaces all instances of "sfdx" with "sf". For each prompt you answer "y" to, the command replaces the sfdx-style
  names with their equivalent sf-style ones. For example, "sfdx force:apex:execute --targetusername myscratch" is
  replaced with "sf apex run --target-org myscratch".

EXAMPLES
  Convert the YAML file called "myScript.yml" located in the current directory; the new file that contains the
  replacements is called "myScript-converted.yml":

    $ sf dev convert script --script ./myScript.yml
```

_See code: [lib/commands/dev/convert/script.ts](https://github.com/salesforcecli/plugin-dev/blob/2.1.4/lib/commands/dev/convert/script.ts)_

## `sf dev generate command`

Generate a new sf command.

```
USAGE
  $ sf dev generate command -n <value> [--force] [--nuts] [--unit]

FLAGS
  -n, --name=<value>  (required) Name of the new command. Use colons to separate the topic and command names.
      --force         Overwrite existing files.
      --[no-]nuts     Generate a NUT test file for the command.
      --[no-]unit     Generate a unit test file for the command.

DESCRIPTION
  Generate a new sf command.

  You must run this command from within a plugin directory, such as the directory created with the "sf dev generate
  plugin" command.

  The command generates basic source files, messages (\*.md), and test files for your new command.  The Typescript files
  contain import statements for the minimum required Salesforce libraries, and scaffold some basic code. The new type
  names come from the value you passed to the --name flag.

  The command updates the package.json file, so if it detects conflicts with the existing file, you're prompted whether
  you want to overwrite the file. There are a number of package.json updates required for a new command, so we recommend
  you answer "y" so the command takes care of them all. If you answer "n", you must update the package.json file
  manually.

EXAMPLES
  Generate the files for a new "sf my exciting command":

    $ sf dev generate command --name my:exciting:command
```

_See code: [lib/commands/dev/generate/command.ts](https://github.com/salesforcecli/plugin-dev/blob/2.1.4/lib/commands/dev/generate/command.ts)_

## `sf dev generate flag`

Generate a flag for an existing command.

```
USAGE
  $ sf dev generate flag [-d]

FLAGS
  -d, --dry-run  Print new flag code instead of adding it to the command file.

DESCRIPTION
  Generate a flag for an existing command.

  You must run this command from within a plugin directory, such as the directory created with the "sf dev generate
  plugin" command.

  This command is interactive. It first discovers all the commands currently implemented in the plugin, and asks you
  which you want to create a new flag for. It then prompts for other flag properties, such as its long name, optional
  short name, type, whether it's required, and so on. Long flag names must be kebab-case and not camelCase. The command
  doesn't let you use an existing long or short flag name. When the command completes, the Typescript file for the
  command is updated with the code for the new flag.

  Use the --dry-run flag to review new code for the command file without actually udpating it.

EXAMPLES
  Generate a new flag and update the command file:

    $ sf dev generate flag

  Don't actually update the command file, just view the generated code:

    $ sf dev generate flag --dry-run
```

_See code: [lib/commands/dev/generate/flag.ts](https://github.com/salesforcecli/plugin-dev/blob/2.1.4/lib/commands/dev/generate/flag.ts)_

## `sf dev generate library`

Generate a new library.

```
USAGE
  $ sf dev generate library

DESCRIPTION
  Generate a new library.

  This command is interactive. You're prompted for information to populate the new library, such as the npm scope (which
  must start with "@"), the name and description of the library, and its GitHub organization. The command clones the
  'forcedotcom/library-template' GitHub repository, installs the library's npm package dependencies using yarn install,
  and updates the package properties.

  When the command completes, your new library contains a few sample source and test files to get you started.

EXAMPLES
  $ sf dev generate library
```

_See code: [lib/commands/dev/generate/library.ts](https://github.com/salesforcecli/plugin-dev/blob/2.1.4/lib/commands/dev/generate/library.ts)_

## `sf dev generate plugin`

Generate a new sf plugin.

```
USAGE
  $ sf dev generate plugin

DESCRIPTION
  Generate a new sf plugin.

  This command is interactive. You're prompted for information to populate your new plugin, such as its name,
  description, author, and percentage of code coverage you want. The command clones the
  'salesforcecli/plugin-template-sf' GitHub repository, installs the plug-in's npm package dependencies using yarn
  install, and updates the package properties.

  When the command completes, your new plugin contains the source, message, and test files for a sample "sf hello world"
  command.

ALIASES
  $ sf plugins generate

EXAMPLES
  $ sf dev generate plugin
```

_See code: [lib/commands/dev/generate/plugin.ts](https://github.com/salesforcecli/plugin-dev/blob/2.1.4/lib/commands/dev/generate/plugin.ts)_

<!-- commandsstop -->
