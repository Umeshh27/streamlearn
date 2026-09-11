import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getAuthUser } from "../lib/api";

const useAuthUser = () => {
  const queryClient = useQueryClient();
  const authUser = useQuery({
    queryKey: ["authUser"],
    queryFn: async () => {
      const data = await getAuthUser();
      if (data?.streamToken) {
        queryClient.setQueryData(["streamToken"], { token: data.streamToken });
      }
      return data;
    },
    retry: 1, // retry once on transient network blip before redirecting
    staleTime: 1000 * 60 * 5, // keep auth user fresh for 5 minutes across route changes
  });

  return {
    isLoading: authUser.isPending || (authUser.isLoading && !authUser.data),
    isFetching: authUser.isFetching,
    authUser: authUser.data?.user,
  };
};
export default useAuthUser;
