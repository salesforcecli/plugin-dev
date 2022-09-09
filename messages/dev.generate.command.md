# summary

Generate a new sf command.

# description

This will generate a basic hello world command, a .md file for messages, and test files.

# flags.force.summary

Overwrite existing files.

# flags.nuts.summary

Generate a NUT test file for the command.

# flags.unit.summary

Generate a unit test file for the command.

# flags.name.summary

Name of the new command. Must be separated by colons.

# examples

- <%= config.bin %> <%= command.id %> --name my:command

# errors.InvalidDir

This command can only be run inside a plugin directory.
