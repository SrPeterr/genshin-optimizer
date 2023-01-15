import { Favorite } from "@mui/icons-material"
import { Autocomplete, AutocompleteProps, Chip, ListItemIcon, ListItemText, MenuItem, Skeleton, TextField, useTheme } from "@mui/material"
import { Suspense, useMemo } from "react"
import { Variant } from "../Formula/type"
import ColorText from "./ColoredText"
/**
 * NOTE: the rationale behind toImg/toExlabel/toExItemLabel, is because `options` needs to be serializable, and having JSX in there will disrupt seralizability.
 */
export type GeneralAutocompleteOption<T extends string> = { key: T, label: string, grouper?: string | number, variant?: Variant, favorite?: boolean }
type GeneralAutocompletePropsBase<T extends string> = {
  label?: string,
  defaultText?: string
  toImg: (v: T) => JSX.Element | undefined,
  toExItemLabel?: (v: T) => Displayable | undefined,
  toExLabel?: (v: T) => Displayable | undefined,
  clearKey?: T
}
export type GeneralAutocompleteProps<T extends string> = GeneralAutocompletePropsBase<T> & { valueKey: T, onChange: (v: T) => void, } &
  Omit<AutocompleteProps<GeneralAutocompleteOption<T>, false, true, false>, "renderInput" | "isOptionEqualToValue" | "renderOption" | "onChange" | "value">
export function GeneralAutocomplete<T extends string>({ options, valueKey: key, label, onChange, clearKey, toImg, toExItemLabel, toExLabel, defaultText, ...acProps }: GeneralAutocompleteProps<T>) {
  const value = findOption(options, key, defaultText)
  const theme = useTheme()
  return <Autocomplete
    autoHighlight
    options={options}
    value={value}
    clearIcon={key !== clearKey ? undefined : null}
    onChange={(event, newValue, reason) => {
      if (reason === "clear" && clearKey !== undefined) return onChange(clearKey)
      return newValue !== null && onChange(newValue.key)
    }}
    isOptionEqualToValue={(option, value) => option.key === value.key}
    renderInput={(params) => {
      const variant = value.variant
      const color = variant ? theme.palette[variant]?.main : undefined
      return <TextField
        {...params}
        label={label}
        InputProps={{
          ...params.InputProps,
          startAdornment: value !== undefined ? toImg(value.key) : undefined,
        }}
        inputProps={{
          ...params.inputProps,
          autoComplete: 'new-password', // disable autocomplete and autofill
          style: { color }
        }}
        color={key ? "success" : "primary"}
      />
    }}
    renderOption={(props, option) => <MenuItem value={option.key} {...props}>
      <ListItemIcon>{toImg(option.key)}</ListItemIcon>
      <ListItemText color={option.variant}>
        <Suspense fallback={<Skeleton variant="text" width={100} />}>
          <ColorText color={option.variant} sx={{ display: "flex", gap: 1 }}>
            {option.key === value?.key ? <strong>{option.label}</strong> : <span>{option.label}</span>}
            {toExItemLabel?.(option.key)}
          </ColorText>
        </Suspense>
      </ListItemText>
      {!!option.favorite && <Favorite />}
    </MenuItem>}
    {...acProps}
  />
}
export type GeneralAutocompleteMultiProps<T extends string> = GeneralAutocompletePropsBase<T> & { valueKeys: T[], onChange: (v: T[]) => void, } &
  Omit<AutocompleteProps<GeneralAutocompleteOption<T>, true, true, false>, "renderInput" | "isOptionEqualToValue" | "renderOption" | "onChange" | "value">
export function GeneralAutocompleteMulti<T extends string>({ options, valueKeys: keys, label, onChange, toImg, toExItemLabel, toExLabel, defaultText, ...acProps }: GeneralAutocompleteMultiProps<T>) {
  const value = useMemo(() => keys.map(k => findOption(options, k, defaultText)), [options, defaultText, keys])
  return <Autocomplete
    autoHighlight
    options={options}
    multiple
    disableCloseOnSelect
    value={value}
    onChange={(event, newValue, reason) => {
      if (reason === "clear") return onChange([])
      return newValue !== null && onChange(newValue.map(v => v.key))
    }}
    isOptionEqualToValue={(option, value) => option.key === value.key}
    renderInput={params => <TextField
      {...params}
      label={label}
      inputProps={{
        ...params.inputProps,
        autoComplete: 'new-password', // disable autocomplete and autofill
      }}
      color={keys.length ? "success" : "primary"}
    />}
    renderOption={(props, option) => <MenuItem value={option.key} {...props}>
      <ListItemIcon>{toImg(option.key)}</ListItemIcon>
      <ListItemText >
        <Suspense fallback={<Skeleton variant="text" width={100} />}>
          <ColorText color={option.variant} sx={{ display: "flex", gap: 1 }}>
            {keys.includes(option.key) ? <strong>{option.label}</strong> : <span>{option.label}</span>}
            {toExItemLabel?.(option.key)}
          </ColorText>
        </Suspense>
      </ListItemText>
      {!!option.favorite && <Favorite />}
    </MenuItem>}
    renderTags={(selected, getTagProps) => selected.map(({ key, label, variant }, index) => {
      return <Chip {...getTagProps({ index })} key={index + key + label} icon={toImg(key)} label={toExLabel ? <span>{label} {toExLabel(key)}</span> : label} color={variant} />
    })}
    {...acProps}
  />
}
function findOption<T extends string>(options: readonly GeneralAutocompleteOption<T>[], key: T, label = "ERROR") {
  return options.find(o => o.key === key) ?? { key: "" as T, label }
}
