var drawerTypeList = ["string", "color", "image-link", "number", "vector2", "vector3", "boolean", "object", "array"];
var inspectorGraph = typeof inspectorGraph !== "undefined" && inspectorGraph ? inspectorGraph : { typeHints: {} };
var typeHints = inspectorGraph.typeHints;
var drawerByTypeMap = {
    string: DrawString,
    color: DrawColor,
    "image-link": DrawImageLink,
    number: DrawFloat,
    vector2: DrawVector2,
    vector3: DrawVector3,
    boolean: DrawBoolean,
    array: DrawArray,
    object: DrawObject
};

var typeValidatorMap = {
    string: function (value) { return typeof value === "string"; },
    color: function (value) { return typeof isHexColor === "function" && isHexColor(value); },
    "image-link": function (value) { return typeof isImageUrl === "function" && isImageUrl(value); },
    number: function (value) { return typeof value === "number"; },
    vector2: function (value) { return typeof isVector2Object === "function" && isVector2Object(value); },
    vector3: function (value) { return typeof isVector3Object === "function" && isVector3Object(value); },
    boolean: function (value) { return typeof value === "boolean"; },
    object: function (value) { return value !== null && typeof value === "object" && !Array.isArray(value); },
    array: function (value) { return Array.isArray(value); }
};
var autoDetectTypePriorityMap = {
    array: 1000,
    vector2: 2000,
    vector3: 2001,
    object: 5000,
    boolean: 7000,
    number: 8000,
    "image-link": 9000,
    color: 9100,
    string: 10000
};

function isHintValidForValue(type, value) {
    if (type === "color" || type === "image-link") return typeof value === "string";
    var validator = typeValidatorMap[type];
    if (!validator) return false;
    return validator(value);
}

function getHintedType(binding, value) {
    if (!binding || !binding.path) return null;
    var hinted = typeHints[binding.path];
    if (!hinted) return null;
    if (!isHintValidForValue(hinted, value)) return null;
    return hinted;
}

function getDrawer(value, binding) {
    var hintedType = getHintedType(binding, value);
    if (hintedType) return getDrawerByType(hintedType);
    if (value === null || value === undefined) return DrawString;
    var sortedTypes = Object.keys(autoDetectTypePriorityMap).sort(function (a, b) {
        return autoDetectTypePriorityMap[a] - autoDetectTypePriorityMap[b];
    });
    for (var i = 0; i < sortedTypes.length; i++) {
        var type = sortedTypes[i];
        var validator = typeValidatorMap[type];
        if (!validator || !validator(value)) continue;
        if (type === "number") return Number.isInteger(value) ? DrawInt : DrawFloat;
        return getDrawerByType(type);
    }
    return DrawString;
}

function getDrawerByType(type) {
    return drawerByTypeMap[type] || DrawString;
}

function getDrawerType(value, binding) {
    var hintedType = getHintedType(binding, value);
    if (hintedType) return hintedType;
    if (Array.isArray(value)) return "array";
    if (value !== null && typeof value === "object") {
        if (typeof isVector2Object === "function" && isVector2Object(value)) return "vector2";
        if (typeof isVector3Object === "function" && isVector3Object(value)) return "vector3";
        return "object";
    }
    if (typeof value === "number") return "number";
    if (typeof value === "boolean") return "boolean";
    if (typeof value === "string" && isHexColor && isHexColor(value)) return "color";
    if (typeof value === "string" && isImageUrl && isImageUrl(value)) return "image-link";
    return "string";
}

