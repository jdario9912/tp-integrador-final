import { Search } from 'lucide-react'
import { TextInput, type TextInputProps } from './TextInput'

export type SearchInputProps = Omit<TextInputProps, 'type' | 'leadingIcon'>

export function SearchInput(props: SearchInputProps) {
  return <TextInput type="search" leadingIcon={<Search />} {...props} />
}
