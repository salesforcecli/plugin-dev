# summary

Generate a new library.

# description

This command is interactive. You're prompted for information to populate the new library, such as the npm scope (which must start with "@"), the name and description of the library, and its GitHub organization. The command clones the 'forcedotcom/library-template' GitHub repository, installs the library's npm package dependencies using yarn install, and updates the package properties.

When the command completes, your new library contains a few sample source and test files to get you started.

# examples

- <%= config.bin %> <%= command.id %>
