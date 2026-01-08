import { useMutation, useQueryClient, UseMutationOptions } from "@tanstack/react-query";
import { Device } from "@/lib/api";

interface OptimisticMutationOptions<TData, TVariables> {
  mutationFn: (variables: TVariables) => Promise<TData>;
  queryKey: string[];
  onSuccess?: (data: TData, variables: TVariables) => void;
  onError?: (error: Error, variables: TVariables) => void;
  /**
   * Function to optimistically update the cache before the mutation completes.
   * Receives current cache data and mutation variables.
   */
  optimisticUpdate: (oldData: Device[] | undefined, variables: TVariables) => Device[];
}

/**
 * A wrapper around useMutation that provides optimistic updates.
 * Automatically rolls back on error.
 * 
 * @example
 * const updateDevice = useOptimisticMutation({
 *   mutationFn: ({ id, data }) => deviceApi.update(id, data),
 *   queryKey: ["devices"],
 *   optimisticUpdate: (oldData, { id, data }) => 
 *     oldData?.map(d => d.id === id ? { ...d, ...data } : d) ?? [],
 *   onSuccess: () => toast.success("Updated!"),
 *   onError: (error) => toast.error(error.message),
 * });
 */
export function useOptimisticMutation<TData, TVariables>({
  mutationFn,
  queryKey,
  optimisticUpdate,
  onSuccess,
  onError,
}: OptimisticMutationOptions<TData, TVariables>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    
    onMutate: async (variables) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey });
      
      // Snapshot the previous value
      const previousData = queryClient.getQueryData<Device[]>(queryKey);
      
      // Optimistically update to the new value
      queryClient.setQueryData<Device[]>(queryKey, (old) => optimisticUpdate(old, variables));
      
      // Return context with the snapshotted value
      return { previousData };
    },
    
    onError: (error, variables, context) => {
      // Roll back to the previous value on error
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
      onError?.(error as Error, variables);
    },
    
    onSuccess: (data, variables) => {
      onSuccess?.(data, variables);
    },
    
    onSettled: () => {
      // Optionally refetch after mutation settles to ensure sync
      // queryClient.invalidateQueries({ queryKey });
    },
  });
}

export default useOptimisticMutation;
