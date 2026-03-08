import type { DrawerCallback, DrawerType, JsonBinding } from "../../../../core/types";
import type { DrawerPlugin, DrawerRuntimeApi } from "../contracts";
import { builtinDrawerPlugins } from "./builtins";

export interface DrawerRegistry {
  drawerTypes: DrawerType[];
  getDrawerType: (value: unknown, binding?: JsonBinding, hintedType?: DrawerType | null) => DrawerType;
  getPluginByType: (type: DrawerType) => DrawerPlugin;
  getDrawerByType: (type: DrawerType, api: DrawerRuntimeApi) => DrawerCallback;
}

function createPluginMap(plugins: DrawerPlugin[]): Record<DrawerType, DrawerPlugin> {
  const byType = {} as Record<DrawerType, DrawerPlugin>;
  plugins.forEach((plugin) => {
    byType[plugin.type] = plugin;
  });
  return byType;
}

export function createDrawerRegistry(plugins: DrawerPlugin[] = builtinDrawerPlugins): DrawerRegistry {
  const pluginByType = createPluginMap(plugins);
  const drawerTypes = plugins.map((plugin) => plugin.type);
  const sortedByPriority = [...plugins].sort((a, b) => a.detectPriority - b.detectPriority);

  const getPluginByType = (type: DrawerType): DrawerPlugin => pluginByType[type] ?? pluginByType.string;

  const getDrawerType = (value: unknown, _binding?: JsonBinding, hintedType?: DrawerType | null): DrawerType => {
    if (hintedType) {
      const hintedPlugin = getPluginByType(hintedType);
      if (hintedPlugin.supportsHint(value)) return hintedType;
    }
    if (value === null || value === undefined) return "string";
    for (let i = 0; i < sortedByPriority.length; i += 1) {
      const plugin = sortedByPriority[i];
      if (plugin && plugin.matches(value)) return plugin.type;
    }
    return "string";
  };

  const getDrawerByType = (type: DrawerType, api: DrawerRuntimeApi): DrawerCallback => {
    const plugin = getPluginByType(type);
    return (container, label, value, beforeNode, binding) => {
      if (beforeNode && binding) {
        plugin.render(api, { container, label, value, beforeNode, binding });
        return;
      }
      if (beforeNode) {
        plugin.render(api, { container, label, value, beforeNode });
        return;
      }
      if (binding) {
        plugin.render(api, { container, label, value, binding });
        return;
      }
      plugin.render(api, { container, label, value });
    };
  };

  return {
    drawerTypes,
    getDrawerType,
    getPluginByType,
    getDrawerByType
  };
}