function normalizeValueForType(value, type) {
    if (type === "string") return value == null ? "" : String(value);
    if (type === "color") {
        if (typeof value === "string" && isHexColor && isHexColor(value)) return value;
        return "#000000";
    }
    if (type === "image-link") return value == null ? "" : String(value);
    if (type === "number") {
        var parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : 0;
    }
    if (type === "vector2") {
        var next2 = { x: 0, y: 0 };
        if (value && typeof value === "object" && !Array.isArray(value)) {
            next2.x = Number.isFinite(Number(value.x)) ? Number(value.x) : 0;
            next2.y = Number.isFinite(Number(value.y)) ? Number(value.y) : 0;
        }
        return next2;
    }
    if (type === "vector3") {
        var next = { x: 0, y: 0, z: 0 };
        if (value && typeof value === "object" && !Array.isArray(value)) {
            next.x = Number.isFinite(Number(value.x)) ? Number(value.x) : 0;
            next.y = Number.isFinite(Number(value.y)) ? Number(value.y) : 0;
            next.z = Number.isFinite(Number(value.z)) ? Number(value.z) : 0;
        }
        return next;
    }
    if (type === "boolean") return !!value;
    if (type === "object") return value !== null && typeof value === "object" && !Array.isArray(value) ? value : {};
    if (type === "array") return Array.isArray(value) ? value : [];
    return value;
}

function isBound(binding) {
    return !!(binding && binding.parent && binding.key !== undefined && binding.key !== null);
}

function escapePathKey(key) {
    return String(key).replace(/\\/g, "\\\\").replace(/\./g, "\\.");
}

function appendBindingPath(parentPath, key) {
    if (typeof key === "number") return parentPath + "[" + key + "]";
    return parentPath + "." + escapePathKey(key);
}

function clearTypeHintsByPrefix(pathPrefix) {
    Object.keys(typeHints).forEach(function (path) {
        if (path === pathPrefix || path.indexOf(pathPrefix + ".") === 0 || path.indexOf(pathPrefix + "[") === 0) {
            delete typeHints[path];
        }
    });
}

function remapTypeHintPrefix(oldPrefix, nextPrefix) {
    var nextEntries = {};
    Object.keys(typeHints).forEach(function (path) {
        if (path === oldPrefix || path.indexOf(oldPrefix + ".") === 0 || path.indexOf(oldPrefix + "[") === 0) {
            var suffix = path.slice(oldPrefix.length);
            nextEntries[nextPrefix + suffix] = typeHints[path];
            delete typeHints[path];
        }
    });
    Object.keys(nextEntries).forEach(function (path) {
        typeHints[path] = nextEntries[path];
    });
}

function createChildBinding(parentBinding, parent, key) {
    var parentPath = parentBinding && parentBinding.path ? parentBinding.path : "$";
    return {
        parent: parent,
        key: key,
        path: appendBindingPath(parentPath, key)
    };
}

function notifyMutation() {
    if (typeof window === "undefined") return;
    if (typeof window.onInspectorMutation !== "function") return;
    window.onInspectorMutation();
}

function getBoundValue(binding, fallbackValue) {
    if (!isBound(binding)) return fallbackValue;
    return binding.parent[binding.key];
}

function setBoundValue(binding, nextValue) {
    if (!isBound(binding)) return;
    if (binding.parent[binding.key] === nextValue) return;
    binding.parent[binding.key] = nextValue;
    notifyMutation();
}

function deleteBoundValue(binding) {
    if (!isBound(binding)) return;
    if (!Object.prototype.hasOwnProperty.call(binding.parent, binding.key)) return;
    if (binding.path) clearTypeHintsByPrefix(binding.path);
    if (Array.isArray(binding.parent)) {
        binding.parent.splice(binding.key, 1);
        if (binding.path) {
            var arrayPath = binding.path.replace(/\[[0-9]+\]$/, "");
            clearTypeHintsByPrefix(arrayPath);
        }
        notifyMutation();
        return;
    }
    delete binding.parent[binding.key];
    notifyMutation();
}

