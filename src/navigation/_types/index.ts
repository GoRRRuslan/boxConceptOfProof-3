export enum ETabRoute {
  Catalogue = 'Catalogue',
  Collection = 'Collection',
}

export type TTabParamList = {
  // The catalogue hides the tab bar (it stays invisible and untouchable, but keeps its place) while a prize is shown.
  [ETabRoute.Catalogue]: { isTabBarHidden?: boolean } | undefined
  [ETabRoute.Collection]: undefined
}
