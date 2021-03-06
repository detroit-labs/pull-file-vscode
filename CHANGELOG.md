# Change Log

## [Unreleased]
Pull files from subdirectories.

## [1.3.2]
Sort files in folder alphanumerically.

## [1.3.1]
Fix issue with only searching root workspace folders for files to pull.

## [1.3.0]
Remove all fs code for reading and copying files in favor of the vscode api.
Clean up async code for readability.
Update repo link to new github repo.
Update major versions of dev dependencies.
Update tslint rules to extend the recommended rules.

## [1.2.2]
Change lets to consts where proper.
Update command to appear in command palette when the editor is json.
Downgrade event-stream to version 3.3.4 due to a security vulnerability.

## [1.2.1]
Dispose status bar item using context subscriptions.
Update changelog with missing release notes.

## [1.2.0]
Only show files of the same extension in the quickpick.
Only show the Pull File command when an editor is open.
Add settings to enable/disable the quickpick and open dialog.
Add a status bar button to activate Pull File.
Add a setting to enable/disable the status bar button.

## [1.1.0]

Added support for a quickpick with all the files in the current directory.
Changed the open dialog to be an option on the newly added quickpick.
The open dialog now defaults to the current directory.

## [1.0.2]

Update package.json with homepage and keywords attributes.

## [1.0.1]

Change Open File Dialog open label from Pull Content to Pull File.

## [1.0.0]

Initial release of Pull File.