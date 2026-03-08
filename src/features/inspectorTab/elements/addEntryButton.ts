export function createAddEntryButton(onAddEntry: () => void): HTMLDivElement {
  const row = document.createElement("div");
  const addButton = document.createElement("button");
  row.classList.add("add-entry-row");
  addButton.type = "button";
  addButton.classList.add("add-entry-button");
  addButton.textContent = "+";
  addButton.addEventListener("click", onAddEntry);
  row.appendChild(addButton);
  return row;
}
