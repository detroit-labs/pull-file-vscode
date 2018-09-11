'use strict';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export function activate(context: vscode.ExtensionContext) {
    let settings = vscode.workspace.getConfiguration('pullfile');

    let disposable = vscode.commands.registerTextEditorCommand('extension.pullFile', (editor) => {
        // Pull content from a file into the active file.
        let pullFile = new PullFile(editor, settings);
        pullFile.Pull();
    });

    if (settings.get("useStatusBarButton", true)) {
        let pullFileStatusBarButton: vscode.StatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
        pullFileStatusBarButton.command = 'extension.pullFile';
        pullFileStatusBarButton.text = "Pull File";
        pullFileStatusBarButton.tooltip = "Overwrite the current file with a selected file.";
        pullFileStatusBarButton.show();
    }

    context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {
}

/**
 * Pull the contents of a file into the active file.
 */
class PullFile {
    private _activeDocument: vscode.TextDocument;
    private _extension: string;
    private _currentDirectory: string;
    private _useOpenDialogText: string = "Use Open Dialog...";
    private _useQuickPick: boolean;
    private _includeOpenDialogOptionInQuickPick: boolean;

    /**
     * Get the active TextDocument and its file extension from the active TextEditor.
     * @param editor The active TextEditor
     */
    constructor(editor: vscode.TextEditor, settings: vscode.WorkspaceConfiguration) {
        this._activeDocument = editor.document;
        this._extension = path.extname(this._activeDocument.fileName);
        this._currentDirectory = path.dirname(this._activeDocument.fileName);

        this._useQuickPick = settings.get("useQuickPick", true);
        this._includeOpenDialogOptionInQuickPick = settings.get("includeOpenDialogOptionInQuickPick", true);
    }

    /**
     * Pull the contents of a file into the active file.
     */
    public Pull(): void {
        // Select a file.
        this.SelectFile().then((fileToPull) => {
            // If a file was selected, copy that file to the current file.
            if (fileToPull) {
                this.CopyFile(fileToPull);
            }
        });
    }

    /**
     * Select the file to pull using a quickpick or the open dialog.
     * @returns A promise that resolves to the selected file or undefined.
     */
    private SelectFile(): Thenable<string | undefined> {
        // Create a Promise to for the selected file.
        const promise: Promise<string | undefined> = new Promise((resolve) => {
            // Show a QuickPick for file selection first.
            if (this._useQuickPick) {
                this.SelectFileWithQuickPick(resolve);
            }
            else {
                this.SelectFileWithOpenDialog(resolve);
            }
            
        });
        
        return promise;
    }

    private SelectFileWithQuickPick(resolve: Function): void {
        // Create a Promise to for the selected file.
        this.ShowQuickPick().then((selection) => {
            // If there was a selection made then see if it was to use the open dialog.
            if (selection) {
                // If a file was not selected in the QuickPick, show an OpenDialog for file selection.
                if (this._includeOpenDialogOptionInQuickPick && selection === this._useOpenDialogText) {
                    this.SelectFileWithOpenDialog(resolve);
                }
                else {
                    // If there is a file selection, append it to the current directory path then resolve the promise to it.
                    let selectedFile: string = path.join(this._currentDirectory, selection);
                    resolve(selectedFile);
                }
            }
        });
    }

    private SelectFileWithOpenDialog(resolve: Function): void {
        this.ShowOpenDialog().then((fileUri) => {
            // If there is a selection, resolve the promise to it.
            if (fileUri && fileUri[0]) {
                resolve(fileUri[0].fsPath);
            }
        });
    }

    /**
     * Show a QuickPick with the files in the current directory.
     * @returns The thenable of the show quick pick.
     */
    private ShowQuickPick(): Thenable<string | undefined> {
        let filesToShow = this.GetFilesToShowInQuickPick();
        
        const quickPickOptions: vscode.QuickPickOptions = {
            canPickMany: false,
            placeHolder: "Select a file to pull..."
        };

        return vscode.window.showQuickPick(filesToShow, quickPickOptions);
    }

    /**
     * Get an array of the files to show in the quickpick.
     */
    private GetFilesToShowInQuickPick(): string[] {
        // Get the files in the current directory.
        let filesInCurrentDirectory: string[] = fs.readdirSync(this._currentDirectory);

        // Create an array to hold the filtered items to show.
        let filesToShow: string[] = [];
        let currentIndex = 0;

        if (this._includeOpenDialogOptionInQuickPick) {
            // Add an option to use the open dialog as the first option.
            filesToShow[0] = this._useOpenDialogText;
            currentIndex++;
        }

        // Remove the current file from the list.
        filesInCurrentDirectory.forEach((value) => {
            if (value !== path.basename(this._activeDocument.fileName) && path.extname(value) === this._extension) {
                // Add the file to the array of files to show.
                filesToShow[currentIndex] = value;
                currentIndex++;
            }
        });

        return filesToShow;
    }

    /**
     * Show an OpenDialog with the options from GetOptions.
     * @returns The thenable of the show open dialog.
     */
    private ShowOpenDialog(): Thenable<vscode.Uri[] | undefined> {
        const options = this.GetOptions();
    
        // Let the user pick a file with the OS file open dialog.
        return vscode.window.showOpenDialog(options);
    }

    /**
     * Copy the file represented by fileToPull to the current file.
     * @param fileToPull The filepath of the file to pull.
     */
    private CopyFile(fileToPull: string): void {
        // If the file has changes then save them first so the editor shows the external changes.
        if (this._activeDocument.isDirty) {
            this._activeDocument.save().then(() => {
                // Copy the selected file to the currently opened file and overwrite it.
                fs.copyFileSync(fileToPull, this._activeDocument.fileName);
            });
        }
        // If the file isn't dirty then we can just overwrite and the editor will show the change.
        else {
            // Copy the selected file to the currently opened file and overwrite it.
            fs.copyFileSync(fileToPull, this._activeDocument.fileName);
        }
    }

    /**
     * Get the OpenDialogOptions for the OpenDialog.
     */
    private GetOptions(): vscode.OpenDialogOptions {
        // Set the options for the OpenDialog.
        const options: vscode.OpenDialogOptions = {
            canSelectMany: false,
            openLabel: "Pull File",
            defaultUri: vscode.Uri.file(this._currentDirectory),
            filters: {
                "All Files": ["*"]
            }
        };
    
        // Add a filter for the current file type if the extension can be found.
        if (this._extension !== "") {
            options.filters = {
                "Current File Type": [this._extension.replace(".", "")],
                "All Files": ["*"]
            };
        }

        return options;
    }
}