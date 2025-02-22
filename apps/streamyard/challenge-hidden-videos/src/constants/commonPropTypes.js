import PropTypes from 'prop-types'

export const streamPropType = PropTypes.shape({
  id: PropTypes.string.isRequired,
  isSelf: PropTypes.bool.isRequired,
  isVideoOn: PropTypes.bool.isRequired,
  name: PropTypes.string.isRequired,
})

export const positionPropType = PropTypes.shape({
  height: PropTypes.number.isRequired,
  width: PropTypes.number.isRequired,
  x: PropTypes.number.isRequired,
  y: PropTypes.number.isRequired,
})
