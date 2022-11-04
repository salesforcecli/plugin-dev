# summary

Audit messages in a plugin's messages directory to locate unused messages and missing messages that have references in source code.

# description

Audit messages in a plugin's messages directory to locate unused messages and missing messages that have references in source code.

# examples

sf dev audit messages
sf dev audit messages --json
sf dev audit messages --messages-dir ./messages --source-dir ./src

# flags.project-dir.summary

Location project where messages are to be audited.

# flags.project-dir.description

The project directory.

# flags.messages-dir.summary

Location of the message bundle directory.

# flags.messages-dir.description

The directory that holds the message bundle files. The default is the messages directory in the current working directory.

# flags.source-dir.summary

Location of the plugin's source code.

# flags.source-dir.description

The directory that holds the plugin's source code. The default is the src directory in the current working directory.

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
