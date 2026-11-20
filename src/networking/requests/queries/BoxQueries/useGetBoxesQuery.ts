import { useQuery } from '@tanstack/react-query'

import MysteryBoxApi from '@networking/api/MysteryBoxApi'
import { EBoxQueryKeys } from '@networking/requests/_config'

export const useGetBoxesQuery = () => {
  const {
    data: boxesData,
    refetch: boxesRefetch,
    isLoading: isLoadingBoxes,
    isError: isErrorBoxes,
  } = useQuery({
    queryKey: [EBoxQueryKeys.GetBoxes],
    queryFn: () => MysteryBoxApi.getBoxes(),
  })

  return {
    boxesData,
    boxesRefetch,
    isLoadingBoxes,
    isErrorBoxes,
  }
}
