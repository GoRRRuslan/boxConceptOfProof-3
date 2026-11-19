// Formats integer cents as US dollars, e.g. 150000 -> "$1,500". Whole dollars only.
export const formatCurrency = (amountInCents: number): string => {
  const dollars = Math.round(amountInCents / 100)

  return `$${dollars.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`
}
