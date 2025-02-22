export interface BulletPoint {
  text: string
  subPoints?: BulletPoint[]
}

export interface EnhancedBulletPoint extends BulletPoint {
  improvedText: string
  categories: string[]
}

declare module '*.md' {
  const content: string

  export default content
}
