import { memo, useMemo } from 'react'
import { StyleSheet, Text, View } from 'react-native'

const GLYPHS = ['+', '·', '~', '-', '/', '\\']

function createPattern(rows: number, cols: number) {
  const lines: string[] = []
  for (let row = 0; row < rows; row += 1) {
    let line = ''
    for (let col = 0; col < cols; col += 1) {
      const index = (row * 17 + col * 13) % GLYPHS.length
      line += GLYPHS[index]
    }
    lines.push(line)
  }
  return lines.join('\n')
}

export const AsciiTexture = memo(() => {
  const pattern = useMemo(() => createPattern(18, 34), [])
  return (
    <View pointerEvents="none" style={styles.container}>
      <Text style={styles.pattern}>{pattern}</Text>
    </View>
  )
})

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  pattern: {
    color: '#FFFFFF',
    opacity: 0.12,
    fontFamily: 'Geist Mono',
    fontSize: 12,
    lineHeight: 12,
  },
})
