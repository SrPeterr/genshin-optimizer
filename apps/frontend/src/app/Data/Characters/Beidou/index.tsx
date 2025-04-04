import type { CharacterData } from '@genshin-optimizer/pipeline'
import { input } from '../../../Formula'
import {
  constant,
  equal,
  greaterEq,
  infoMut,
  percent,
  prod,
  subscript,
} from '../../../Formula/utils'
import type { CharacterKey, ElementKey } from '@genshin-optimizer/consts'
import { cond, stg, st } from '../../SheetUtil'
import CharacterSheet from '../CharacterSheet'
import { charTemplates } from '../charTemplates'
import type { ICharacterSheet } from '../ICharacterSheet.d'
import {
  customDmgNode,
  dataObjForCharacterSheet,
  dmgNode,
  shieldElement,
  shieldNode,
  shieldNodeTalent,
} from '../dataUtil'
import data_gen_src from './data_gen.json'
import skillParam_gen from './skillParam_gen.json'

const key: CharacterKey = 'Beidou'
const elementKey: ElementKey = 'electro'
const data_gen = data_gen_src as CharacterData
const ct = charTemplates(key, data_gen.weaponTypeKey)

let a = 0,
  s = 0,
  b = 0
const dm = {
  normal: {
    hitArr: [
      skillParam_gen.auto[a++],
      skillParam_gen.auto[a++],
      skillParam_gen.auto[a++],
      skillParam_gen.auto[a++],
      skillParam_gen.auto[a++],
    ],
  },
  charged: {
    spinningDmg: skillParam_gen.auto[a++],
    finalDmg: skillParam_gen.auto[a++],
    stamina: skillParam_gen.auto[a++][0],
    duration: skillParam_gen.auto[a++][0],
  },
  plunging: {
    dmg: skillParam_gen.auto[a++],
    low: skillParam_gen.auto[a++],
    high: skillParam_gen.auto[a++],
  },
  skill: {
    shieldHp_: skillParam_gen.skill[s++],
    shieldFlat: skillParam_gen.skill[s++],
    dmgBase: skillParam_gen.skill[s++],
    onHitDmgBonus: skillParam_gen.skill[s++], //DMG bonus on hit taken
    cd: skillParam_gen.skill[s++][0],
  },
  burst: {
    burstDmg: skillParam_gen.burst[b++],
    lightningDmg: skillParam_gen.burst[b++],
    damageReduction: skillParam_gen.burst[b++],
    duration: skillParam_gen.burst[b++][0],
    cd: skillParam_gen.burst[b++][0],
    energyCost: skillParam_gen.burst[b++][0],
  },
  //pasive 1: 2, //additional targets for lightning arc
  ascension4: {
    normalDmg_: skillParam_gen.passive2[0][0], //Same value for all 3
    chargeDmg_: skillParam_gen.passive2[0][0],
    attackSpeed: skillParam_gen.passive2[0][0],
  },
  constellation1: {
    shieldHp_: skillParam_gen.constellation1[0],
  },
  constellation4: {
    skillDmg: skillParam_gen.constellation4[0],
    duration: skillParam_gen.constellation4[1],
  },
  constellation6: {
    electroResShred_: -1 * skillParam_gen.constellation6[0],
  },
} as const

//Toggable stuff:
// A4: Unleashing <b>Tidecaller</b> with its maximum DMG Bonus
// C6: During the duration of <b>Stormbreaker</b>

const [condC6Path, condC6] = cond(key, 'Constellation6')
const [condA4Path, condA4] = cond(key, 'Ascension4')

const nodeC3 = greaterEq(input.constellation, 3, 3)
const nodeC5 = greaterEq(input.constellation, 5, 3)

const skillDmgOneHit = dm.skill.dmgBase.map(
  (dmg, i) => dmg + dm.skill.onHitDmgBonus[i]
)
const skillDmgTwoHits = dm.skill.dmgBase.map(
  (dmg, i) => dmg + 2 * dm.skill.onHitDmgBonus[i]
)

