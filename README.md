# pull-file README

Pull File is a VS Code extension that is used to overwrite the current file with a selected file.

## Features

Using the command Pull File, you can select a file to overwrite the current file with.

When opening the Open File Dialog, Pull File will add an extension filter for the current file extension.

If the currently opened editor has changes that are unsaved then Pull File will save them just before overwriting, so VS Code will reflect the external changes.

## Requirements

Pull File does not have any additional requirements beyond VS Code.

## Extension Settings

No settings are added by Pull File.

## Known Issues

When selecting a file with a different extension than the current one, Pull File saves the selected file with the current file's extension.

## Release Notes

### 1.0.0

Initial release of Pull File

### 1.0.1

Change Open File Dialog open label from Pull Content to Pull File.

### 1.0.2

Update package.json with homepage and keywords attributes