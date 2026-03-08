import type { DrawerPlugin } from "../contracts";
import { arrayDrawerPlugin } from "../default-drawers/arrayDrawer";
import { graphDrawerPlugin } from "../default-drawers/graphDrawer";
import { booleanDrawerPlugin } from "../default-drawers/booleanDrawer";
import { colorDrawerPlugin } from "../default-drawers/colorDrawer";
import { imageLinkDrawerPlugin } from "../default-drawers/imageLinkDrawer";
import { numberDrawerPlugin } from "../default-drawers/numberDrawer";
import { objectDrawerPlugin } from "../default-drawers/objectDrawer";
import { stringDrawerPlugin } from "../default-drawers/stringDrawer";
import { vector2DrawerPlugin } from "../default-drawers/vector2Drawer";
import { vector3DrawerPlugin } from "../default-drawers/vector3Drawer";

export const builtinDrawerPlugins: DrawerPlugin[] = [
  stringDrawerPlugin,
  colorDrawerPlugin,
  imageLinkDrawerPlugin,
  numberDrawerPlugin,
  vector2DrawerPlugin,
  vector3DrawerPlugin,
  booleanDrawerPlugin,
  graphDrawerPlugin,
  objectDrawerPlugin,
  arrayDrawerPlugin
];
