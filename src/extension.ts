"use strict";
import * as path from "path";
import * as vscode from "vscode";

interface IConfig {
    useQuickPick: boolean;
    showOpenDialogOption: boolean;
    useStatusBarButton: boolean;
}

const commandId = "extension.pullFile";
const commandDisplayText = "Pull File";
const statusBarButtonTooltip = "Overwrite the current file with a selected file.";
const useOpenDialogText = "Use Open Dialog...";
const quickPickPlaceholder = "Select a file to pull...";

export function activate(context: vscode.ExtensionContext) {
    const config = getConfigSettings();

    const command = vscode.commands.registerTextEditorCommand(commandId, (editor) => {
        // Pull content from a file into the active file.
        new PullFile(editor, config.useQuickPick, config.showOpenDialogOption).pull();
    });

    context.subscriptions.push(command);

    if (config.useStatusBarButton) {
        const statusBarButton = createStatusBarButton();
        statusBarButton.show();
        context.subscriptions.push(statusBarButton);
    }
}

function getConfigSettings(): IConfig {
    const config = vscode.workspace.getConfiguration("pullfile");
    const useQuickPick = config.get<boolean>("useQuickPick", true);
    const showOpenDialogOption = config.get<boolean>("includeOpenDialogOptionInQuickPick", true);
    const useStatusBarButton = config.get<boolean>("useStatusBarButton", true);
    return { useQuickPick, showOpenDialogOption, useStatusBarButton };
}

function createStatusBarButton(): vscode.StatusBarItem {
    const statusBarButton: vscode.StatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
    statusBarButton.command = commandId;
    statusBarButton.text = commandDisplayText;
    statusBarButton.tooltip = statusBarButtonTooltip;
    return statusBarButton;
}

class PullFile {
    private activeDocument: vscode.TextDocument;
    private activeFileUri: vscode.Uri;
    private extension: string;
    private activeFolder!: vscode.WorkspaceFolder;
    private useQuickPick: boolean;
    private showOpenDialogOption: boolean;
    private openDialogOptions: vscode.OpenDialogOptions = {
        canSelectMany: false,
        filters: {
            "All Files": ["*"],
        },
        openLabel: commandDisplayText,
    };

    constructor(editor: vscode.TextEditor, useQuickPick: boolean, showOpenDialogOption: boolean) {
        this.activeDocument = editor.document;
        this.activeFileUri = this.activeDocument.uri;
        this.extension = path.extname(this.activeDocument.fileName);
        const activeFolder = vscode.workspace.getWorkspaceFolder(this.activeFileUri);
        if (activeFolder) {
            this.activeFolder = activeFolder;
        }
        this.useQuickPick = useQuickPick;
        this.showOpenDialogOption = showOpenDialogOption;
    }
    /**
     * Pull the contents of a file into the active file.
     */
    public pull(): void {
        if (!this.activeFolder) {
            return;
        }

        this.getFilesInFolder()
            .then((files) => {
                // Show a QuickPick for file selection first.
                if (this.useQuickPick) {
                    return this.selectFileWithQuickPick(files);
                } else {
                    return this.selectFileWithOpenDialog();
                }
            })
            .then((filePathToPull) => {
                // If a file was selected, copy that file to the current file.
                if (filePathToPull) {
                    const file = vscode.Uri.file(filePathToPull);
                    this.copyFile(file);
                }
            });
    }

    /**
     * Get an array of the files with the extension in the folder.
     */
    private async getFilesInFolder(): Promise<vscode.Uri[]> {
        // Get the files in the folder.
        const searchPattern = new vscode.RelativePattern(this.activeFolder, "*" + this.extension);
        const excludePattern = new vscode.RelativePattern(this.activeFolder, path.basename(this.activeFileUri.fsPath));
        return vscode.workspace.findFiles(searchPattern, excludePattern);
    }

    private async selectFileWithQuickPick(files: vscode.Uri[]): Promise<string | undefined> {
        const items: string[] = [];

        if (this.showOpenDialogOption) {
            items.push(useOpenDialogText);
        }

        items.push(...files.map((file) => path.basename(file.fsPath)));
        const selection = await this.showQuickPick(items);

        // If there was a selection made then see if it was to use the open dialog.
        if (selection) {
            // If a file was not selected in the QuickPick, show an OpenDialog for file selection.
            if (this.showOpenDialogOption && selection === useOpenDialogText) {
                return this.selectFileWithOpenDialog();
            } else {
                // If there is a file selection, resolve the promise to it.
                return path.join(this.activeFolder.uri.fsPath, selection);
            }
        } else {
            return undefined;
        }
    }

    private async selectFileWithOpenDialog(): Promise<string | undefined> {
        const fileUri = await this.showOpenDialog();

        // If there is a selection, resolve the promise to it.
        if (fileUri && fileUri[0]) {
            return fileUri[0].fsPath;
        } else {
            return undefined;
        }
    }

    /**
     * Show a QuickPick with the files in the current directory.
     * @returns The thenable of the show quick pick.
     */
    private showQuickPick(items: string[]): Thenable<string | undefined> {
        const quickPickOptions: vscode.QuickPickOptions = {
            canPickMany: false,
            placeHolder: quickPickPlaceholder,
        };

        return vscode.window.showQuickPick(items, quickPickOptions);
    }

    /**
     * Show an OpenDialog with the options from GetOptions.
     * @returns The thenable of the show open dialog.
     */
    private showOpenDialog(): Thenable<vscode.Uri[] | undefined> {
        // Add a filter for the current file type.
        if (this.extension !== "" && this.openDialogOptions.filters) {
            this.openDialogOptions.filters["Current File Type"] = [this.extension.replace(".", "")];
        }

        // Let the user pick a file with the OS file open dialog.
        return vscode.window.showOpenDialog(this.openDialogOptions);
    }

    /**
     * Copy the file represented by fileToPull to the current file.
     * @param fileToPull The filepath of the file to pull.
     */
    private async copyFile(fileToPull: vscode.Uri): Promise<void> {
        // TODO: replace text in file using vscode replace instead of fs.
        const text = (await vscode.workspace.openTextDocument(fileToPull)).getText();

        // Copy the selected file to the currently opened file and overwrite it.
        const range = this.getWholeFileRange(this.activeDocument);
        const edit = new vscode.WorkspaceEdit();
        edit.replace(this.activeFileUri, range, text);
        await vscode.workspace.applyEdit(edit);
        this.activeDocument.save();
    }

    private getWholeFileRange(document: vscode.TextDocument): vscode.Range {
        const firstLine = document.lineAt(0);
        const lastLine = document.lineAt(document.lineCount - 1);
        return new vscode.Range(firstLine.range.start, lastLine.range.end);
    }
}
