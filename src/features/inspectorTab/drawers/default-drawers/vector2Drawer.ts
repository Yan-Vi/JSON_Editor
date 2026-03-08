import { isVector2Object } from "../../../../core/valueUtils";
import { createVectorPlugin } from "../shared/vector";

export const VECTOR2_DRAWER_TYPE = "vector2" as const;

export const vector2DrawerPlugin = createVectorPlugin(VECTOR2_DRAWER_TYPE, ["x", "y"], isVector2Object, 2000);
