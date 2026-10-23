export function multipart(input: object): FormData {
  const data = new FormData()
  function append(key: string, value: unknown) {
    if (value instanceof File) data.append(key, value)
    else if (Array.isArray(value)) {
      if (!value.length) data.append(key, '')
      else value.forEach((v, i) => append(`${key}[${i}]`, v))
    } else if (value && typeof value === 'object')
      Object.entries(value).forEach(([k, v]) => append(`${key}[${k}]`, v))
    else if (value !== undefined)
      data.append(
        key,
        value == null ? '' : typeof value === 'boolean' ? (value ? '1' : '0') : String(value),
      )
  }
  Object.entries(input).forEach(([k, v]) => append(k, v))
  return data
}
