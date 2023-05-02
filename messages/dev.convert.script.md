# summary

Convert your existing sfdx scripts to use sf executable and new commands

# description

Convert your existing sfdx scripts

# flags.script.summary

The filepath to your script

# flags.no-prompt.summary

Don't prompt for replacements

# examples

- <%= config.bin %> <%= command.id %> convert script --script myScript.yml

# warnBreakingChange

This script will replace sfdx commands for sf commands. It does not guarantee breaking changes, or changed json results.

# warnSfdxToSf

As an additional reminder, the sfdx commands will be available in sf and can be migrated by simpling changing 'sfdx' to 'sf'.

# warnSfV2

This script assumes you've uninstalled `sf v1` and `sfdx` and are ready to use `sf v2` 

# continue

Do you want to continue?

# cannotDetermine

Cannot determine appropriate replacement for %s 

# success

A converted file has been written to %s

# errorComment

\# ERROR converting this line, human intervention required

