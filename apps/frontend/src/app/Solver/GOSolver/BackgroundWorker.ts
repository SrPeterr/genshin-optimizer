import type { WorkerCommand, WorkerResult } from '..'
import { assertUnreachable } from '../../Util/Util'
import type { RequestFilter } from '../common'
import {
  artSetPerm,
  countBuilds,
  filterArts,
  filterFeasiblePerm,
} from '../common'
import { BNBSplitWorker } from './BNBSplitWorker'
import { ComputeWorker } from './ComputeWorker'
import { DefaultSplitWorker } from './DefaultSplitWorker'

// TODO: re-tune and rename these parameters
const iterateSizeGroupThreshold = 1_000_000_000
const maxIterateNestedSize = 100_000_000
const maxIterateSize = 16_000_000

declare function postMessage(command: WorkerCommand | WorkerResult): void

let splitWorker: SplitWorker, computeWorker: ComputeWorker

async function handleEvent(e: MessageEvent<WorkerCommand>): Promise<void> {
  const { data } = e,
    { command } = data
  switch (command) {
    case 'split': {
      const resplit = data.count > iterateSizeGroupThreshold
      const maxSize = resplit ? maxIterateNestedSize : maxIterateSize

      for (const filter of splitWorker.split(data.filter, maxSize)) {
        if (resplit) {
          const count = countBuilds(filterArts(computeWorker.arts, filter))
          postMessage({ command: 'split', filter, count })
        } else {
          postMessage({ command: 'iterate', filter })
        }
        await new Promise((r) => setTimeout(r)) // in case a `threshold` is broadcasted
      }
      break
    }
    case 'iterate':
      computeWorker.compute(data.filter)
      break
    case 'threshold': {
      splitWorker.setThreshold(data.threshold)
      computeWorker.setThreshold(data.threshold)
      return // This is a fire-and-forget command
    }
    case 'finalize': {
      computeWorker.refresh(true)
      const { builds, plotData } = computeWorker
      postMessage({ resultType: 'finalize', builds, plotData })
      break
    }
    case 'count': {
      const { exclusion } = data,
        arts = computeWorker.arts
      const perms = filterFeasiblePerm(
        artSetPerm(exclusion, [
          ...new Set(
            Object.values(arts.values).flatMap((x) => x.map((x) => x.set!))
          ),
        ]),
        arts
      )
      let count = 0
      for (const filter of perms) {
        const currentCount = countBuilds(filterArts(arts, filter))
        postMessage({ command: 'split', filter, count: currentCount })
        count += currentCount
      }
      postMessage({ resultType: 'count', count })
      break
    }
    case 'setup':
      try {
        splitWorker = new BNBSplitWorker(data, (x) => postMessage(x))
      } catch {
        splitWorker = new DefaultSplitWorker(data, (x) => postMessage(x))
      }
      computeWorker = new ComputeWorker(data, (x) => postMessage(x))
      break
    default:
      assertUnreachable(command)
  }
  postMessage({ resultType: 'done' })
}
onmessage = async (e: MessageEvent<WorkerCommand>) => {
  try {
    await handleEvent(e)
  } catch (e) {
    postMessage({ resultType: 'err', message: (e as any).message })
  }
}

export interface SplitWorker {
  split(filter: RequestFilter, minCount: number): Iterable<RequestFilter>
  setThreshold(newThreshold: number): void
}
