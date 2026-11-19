declare module '*.glb' {
  const assetModule: number

  export default assetModule
}

declare module '*.webp' {
  const imageModule: number

  export default imageModule
}

declare module '*.wav' {
  const soundModule: number

  export default soundModule
}
