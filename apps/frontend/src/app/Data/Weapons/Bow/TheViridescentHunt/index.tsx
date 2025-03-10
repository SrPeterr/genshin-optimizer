import type { WeaponData } from '@genshin-optimizer/pipeline'
import { input } from '../../../../Formula'
import {
  constant,
  equal,
  infoMut,
  prod,
  subscript,
} from '../../../../Formula/utils'
import type { WeaponKey } from '@genshin-optimizer/consts'
import { customDmgNode } from '../../../Characters/dataUtil'
import { st } from '../../../SheetUtil'
import { dataObjForWeaponSheet } from '../../util'
import type { IWeaponSheet } from '../../IWeaponSheet'
import WeaponSheet, { headerTemplate } from '../../WeaponSheet'
import data_gen_json from './data_gen.json'

const key: WeaponKey = 'TheViridescentHunt'
const data_gen = data_gen_json as WeaponData

const dmgPerc_s = [0.4, 0.5, 0.6, 0.7, 0.8]
const dmg = equal(
  input.weapon.key,
  key,
  customDmgNode(
    prod(subscript(input.weapon.refineIndex, dmgPerc_s), input.total.atk),
    'elemental',
    { hit: { ele: constant('physical') } }
  )
)

const data = dataObjForWeaponSheet(key, data_gen, undefined, { dmg })
const sheet: IWeaponSheet = {
  document: [
    {
      header: headerTemplate(key, st('base')),
      fields: [
        {
          node: infoMut(dmg, { name: st('dmg') }),
        },
      ],
    },
  ],
}

export default new WeaponSheet(key, sheet, data_gen, data)
