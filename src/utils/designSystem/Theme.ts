export interface IThemePalette {
  Colors: {
    background: string
    surface: string
    card: string
    accent: string
    textPrimary: string
    textSecondary: string
    textOnAccent: string
    danger: string
    // Full-screen white of the reveal flash.
    flash: string
    // Dark veil behind a sheet, so the screen under it is still faintly visible.
    scrim: string
  }
}

export const theme: IThemePalette = {
  Colors: {
    background: '#0B0D12',
    surface: '#9A9484',
    card: '#151922',
    accent: '#7FB7C4',
    textPrimary: '#F5F1E8',
    textSecondary: '#9A9484',
    textOnAccent: '#0B0D12',
    danger: '#E4572E',
    flash: '#FFFFFF',
    scrim: 'rgba(5, 6, 9, 0.88)',
  },
}
