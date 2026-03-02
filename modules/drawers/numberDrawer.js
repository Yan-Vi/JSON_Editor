function toNumberOrZero(raw) {
    var parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : 0;
}

function drawInt(ctx, container, label, value, beforeNode, binding) {
    var t = ctx.createDrawerFrame(container, label, "number-value", "number", function (nextType) {
        ctx.replaceDrawer(container, t.frame, label, nextType, value, binding);
    }, function () {
        ctx.deleteBoundValue(binding);
        container.removeChild(t.frame);
    }, beforeNode, binding);
    t.value.type = "number";
    t.value.value = value;
    t.value.addEventListener("input", function () {
        ctx.setBoundValue(binding, toNumberOrZero(t.value.value));
    });
    ctx.bindLabelInput(t.label, binding);
}

function drawFloat(ctx, container, label, value, beforeNode, binding) {
    var t = ctx.createDrawerFrame(container, label, "number-value", "number", function (nextType) {
        ctx.replaceDrawer(container, t.frame, label, nextType, value, binding);
    }, function () {
        ctx.deleteBoundValue(binding);
        container.removeChild(t.frame);
    }, beforeNode, binding);
    t.value.type = "number";
    t.value.value = value;
    t.value.addEventListener("input", function () {
        ctx.setBoundValue(binding, toNumberOrZero(t.value.value));
    });
    ctx.bindLabelInput(t.label, binding);
}
