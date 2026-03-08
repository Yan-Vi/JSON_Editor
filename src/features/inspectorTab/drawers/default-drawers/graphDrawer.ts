import { createAddEntryButton } from "../../elements";
import { createEditorEmbedded } from "../nodeDrawer";
import { createStandardFrame } from "../shared/frame";
import { getNextObjectKey } from "../shared/objectKey";
import type { DrawerPlugin } from "../contracts";

export const GRAPH_DRAWER_TYPE = "graph" as const;

interface GraphNodeShape {
  position: { x: number; y: number };
  bounds: { width: number; height: number };
}

interface GraphEdgeShape {
  sourceId: string;
  targetId: string;
}

interface GraphShape {
  nodes: Record<string, GraphNodeShape>;
  edges: Record<string, GraphEdgeShape>;
  data: Record<string, unknown>;
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function toFiniteOrZero(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeGraphNode(value: unknown): GraphNodeShape {
  const node = isObjectRecord(value) ? value : {};
  const position = isObjectRecord(node.position) ? node.position : {};
  const bounds = isObjectRecord(node.bounds) ? node.bounds : {};
  return {
    position: { x: toFiniteOrZero(position.x), y: toFiniteOrZero(position.y) },
    bounds: { width: toFiniteOrZero(bounds.width), height: toFiniteOrZero(bounds.height) }
  };
}

function normalizeGraphEdge(value: unknown): GraphEdgeShape {
  const edge = isObjectRecord(value) ? value : {};
  return {
    sourceId: edge.sourceId == null ? "" : String(edge.sourceId),
    targetId: edge.targetId == null ? "" : String(edge.targetId)
  };
}

function normalizeGraph(value: unknown): GraphShape {
  if (isGraphLike(value)) {
    const graph = value as GraphShape;
    const nodesRaw = isObjectRecord(graph.nodes) ? graph.nodes : {};
    const edgesRaw = isObjectRecord(graph.edges) ? graph.edges : {};
    const dataRaw = isObjectRecord(graph.data) ? graph.data : {};
    const nodes: Record<string, GraphNodeShape> = {};
    const edges: Record<string, GraphEdgeShape> = {};
    Object.keys(nodesRaw).forEach((id) => {
      nodes[id] = normalizeGraphNode(nodesRaw[id]);
    });
    Object.keys(edgesRaw).forEach((id) => {
      edges[id] = normalizeGraphEdge(edgesRaw[id]);
    });
    return { nodes, edges, data: dataRaw };
  }

  const sourceEntries: Array<[string, unknown]> = Array.isArray(value)
    ? value.map((item, index) => [String(index), item])
    : isObjectRecord(value)
      ? Object.entries(value)
      : [];
  const nodes: Record<string, GraphNodeShape> = {};
  const data: Record<string, unknown> = {};
  sourceEntries.forEach(([nodeId, nodeValue], index) => {
    nodes[nodeId] = createDefaultNode(index);
    data[nodeId] = nodeValue;
  });
  return { nodes, edges: {}, data };
}

function isGraphLike(value: unknown): boolean {
  if (!isObjectRecord(value)) return false;
  if (!Object.prototype.hasOwnProperty.call(value, "nodes")) return false;
  if (!Object.prototype.hasOwnProperty.call(value, "edges")) return false;
  if (!Object.prototype.hasOwnProperty.call(value, "data")) return false;
  return isObjectRecord(value.nodes) && isObjectRecord(value.edges) && isObjectRecord(value.data);
}

function createDefaultNode(index: number): GraphNodeShape {
  return {
    position: { x: 16 + index * 24, y: 16 + index * 20 },
    bounds: { width: 320, height: 220 }
  };
}

export const graphDrawerPlugin: DrawerPlugin = {
  type: GRAPH_DRAWER_TYPE,
  detectPriority: 4500,
  matches: (value) => isGraphLike(value),
  supportsHint: (value) => isObjectRecord(value),
  normalize: (value) => normalizeGraph(value),
  render: (api, args) => {
    const sourceGraph = api.getBoundValue(args.binding, args.value);
    const graphValue = isGraphLike(sourceGraph)
      ? (sourceGraph as GraphShape)
      : (normalizeGraph(sourceGraph) as GraphShape);
    if (args.binding && sourceGraph !== graphValue) {
      api.setBoundValue(args.binding, graphValue);
    }
    let host: HTMLDivElement;
    const refs = createStandardFrame(api, args.container, args.label, args.beforeNode, args.binding, {
      valueClass: "object-value",
      drawerType: GRAPH_DRAWER_TYPE,
      sourceValue: graphValue
    });
    api.bindLabelInput(refs.label, args.binding);
    if (!(refs.value instanceof HTMLDivElement)) return;
    refs.value.innerHTML = "";
    host = refs.value;
    

    const graphBinding = graphValue as unknown as Record<string | number, unknown>;
    const dataBinding = api.createChildBinding(args.binding, graphBinding, "data");
    const nodeIds = [...new Set([...Object.keys(graphValue.nodes), ...Object.keys(graphValue.data)])];

    const viewportsSection = document.createElement("div");
    viewportsSection.className = "graph-viewports-section";
    host.appendChild(viewportsSection);

    function renderNodeViewport(nodeId: string): void {
      if (!(nodeId in graphValue.data)) {
        graphValue.data[nodeId] = {};
      }
      if (!(nodeId in graphValue.nodes)) {
        graphValue.nodes[nodeId] = createDefaultNode(Object.keys(graphValue.nodes).length);
      }
      const nodeMeta = normalizeGraphNode(graphValue.nodes[nodeId]);
      graphValue.nodes[nodeId] = nodeMeta;
      const nodeData = graphValue.data[nodeId];
      const nodeDataBinding = api.createChildBinding(dataBinding, graphValue.data, nodeId);
      const wrapper = document.createElement("div");
      viewportsSection.appendChild(wrapper);
      createEditorEmbedded({
        container: wrapper,
        label: nodeId,
        value: nodeData,
        binding: nodeDataBinding,
        api,
        onMutation: () => api.notifyMutation()
      });

      const viewport = wrapper;
      const dragSurface = wrapper.querySelector(".editor-tabs");
      if (!(viewport instanceof HTMLDivElement) || !(dragSurface instanceof HTMLDivElement)) return;

      const applyPosition = (x: number, y: number): void => {
        nodeMeta.position.x = x;
        nodeMeta.position.y = y;
        viewport.style.left = `${nodeMeta.position.x}px`;
        viewport.style.top = `${nodeMeta.position.y}px`;
      };

      applyPosition(toFiniteOrZero(nodeMeta.position.x), toFiniteOrZero(nodeMeta.position.y));

      dragSurface.addEventListener("mousedown", (event) => {
        if (event.button !== 0) return;
        const activeElement = document.activeElement;
        if (activeElement instanceof HTMLElement) activeElement.blur();
        event.preventDefault();
        const startX = event.clientX;
        const startY = event.clientY;
        const originX = nodeMeta.position.x;
        const originY = nodeMeta.position.y;
        const onMove = (moveEvent: MouseEvent): void => {
          applyPosition(originX + moveEvent.clientX - startX, originY + moveEvent.clientY - startY);
        };
        const onUp = (): void => {
          window.removeEventListener("mousemove", onMove);
          window.removeEventListener("mouseup", onUp);
          api.notifyMutation();
        };
        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
      });
    }

    nodeIds.forEach((nodeId) => renderNodeViewport(nodeId));

    const addNodeRow = createAddEntryButton(() => {
      const nodeId = getNextObjectKey(graphValue.nodes);
      graphValue.nodes[nodeId] = createDefaultNode(Object.keys(graphValue.nodes).length);
      graphValue.data[nodeId] = {};
      renderNodeViewport(nodeId);
      api.notifyMutation();
    });
    addNodeRow.querySelector("button")!.textContent = "Add Node";
    host.appendChild(addNodeRow);

  }
};
