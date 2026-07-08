#!/usr/bin/env node
/**
 * Firestore guests_v2/all 읽기가 가능해질 때까지 대기 후 인원 수를 출력합니다.
 *
 * 사용법:
 *   FIREBASE_SERVICE_ACCOUNT="$(cat service-account.json)" node scripts/wait-and-list-guests.mjs
 */

import { getAdminDb } from '../server/lib/firebaseAdmin.js'

const MAX_ATTEMPTS = 40
const INTERVAL_MS = 15000

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function tryListGuests() {
  const db = getAdminDb()
  const snap = await db.collection('guests_v2').doc('all').get()
  const guests = Array.isArray(snap.data()?.guests) ? snap.data().guests : []
  const active = guests.filter((g) => g.isDeleted !== true)
  return { total: guests.length, active: active.length, exists: snap.exists }
}

async function main() {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const result = await tryListGuests()
      console.log(`[ok] guests_v2/all exists=${result.exists} total=${result.total} active=${result.active}`)
      process.exit(0)
    } catch (error) {
      const message = String(error?.message || error)
      console.log(`[${attempt}/${MAX_ATTEMPTS}] ${message}`)
      if (!message.includes('Quota exceeded') && error?.code !== 8) {
        throw error
      }
    }
    if (attempt < MAX_ATTEMPTS) await sleep(INTERVAL_MS)
  }
  console.error('할당량이 아직 풀리지 않았습니다. Firebase 콘솔에서 Blaze·결제 연결을 확인하세요.')
  process.exit(1)
}

main()
