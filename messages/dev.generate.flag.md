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

a unit and quantity of time (example: X minutes, 4 days). You can specify min/max/default.

# flagDescriptions.option

a choice from a defined list of string options. You can set the allowed values.

# flagDescriptions.integer

an integer with built-in validation of optional min/max/default values.

# flagDescriptions.custom

a flag with a custom typescript type. You'll need to add some code after the scaffolding is complete.

# flagDescriptions.salesforceId

a valid salesforce record ID. You can specify the 3-character prefix and/or the length of the ID.

# flagDescriptions.file

a local file path. You can specify whether the file must exist.

# flagDescriptions.directory

a local directory path. You can specify whether the file must exist.

# flagDescriptions.orgApiVersion

a valid salesforce API version number. The code checks for minimal non-retired values.

# flagDescriptions.requiredOrg

a Salesforce org, entered by username/alias and aware of default org.

# flagDescriptions.optionalOrg

a Salesforce org, entered by username/alias and aware of default org.

# flagDescriptions.requiredHub

a Salesforce org, entered by username/alias and aware of default dev hub. Must be a dev hub.

# flagDescriptions.optionalHub

a Salesforce org, entered by username/alias and aware of default dev hub. Must be a dev hub.

# flagDescriptions.url

Validates that input matches URL spec. Returns the NodeJS Url class for simplified parsing.

# flagDescriptions.string

Any valid string

# flagDescriptions.boolean

Take no value, has value of `true` if provided and `false` otherwise
