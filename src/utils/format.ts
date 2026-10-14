export const format = (value: number | null, digits = 1) => value === null ? '—' : (Math.abs(value) < .5 * 10 ** -digits ? 0 : value).toFixed(digits);
