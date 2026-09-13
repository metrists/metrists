import { useEffect } from "react";
import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { openWorkspace } from "@/entities/workspaces";

export function Loader({ children }: { children: React.ReactNode }) {
  const { workspacePath } = useWorkspaceParams();

  useEffect(() => {
    if (!workspacePath) {
      return;
    }

    // Registers the workspace as open (idempotent): seeds collections,
    // kicks the listing walk, starts the workspace-lifetime metadata
    // watcher. Close is explicit (entities/workspaces.ts), not tied to this
    // component's lifetime.
    openWorkspace(workspacePath);
  }, [workspacePath]);

  if (!workspacePath) {
    return null;
  }

  // Render children immediately - collections are created synchronously
  // Data will load in the background and components will reactively update
  return <>{children}</>;
}
