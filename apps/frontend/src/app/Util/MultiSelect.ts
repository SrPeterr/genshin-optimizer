import { toggleArr } from "./Util"

export function handleMultiSelect<T>(allKeys: T[]) {
  return (arr: T[], v: T): T[] => {
    const len = arr.length
    if (len === 0) return [v]
    if (len === 1 && arr[0] === v) return []
    return [...new Set(toggleArr(arr, v))]
  }
}
