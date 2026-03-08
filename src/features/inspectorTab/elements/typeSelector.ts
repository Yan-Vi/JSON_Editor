import type { DrawerType } from "../../../core/types";

export function createTypeSelector(
  drawerType: DrawerType,
  drawerTypeList: DrawerType[],
  onTypeChange: (nextType: DrawerType) => void
): HTMLSelectElement {
  const typeSelect = document.createElement("select");
  typeSelect.classList.add("drawer-type-select");
  typeSelect.innerHTML = drawerTypeList
    .map((type) => `<option value="${type}">${type}</option>`)
    .join("");
  typeSelect.value = drawerType;
  typeSelect.addEventListener("change", () => {
    onTypeChange(typeSelect.value as DrawerType);
  });
  return typeSelect;
}
