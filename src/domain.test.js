import assert from 'node:assert/strict'
import { companionDiffers, gainExperience, isOnTime, localDateKey, medicationHeadline, nearestSchedule } from './domain.js'

assert.equal(isOnTime('08:00', '2026-07-03T08:30:00+09:00'), true)
assert.equal(isOnTime('08:00', '2026-07-03T08:31:00+09:00'), false)
assert.equal(isOnTime('00:10', '2026-07-02T23:50:00+09:00'), true)
assert.equal(isOnTime('23:50', '2026-07-03T00:10:00+09:00'), true)
assert.equal(localDateKey(nearestSchedule('00:10', '2026-07-02T23:50:00+09:00')), '2026-07-03')
assert.deepEqual(gainExperience({ level: 6, experience: 6 }), { level: 7, experience: 0, leveledUp: true })
assert.deepEqual(gainExperience({ level: 7, experience: 6 }), { level: 8, experience: 0, leveledUp: true })
assert.equal(companionDiffers({ level: 2, experience: 1 }, { level: 2, experience: 0 }), true)
assert.equal(medicationHeadline([{ id: 'am', time: '08:00', name: '아침 약' }, { id: 'pm', time: '12:40', name: '점심 약' }], [{ date: '2026-07-03', scheduleId: 'am', status: 'done' }], new Date('2026-07-03T10:00:00+09:00')), '아침 복용 완료, 다음 복용은 2시간 40분 뒤예요.')
assert.equal(medicationHeadline([{ id: 'am', time: '08:00', name: '아침 약' }, { id: 'pm', time: '12:40', name: '점심 약' }], [{ date: '2026-07-03', scheduleId: 'am', status: 'missed' }], new Date('2026-07-03T10:00:00+09:00')), '아침 미복용, 다음 복용은 2시간 40분 뒤예요.')
console.log('domain checks passed')
