import styled from '@emotion/styled'
import { Form } from 'formik'

const Wrap = styled(Form)`
  display: flex;
  flex-direction: column;
  gap: 24px;

  & > * {
    flex: 1;
  }
`

type StyledFormProps = {
  children: React.ReactNode
}
const StyledForm = ({ children }: StyledFormProps) => {
  return <Wrap>{children}</Wrap>
}

export default StyledForm
