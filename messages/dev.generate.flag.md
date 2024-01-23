# summary

Generate a flag for an existing command.

# description

You must run this command from within a plugin directory, such as the directory created with the "sf dev generate plugin" command.

This command is interactive. It first discovers all the commands currently implemented in the plugin, and asks you which you want to create a new flag for. It then prompts for other flag properties, such as its long name, optional short name, type, whether it's required, and so on. Long flag names must be kebab-case and not camelCase. The command doesn't let you use an existing long or short flag name. When the command completes, the Typescript file for the command is updated with the code for the new flag.

Use the --dry-run flag to review new code for the command file without actually updating it.

# flags.dry-run.summary

Print new flag code instead of adding it to the command file.

# examples

- Generate a new flag and update the command file:

  <%= config.bin %> <%= command.id %>

- Don't actually update the command file, just view the generated code:

  <%= config.bin %> <%= command.id %> --dry-run

# error.InvalidDir

This command must be run inside a plugin directory.

# question.SelectCommand

Select the command you want to add a flag to:

# question.FlagType

Select the type of the new flag:

# question.FlagName

Enter the new flag's name:

# error.KebabCase

Flag name must be in kebab case (example: my-flag).

# error.FlagExists

The %s flag already exists.

# error.FlagNameRequired

You must provide a flag name.

# question.FlagSummary

Enter a short description (summary) of the flag:

# default.FlagSummary

Summary for %s.

# error.InvalidSummary

All summaries must start with a capital letter and end with a period.

# question.FlagShortChar

Enter the flag's single-character short name (optional):

# error.FlagShortCharExists

The %s character is already used by the %s flag.

# error.InvalidFlagShortChar

Flag single-character short name must be a letter.

# error.InvalidFlagShortCharLength

Must be a single character.

# error.InvalidInteger

Must be an integer.

# error.IntegerMaxLessThanMin

Maximum must be greater than minimum.

# error.RequiredIntegerDefault

An integer flag requires a default when it has a min and/or max value.

# error.InvalidDefaultInteger

Default integer must be between the specified minimum and maximum.

# question.RequiredFlag

Is this flag required?

# question.AllowMultiple

Can this flag be specified multiple times?

# question.Duration.Unit

Select the duration unit:

# question.Duration.DefaultValue

Enter the duration default value (optional):

# question.Duration.Minimum

Enter the duration minimum value (optional):

# question.Duration.Maximum

Enter the duration maximum value (optional):

# question.SalesforceId.Length

Select the salesforceId length:

# question.SalesforceId.StartsWith

Enter the 3-character salesforceId prefix (optional):

# error.InvalidSalesforceIdPrefix

Must be 3 characters.

# question.FileDir.Exists

Does this flag require the file or directory to exist?

# question.Integer.Minimum

Enter the minimum integer value (optional):

# question.Integer.Maximum

Enter the maximum integer value (optional):

# question.Integer.Default

Enter the default integer value (required if setting a minimum or maximum):

# question.Options

Enter an option, or hit enter if you are done entering options

# question.UseStandard

Do you want to use the standard definition (character, summary, description, default) for this flag type

# flagDescriptions.duration

A unit and quantity of time, such as "10 minutes" or "4 days". You can optionally specify the minimum, maximum, or default values to take advantage of the built-in CLI validation rules.

# flagDescriptions.option

Value is a choice out of a pre-defined list of string values. You will then be asked for the list of allowed values.

# flagDescriptions.integer 

An integer. You can optionally specify the minimum, maximum, or default values to take advantage of the built-in CLI validation rules.

# flagDescriptions.custom

Flag with a custom typescript type. You must add some code after the scaffolding is complete.

# flagDescriptions.salesforceId 

A valid Salesforce record ID. You can specify the 3-character prefix and the length of the ID.

# flagDescriptions.file

A local file. You can specify whether the file must already exist.

# flagDescriptions.directory

A local directory path. You can specify whether the directory must already exist.

# flagDescriptions.orgApiVersion

A valid Salesforce API version number. The code checks for minimal non-retired values. You can optionally use the standard CLI API version flag ("--api-version").

# flagDescriptions.requiredOrg

A required Salesforce org, which a user specifies with either a Salesforce username or an alias. You can optionally mimic the standard CLI target org flag ("--target-org").  Flag respects the user's default org if it's set. 

# flagDescriptions.optionalOrg

An optional Salesforce org, which a user specifies with either a Salesforce username or an alias. You can optionally use the standard CLI target org flag ("--target-org"). Flag respects the user's default org if it's set. 

# flagDescriptions.requiredHub

A required Salesforce Dev Hub org, which a user specifies with either a Salesforce username or an alias. You can optionally use the standard CLI target Dev Hub flag ("--target-dev-hub"). Flag respects the user's default Dev Hub org if it's set.

# flagDescriptions.optionalHub

An optional Salesforce Dev Hub org, which a user specifies with either a Salesforce username or an alias. You can optionally use the standard CLI target Dev Hub flag ("--target-dev-hub"). Flag respects the user's default Dev Hub org if it's set.

# flagDescriptions.url

A valid URL. The code checks that the input matches the official W3C URL specification. Returns the NodeJS Url class for simplified parsing.

# flagDescriptions.string

Any valid string.

# flagDescriptions.boolean

Value is either `true` (if the user specifies it when executing the command) or `false` (user doesn't specify it.)
