import styled from 'styled-components'
import React from 'react'
import { positionPropType, streamPropType } from '../constants/commonPropTypes'

const Wrapper = styled.div`
	position: absolute;
	width: ${(props) => props.position.width}%;
	height: ${(props) => props.position.height}%;
	left: ${(props) => props.position.x}%;
	top: ${(props) => props.position.y}%;
	overflow: hidden;
`

const Video = styled.video`
	width: 100%;
	height: 100%;
	object-fit: cover;
	position: absolute;
`

const NameTag = styled.span`
	max-width: 100%;
	padding: 4px 8px;
	position: absolute;
	left: 0;
	bottom: 0;
	overflow: hidden;
	background-color: #333;
	color: #fff;
`

const Stream = ({ position, stream }) => (
  <Wrapper position={position}>
    <Video autoPlay loop muted src={stream.src} />
    <NameTag>{stream.name}</NameTag>
  </Wrapper>
)

Stream.propTypes = {
  position: positionPropType.isRequired,
  stream: streamPropType.isRequired,
}

export default Stream
