import { useMutation } from '@tanstack/react-query'

import useStore from '@models/mainStorage/_storeConfigured'
import MysteryBoxApi from '@networking/api/MysteryBoxApi'
import type { IMysteryBox } from '@networking/api/MysteryBoxApi/_types'
import { runBoxPurchase } from '@networking/requests/mutations/PurchaseMutations/_logic/runBoxPurchase'

export const usePostPurchaseBoxMutation = () => {
  // --------------------- Mutations ----------------------- //
  const { mutateAsync: mutatePurchaseBoxAsync, isPending: isPendingPurchaseBox } = useMutation({
    mutationFn: (box: IMysteryBox) => runBoxPurchase({ box, api: MysteryBoxApi, purchaseStore: useStore }),
  })

  return {
    mutatePurchaseBoxAsync,
    isPendingPurchaseBox,
  }
}
