function drawArray(ctx, container, label, value, beforeNode, binding) {
    var t = ctx.createDrawerFrame(container, label, "array-value", "array", function (nextType) {
        ctx.replaceDrawer(container, t.frame, label, nextType, value, binding);
    }, function () {
        ctx.deleteBoundValue(binding);
        container.removeChild(t.frame);
    }, beforeNode, binding);
    var addEntryControl = createAddEntryButton(function () {
        var nextValue = "";
        value.push(nextValue);
        ctx.notifyMutation();
        var newBinding = ctx.createChildBinding(binding, value, value.length - 1);
        ctx.DrawString(t.value, "", nextValue, addEntryControl, newBinding);
    });
    for (let i = 0; i < value.length; i++) {
        var childBinding = ctx.createChildBinding(binding, value, i);
        ctx.getDrawer(value[i], childBinding)(t.value, "", value[i], undefined, childBinding);
    }
    t.value.appendChild(addEntryControl);
}
