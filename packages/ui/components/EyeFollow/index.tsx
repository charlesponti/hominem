import styled from '@emotion/styled'
import { useCallback, useEffect, useMemo, useState } from 'react'

const HEAD_SIZE = 100
const HEAD_RADIUS = HEAD_SIZE / 2

const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
`

const Head = styled.div<{ background: string }>`
  background-color: ${({ background }) => background};
  border-radius: 4px;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 24px;
  height: ${HEAD_SIZE}px;
  width: ${HEAD_SIZE}px;
`

const Eye = styled.div`
  border-radius: 50%;
  position: relative;
`

const EyePupil = styled.div`
  width: 8px;
  height: 8px;
  background-color: #000;
  border-radius: 50%;
  position: absolute;
  top: 50%;
  right: 0;
`

const EyeFollow = () => {
  const [eyeRotation, setEyeRotation] = useState(0)
  const head = document.querySelector('.head')
  const headPosition = useMemo(() => {
    const headRect = head?.getBoundingClientRect()
    const headX = headRect?.left as number
    const headY = headRect?.top as number
    return {
      top: headX + HEAD_RADIUS,
      left: headY + HEAD_RADIUS,
    }
  }, [head])

  const onMouseMove = useCallback(
    (e: MouseEvent) => {
      const mouseDistanceFromTop = e.clientX
      const mouseDistanceFromLeft = e.clientY

      // The angle of the mouse position relative to the center of the head.
      const angle = Math.atan2(
        mouseDistanceFromLeft - headPosition.left,
        mouseDistanceFromTop - headPosition.top
      )

      // Convert radians to degrees.
      const angleDegrees = (angle * 180) / Math.PI

      // Set the eye rotation. Using 20 as a modifier to make the eyes look
      // at the center of cursor.
      setEyeRotation(angleDegrees - 20)
    },
    [headPosition]
  )

  useEffect(() => document.addEventListener('mousemove', onMouseMove), [onMouseMove])

  return (
    <Wrap>
      <Head className="head" background="red">
        <Eye
          className="w-6 h-6 bg-white rounded-full"
          style={{ transform: `rotate(${eyeRotation}deg)` }}
        >
          <EyePupil />
        </Eye>
        <Eye
          className="w-6 h-6 bg-white rounded-full"
          style={{ transform: `rotate(${eyeRotation}deg)` }}
        >
          <EyePupil />
        </Eye>
      </Head>
    </Wrap>
  )
}

export default EyeFollow
