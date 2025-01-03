const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

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

                    // Đường dẫn để lưu file data-commit.json
                    const jsonFilePath = path.join(vscode.workspace.rootPath, 'data-commit.json');

                    // Tạo file data-commit.json
                    try {
                        fs.writeFileSync(jsonFilePath, JSON.stringify([commitData], null, 2));
                        vscode.window.showInformationMessage('Đã tạo file data-commit.json thành công!');
                    } catch (error) {
                        vscode.window.showErrorMessage('Có lỗi khi tạo file: ' + error.message);
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

    // Đọc nội dung .gitignore nếu có
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

        // Bỏ qua các file trong thư mục .git
        if (file === '.git') return;

        // Kiểm tra xem file có khớp với các pattern trong .gitignore không
        if (isIgnored(file, gitIgnorePatterns)) return;

        if (stat && stat.isDirectory()) {
            results = results.concat(getAllFiles(filePath)); // Recursive call to traverse subfolders
        } else {
            results.push(path.relative(rootPath, filePath));
        }
    });

    return results;
}

// Kiểm tra xem file có khớp với các pattern trong .gitignore hay không
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
