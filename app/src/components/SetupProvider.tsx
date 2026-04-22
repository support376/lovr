'use client'

import { createContext, useContext, useState, type ReactNode } from 'react'
import { FirstSetupModal } from './FirstSetupModal'

type Ctx = {
  needsSetup: boolean
  open: () => void
}

const SetupCtx = createContext<Ctx>({ needsSetup: false, open: () => {} })

/**
 * 전역 setup 상태.
 * - needsSetup: self 있는데 gender/rel/event 중 하나라도 없음
 * - open(): 모달 띄우기. 직접 호출 OR submit 가드에서 자동 호출
 */
export function useSetup() {
  return useContext(SetupCtx)
}

export function SetupProvider({
  children,
  needsGender,
  needsRelationship,
  needsFirstEvent,
  existingRelationshipId,
}: {
  children: ReactNode
  needsGender: boolean
  needsRelationship: boolean
  needsFirstEvent: boolean
  existingRelationshipId: string | null
}) {
  const needsSetup = needsGender || needsRelationship || needsFirstEvent
  const [open, setOpen] = useState(false)

  return (
    <SetupCtx.Provider
      value={{ needsSetup, open: () => needsSetup && setOpen(true) }}
    >
      {children}
      {open && (
        <FirstSetupModal
          needsGender={needsGender}
          needsRelationship={needsRelationship}
          needsFirstEvent={needsFirstEvent}
          existingRelationshipId={existingRelationshipId}
          onClose={() => setOpen(false)}
        />
      )}
    </SetupCtx.Provider>
  )
}

/**
 * 상단 얇은 배너 — needsSetup 때만 표시. 클릭 시 모달 열림.
 */
export function SetupBanner() {
  const { needsSetup, open } = useSetup()
  if (!needsSetup) return null
  return (
    <button
      type="button"
      onClick={open}
      className="w-full py-2 px-4 bg-accent/15 border-b border-accent/30 text-[11px] text-accent hover:bg-accent/25 text-center font-medium"
    >
      시작하려면 3가지만 넣어봐 · 1분 ▶
    </button>
  )
}
