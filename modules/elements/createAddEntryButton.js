function createAddEntryButton(onAddEntry) {
    var row = document.createElement("div");
    var addButton = document.createElement("button");
    row.classList.add("add-entry-row");
    addButton.type = "button";
    addButton.classList.add("add-entry-button");
    addButton.textContent = "+";
    addButton.addEventListener("click", onAddEntry);
    row.appendChild(addButton);
    return row;
}
