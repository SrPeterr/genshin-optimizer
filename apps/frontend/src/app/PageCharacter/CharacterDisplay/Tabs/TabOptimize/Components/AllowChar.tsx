import { allArtifactSlotKeys, allElementKeys, allWeaponTypeKeys, CharacterKey, charKeyToLocCharKey, LocationCharacterKey, LocationKey } from "@genshin-optimizer/consts";
import SettingsIcon from '@mui/icons-material/Settings';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import { Box, Button, CardActionArea, CardContent, Divider, Grid, Stack, TextField, ToggleButton, Typography } from "@mui/material";
import { ChangeEvent, MouseEvent, useCallback, useContext, useDeferredValue, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import SlotIcon from "../../../../../Components/Artifact/SlotIcon";
import CardDark from "../../../../../Components/Card/CardDark";
import CardLight from "../../../../../Components/Card/CardLight";
import CharacterCardPico from "../../../../../Components/Character/CharacterCardPico";
import CloseButton from "../../../../../Components/CloseButton";
import InfoTooltip from "../../../../../Components/InfoTooltip";
import ModalWrapper from "../../../../../Components/ModalWrapper";
import SolidToggleButtonGroup from "../../../../../Components/SolidToggleButtonGroup";
import SqBadge from "../../../../../Components/SqBadge";
import ElementToggle from "../../../../../Components/ToggleButton/ElementToggle";
import WeaponToggle from "../../../../../Components/ToggleButton/WeaponToggle";
import { CharacterContext } from "../../../../../Context/CharacterContext";
import { getCharSheet } from "../../../../../Data/Characters";
import { DatabaseContext } from "../../../../../Database/Database";
import { allAllowLocationsState, AllowLocationsState } from "../../../../../Database/DataManagers/BuildSettingData";
import useBoolState from "../../../../../ReactHooks/useBoolState";
import useForceUpdate from "../../../../../ReactHooks/useForceUpdate";
import { iconInlineProps } from "../../../../../SVGIcons";
import { ICachedCharacter } from "../../../../../Types/character";
import { characterFilterConfigs } from "../../../../../Util/CharacterSort";
import { filterFunction } from "../../../../../Util/SortByFilters";
import { bulkCatTotal } from "../../../../../Util/totalUtils";
import { toggleArr } from "../../../../../Util/Util";
import useBuildSetting from "../useBuildSetting";

export default function AllowChar({ disabled = false, allowListTotal }: { disabled?: boolean, allowListTotal: string }) {
  const { t } = useTranslation("page_character_optimize")
  const { t: t_pc } = useTranslation("page_character")
  const { character: { key: characterKey } } = useContext(CharacterContext)
  const { buildSetting: { excludedLocations, allowLocationsState }, buildSettingDispatch } = useBuildSetting(characterKey)
  const { database } = useContext(DatabaseContext)
  const [show, onOpen, onClose] = useBoolState(false)
  const [dbDirty, forceUpdate] = useForceUpdate()
  const deferredDbDirty = useDeferredValue(dbDirty)

  const [searchTerm, setSearchTerm] = useState("")
  const deferredSearchTerm = useDeferredValue(searchTerm)
  const [elementKeys, setElementKeys] = useState([...allElementKeys])
  const deferredElementKeys = useDeferredValue(elementKeys)
  const [weaponTypeKeys, setWeaponTypeKeys] = useState([...allWeaponTypeKeys])
  const deferredWeaponTypeKeys = useDeferredValue(weaponTypeKeys)

  const charKeyMap: Dict<CharacterKey, ICachedCharacter> = useMemo(() =>
    deferredDbDirty && Object.fromEntries(Array.from(new Set(
      Object.entries(database.chars.data)
        .filter(([ck]) => ck !== characterKey)
        .filter(([ck]) => filterFunction({ element: deferredElementKeys, weaponType: deferredWeaponTypeKeys, name: deferredSearchTerm }, characterFilterConfigs(database))(ck))
    ))),
    [deferredDbDirty, database, deferredElementKeys, deferredWeaponTypeKeys, deferredSearchTerm, characterKey]
  )

  const locList = Object.entries(charKeyMap)
    .sort(([ck1, c1], [ck2, c2]) => {
      // sort characters by: star => more artifacts equipped
      const [choosec1, choosec2] = [-1, 1]
      const c1f = database.charMeta.get(ck1).favorite
      const c2f = database.charMeta.get(ck2).favorite
      if (c1f && !c2f) return choosec1
      else if (c2f && !c1f) return choosec2

      const art1 = Object.values(c1.equippedArtifacts).filter(id => id).length
      const art2 = Object.values(c2.equippedArtifacts).filter(id => id).length
      if (art1 > art2) return choosec1
      else if (art2 > art1) return choosec2
      return ck1.localeCompare(ck2)
    })
    .map(([ck]) => charKeyToLocCharKey(ck))

  const { elementTotals, weaponTypeTotals } = useMemo(() => {
    const catKeys = { elementTotals: [...allElementKeys], weaponTypeTotals: [...allWeaponTypeKeys] } as const
    return bulkCatTotal(catKeys, ctMap =>
      Object.entries(database.chars.data)
        .forEach(([ck]) => {
          const sheet = getCharSheet(ck, database.gender)
          const eleKey = sheet.elementKey
          ctMap.elementTotals[eleKey].total++
          if (charKeyMap[ck]) ctMap.elementTotals[eleKey].current++

          const weaponTypeKey = sheet.weaponTypeKey
          ctMap.weaponTypeTotals[weaponTypeKey].total++
          if (charKeyMap[ck]) ctMap.weaponTypeTotals[weaponTypeKey].current++
        })
    )
  }, [charKeyMap, database.chars.data, database.gender])

  useEffect(() => database.charMeta.followAny(_ => forceUpdate()), [forceUpdate, database])
  useEffect(() => database.chars.followAny(_ => forceUpdate()), [forceUpdate, database])


  const allowAll = useCallback(() => buildSettingDispatch({ excludedLocations: [], allowLocationsState: "customList" }), [buildSettingDispatch])
  const disallowAll = useCallback(() => buildSettingDispatch({ excludedLocations: [...locList], allowLocationsState: "customList" }), [buildSettingDispatch, locList])

  const toggle = useCallback((lk: LocationKey) => buildSettingDispatch({ excludedLocations: toggleArr(excludedLocations, lk), allowLocationsState: "customList" }), [excludedLocations, buildSettingDispatch])

  const setState = useCallback((_e: MouseEvent, state: AllowLocationsState) => buildSettingDispatch({ allowLocationsState: state }), [buildSettingDispatch])

  const total = locList.length
  const useTot = total - excludedLocations.length
  const charactersAllowed = allowLocationsState === "all"
    ? total
    : (allowLocationsState === "customList"
      ? `${useTot}/${total}`
      : 0 // unequippedOnly
    )
  return <Box display="flex" gap={1}>
    {/* Begin modal */}
    <ModalWrapper open={show} onClose={onClose} containerProps={{ maxWidth: "xl" }}><CardDark>
      <CardContent>
        <Box display="flex" gap={1} alignItems="center">
          <Typography variant="h6">{t`excludeChar.title`}</Typography>
          <InfoTooltip title={
            <Typography>
              {t`excludeChar.tooltip`}
            </Typography>
          } />
          <Box flexGrow={1} />
          <CloseButton onClick={onClose} size="small" />
        </Box>
      </CardContent>
      <Divider />
      <CardContent sx={{ pb: 0 }}>
        <Stack gap={1}>
          <Box display="flex" gap={1} flexWrap="wrap">
            <SolidToggleButtonGroup
              exclusive
              baseColor="secondary"
              size="small"
              value={allowLocationsState}
              onChange={setState}
            >
              {allAllowLocationsState.map(s =>
                <ToggleButton key={s} value={s} disabled={allowLocationsState === s || disabled}>
                  {t(`excludeChar.states.${s}`)}
                </ToggleButton>
              )}
            </SolidToggleButtonGroup>
            <TextField
              autoFocus
              value={searchTerm}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setSearchTerm(e.target.value)}
              label={t_pc("characterName")}
              size="small"
              sx={{ height: "100%" }}
              InputProps={{
                sx: { height: "100%" }
              }}
            />
          </Box>
          <Box display="flex" gap={1} flexWrap="wrap">
            <WeaponToggle sx={{ height: "100%" }} onChange={setWeaponTypeKeys} value={deferredWeaponTypeKeys} totals={weaponTypeTotals} size="small" />
            <ElementToggle sx={{ height: "100%" }} onChange={setElementKeys} value={deferredElementKeys} totals={elementTotals} size="small" />
          </Box>
        </Stack>
      </CardContent>
      <CardContent sx={{ opacity: allowLocationsState === "customList" ? 1 : 0.6 }}>
        <Box pb={1} display="flex" gap={1} flexWrap="wrap">
          <Button color="success" sx={{ flexGrow: 1 }} onClick={allowAll} >
            {t`excludeChar.modal.allow_all`}
            <SqBadge sx={{ ml: 1 }}><strong>{`${useTot}/${total}`}</strong></SqBadge>
          </Button>
          <Button color="error" sx={{ flexGrow: 1 }} onClick={disallowAll} >
            {t`excludeChar.modal.disallow_All`}
            <SqBadge sx={{ ml: 1 }}><strong>{`${total - useTot}/${total}`}</strong></SqBadge>
          </Button>
        </Box>
        <Grid container spacing={1} columns={{ xs: 6, sm: 7, md: 10, lg: 12, xl: 16 }}>
          {locList.map((lk) =>
            <Grid item key={lk} xs={1}>
              <SelectItem locKey={lk} onClick={() => toggle(lk)} selected={!excludedLocations.includes(lk)} />
            </Grid>
          )}
        </Grid>
      </CardContent>
    </CardDark></ModalWrapper>

    {/* Button to open modal */}
    <CardLight sx={{ display: "flex", width: "100%" }}>
      <CardContent sx={{ flexGrow: 1 }}>
        <Stack spacing={1}>
          <Typography>
            <strong>{t("excludeChar.title")}</strong>
          </Typography>
          <Typography>
            {t("excludeChar.usingState")} <SqBadge color="info">{t(`excludeChar.states.${allowLocationsState}`)}</SqBadge>
          </Typography>
          <Typography>
            {t("excludeChar.chars")} <SqBadge color="success">{charactersAllowed} <ShowChartIcon {...iconInlineProps} />{t("artSetConfig.allowed")}</SqBadge>
          </Typography>
          <Typography>
            {t("excludeChar.artis")} <SqBadge color="success">{allowListTotal} <ShowChartIcon {...iconInlineProps} />{t("artSetConfig.allowed")}</SqBadge>
          </Typography>
        </Stack>
      </CardContent>
      <Button sx={{ borderRadius: 0, flexShrink: 1, minWidth: 40 }} onClick={onOpen} disabled={disabled} color="info">
        <SettingsIcon />
      </Button>
    </CardLight>
  </Box >
}

function SelectItem({ locKey, selected, onClick }: {
  locKey: LocationCharacterKey,
  onClick: () => void,
  selected: boolean
}) {
  const { database } = useContext(DatabaseContext)
  const char = database.chars.get(database.chars.LocationToCharacterKey(locKey))
  return <CardActionArea onClick={onClick}>
    <CardLight sx={{ opacity: selected ? undefined : 0.6, borderColor: selected ? "rgb(100,200,100)" : "rgb(200,100,100)", borderWidth: "3px", borderStyle: "solid", borderRadius: "8px" }}  >
      <CharacterCardPico characterKey={database.chars.LocationToCharacterKey(locKey)} />
      <Box fontSize="0.85em" display="flex" justifyContent="space-between" p={0.3} >
        {allArtifactSlotKeys.map(s => <SlotIcon key={s} slotKey={s} iconProps={{ fontSize: "inherit", sx: { opacity: char?.equippedArtifacts[s] ? undefined : 0.5 } }} />)}
      </Box>
    </CardLight>
  </CardActionArea>
}
