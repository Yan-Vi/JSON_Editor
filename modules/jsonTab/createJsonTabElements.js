function createJsonTabElements() {
    var jsonPanel = document.createElement("div");
    var jsonToolbar = document.createElement("div");
    var formatJsonButton = document.createElement("button");
    var jsonEditorWrap = document.createElement("div");
    var jsonLineNumbers = document.createElement("div");
    var jsonOutput = document.createElement("textarea");
    var jsonError = document.createElement("div");
    jsonPanel.classList.add("json-panel", "editor-panel");
    jsonToolbar.classList.add("json-toolbar");
    formatJsonButton.classList.add("json-format-button");
    formatJsonButton.type = "button";
    formatJsonButton.textContent = "format";
    jsonEditorWrap.classList.add("json-editor-wrap");
    jsonLineNumbers.classList.add("json-line-numbers");
    jsonOutput.classList.add("json-output");
    jsonOutput.readOnly = false;
    jsonOutput._lineNumbers = jsonLineNumbers;
    jsonError.classList.add("json-error");
    jsonToolbar.appendChild(formatJsonButton);
    jsonPanel.appendChild(jsonToolbar);
    jsonEditorWrap.appendChild(jsonLineNumbers);
    jsonEditorWrap.appendChild(jsonOutput);
    jsonPanel.appendChild(jsonEditorWrap);
    jsonPanel.appendChild(jsonError);
    return {
        panel: jsonPanel,
        output: jsonOutput,
        error: jsonError,
        formatButton: formatJsonButton,
        lineNumbers: jsonLineNumbers
    };
}
