import { EBoxIdentifier, EWatchIdentifier, type IMysteryBox } from '@networking/api/MysteryBoxApi/_types'

export const BOX_CATALOGUE: IMysteryBox[] = [
  {
    identifier: EBoxIdentifier.Starter,
    name: 'Starter Box',
    priceInCents: 5_000,
    colorHex: '#5B8DEF',
    dropTable: [
      { watchIdentifier: EWatchIdentifier.Casio, weight: 70 },
      { watchIdentifier: EWatchIdentifier.Perpetual, weight: 25 },
      { watchIdentifier: EWatchIdentifier.Gmt, weight: 5 },
    ],
  },
  {
    identifier: EBoxIdentifier.Classic,
    name: 'Classic Box',
    priceInCents: 15_000,
    colorHex: '#2AA876',
    dropTable: [
      { watchIdentifier: EWatchIdentifier.Casio, weight: 40 },
      { watchIdentifier: EWatchIdentifier.Perpetual, weight: 40 },
      { watchIdentifier: EWatchIdentifier.Gmt, weight: 18 },
      { watchIdentifier: EWatchIdentifier.SkyDweller, weight: 2 },
    ],
  },
  {
    identifier: EBoxIdentifier.Elite,
    name: 'Elite Box',
    priceInCents: 40_000,
    colorHex: '#9B59D0',
    dropTable: [
      { watchIdentifier: EWatchIdentifier.Perpetual, weight: 50 },
      { watchIdentifier: EWatchIdentifier.Gmt, weight: 40 },
      { watchIdentifier: EWatchIdentifier.SkyDweller, weight: 10 },
    ],
  },
  {
    // More expensive than the starting balance on purpose: exercises the "cannot afford" state.
    identifier: EBoxIdentifier.Legend,
    name: 'Legend Box',
    priceInCents: 120_000,
    colorHex: '#E0A526',
    dropTable: [
      { watchIdentifier: EWatchIdentifier.Gmt, weight: 55 },
      { watchIdentifier: EWatchIdentifier.SkyDweller, weight: 45 },
    ],
  },
  {
    identifier: EBoxIdentifier.Chrono,
    name: 'Chrono Box',
    priceInCents: 8_000,
    colorHex: '#E4572E',
    dropTable: [
      { watchIdentifier: EWatchIdentifier.Casio, weight: 60 },
      { watchIdentifier: EWatchIdentifier.Perpetual, weight: 35 },
      { watchIdentifier: EWatchIdentifier.Gmt, weight: 5 },
    ],
  },
  {
    identifier: EBoxIdentifier.Aviator,
    name: 'Aviator Box',
    priceInCents: 25_000,
    colorHex: '#17BEBB',
    dropTable: [
      { watchIdentifier: EWatchIdentifier.Perpetual, weight: 55 },
      { watchIdentifier: EWatchIdentifier.Gmt, weight: 40 },
      { watchIdentifier: EWatchIdentifier.SkyDweller, weight: 5 },
    ],
  },
  {
    identifier: EBoxIdentifier.Diver,
    name: 'Diver Box',
    priceInCents: 60_000,
    colorHex: '#3A5BA0',
    dropTable: [
      { watchIdentifier: EWatchIdentifier.Gmt, weight: 65 },
      { watchIdentifier: EWatchIdentifier.SkyDweller, weight: 35 },
    ],
  },
  {
    identifier: EBoxIdentifier.Grand,
    name: 'Grand Box',
    priceInCents: 250_000,
    colorHex: '#C0392B',
    dropTable: [
      { watchIdentifier: EWatchIdentifier.Gmt, weight: 30 },
      { watchIdentifier: EWatchIdentifier.SkyDweller, weight: 70 },
    ],
  },
]
