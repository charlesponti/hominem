import React, { useCallback, useEffect, useState } from 'react'
import ReactDOM from 'react-dom'
import styled from 'styled-components'
import Stream from './components/Stream.js'
import StreamControls from './components/StreamControls.js'
import { getPositions } from './services/positions'
import generateNotificationText from './utils'

const Wrap = styled.div`
	width: 100%;
	height: 100vh;
	display: flex;
	padding: 16px;
`

const ControlsColumn = styled.div`
	width: 180px;
	margin-right: 24px;
`

const StreamContainer = styled.div`
	width: 640px;
	height: 360px;
	position: relative;
	background-color: #000;
`

const initialStreams = {
  1: {
    id: '1',
    isSelf: true,
    isVideoOn: true,
    name: 'You',
    src: `https://res.cloudinary.com/streamyard-dev/video/upload/v1603796670/coding-interview/brian.webm`,
  },
  2: {
    id: '2',
    isSelf: false,
    isVideoOn: true,
    name: 'Maya',
    src: `https://res.cloudinary.com/streamyard-dev/video/upload/v1603796768/coding-interview/maya.webm`,
  },
  3: {
    id: '3',
    isSelf: false,
    isVideoOn: true,
    name: 'Larry',
    src: `https://res.cloudinary.com/streamyard-dev/video/upload/v1603796670/coding-interview/larry.webm`,
  },
  4: {
    id: '4',
    isSelf: false,
    isVideoOn: true,
    name: 'Brenda',
    src: `https://res.cloudinary.com/streamyard-dev/video/upload/v1603796670/coding-interview/brenda.webm`,
  },
}

const Notification = styled.div`
	display: ${(props) => (props.shown ? 'flex' : 'none')};
	position: absolute;
	top: 5px;
	z-index: 1;
	text-align: center;
	color: white;
	width: 100%;
	transition: all 1s ease-in;
	justify-content: center;
`

const NotificationText = styled.p`
	background-color: grey;
	border-radius: 4px;
	margin: 0;
	padding: 3px;
`

const App = () => {
  const [streams, setStreams] = useState(initialStreams)
  const [notificationText, setNotificationText] = useState('')
  const [isNotificationShown, setNotifcationShown] = useState(false)

  // timeout if notification

  useEffect(() => {
    if (isNotificationShown) {
      setTimeout(() => {
        setNotifcationShown(false)
      }, 500)
    }

    return () => {}
  }, [isNotificationShown])

  const updateStream = useCallback(
    (stream) => {
      setStreams({ ...streams, [stream.id]: stream })
      const text = generateNotificationText(
        Object.keys(streams).reduce(
          (result, id) => {
            if (id !== stream.id) result.push(streams[id])
            return result
          },
          [stream]
        )
      )
      setNotificationText(text)

      setNotifcationShown(text.length)
    },
    [streams]
  )

  const positions = getPositions(streams)

  // Notification component
  // Stream onchange

  return (
    <Wrap>
      <ControlsColumn>
        {Object.values(streams).map((stream) => (
          <StreamControls key={stream.id} stream={stream} updateStream={updateStream} />
        ))}
      </ControlsColumn>
      <StreamContainer>
        <Notification shown={isNotificationShown} text={notificationText}>
          <NotificationText>{notificationText}</NotificationText>
        </Notification>
        {Object.values(streams).map((stream) => (
          <Stream key={stream.id} position={positions[stream.id]} stream={stream} />
        ))}
      </StreamContainer>
    </Wrap>
  )
}

ReactDOM.render(<App />, document.getElementById('root'))
