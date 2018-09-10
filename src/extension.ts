'use strict';
import { window, ExtensionContext, commands, TextDocument, TextEditor, OpenDialogOptions, QuickPickOptions } from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { isString } from 'util';

export function activate(context: ExtensionContext) {
    let disposable = commands.registerCommand('extension.pullFile', () => {
        // Pull content from a file into the active file.
        let editor = window.activeTextEditor;
        // Verify the active TextEditor is not undefined.
        if (isTextEditor(editor)) {
            let pullFile = new PullFile(editor);

            pullFile.ShowQuickPick().then((selection: string | undefined) => {
                if (isString(selection)) {
                    pullFile.Pull();
                }
            });

            pullFile.Pull();
        }
    });

    context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {
}

/**
 * Pull the contents of a file into the active file.
 */
class PullFile {
    _activeDocument: TextDocument;
    _extension: string;

    /**
     * Get the active TextDocument and its file extension from the active TextEditor.
     * @param editor The active TextEditor
     */
    constructor(editor: TextEditor) {
        this._activeDocument = editor.document;
        this._extension = path.extname(this._activeDocument.fileName).replace('.', '');
    }

    /**
     * Show a QuickPick with the files in the current directory.
     * @returns The thenable of the show quick pick.
     */
    ShowQuickPick(): Thenable<string | undefined> {
        // Get the files in the current directory.
        let filesInCurrentDirectory: string[] = fs.readdirSync(this._activeDocument.fileName);
        
        const quickPickOptions: QuickPickOptions = {
            canPickMany: false,
            placeHolder: "Select a file to pull..."
        };

        return window.showQuickPick(filesInCurrentDirectory, quickPickOptions);
    }

    /**
     * Pull the contents of a file into the active file.
     */
    Pull() {
        const options = this.GetOptions();
    
        // Let the user pick a file with the OS file open dialog.
        window.showOpenDialog(options).then(fileUri => {
            // Once the dialog has been closed, make sure there is a file picked.
            if (fileUri && fileUri[0]) {
                // If the file is dirty, then save it before overwriting so the editor shows the change.
                if (this._activeDocument.isDirty) {
                    this._activeDocument.save().then(() => {
                        // Copy the selected file to the currently opened file and overwrite it.
                        fs.copyFileSync(fileUri[0].fsPath, this._activeDocument.fileName);
                    });
                }
                else { // If the file isn't dirty then we can just overwrite and the editor will show the change.
                    // Copy the selected file to the currently opened file and overwrite it.
                    fs.copyFileSync(fileUri[0].fsPath, this._activeDocument.fileName);
                }
            }
        });
    }

    /**
     * Get the OpenDialogOptions for the OpenDialog.
     */
    private GetOptions(): OpenDialogOptions {
        // Set the options for the OpenDialog.
        const options: OpenDialogOptions = {
            canSelectMany: false,
            openLabel: "Pull File",
            filters: {
                "All Files": ["*"]
            }
        };
    
        // Add a filter for the current file type if the extension can be found.
        if (this._extension !== "") {
            options.filters = {
                "Current File Type": [this._extension],
                "All Files": ["*"]
            };
        }

        return options;
    }
}

/**
 * Type guard to verify editor is a TextEditor.
 * @param editor The editor to type guard.
 */
function isTextEditor(editor: any): editor is TextEditor {
    return editor !== undefined && (<TextEditor>editor).document !== undefined;
}