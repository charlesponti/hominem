import { AlertCircle, CheckCircle, Info, XCircle } from "lucide-react";
import { useState } from "react";
import styles from "./alert.module.css";

export type AlertType = "success" | "error" | "warning" | "info";

interface AlertProps {
	type: AlertType;
	children: React.ReactNode;
	dismissible?: boolean;
	onDismiss?: () => void;
}

const Alert = ({
	type,
	children,
	dismissible = false,
	onDismiss,
}: AlertProps) => {
	const [isVisible, setIsVisible] = useState(true);

	const handleDismiss = () => {
		setIsVisible(false);
		onDismiss?.();
	};

	if (!isVisible) {
		return null;
	}

	const getIcon = () => {
		switch (type) {
			case "success":
				return <CheckCircle size={20} />;
			case "error":
				return <XCircle size={20} />;
			case "warning":
				return <AlertCircle size={20} />;
			case "info":
				return <Info size={20} />;
			default:
				return <Info size={20} />;
		}
	};

	const alertClasses = [styles.container, styles[type]].join(" ");

	const iconClasses = [
		styles.iconWrapper,
		styles[`icon${type.charAt(0).toUpperCase() + type.slice(1)}`],
	].join(" ");

	return (
		<div className={alertClasses}>
			<div className={iconClasses}>{getIcon()}</div>
			<div className={styles.content}>{children}</div>
			{dismissible && (
				<button
					type="button"
					className={styles.dismissButton}
					onClick={handleDismiss}
					aria-label="Dismiss alert"
				>
					<XCircle size={16} />
				</button>
			)}
		</div>
	);
};

export default Alert;
