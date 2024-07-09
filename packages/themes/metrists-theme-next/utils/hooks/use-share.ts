import { useToast } from "./use-toast";
import { shareMetaCurry } from "../share";

export function useShare(meta: Parameters<typeof shareMetaCurry>[1]) {
  const { toast } = useToast();
  return shareMetaCurry(toast, meta);
}
