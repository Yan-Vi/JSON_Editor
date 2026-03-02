function createDeleteButton(container, label, onDelete) {
    var deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.classList.add("delete-entry-button");
    deleteButton.textContent = "×";
    if (container.classList.contains("inspector") && label === "json") {
        deleteButton.style.display = "none";
    }
    if (typeof onDelete === "function") {
        deleteButton.addEventListener("click", onDelete);
    }
    return deleteButton;
}
