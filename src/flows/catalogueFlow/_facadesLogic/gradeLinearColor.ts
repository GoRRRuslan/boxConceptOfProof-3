import type { TColorRgba } from '@flows/catalogueFlow/_types'

// The colour grade of the scene: a touch more saturation and contrast. It is applied to the colours of the boxes (the only coloured
// thing in the scene), the same way in all three repositories, so it costs no frame (no extra full-screen pass) and looks the same
// on every engine. Linear RGB in, linear RGB out.
export const COLOR_GRADE_SATURATION = 1.08
export const COLOR_GRADE_CONTRAST = 1.05
// Middle grey in linear light: the contrast turns around it.
const MIDDLE_GREY = 0.18

export const gradeLinearColor = ([red, green, blue, alpha]: TColorRgba): TColorRgba => {
  const luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue

  const grade = (channel: number): number => {
    const saturated = luminance + (channel - luminance) * COLOR_GRADE_SATURATION

    return Math.max(0, MIDDLE_GREY + (saturated - MIDDLE_GREY) * COLOR_GRADE_CONTRAST)
  }

  return [grade(red), grade(green), grade(blue), alpha]
}
