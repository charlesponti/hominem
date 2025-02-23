import React from 'react'
import PropTypes from 'prop-types'

const VideoCamOff = ({ fill, size, ...otherProps }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={fill}
    {...otherProps}
  >
    <path d="M0 0h24v24H0zm0 0h24v24H0z" fill="none" />
    <path d="M21 6.5l-4 4V7c0-.55-.45-1-1-1H9.82L21 17.18V6.5zM3.27 2L2 3.27 4.73 6H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.21 0 .39-.08.54-.18L19.73 21 21 19.73 3.27 2z" />
  </svg>
)

VideoCamOff.propTypes = {
  size: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  fill: PropTypes.string,
}

VideoCamOff.defaultProps = {
  size: 24,
  fill: '#555',
}

export default VideoCamOff