function renameBoundKey(binding, nextKey) {
    if (!isBound(binding)) return;
    if (Array.isArray(binding.parent)) return;
    if (typeof nextKey !== "string") return;
    var trimmedKey = nextKey.trim();
    if (trimmedKey.length === 0) return;
    var oldKey = binding.key;
    if (trimmedKey === oldKey) return;
    if (Object.prototype.hasOwnProperty.call(binding.parent, trimmedKey)) return;
    var oldPath = binding.path;
    binding.parent[trimmedKey] = binding.parent[oldKey];
    delete binding.parent[oldKey];
    binding.key = trimmedKey;
    if (oldPath) {
        var parentPath = oldPath.replace(/\.[^.]+$/, "");
        var nextPath = appendBindingPath(parentPath, trimmedKey);
        remapTypeHintPrefix(oldPath, nextPath);
        binding.path = nextPath;
    }
    notifyMutation();
}

function bindLabelInput(labelEl, binding) {
    if (!isBound(binding)) return;
    if (Array.isArray(binding.parent)) return;
    labelEl.addEventListener("change", function () {
        renameBoundKey(binding, labelEl.value);
    });
}

function replaceDrawer(container, frame, label, targetType, sourceValue, binding) {
    var drawer = getDrawerByType(targetType);
    var currentValue = getBoundValue(binding, sourceValue);
    var normalizedValue = normalizeValueForType(currentValue, targetType);
    var nextLabel = label;
    if (binding && binding.parent && !Array.isArray(binding.parent) && typeof binding.key === "string") {
        nextLabel = binding.key;
    }
    setBoundValue(binding, normalizedValue);
    if (binding && binding.path) typeHints[binding.path] = targetType;
    drawer(container, nextLabel, normalizedValue, frame, binding);
    container.removeChild(frame);
    notifyMutation();
}

const context = {
    createDrawerFrame: createDrawerFrame,
    getDrawer: getDrawer,
    getDrawerByType: getDrawerByType,
    getDrawerType: getDrawerType,
    replaceDrawer: replaceDrawer,
    DrawString: DrawString,
    createChildBinding: createChildBinding,
    notifyMutation: notifyMutation,
    getBoundValue: getBoundValue,
    setBoundValue: setBoundValue,
    deleteBoundValue: deleteBoundValue,
    bindLabelInput: bindLabelInput
};

function exportTypeHintsSnapshot() {
    return JSON.parse(JSON.stringify(typeHints));
}

function importTypeHintsSnapshot(nextTypeHints) {
    var source = nextTypeHints && typeof nextTypeHints === "object" ? nextTypeHints : {};
    Object.keys(typeHints).forEach(function (key) {
        delete typeHints[key];
    });
    Object.keys(source).forEach(function (key) {
        typeHints[key] = source[key];
    });
    inspectorGraph.typeHints = typeHints;
}

function DrawAny(container, label, value, beforeNode, binding) {
    getDrawer(value, binding)(container, label, value, beforeNode, binding);
}

function DrawObject(container, label, value, beforeNode, binding) {
    return drawObject(context, container, label, value, beforeNode, binding);
}

function DrawString(container, label, value, beforeNode, binding) {
    return drawString(context, container, label, value, beforeNode, binding);
}

function DrawColor(container, label, value, beforeNode, binding) {
    return drawColor(context, container, label, value, beforeNode, binding);
}

function DrawImageLink(container, label, value, beforeNode, binding) {
    return drawImageLink(context, container, label, value, beforeNode, binding);
}

function DrawInt(container, label, value, beforeNode, binding) {
    return drawInt(context, container, label, value, beforeNode, binding);
}

function DrawFloat(container, label, value, beforeNode, binding) {
    return drawFloat(context, container, label, value, beforeNode, binding);
}

function DrawVector2(container, label, value, beforeNode, binding) {
    return drawVector2(context, container, label, value, beforeNode, binding);
}

function DrawVector3(container, label, value, beforeNode, binding) {
    return drawVector3(context, container, label, value, beforeNode, binding);
}

function DrawBoolean(container, label, value, beforeNode, binding) {
    return drawBoolean(context, container, label, value, beforeNode, binding);
}

function DrawArray(container, label, value, beforeNode, binding) {
    return drawArray(context, container, label, value, beforeNode, binding);
}
