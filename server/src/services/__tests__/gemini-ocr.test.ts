import { describe, it, expect } from 'vitest'
import { pickModelForOcr } from '../gemini-ocr.service'

// ── Model picker — pure function, no Gemini SDK call ──────────────────────
// Routing decision is always input-driven: images → pro, large PDFs → pro,
// small PDFs → flash. Model IDs themselves are overridable via
// GEMINI_MODEL_FLASH / GEMINI_MODEL_PRO env vars (covered by the service
// reading them at import time — not retested here).

const FLASH = 'gemini-2.5-flash'
const PRO   = 'gemini-2.5-pro'

describe('pickModelForOcr — image inputs always route to pro', () => {
  for (const mime of ['image/jpeg', 'image/png', 'image/webp']) {
    it(`${mime} → pro`, () => {
      const r = pickModelForOcr(mime, 100)
      expect(r.model).toBe(PRO)
      expect(r.reason).toBe('image-input')
    })
  }
})

describe('pickModelForOcr — PDF size routing', () => {
  it('small PDF (~100 KB raw) → flash', () => {
    // 100 KB raw ≈ 133 KB base64
    const r = pickModelForOcr('application/pdf', 133_000)
    expect(r.model).toBe(FLASH)
    expect(r.reason).toBe('small-digital-pdf')
  })

  it('large PDF (~600 KB raw) → pro', () => {
    // 600 KB raw ≈ 800 KB base64 — over the 500 KB threshold
    const r = pickModelForOcr('application/pdf', 800_000)
    expect(r.model).toBe(PRO)
    expect(r.reason).toBe('large-pdf')
  })

  it('PDF right at the boundary (~500 KB raw) → flash', () => {
    // base64 length 666_666 → 500 KB raw (boundary — not strictly over)
    const r = pickModelForOcr('application/pdf', 666_666)
    expect(r.model).toBe(FLASH)
    expect(r.reason).toBe('small-digital-pdf')
  })

  it('PDF just over the boundary → pro', () => {
    // 700_000 base64 ≈ 525 KB raw
    const r = pickModelForOcr('application/pdf', 700_000)
    expect(r.model).toBe(PRO)
    expect(r.reason).toBe('large-pdf')
  })
})
