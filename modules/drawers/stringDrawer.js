function drawString(ctx, container, label, value, beforeNode, binding) {
    var t = ctx.createDrawerFrame(container, label, "text-value", "string", function (nextType) {
        ctx.replaceDrawer(container, t.frame, label, nextType, value, binding);
    }, function () {
        ctx.deleteBoundValue(binding);
        container.removeChild(t.frame);
    }, beforeNode, binding);
    t.value.type = "text";
    t.value.value = value == null ? "" : String(value);
    t.value.addEventListener("input", function () {
        ctx.setBoundValue(binding, t.value.value);
    });
    ctx.bindLabelInput(t.label, binding);
}