const nodeBurstElectroResRed_ = greaterEq(
  input.constellation,
  6,
  equal(condC6, 'on', percent(dm.constellation6.electroResShred_))
)
const nodeSkillNormalDmg_ = greaterEq(
  input.asc,
  4,
  equal(condA4, 'on', percent(dm.ascension4.normalDmg_))
)
const nodeSkillChargeDmg_ = greaterEq(
  input.asc,
  4,
  equal(condA4, 'on', percent(dm.ascension4.chargeDmg_))
)
const nodeSkillAttackSpeed_ = greaterEq(
  input.asc,
  4,
  equal(condA4, 'on', percent(dm.ascension4.attackSpeed))
)

const skillShieldNode = shieldNodeTalent(
  'hp',
  dm.skill.shieldHp_,
  dm.skill.shieldFlat,
  'skill'
)
const c1ShieldNode = shieldNode('hp', percent(dm.constellation1.shieldHp_), 0)

const dmgFormulas = {
  normal: Object.fromEntries(
    dm.normal.hitArr.map((arr, i) => [i, dmgNode('atk', arr, 'normal')])
  ),
  charged: {
    spinningDmg: dmgNode('atk', dm.charged.spinningDmg, 'charged'),
    finalDmg: dmgNode('atk', dm.charged.finalDmg, 'charged'),
  },
  plunging: Object.fromEntries(
    Object.entries(dm.plunging).map(([key, value]) => [
      key,
      dmgNode('atk', value, 'plunging'),
    ])
  ),
  skill: {
    shield: skillShieldNode,
    electroShield: shieldElement('electro', skillShieldNode),
    baseDmg: dmgNode('atk', dm.skill.dmgBase, 'skill'),
    dmgOneHit: dmgNode('atk', skillDmgOneHit, 'skill'),
    dmgTwoHits: dmgNode('atk', skillDmgTwoHits, 'skill'),
  },
  burst: {
    burstDmg: dmgNode('atk', dm.burst.burstDmg, 'burst'),
    lightningDmg: dmgNode('atk', dm.burst.lightningDmg, 'burst'),
  },
  constellation1: {
    shield: greaterEq(input.constellation, 1, c1ShieldNode),
    electroShield: greaterEq(
      input.constellation,
      1,
      shieldElement('electro', c1ShieldNode)
    ),
  },
  constellation4: {
    skillDmg: greaterEq(
      input.constellation,
      4,
      customDmgNode(
        prod(input.total.atk, percent(dm.constellation4.skillDmg)),
        'elemental',
        { hit: { ele: constant(elementKey) } }
      )
    ),
  },
}

export const data = dataObjForCharacterSheet(
  key,
  elementKey,
  'liyue',
  data_gen,
  dmgFormulas,
  {
    premod: {
      skillBoost: nodeC3,
      burstBoost: nodeC5,
      normal_dmg_: nodeSkillNormalDmg_,
      charged_dmg_: nodeSkillChargeDmg_,
      atkSPD_: nodeSkillAttackSpeed_,
    },
    teamBuff: {
      premod: {
        electro_enemyRes_: nodeBurstElectroResRed_,
      },
    },
  }
)

