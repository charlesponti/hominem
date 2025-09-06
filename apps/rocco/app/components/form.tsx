import { Form } from "formik";
import styles from "./form.module.css";

type StyledFormProps = {
	children: React.ReactNode;
};

const StyledForm = ({ children }: StyledFormProps) => {
	return <Form className={styles.wrap}>{children}</Form>;
};

export default StyledForm;
