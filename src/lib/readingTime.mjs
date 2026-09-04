export function estimateReadingTime(text) {
  const source = String(text ?? '')
  const cjkUnits = (source.match(/[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]/g) ?? []).length
  const latinText = source.replace(/[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]/g, ' ')
  const latinUnits = (latinText.match(/[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*/g) ?? []).length
  return Math.max(1, Math.ceil((cjkUnits + latinUnits) / 300))
}
