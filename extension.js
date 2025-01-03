const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function activate(context) {
    let disposable = vscode.commands.registerCommand('generate-commit-data-extension.generateCommitData', function () {
        const panel = vscode.window.createWebviewPanel(
            'generateCommitData', // ID của WebView
            'Generate Commit Data', // Tiêu đề của WebView
            vscode.ViewColumn.One, // Cột trong VS Code
            { enableScripts: true } // Cho phép chạy scripts trong WebView
        );

        const htmlPath = path.join(context.extensionPath, 'webview', 'index.html');
        const htmlContent = fs.readFileSync(htmlPath, 'utf8');
        panel.webview.html = htmlContent;

        // Lắng nghe thông điệp từ WebView
        panel.webview.onDidReceiveMessage(message => {
            switch (message.command) {
                case 'getAllFiles':
                    // Đọc tất cả các file trong thư mục gốc của dự án
                    const rootPath = vscode.workspace.rootPath;
                    if (rootPath) {
                        const files = getAllFiles(rootPath);
                        panel.webview.postMessage({ command: 'fileList', files: files });
                    }
                    break;
                case 'generateCommitData':
                    const commitData = message.data;

                    // Perform the commit immediately instead of creating a JSON file
                    try {
                        const authorDate = commitData.date;
                        const files = commitData.files;
                        const content = commitData.content || commitData.defaultContent;

                        // Add files to the staging area and commit
                        // files.forEach((file) => {
                        //     execSync(`git add ${file}`);
                        // });

                        const envVars = `GIT_AUTHOR_DATE="${authorDate}" GIT_COMMITTER_DATE="${authorDate}"`;
                        execSync(`${envVars} git commit -m "${content}"`, { stdio: 'inherit' });

                        vscode.window.showInformationMessage(`Commit successful: "${content}" with AUTHOR_DATE=${authorDate}`);
                    } catch (error) {
                        vscode.window.showErrorMessage('Error during commit: ' + error.message);
                    }
                    break;
            }
        });
    });

    context.subscriptions.push(disposable);
}

function getAllFiles(dirPath) {
    const rootPath = vscode.workspace.rootPath;
    let results = [];

    // Read .gitignore if exists
    const gitIgnorePath = path.join(rootPath, '.gitignore');
    let gitIgnorePatterns = [];
    if (fs.existsSync(gitIgnorePath)) {
        const gitIgnoreContent = fs.readFileSync(gitIgnorePath, 'utf-8');
        gitIgnorePatterns = gitIgnoreContent.split('\n').map(pattern => pattern.trim()).filter(Boolean);
    }

    const list = fs.readdirSync(dirPath);
    list.forEach(file => {
        const filePath = path.join(dirPath, file);
        const stat = fs.statSync(filePath);

        // Skip files in the .git directory
        if (file === '.git') return;

        // Check if file matches any pattern in .gitignore
        if (isIgnored(file, gitIgnorePatterns)) return;

        if (stat && stat.isDirectory()) {
            results = results.concat(getAllFiles(filePath)); // Recursive call to traverse subfolders
        } else {
            results.push(path.relative(rootPath, filePath));
        }
    });

    return results;
}

// Check if a file matches any pattern in .gitignore
function isIgnored(file, gitIgnorePatterns) {
    return gitIgnorePatterns.some(pattern => {
        const regex = new RegExp('^' + pattern.replace(/\//g, '\\/').replace(/\*/g, '.*') + '$');
        return regex.test(file);
    });
}

function deactivate() {}

module.exports = {
    activate,
    deactivate
};
