import PropTypes from 'prop-types'
import React, { useCallback } from 'react'
import styled from 'styled-components'
import { streamPropType } from '../constants/commonPropTypes'
import VideoCam from '../icons/VideoCam'
import VideoCamOff from '../icons/VideoCamOff'

const Wrap = styled.div`
	width: 100%;
	padding: 8px 16px;
	margin-bottom: 16px;
	display: flex;
	align-items: center;
	border: 1px solid #d3d3d3;
	border-radius: 5px;
`

const Name = styled.span`
	flex: 1;
	margin-right: 16px;
`

const CameraButton = styled.button`
	width: 36px;
	height: 36px;
	flex: 0 0 auto;
	display: flex;
	justify-content: center;
	align-items: center;
	padding: 0;
	background: none;
	border: none;
	outline: none;
	cursor: pointer;
`

const StreamControls = ({ stream, updateStream }) => {
  const onCameraClick = useCallback(
    () => updateStream({ ...stream, isVideoOn: !stream.isVideoOn }),
    [stream, updateStream]
  )

  return (
    <Wrap>
      <Name>{stream.name}</Name>
      <CameraButton onClick={onCameraClick}>
        {stream.isVideoOn ? <VideoCam /> : <VideoCamOff />}
      </CameraButton>
    </Wrap>
  )
}

StreamControls.propTypes = {
  stream: streamPropType.isRequired,
  updateStream: PropTypes.func.isRequired,
}

export default StreamControls
