export function createDeleteButton(container: HTMLElement, label: string, onDelete: () => void): HTMLButtonElement {
  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.classList.add("delete-entry-button");
  deleteButton.textContent = "×";
  if (container.classList.contains("inspector") && label === "json") {
    deleteButton.style.display = "none";
  }
  deleteButton.addEventListener("click", onDelete);
  return deleteButton;
}
