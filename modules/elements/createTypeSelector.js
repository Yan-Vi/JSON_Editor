function createTypeSelector(drawerType, onTypeChange) {
    var types = typeof drawerTypeList !== "undefined" ? drawerTypeList : ["string", "number", "boolean", "object", "array"];
    var typeSelect = document.createElement("select");
    typeSelect.classList.add("drawer-type-select");
    typeSelect.innerHTML = types.map(function (type) {
        return '<option value="' + type + '">' + type + "</option>";
    }).join("");
    typeSelect.value = drawerType;
    if (typeof onTypeChange === "function") {
        typeSelect.addEventListener("change", function () {
            onTypeChange(typeSelect.value);
        });
    }
    return typeSelect;
}
