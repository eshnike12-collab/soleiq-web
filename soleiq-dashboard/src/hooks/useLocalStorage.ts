import { useState } from 'react'

export function useLocalStorage<T>(key: string, initialValue: T): [T, (v: T) => void] {
  const [stored, setStored] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch {
      return initialValue
    }
  })
  const setValue = (value: T) => {
    setStored(value)
    localStorage.setItem(key, JSON.stringify(value))
  }
  return [stored, setValue]
}
