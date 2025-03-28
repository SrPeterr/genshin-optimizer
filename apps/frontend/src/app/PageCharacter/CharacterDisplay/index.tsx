import type { CharacterKey } from '@genshin-optimizer/consts'
import {
  BarChart,
  Calculate,
  FactCheck,
  Groups,
  Person,
  Science,
  TrendingUp,
} from '@mui/icons-material'
import { Box, Button, CardContent, Skeleton, Tab, Tabs } from '@mui/material'
import {
  Suspense,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useTranslation } from 'react-i18next'
import {
  Link as RouterLink,
  Navigate,
  Route,
  Routes,
  useMatch,
  useNavigate,
  useParams,
} from 'react-router-dom'
import CardDark from '../../Components/Card/CardDark'
import CardLight from '../../Components/Card/CardLight'
import CloseButton from '../../Components/CloseButton'
import {
  HitModeToggle,
  InfusionAuraDropdown,
  ReactionToggle,
} from '../../Components/HitModeEditor'
import LevelSelect from '../../Components/LevelSelect'
import SqBadge from '../../Components/SqBadge'
import type { CharacterContextObj } from '../../Context/CharacterContext'
import { CharacterContext } from '../../Context/CharacterContext'
import type { dataContextObj } from '../../Context/DataContext'
import { DataContext } from '../../Context/DataContext'
import {
  FormulaDataContext,
  FormulaDataWrapper,
} from '../../Context/FormulaDataContext'
import type { ChartData, GraphContextObj } from '../../Context/GraphContext'
import { GraphContext } from '../../Context/GraphContext'
import { SillyContext } from '../../Context/SillyContext'
import { getCharSheet } from '../../Data/Characters'
import { DatabaseContext } from '../../Database/Database'
import useBoolState from '../../ReactHooks/useBoolState'
import useCharacter from '../../ReactHooks/useCharacter'
import useCharacterReducer from '../../ReactHooks/useCharacterReducer'
import useDBMeta from '../../ReactHooks/useDBMeta'
import useTeamData from '../../ReactHooks/useTeamData'
import useTitle from '../../ReactHooks/useTitle'
import { charKeyToCharName } from '../../Types/consts'
import { CustomMultiTargetButton } from '../CustomMultiTarget'
import CharSelectButton from './CharSelectButton'
import FormulaModal from './FormulaModal'
import StatModal from './StatModal'
import TabBuild from './Tabs/TabOptimize'
import TabOverview from './Tabs/TabOverview'
import TabTalent from './Tabs/TabTalent'
import TabTeambuffs from './Tabs/TabTeambuffs'
import TabTheorycraft from './Tabs/TabTheorycraft'
import TravelerElementSelect from './TravelerElementSelect'
import TravelerGenderSelect from './TravelerGenderSelect'

export default function CharacterDisplay() {
  const navigate = useNavigate()
  const { database } = useContext(DatabaseContext)
  const onClose = useCallback(() => navigate('/characters'), [navigate])
  const { characterKey } = useParams<{ characterKey?: CharacterKey }>()
  const invalidKey = !database.chars.keys.includes(characterKey as CharacterKey)
  if (invalidKey) return <Navigate to="/characters" />

  return (
    <Box my={1} display="flex" flexDirection="column" gap={1}>
      <Suspense
        fallback={<Skeleton variant="rectangular" width="100%" height={1000} />}
      >
        {characterKey && (
          <CharacterDisplayCard
            key={characterKey}
            characterKey={characterKey}
            onClose={onClose}
          />
        )}
      </Suspense>
    </Box>
  )
}

