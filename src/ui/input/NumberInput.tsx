import { TextInput, type TextInputProps } from './TextInput'

export type NumberInputProps = Omit<TextInputProps, 'type' | 'leadingIcon'>

// inputMode decimal: teclado numérico con coma/punto en móvil
export function NumberInput({
  inputMode = 'decimal',
  ...rest
}: NumberInputProps) {
  return <TextInput type="number" inputMode={inputMode} {...rest} />
}
