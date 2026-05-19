import { describe, it, expect } from 'vitest'
import { toArray } from '../utils'

// `toArray` is the canonical defence against "X.find is not a function"
// crashes when a useQuery result is briefly undefined / null / unexpectedly
// shaped during initial load, refetch, or backend response drift. Every
// callsite that immediately invokes `.find`/`.filter`/`.map` relies on this
// returning an array unconditionally.

describe('toArray', () => {
  it('returns a bare array unchanged', () => {
    const a = [1, 2, 3]
    expect(toArray<number>(a)).toBe(a)
  })

  it('empty array → empty array (same reference)', () => {
    const a: number[] = []
    expect(toArray(a)).toBe(a)
  })

  it('unwraps the paginated envelope `{ data: [...] }`', () => {
    const r = { data: [{ id: 'x' }, { id: 'y' }], total: 2 }
    expect(toArray<{ id: string }>(r)).toEqual([{ id: 'x' }, { id: 'y' }])
  })

  it('paginated envelope with empty data → empty array', () => {
    expect(toArray({ data: [], total: 0, nextCursor: null })).toEqual([])
  })

  it('null input → empty array (the original bug — null slips past default destructure)', () => {
    expect(toArray(null)).toEqual([])
  })

  it('undefined input → empty array', () => {
    expect(toArray(undefined)).toEqual([])
  })

  it('plain object without `data` field → empty array (no crash)', () => {
    expect(toArray({ foo: 'bar' })).toEqual([])
  })

  it('object with non-array `data` field → empty array', () => {
    expect(toArray({ data: 'not an array' })).toEqual([])
    expect(toArray({ data: null })).toEqual([])
    expect(toArray({ data: 42 })).toEqual([])
  })

  it('string / number / boolean inputs → empty array (never crash)', () => {
    expect(toArray('hello')).toEqual([])
    expect(toArray(42)).toEqual([])
    expect(toArray(true)).toEqual([])
  })

  it('result is always safe to chain .find on', () => {
    // The whole point — every shape must support .find without throwing.
    const inputs: unknown[] = [null, undefined, {}, { data: null }, { data: [{ id: 'a' }] }, [{ id: 'b' }], 'string']
    for (const input of inputs) {
      const result = toArray<{ id: string }>(input)
      // Must not throw.
      expect(() => result.find(x => x.id === 'a')).not.toThrow()
      expect(() => result.filter(() => true)).not.toThrow()
      expect(() => result.map(x => x.id)).not.toThrow()
    }
  })
})
