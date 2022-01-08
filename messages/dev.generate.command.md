# summary

Generate a new sf command.

# description

This will generate a basic hello world command, a .md file for messages, and test files.

# flags.force.description

Overwrite existing files.

# flags.nuts.description

Generate a NUT test file for the command.

# flags.unit.description

Generate a unit test file for the command.

# flags.name.description

Name of the new command. Must be separated by colons.

# examples

- <%= config.bin %> <%= command.id %> --name my:command