type CharacterDisplayCardProps = {
  characterKey: CharacterKey
  onClose?: () => void
}
function CharacterDisplayCard({
  characterKey,
  onClose,
}: CharacterDisplayCardProps) {
  const { silly } = useContext(SillyContext)
  const character = useCharacter(characterKey)
  const { gender } = useDBMeta()
  const characterSheet = getCharSheet(characterKey, gender)
  const teamData = useTeamData(characterKey)
  const { target: charUIData } = teamData?.[characterKey] ?? {}
  const {
    params: { tab = 'overview' },
  } = useMatch({ path: '/characters/:charKey/:tab', end: false }) ?? {
    params: { tab: 'overview' },
  }
  const { t } = useTranslation([
    'sillyWisher_charNames',
    'charNames_gen',
    'page_character',
  ])

  useTitle(
    useMemo(
      () =>
        `${t(
          `${
            silly ? 'sillyWisher_charNames' : 'charNames_gen'
          }:${charKeyToCharName(characterKey, gender)}`
        )} - ${t(`page_character:tabs.${tab}`)}`,
      [t, silly, characterKey, gender, tab]
    )
  )

  const characterDispatch = useCharacterReducer(character?.key ?? '')

  const dataContextValue: dataContextObj | undefined = useMemo(() => {
    if (!teamData || !charUIData) return undefined
    return {
      data: charUIData,
      teamData,
      oldData: undefined,
    }
  }, [charUIData, teamData])

  const characterContextValue: CharacterContextObj | undefined = useMemo(() => {
    if (!character || !characterSheet) return undefined
    return {
      character,
      characterSheet,
      characterDispatch,
    }
  }, [character, characterSheet, characterDispatch])

  const [chartData, setChartData] = useState(undefined as ChartData | undefined)
  const [graphBuilds, setGraphBuilds] = useState<string[][]>()
  const graphContextValue: GraphContextObj | undefined = useMemo(() => {
    return {
      chartData,
      setChartData,
      graphBuilds,
      setGraphBuilds,
    }
  }, [chartData, graphBuilds])

  // Clear state when switching characters
  useEffect(() => {
    setChartData(undefined)
    setGraphBuilds(undefined)
  }, [characterKey])

  return (
    <CardDark>
      {dataContextValue && characterContextValue && graphContextValue ? (
        <CharacterContext.Provider value={characterContextValue}>
          <DataContext.Provider value={dataContextValue}>
            <GraphContext.Provider value={graphContextValue}>
              <FormulaDataWrapper>
                <CardContent
                  sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}
                >
                  <Box display="flex">
                    <Box display="flex" gap={1} flexWrap="wrap" flexGrow={1}>
                      <CharSelectButton />
                      <TravelerElementSelect />
                      <TravelerGenderSelect />
                      <DetailStatButton />
                      <CustomMultiTargetButton />
                      <FormulasButton />
                    </Box>
                    {!!onClose && <CloseButton onClick={onClose} />}
                  </Box>
                  <Box display="flex" gap={1} flexWrap="wrap">
                    {character && (
                      <LevelSelect
                        level={character.level}
                        ascension={character.ascension}
                        setBoth={characterDispatch}
                      />
                    )}
                    <HitModeToggle size="small" />
                    <InfusionAuraDropdown />
                    <ReactionToggle size="small" />
                  </Box>
                  <CardLight>
                    <TabNav tab={tab} />
                  </CardLight>
                  <CharacterPanel />
                  <CardLight>
                    <TabNav tab={tab} />
                  </CardLight>
                </CardContent>
              </FormulaDataWrapper>
            </GraphContext.Provider>
          </DataContext.Provider>
        </CharacterContext.Provider>
      ) : (
        <Skeleton variant="rectangular" width="100%" height={1000} />
      )}
    </CardDark>
  )
}
function CharacterPanel() {
  return (
    <Suspense
      fallback={<Skeleton variant="rectangular" width="100%" height={500} />}
    >
      <Routes>
        {/* Character Panel */}
        <Route index element={<TabOverview />} />
        <Route path="/talent" element={<TabTalent />} />
        <Route path="/teambuffs" element={<TabTeambuffs />} />
        <Route path="/optimize" element={<TabBuild />} />
        <Route path="/theorycraft" element={<TabTheorycraft />} />
      </Routes>
    </Suspense>
  )
}
function TabNav({ tab }: { tab: string }) {
  const { t } = useTranslation('page_character')
  return (
    <Tabs
      value={tab}
      variant="scrollable"
      allowScrollButtonsMobile
      sx={{
        '& .MuiTab-root:hover': {
          transition: 'background-color 0.25s ease',
          backgroundColor: 'rgba(255,255,255,0.1)',
        },
      }}
    >
      <Tab
        sx={{ minWidth: '20%' }}
        value="overview"
        label={t('tabs.overview')}
        icon={<Person />}
        component={RouterLink}
        to=""
      />
      <Tab
        sx={{ minWidth: '20%' }}
        value="talent"
        label={t('tabs.talent')}
        icon={<FactCheck />}
        component={RouterLink}
        to="talent"
      />
      <Tab
        sx={{ minWidth: '20%' }}
        value="teambuffs"
        label={t('tabs.teambuffs')}
        icon={<Groups />}
        component={RouterLink}
        to="teambuffs"
      />
      <Tab
        sx={{ minWidth: '20%' }}
        value="optimize"
        label={t('tabs.optimize')}
        icon={<TrendingUp />}
        component={RouterLink}
        to="optimize"
      />
      <Tab
        sx={{ minWidth: '20%' }}
        value="theorycraft"
        label={t('tabs.theorycraft')}
        icon={<Science />}
        component={RouterLink}
        to="theorycraft"
      />
    </Tabs>
  )
}

function DetailStatButton() {
  const { t } = useTranslation('page_character')
  const [open, onOpen, onClose] = useBoolState()
  const {
    character: { bonusStats },
  } = useContext(CharacterContext)
  const bStatsNum = Object.keys(bonusStats).length
  return (
    <>
      <Button color="info" startIcon={<BarChart />} onClick={onOpen}>
        {t`addStats.title`}
        {!!bStatsNum && (
          <SqBadge sx={{ ml: 1 }} color="success">
            {bStatsNum}
          </SqBadge>
        )}
      </Button>
      <StatModal open={open} onClose={onClose} />
    </>
  )
}
function FormulasButton() {
  const { onModalOpen } = useContext(FormulaDataContext)
  return (
    <>
      <Button color="info" startIcon={<Calculate />} onClick={onModalOpen}>
        Formulas {'&'} Calcs
      </Button>
      <FormulaModal />
    </>
  )
}
