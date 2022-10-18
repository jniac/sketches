
export const injectBefore = (source, pattern, injectedCode) => {
  return source.replace(pattern, `${injectedCode}\n${pattern}`)
}

export const injectAfter = (source, pattern, injectedCode) => {
  return source.replace(pattern, `${pattern}\n${injectedCode}`)
}
