import React from 'react'
import PropTypes from 'prop-types'

const VideoCam = ({ fill, size, ...otherProps }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={fill}
    {...otherProps}
  >
    <path d="M0 0h24v24H0z" fill="none" />
    <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" />
  </svg>
)

VideoCam.propTypes = {
  size: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  fill: PropTypes.string,
}

VideoCam.defaultProps = {
  size: 24,
  fill: '#555',
}

export default VideoCam
