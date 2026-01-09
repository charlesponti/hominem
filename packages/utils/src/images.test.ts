import { describe, expect, it } from 'vitest'
import { getHominemPhotoURL } from './images.js'

describe('getHominemPhotoURL', () => {
  it('returns null for empty input', () => {
    expect(getHominemPhotoURL('', 800, 600)).toBeNull()
  })

  it('returns supabase URLs unchanged', () => {
    const url = 'https://xyz.supabase.co/storage/v1/object/public/places/abc.jpg'
    expect(getHominemPhotoURL(url, 800, 600)).toBe(url)
  })

  it('builds proxy URL for Google Places reference', () => {
    const ref = 'places/ChIJ.../photos/abcd'
    const out = getHominemPhotoURL(ref, 640, 480)
    expect(out).toBe(`/api/images?resource=${encodeURIComponent(ref)}&width=640&height=480`)
  })

  it('appends dimensions to googleusercontent URLs', () => {
    const url = 'https://lh3.googleusercontent.com/abc'
    expect(getHominemPhotoURL(url, 320, 200)).toBe(`${url}=w320-h200-c`)
  })
})
