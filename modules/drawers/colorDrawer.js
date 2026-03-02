function isHexColor(value) {
    return /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/.test(value);
}

function toLongHex(value) {
    if (!isHexColor(value)) return "#000000";
    if (value.length === 7) return value.toLowerCase();
    return ("#" + value[1] + value[1] + value[2] + value[2] + value[3] + value[3]).toLowerCase();
}

function setBoundValueSilently(binding, nextValue) {
    if (!binding || !binding.parent || binding.key === undefined || binding.key === null) return;
    binding.parent[binding.key] = nextValue;
}

function drawColor(ctx, container, label, value, beforeNode, binding) {
    var t = ctx.createDrawerFrame(container, label, "text-value", "color", function (nextType) {
        ctx.replaceDrawer(container, t.frame, label, nextType, value, binding);
    }, function () {
        ctx.deleteBoundValue(binding);
        container.removeChild(t.frame);
    }, beforeNode, binding);
    var colorStack = document.createElement("div");
    var colorPicker = document.createElement("input");
    colorStack.classList.add("color-drawer-stack");
    colorPicker.classList.add("color-picker-value");
    colorPicker.type = "color";
    t.value.type = "text";
    t.value.value = value == null ? "" : String(value);
    colorPicker.value = toLongHex(t.value.value);
    t.value.addEventListener("input", function () {
        if (isHexColor(t.value.value)) {
            colorPicker.value = toLongHex(t.value.value);
        }
        ctx.setBoundValue(binding, t.value.value);
    });
    colorPicker.addEventListener("input", function () {
        t.value.value = colorPicker.value;
        setBoundValueSilently(binding, colorPicker.value);
    });
    colorPicker.addEventListener("change", function () {
        setBoundValueSilently(binding, colorPicker.value);
        ctx.notifyMutation();
    });
    ctx.bindLabelInput(t.label, binding);
    t.frame.replaceChild(colorStack, t.value);
    colorStack.appendChild(t.value);
    colorStack.appendChild(colorPicker);
}
