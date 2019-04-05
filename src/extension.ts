"use strict";
import { copyFileSync, readdirSync } from "fs";
import { basename, dirname, extname, join } from "path";
import * as vscode from "vscode";

export function activate(context: vscode.ExtensionContext) {
    const settings = vscode.workspace.getConfiguration("pullfile");

    const disposable = vscode.commands.registerTextEditorCommand("extension.pullFile", (editor) => {
        // Pull content from a file into the active file.
        const pullFile = new PullFile(editor, settings);
        pullFile.Pull();
    });

    context.subscriptions.push(disposable);

    if (settings.get("useStatusBarButton", true)) {
        const pullFileStatusBarButton: vscode.StatusBarItem =
            vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
        pullFileStatusBarButton.command = "extension.pullFile";
        pullFileStatusBarButton.text = "Pull File";
        pullFileStatusBarButton.tooltip = "Overwrite the current file with a selected file.";
        pullFileStatusBarButton.show();

        context.subscriptions.push(pullFileStatusBarButton);
    }
}

/**
 * Pull the contents of a file into the active file.
 */
class PullFile {
    private activeDocument: vscode.TextDocument;
    private extension: string;
    private currentDirectory: string;
    private useOpenDialogText: string = "Use Open Dialog...";
    private useQuickPick: boolean;
    private includeOpenDialogOptionInQuickPick: boolean;

    /**
     * Get the active TextDocument and its file extension from the active TextEditor.
     * @param editor The active TextEditor
     */
    constructor(editor: vscode.TextEditor, settings: vscode.WorkspaceConfiguration) {
        this.activeDocument = editor.document;
        this.extension = extname(this.activeDocument.fileName);
        this.currentDirectory = dirname(this.activeDocument.fileName);

        this.useQuickPick = settings.get("useQuickPick", true);
        this.includeOpenDialogOptionInQuickPick = settings.get("includeOpenDialogOptionInQuickPick", true);
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
            if (this.useQuickPick) {
                resolve(this.SelectFileWithQuickPick());
            } else {
                resolve(this.SelectFileWithOpenDialog());
            }

        });

        return promise;
    }

    private SelectFileWithQuickPick(): string {
        // Create a Promise to for the selected file.
        this.ShowQuickPick().then((selection) => {
            // If there was a selection made then see if it was to use the open dialog.
            if (selection) {
                // If a file was not selected in the QuickPick, show an OpenDialog for file selection.
                if (this.includeOpenDialogOptionInQuickPick && selection === this.useOpenDialogText) {
                    return this.SelectFileWithOpenDialog();
                } else {
                    // If there is a file selection, append it to the current directory path then return it.
                    return join(this.currentDirectory, selection);
                }
            }
        });
    }

    private SelectFileWithOpenDialog(): string {
        this.ShowOpenDialog().then((fileUri) => {
            // If there is a selection, resolve the promise to it.
            if (fileUri && fileUri[0]) {
                return fileUri[0].fsPath;
            }
        });
    }

    /**
     * Show a QuickPick with the files in the current directory.
     * @returns The thenable of the show quick pick.
     */
    private ShowQuickPick(): Thenable<string | undefined> {
        const filesToShow = this.GetFilesToShowInQuickPick();

        const quickPickOptions: vscode.QuickPickOptions = {
            canPickMany: false,
            placeHolder: "Select a file to pull...",
        };

        return vscode.window.showQuickPick(filesToShow, quickPickOptions);
    }

    /**
     * Get an array of the files to show in the quickpick.
     */
    private GetFilesToShowInQuickPick(): string[] {
        // Get the files in the current directory.
        const filesInCurrentDirectory: string[] = readdirSync(this.currentDirectory);

        // Create an array to hold the filtered items to show.
        const filesToShow: string[] = [];
        let currentIndex = 0;

        if (this.includeOpenDialogOptionInQuickPick) {
            // Add an option to use the open dialog as the first option.
            filesToShow[0] = this.useOpenDialogText;
            currentIndex++;
        }

        // Remove the current file from the list.
        filesInCurrentDirectory.forEach((value) => {
            if (value !== basename(this.activeDocument.fileName) && extname(value) === this.extension) {
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
        if (this.activeDocument.isDirty) {
            this.activeDocument.save().then(() => {
                // Copy the selected file to the currently opened file and overwrite it.
                copyFileSync(fileToPull, this.activeDocument.fileName);
            });
        } else {
            // Copy the selected file to the currently opened file and overwrite it.
            copyFileSync(fileToPull, this.activeDocument.fileName);
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
            defaultUri: vscode.Uri.file(this.currentDirectory),
            filters: {
                "All Files": ["*"],
            },
        };

        // Add a filter for the current file type if the extension can be found.
        if (this.extension !== "") {
            options.filters = {
                "Current File Type": [this.extension.replace(".", "")],
                "All Files": ["*"],
            };
        }

        return options;
    }
}
