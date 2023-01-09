# summary

Convert a .json messages file

# description

Converts a .json messages file to markdown. Preserves the filename and the original messages file, creating a new file with the markdown extensions. Once you review the file, delete it

# flags.filename.summary

Filename to convert

# flags.project-dir.summary

Location of the project whose messages are to be audited.

# flags.project-dir.description

The project directory.

# examples

- <%= config.bin %> <%= command.id %> --filename something.json
- <%= config.bin %> <%= command.id %> --project-dir ./path/to/plugin --filename something.json
