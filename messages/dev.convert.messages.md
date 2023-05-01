# summary

Convert a .json messages file into Markdown.

# description

Preserves the filename and the original messages file, then creates a new file with the Markdown extension and standard headers for the command and flag summaries, descriptions, and so on. After you review the new Markdown file, delete the old .json file.

# flags.filename.summary

Filename to convert.

# flags.project-dir.summary

Location of the project whose messages are to be converted.

# examples

- Convert the my-command.json message file into my-command.md with the standard messages headers:

  <%= config.bin %> <%= command.id %> --filename my-command.json

- Similar to previous example, but specify the plugin project directory:

- <%= config.bin %> <%= command.id %> --project-dir ./path/to/plugin --filename my-command.json
