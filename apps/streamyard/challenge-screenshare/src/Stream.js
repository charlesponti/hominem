import PropTypes from "prop-types";
import React, { useEffect, useRef, useState } from "react";
import MoreVerticalIcon from "./MoreVerticalIcon";

/**
 * Construct calculators for menu position
 *
 * @param {*} containerHeight
 * @param {*} containerWidth
 * @param {*} containerAspectRatio
 */
function PositionCalculators(
	containerHeight,
	containerWidth,
	containerAspectRatio,
) {
	return {
		/**
		 * If the video's aspect ratio is below that of the container, the video's height
		 * will be less than that of the container.
		 *
		 * To determine the correct top position of the menu icon, we must determine
		 * what the container's height would be if the container matched the video's
		 * aspect ratio.
		 *
		 * 1. Multiply the `containerWidth` by the video's aspect ratio
		 * 2. Subtract the result from the `containerHeight`
		 * 3. Divide the result by 2 because there will be black bars above and below the video within the container.
		 * 4. Add 4 so that the menu icon is within the video instead of directly along the top.
		 *
		 * If the aspect ratio of the video is equal to or above that of the container, the height
		 * of the video will match that of the container.
		 */
		getTopPosition(aspectRatio) {
			return aspectRatio < containerAspectRatio
				? (containerHeight - containerWidth * aspectRatio) / 2 + 4
				: 4;
		},
		/**
		 * If the aspect ratio of the video is above that of the container, the width
		 * of the video will be less than that of the container.
		 *
		 * In order to determine the correct right position of the menu icon, we must determine
		 * what the width of the container would be if the container matched the video's
		 * aspect ratio. We do this is multiplying the containerHeight by the video's aspect ratio
		 * and substracting the result from the container's width. We then divide by 2 because
		 * there will be black bars to the left and rigth of the video within the container.
		 *
		 * Lastly, we add 4 so that the menu icon is within the video instead of directly along the right.
		 *
		 * If the aspect ratio of the video is equal to or above that of the container, the width
		 * of the video will match that of the container.
		 */
		getRightPosition: (aspectRatio) =>
			aspectRatio > containerAspectRatio
				? (containerWidth - containerHeight / aspectRatio) / 2 + 4
				: 4,
	};
}

const Stream = ({ containerHeight, containerWidth, mediaStream }) => {
	const videoRef = useRef();
	const [iconTop, setIconTop] = useState(4);
	const [iconRight, setIconRight] = useState(4);
	const [prevRatio, setPrevRatio] = useState(0);
	const containerAspectRatio = containerHeight / containerWidth;
	const { getTopPosition, getRightPosition } = PositionCalculators(
		containerHeight,
		containerWidth,
		containerAspectRatio,
	);

	useEffect(() => {
		videoRef.current.srcObject = mediaStream;
	}, [mediaStream]);

	useEffect(() => {
		const interval = setInterval(() => {
			const {
				current: { videoHeight, videoWidth },
			} = videoRef;

			const videoAspectRatio = videoHeight / videoWidth;

			// Only set icon top and right is aspect ratio is different from
			// container or the aspect ratio has not changed. there has to be
			// an onchange event or something to listen to here
			if (containerAspectRatio === videoAspectRatio) return;
			if (prevRatio === videoAspectRatio) return;

			// Set new aspect ratio
			setPrevRatio(videoAspectRatio);
			setIconTop(getTopPosition(videoAspectRatio));
			setIconRight(getRightPosition(videoAspectRatio));
		}, 100);

		return () => clearInterval(interval);
	}, [containerAspectRatio, getRightPosition, getTopPosition, prevRatio]);

	return (
		<div
			style={{
				width: `${containerWidth}px`,
				height: `${containerHeight}px`,
				position: "relative",
				backgroundColor: "black",
			}}
		>
			<video
				autoPlay
				muted
				ref={videoRef}
				style={{ width: "100%", height: "100%" }}
			/>
			<MoreVerticalIcon
				fill="#fff"
				style={{
					position: "absolute",
					top: `${iconTop}px`,
					right: `${iconRight}px`,
					backgroundColor: "#333",
					borderRadius: "2px",
					transition: "all 125ms ease 0s",
				}}
			/>
		</div>
	);
};

Stream.propTypes = {
	containerHeight: PropTypes.number.isRequired,
	containerWidth: PropTypes.number.isRequired,
	mediaStream: PropTypes.object.isRequired,
};

export default Stream;
