# summary

Generate a new sf command.

# description

You must run this command from within a plugin directory, such as the directory created with the "sf generate plugin" command.

The command updates the package.json file, so if it detects conflicts with the existing file, you're prompted whether you want to overwrite the file. There are a number of package.json updates required for a new command, so we recommend you answer "y" so the command takes care of them all. If you answer "n", you must update the package.json file manually.

The command generates basic source, messages (\*.md), and test files for your command.  The Typescript files contain import statements for the minimum required Salesforce libraries, and scaffold some basic code. The new type names come from the value you passed to the --name flag.

# flags.force.summary

Overwrite existing files.

# flags.nuts.summary

Generate a NUT test file for the command.

# flags.unit.summary

Generate a unit test file for the command.

# flags.name.summary

Name of the new command. Use colons to separate the topic and command names.

# examples

- Generate the files for a new "sf my exciting command":

  <%= config.bin %> <%= command.id %> --name my:exciting:command

# errors.InvalidDir

This command must be run inside a plugin directory.
