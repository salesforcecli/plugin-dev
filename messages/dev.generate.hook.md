# summary

Generate a new sf hook.

# description

This will generate a basic hook, add the hook to the package.json, and a generate a test file.

# flags.force.description

Overwrite existing files.

# flags.event.description

Event to run hook on.

# examples

- <%= config.bin %> <%= command.id %> --event sf:env:display

# errors.InvalidDir

This command can only be run inside a plugin directory.
