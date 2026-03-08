export function createMutationBridge(onMutation: () => void): () => void {
  return () => onMutation();
}

export function createRefreshBridge(onRefresh: () => void): () => void {
  return () => onRefresh();
}
