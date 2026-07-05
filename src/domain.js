export const XP_PER_LEVEL = 7

export function localDateKey(date = new Date()) {
  const offset = date.getTimezoneOffset() * 60000
  return new Date(date.getTime() - offset).toISOString().slice(0, 10)
}

export function scheduledAt(time, occurredAt = new Date()) {
  const [hours, minutes] = time.split(':').map(Number)
  const date = new Date(occurredAt)
  date.setHours(hours, minutes, 0, 0)
  return date
}

export function nearestSchedule(time, occurredAt) {
  const current = scheduledAt(time, new Date(occurredAt))
  return [-1, 0, 1].map(days => {
    const candidate = new Date(current)
    candidate.setDate(candidate.getDate() + days)
    return candidate
  }).sort((a, b) => Math.abs(a - new Date(occurredAt)) - Math.abs(b - new Date(occurredAt)))[0]
}

export function isOnTime(time, occurredAt) {
  return Math.abs(new Date(occurredAt) - nearestSchedule(time, occurredAt)) <= 30 * 60 * 1000
}

export function gainExperience({ level = 1, experience = 0 }) {
  return experience + 1 === XP_PER_LEVEL
    ? { level: level + 1, experience: 0, leveledUp: true }
    : { level, experience: experience + 1, leveledUp: false }
}

export function companionDiffers(current, reported) {
  return Boolean(reported && (current.level !== reported.level || current.experience !== reported.experience))
}

export function medicationHeadline(schedules, records, now = new Date()) {
  const today = localDateKey(now)
  const status = id => records.find(record => record.date === today && record.scheduleId === id)?.status ?? 'pending'
  const completed = schedules.filter(schedule => status(schedule.id) === 'done').sort((a, b) => a.time.localeCompare(b.time)).at(-1)
  const missed = schedules.filter(schedule => status(schedule.id) === 'missed').sort((a, b) => a.time.localeCompare(b.time)).at(-1)
  const next = schedules.find(schedule => status(schedule.id) === 'pending')
  const prefix = missed ? `${missed.name.replace(/\s*약$/, '')} 미복용, ` : completed ? `${completed.name.replace(/\s*약$/, '')} 복용 완료, ` : ''
  if (!next) return missed ? `${prefix}오늘 남은 복약이 없어요.` : completed ? `${prefix}오늘 복약을 모두 마쳤어요.` : '오늘 예정된 복약이 없어요.'
  const minutes = Math.max(0, Math.ceil((scheduledAt(next.time, now) - now) / 60000))
  if (!minutes) return `${prefix}지금 다음 약을 복용할 시간이에요.`
  const hours = Math.floor(minutes / 60), rest = minutes % 60
  return `${prefix}다음 복용은 ${hours ? `${hours}시간 ` : ''}${rest ? `${rest}분 ` : ''}뒤예요.`
}
