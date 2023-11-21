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

## `sf dev generate command`

Generate a new sf command.

```
USAGE
  $ sf dev generate command -n <value> [--force] [--nuts] [--unit]

FLAGS
  -n, --name=<value>  (required) Name of the new command. Use colons to separate the topic and command names.
  --force             Overwrite existing files.
  --[no-]nuts         Generate a NUT test file for the command.
  --[no-]unit         Generate a unit test file for the command.

DESCRIPTION
  Generate a new sf command.

  You must run this command from within a plugin directory, such as the directory created with the "sf generate plugin"
  command.

  The command updates the package.json file, so if it detects conflicts with the existing file, you're prompted whether
  you want to overwrite the file. There are a number of package.json updates required for a new command, so we recommend
  you answer "y" so the command takes care of them all. If you answer "n", you must update the package.json file
  manually.

  The command generates basic source, messages (\*.md), and test files for your command.  The Typescript files contain
  import statements for the minimum required Salesforce libraries, and scaffold some basic code. The new type names come
  from the value you passed to the --name flag.

EXAMPLES
  Generate the files for a new "sf my exciting command":

    $ sf dev generate command --name my:exciting:command
```

## `sf dev generate flag`

Summary of a command.

```
USAGE
  $ sf dev generate flag [-d]

FLAGS
  -d, --dry-run  Print new flag instead of adding it to the command file.

DESCRIPTION
  Summary of a command.

  Description of a command.

EXAMPLES
  $ sf dev generate flag
```

## `sf dev generate hook`

Generate a new sf hook.

```
USAGE
  $ sf dev generate hook --event sf:env:list|sf:env:display|sf:deploy|sf:logout [--force]

FLAGS
  --event=<option>  (required) Event to run hook on. Use colons to separate topic and command names of the event.
                    <options: sf:env:list|sf:env:display|sf:deploy|sf:logout>
  --force           Overwrite existing files.

DESCRIPTION
  Generate a new sf hook.

  You must run this command from within a plugin directory, such as the directory created with the "sf generate plugin"
  command.

  The command updates the package.json file, so if it detects conflicts with the existing file, you're prompted whether
  you want to overwrite the file. There are a number of package.json updates required for a new hook, so we recommend
  you answer "y" so the command takes care of them all. If you answer "n", you must update the package.json file
  manually.

  The command generates a basic Typescript source file in the "src/hooks" directory to get you started. The source
  file's name is based on the event you're hooking into, such as envList.ts for the "sf env list" command.

EXAMPLES
  Generate source file for a hook into the "sf env display" command:

    $ sf dev generate hook --event sf:env:display
```

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
