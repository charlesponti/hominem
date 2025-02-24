function getPositions(streams) {
  const streamsWithVideoCount = Object.values(streams).filter((s) => s.isVideoOn).length

  const positions = {}

  // Position all streams that have video on
  Object.keys(streams)
    .filter((id) => streams[id].isVideoOn)
    .forEach((id, i) => {
      const width = 100 / streamsWithVideoCount

      positions[id] = {
        height: 100,
        width,
        x: width * i,
        y: 0,
      }
    })

  // Hide streams with video off
  Object.keys(streams)
    .filter((id) => !streams[id].isVideoOn)
    .forEach((id) => {
      positions[id] = {
        height: 0,
        width: 0,
        x: 0,
        y: 0,
      }
    })

  return positions
}

// eslint-disable-next-line import/prefer-default-export
export { getPositions }
