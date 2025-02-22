import React, { useCallback, useState } from 'react'
import ReactDOM from 'react-dom'
import Stream from './Stream.js'

const App = () => {
  const [mediaStream, setMediaStream] = useState()

  const captureScreen = useCallback(() => {
    navigator.mediaDevices
      .getDisplayMedia({
        audio: false,
        video: {
          width: { max: 1920 },
          height: { max: 1080 },
        },
      })
      .then((newStream) => setMediaStream(newStream))
      .catch((error) => {
        console.error('Screen capture failed', error)
      })
  }, [])

  const disabled = !!mediaStream

  return (
    <div>
      <button
        disabled={disabled}
        onClick={captureScreen}
        style={{
          display: 'block',
          width: '200px',
          height: '50px',
          marginBottom: '16px',
          fontSize: '15px',
          borderRadius: '5px',
          background: '#794fff',
          color: '#fff',
          opacity: disabled ? 0.4 : 1,
          cursor: disabled ? 'default' : 'pointer',
        }}
      >
        Capture Screen
      </button>
      {mediaStream && (
        <Stream
          // You may want to play around with these container size props to ensure the
          // Stream component can handle various sizes/aspect ratios
          containerHeight={360}
          containerWidth={640}
          mediaStream={mediaStream}
        />
      )}
    </div>
  )
}

ReactDOM.render(<App />, document.getElementById('root'))
