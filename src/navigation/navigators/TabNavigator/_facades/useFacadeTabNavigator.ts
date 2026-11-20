import { useTranslation } from 'react-i18next'

export const useFacadeTabNavigator = () => {
  const { t } = useTranslation()

  return {
    catalogueLabelText: t('tabs.catalogue'),
    collectionLabelText: t('tabs.collection'),
  }
}
