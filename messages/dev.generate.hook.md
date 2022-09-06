# summary

Generate a new sf hook.

# description

You must run this command from within a plugin directory, such as the directory created with the "sf generate plugin" command.

The command updates the package.json file, so if it detects conflicts with the existing file, you're prompted whether you want to overwrite the file. There are a number of package.json updates required for a new hook, so we recommend you answer "y" so the command takes care of them all. If you answer "n", you must update the package.json file manually.

The command generates a basic Typescript source file in the "src/hooks" directory to get you started. The source file's name is based on the event you're hooking into, such as envList.ts for the "sf env list" command.

# flags.force.summary

Overwrite existing files.

# flags.event.summary

Event to run hook on. Use colons to separate topic and command names of the event.

# examples

- Generate source file for a hook into the "sf env display" command:

  <%= config.bin %> <%= command.id %> --event sf:env:display

# errors.InvalidDir

This command must be run inside a plugin directory.
