import type { Guest } from '../contexts/DataContext'

export type CompanionDraft = {
  id: string
  name: string
  phone: string
  skipPhone: boolean
}

export function createCompanionDraft(): CompanionDraft {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: '',
    phone: '',
    skipPhone: false,
  }
}

export function getBookingGroupId(guest: Guest): string {
  return typeof guest.bookingGroupId === 'string' ? guest.bookingGroupId : ''
}

export function getGroupMembers(guests: Guest[], groupId: string): Guest[] {
  if (!groupId) return []
  return guests.filter(
    (g) => g.isDeleted !== true && getBookingGroupId(g) === groupId
  )
}

export function sortGroupMembersClient(members: Guest[]): Guest[] {
  return [...members].sort((a, b) => {
    const aPrimary = a.isPrimaryBooker === true ? 0 : 1
    const bPrimary = b.isPrimaryBooker === true ? 0 : 1
    if (aPrimary !== bPrimary) return aPrimary - bPrimary
    const aShared = a.companionMode === 'shared_phone' ? 0 : 1
    const bShared = b.companionMode === 'shared_phone' ? 0 : 1
    if (aShared !== bShared) return aShared - bShared
    return String(a.name || '').localeCompare(String(b.name || ''), 'ko')
  })
}

export function countReceivedInGroup(members: Guest[]): number {
  return members.filter((g) => g.ticketReceived === true).length
}
