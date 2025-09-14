import type { HTMLAttributes } from "react";

type WrapProps = HTMLAttributes<HTMLParagraphElement>;
const Wrap = ({ children, ...props }: WrapProps) => (
	<p {...props}>{children}</p>
);

type PlaceStatusProps = WrapProps & {
	place: google.maps.places.PlaceResult;
};

const PlaceStatus = ({ place, ...props }: PlaceStatusProps) => {
	const opertional = place?.business_status === "OPERATIONAL";
	const permanentlyClosed = place?.business_status === "CLOSED_PERMANENTLY";
	const temporarilyClosed = place?.business_status === "CLOSED_TEMPORARILY";
	const isOpen = place?.opening_hours?.isOpen();

	if (!place?.business_status) {
		return null;
	}

	if (opertional && isOpen) {
		return (
			<Wrap {...props}>
				<span className="text-green-500 font-semibold mr-2">Open today</span>
				<br />
				{
					// Only show opening hours for today
					place.opening_hours?.weekday_text?.[new Date().getDay()]
						.replace(/[a-zA-Z]+: /, "")
						.replace(/–/g, " to ")
				}
			</Wrap>
		);
	}

	if (opertional && !isOpen) {
		return (
			<Wrap {...props}>
				<span className="text-red-500 font-semibold">Closed </span>
				<span>
					{/* Display "Opens <day they are next open> from" */}
					<span>Opens again </span>
					{
						// Display the the opening hours for the next day they are open
						place.opening_hours?.weekday_text?.[(new Date().getDay() + 1) % 7]
							.replace(/: /, " at ")
							.replace(/–/g, " to ")
					}
				</span>
			</Wrap>
		);
	}

	return (
		<Wrap {...props}>
			<span className="font-semibold">Status:</span>{" "}
			{
				// If permanently closed, show sad message
				permanentlyClosed && (
					<>
						<span className="font-semibold">Permanently Closed</span> 😢
					</>
				)
			}
			{
				// If temporarily closed, show a uplifting message
				temporarilyClosed && (
					<>
						<span className="font-semibold">
							Temporarily Closed but will return
						</span>
						🤞
					</>
				)
			}
		</Wrap>
	);
};

export default PlaceStatus;
