function setLabelVisibility(labelEl, label) {
    labelEl.style.display = (label === "" || label === undefined || label === null) ? "none" : "";
}
