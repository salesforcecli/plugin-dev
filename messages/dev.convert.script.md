# summary

Convert a script file that contains deprecated sfdx-style commands to use the new sf-style commands instead. 

# description

Important: Use this command only to get started on the sfdx->sf script migration. We don't guarantee that the new sf-style command replacements work correctly or as you expect. You must test, and probably update, the new script before putting it into production. We also don't guarantee that the JSON results are the same as before. 

This command can convert a large part of your script, but possibly not all. There are some sfdx-style commands that don't have an obvious sf-style equivalent. In this case, this command doesn't replace the sfdx-style command but instead adds a comment to remind you that you must convert it manually. See the Salesforce CLI Command Reference for migration information about each deprecated sfdx-style command: https://developer.salesforce.com/docs/atlas.en-us.sfdx_cli_reference.meta/sfdx_cli_reference/cli_reference.htm.

This command is interactive; as it scans your script, it prompts you when it finds an sfdx-style command or flag and asks if you want to convert it to the displayed suggestion. The command doesn't update the script file directly; rather, it creates a new file whose name is the original name but with "-converted" appended to it. The script replaces all instances of "sfdx" with "sf". For each prompt you answer "y" to, the command replaces the sfdx-style names with their equivalent sf-style ones. For example, "sfdx force:apex:execute --targetusername myscratch" is replaced with "sf apex run --target-org myscratch".  

# flags.script.summary

Filepath to the script you want to convert.

# flags.no-prompt.summary

Don't prompt for suggested replacements.

# examples

- Convert the YAML file called "myScript.yml" located in the current directory; the new file that contains the replacements is called "myScript-converted.yml":

  <%= config.bin %> <%= command.id %> --script ./myScript.yml

# warnBreakingChange

This command creates a new script file in which sfdx-style commands are replaced with sf-style ones. We don't guarantee that the replacements work correctly or as you expect, and the JSON results can differ from the old commands. 

# warnSfdxToSf

Remember that the sfdx-style commands are still available, although they're deprecated. Migrate your commands to the new sf-style so you don't get the deprecation warnings anymore and to get command updates.

# warnSfV2

This script assumes you've uninstalled `sf v1` and `sfdx` and are ready to use `sf v2`.

# continue

Do you want to continue?

# replaceCommand

Replace command "%s" with "%s":

# replaceFlag

Replace flag "%s" with "%s":

# cannotDetermine

Can't determine the appropriate replacement for %s.

# success

A converted file has been written to %s.

# errorComment

ERROR: Unable to convert this command; you must convert it manually. 
