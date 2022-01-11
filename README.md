# plugin-dev

[![NPM](https://img.shields.io/npm/v/@salesforce/plugin-dev.svg?label=@salesforce/plugin-dev)](https://www.npmjs.com/package/@salesforce/plugin-dev) [![CircleCI](https://circleci.com/gh/salesforcecli/plugin-dev/tree/main.svg?style=shield)](https://circleci.com/gh/salesforcecli/plugin-dev/tree/main) [![Downloads/week](https://img.shields.io/npm/dw/@salesforce/plugin-dev.svg)](https://npmjs.org/package/@salesforce/plugin-dev) [![License](https://img.shields.io/badge/License-BSD%203--Clause-brightgreen.svg)](https://raw.githubusercontent.com/salesforcecli/plugin-dev/main/LICENSE.txt)

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

To use your plugin, run using the local `./bin/dev` or `./bin/dev.cmd` file.

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

- [`sf dev generate command`](#sf-dev-generate-command)
- [`sf dev generate hook`](#sf-dev-generate-hook)
- [`sf dev generate plugin`](#sf-dev-generate-plugin)
- [`sf dev hook HOOK`](#sf-dev-hook-hook)

## `sf dev generate command`

Generate a new sf command.

```
USAGE
  $ sf dev generate command --name <value> [--force] [--nuts] [--unit]

FLAGS
  --force         Overwrite existing files.
  --name=<value>  (required) Name of the new command. Must be separated by colons.
  --[no-]nuts     Generate a NUT test file for the command.
  --[no-]unit     Generate a unit test file for the command.

DESCRIPTION
  Generate a new sf command.

  This will generate a basic hello world command, a .md file for messages, and test files.

EXAMPLES
  $ sf dev generate command --name my:command
```

## `sf dev generate hook`

Generate a new sf hook.

```
USAGE
  $ sf dev generate hook --event sf:env:list|sf:env:display|sf:deploy|sf:logout [--force]

FLAGS
  --event=<option>  (required) Event to run hook on.
                    <options: sf:env:list|sf:env:display|sf:deploy|sf:logout>
  --force           Overwrite existing files.

DESCRIPTION
  Generate a new sf hook.

  This will generate a basic hook, add the hook to the package.json, and a generate a test file.

EXAMPLES
  $ sf dev generate hook --event sf:env:display
```

## `sf dev generate plugin`

Generate a new sf plugin.

```
USAGE
  $ sf dev generate plugin

DESCRIPTION
  Generate a new sf plugin.

  This will clone the template repo 'salesforcecli/plugin-template-sf' and update package properties

EXAMPLES
  $ sf dev generate plugin
```

## `sf dev hook HOOK`

Run a hook. For testing purposes only.

```
USAGE
  $ sf dev hook [HOOK] [--json] [-p <value>]

ARGUMENTS
  HOOK  Name of hook to execute.

FLAGS
  -p, --plugin=<value>  Specific plugin from which to execute hook

GLOBAL FLAGS
  --json  Format output as json.

EXAMPLES
  Execute a hook by name:

    $ sf dev hook sf:env:list

  Execute a hook by name in a specific plugin:

    $ sf dev hook sf:env:list --plugin env
```

<!-- commandsstop -->
