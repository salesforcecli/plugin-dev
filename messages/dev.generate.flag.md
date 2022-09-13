# summary

Summary of a command.

# description

Description of a command.

# flags.dry-run.summary

Print new flag instead of adding it to the command file.

# examples

- <%= config.bin %> <%= command.id %>

# error.InvalidDir

This command can only be run inside a plugin directory.

# question.SelectCommand

Select a command to add a flag to

# question.FlagType

What type of flag is this?

# question.FlagName

What is the name of the flag?

# error.KebabCase

Flag name must be in kebab case (example: my-flag).

# error.FlagExists

The %s flag already exists.

# error.FlagNameRequired

You must provide a flag name.

# question.FlagSummary

What is the summary of the flag?

# default.FlagSummary

Summary for %s.

# error.InvalidSummary

All summaries must start with a capital and end with a period.

# question.FlagShortChar

Flag short character? (optional)

# error.FlagShortCharExists

The %s character is already used by the %s flag.

# error.InvalidFlagShortChar

Flag short character must be a letter.

# error.InvalidFlagShortCharLength

Must be a single character.

# error.InvalidInteger

Must be an integer.

# error.IntegerMaxLessThanMin

Maximum must be greater than minimum.

# error.InvalidDefaultInteger

Default integer must be between the specified minimum and maximum.

# question.RequiredFlag

Is this flag required?

# question.AllowMultiple

Can this flag be specified multiple times?

# question.Duration.Unit

What unit should be used for duration?

# question.Duration.DefaultValue

Default value for this duration? (optional)

# question.Duration.Minimum

Minimum required value for duration flag? (optional)

# question.Duration.Maximum

Maximum required value for duration flag? (optional)

# question.SalesforceId.Length

Required length for salesforceId?

# question.SalesforceId.StartsWith

Required 3 character prefix for salesforceId? (optional)

# error.InvalidSalesforceIdPrefix

Must be 3 characters.

# question.FileDir.Exists

Does this flag require the file or directory to exist?

# question.Integer.Minimum

Minimum required value for integer flag? (optional)

# question.Integer.Maximum

Maximum required value for integer flag? (optional)

# question.Integer.Default

Default value for integer flag? (required if setting min and/or max)
