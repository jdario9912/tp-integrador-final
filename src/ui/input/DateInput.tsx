import { TextInput, type TextInputProps } from './TextInput'

export type DateInputProps = Omit<
  TextInputProps,
  'type' | 'leadingIcon' | 'suffix'
>

export function DateInput(props: DateInputProps) {
  return <TextInput type="date" {...props} />
}