const sheet: ICharacterSheet = {
  key,
  name: ct.name,
  rarity: data_gen.star,
  elementKey: elementKey,
  weaponTypeKey: data_gen.weaponTypeKey,
  gender: 'F',
  constellationName: ct.chg('constellationName'),
  title: ct.chg('title'),
  talent: {
    auto: ct.talentTem('auto', [
      {
        text: ct.chg('auto.fields.normal'),
      },
      {
        fields: dm.normal.hitArr.map((_, i) => ({
          node: infoMut(dmgFormulas.normal[i], {
            name: ct.chg(`auto.skillParams.${i}`),
          }),
        })),
      },
      {
        text: ct.chg('auto.fields.charged'),
      },
      {
        fields: [
          {
            node: infoMut(dmgFormulas.charged.spinningDmg, {
              name: ct.chg(`auto.skillParams.5`),
            }),
          },
          {
            node: infoMut(dmgFormulas.charged.finalDmg, {
              name: ct.chg(`auto.skillParams.6`),
            }),
          },
          {
            text: ct.chg('auto.skillParams.7'),
            value: dm.charged.stamina,
            unit: '/s',
          },
          {
            text: ct.chg('auto.skillParams.8'),
            value: dm.charged.duration,
            unit: 's',
          },
        ],
      },
      {
        text: ct.chg(`auto.fields.plunging`),
      },
      {
        fields: [
          {
            node: infoMut(dmgFormulas.plunging.dmg, {
              name: stg('plunging.dmg'),
            }),
          },
          {
            node: infoMut(dmgFormulas.plunging.low, {
              name: stg('plunging.low'),
            }),
          },
          {
            node: infoMut(dmgFormulas.plunging.high, {
              name: stg('plunging.high'),
            }),
          },
        ],
      },
    ]),

    skill: ct.talentTem('skill', [
      {
        fields: [
          {
            node: infoMut(dmgFormulas.skill.shield, {
              name: st(`dmgAbsorption.none`),
            }),
          },
          {
            node: infoMut(dmgFormulas.skill.electroShield, {
              name: st(`dmgAbsorption.electro`),
            }),
          },
          {
            node: infoMut(dmgFormulas.skill.baseDmg, {
              name: ct.chg(`skill.skillParams.1`),
            }),
          },
          {
            node: infoMut(dmgFormulas.skill.dmgOneHit, {
              name: ct.ch('skillOneHit'),
            }),
          },
          {
            node: infoMut(dmgFormulas.skill.dmgTwoHits, {
              name: ct.ch('skillTwoHit'),
            }),
          },
          {
            text: ct.chg('skill.skillParams.3'),
            value: dm.skill.cd,
            unit: 's',
          },
        ],
      },
      ct.condTem('passive2', {
        teamBuff: false,
        value: condA4,
        path: condA4Path,
        name: ct.ch('tidecallerMaxDmg'),
        states: {
          on: {
            fields: [
              {
                node: nodeSkillNormalDmg_,
              },
              {
                node: nodeSkillChargeDmg_,
              },
              {
                node: nodeSkillAttackSpeed_,
              },
              {
                text: stg('duration'),
                value: 10,
                unit: 's',
              },
              {
                text: ct.ch('a4charge'),
              },
            ],
          },
        },
      }),
    ]),

    burst: ct.talentTem('burst', [
      {
        fields: [
          {
            node: infoMut(dmgFormulas.burst.burstDmg, {
              name: ct.chg(`burst.skillParams.0`),
            }),
          },
          {
            node: infoMut(dmgFormulas.burst.lightningDmg, {
              name: ct.chg(`burst.skillParams.1`),
            }),
          },
          {
            node: infoMut(
              subscript(input.total.burstIndex, dm.burst.damageReduction),
              { name: ct.ch('burstDmgRed_'), unit: '%' }
            ),
          },
          {
            text: ct.chg('burst.skillParams.3'),
            value: dm.burst.duration,
            unit: 's',
          },
          {
            text: ct.chg('burst.skillParams.4'),
            value: dm.burst.cd,
            unit: 's',
          },
          {
            text: ct.chg('burst.skillParams.5'),
            value: dm.burst.energyCost,
          },
        ],
      },
      ct.condTem('constellation6', {
        teamBuff: true,
        value: condC6,
        path: condC6Path,
        name: ct.ch('duringBurst'),
        states: {
          on: {
            fields: [
              {
                node: nodeBurstElectroResRed_,
              },
            ],
          },
        },
      }),
    ]),

    passive1: ct.talentTem('passive1'),
    passive2: ct.talentTem('passive2'),
    passive3: ct.talentTem('passive3'),
    constellation1: ct.talentTem('constellation1', [
      ct.fieldsTem('constellation1', {
        fields: [
          {
            node: infoMut(dmgFormulas.constellation1.shield, {
              name: st(`dmgAbsorption.none`),
            }),
          },
          {
            node: infoMut(dmgFormulas.constellation1.electroShield, {
              name: st(`dmgAbsorption.electro`),
            }),
          },
        ],
      }),
    ]),
    constellation2: ct.talentTem('constellation2'),
    constellation3: ct.talentTem('constellation3', [
      { fields: [{ node: nodeC3 }] },
    ]),
    constellation4: ct.talentTem('constellation4', [
      ct.fieldsTem('constellation4', {
        fields: [
          {
            node: infoMut(dmgFormulas.constellation4.skillDmg, {
              name: ct.ch('c4dmg'),
            }),
          },
        ],
      }),
    ]),
    constellation5: ct.talentTem('constellation5', [
      { fields: [{ node: nodeC5 }] },
    ]),
    constellation6: ct.talentTem('constellation6'),
  },
}

export default new CharacterSheet(sheet, data)
