# summary

Audit messages in a plugin's messages directory to locate unused messages and missing messages that have references in source code.

# examples

- Audit messages using default directories:

  <%= config.bin %> <%= command.id %>

- Audit messages in the "messages" directory in the current working directory; the plugin's source directory is in "src":

  <%= config.bin %> <%= command.id %> --messages-dir ./messages --source-dir ./src

# flags.project-dir.summary

Location of the project where messages are to be audited.

# flags.messages-dir.summary

Directory that contains the plugin's message files. 

# flags.messages-dir.description

The default is the "messages" directory in the current working directory.

# flags.source-dir.summary

Directory that contains the plugin's source code.

# flags.source-dir.description

The default is the "src" directory in the current working directory.

# noUnusedMessagesFound

No unused messages found

# unusedMessagesFound

Unused messages found

# noMissingMessagesFound

No missing messages found

# missingMessagesExplanation

The following entries are message references that do not have corresponding message definitions.

# missingMessagesNonLiteralWarning

An asterisk (*) indicates that the message reference is either a variable or function.
This means that the message reference is not a literal string and cannot be audited.
The section 'Unused Messages' may include messages that are referenced by variables or functions.
Accessing a message by a variable or function can also cause entire message bundles to be flagged as unused.
Check the references manually to determine which messages are consumed by variables or functions.

# missingMessagesFound

Missing messages found

# unusedBundlesFound

Unused bundles found

# noUnusedBundlesFound

No unused bundles found

# duplicateBundles

Duplicate message bundles found in directory %s

# duplicateBundles.actions

Check the messages directory for duplicate message bundles.

# noMissingBundlesFound

No missing bundles found

# missingBundlesFound

Missing bundles found
