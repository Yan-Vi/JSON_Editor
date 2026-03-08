import { isVector3Object } from "../../../../core/valueUtils";
import { createVectorPlugin } from "../shared/vector";

export const VECTOR3_DRAWER_TYPE = "vector3" as const;

export const vector3DrawerPlugin = createVectorPlugin(VECTOR3_DRAWER_TYPE, ["x", "y", "z"], isVector3Object, 2001);
