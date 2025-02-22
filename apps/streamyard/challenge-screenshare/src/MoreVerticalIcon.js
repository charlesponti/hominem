import React from 'react'
import PropTypes from 'prop-types'

const MoreVerticalIcon = ({ fill, size, ...otherProps }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={fill}
    {...otherProps}
  >
    <path d="M0 0h24v24H0z" fill="none" />
    <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
  </svg>
)

MoreVerticalIcon.propTypes = {
  size: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  fill: PropTypes.string,
}

MoreVerticalIcon.defaultProps = {
  size: 24,
  fill: '#555',
}

export default MoreVerticalIcon
