import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { auth, db, firebaseReady } from "./firebase";
import {
  companionDiffers,
  gainExperience,
  isOnTime,
  localDateKey,
  medicationHeadline,
  missedSchedules,
  nearestSchedule,
  scheduledAt,
  XP_PER_LEVEL,
} from "./domain";
import "./style.css";

const defaults = [
  {
    id: "morning",
    time: "08:00",
    name: "아침 약",
    detail: "혈압약 1정 · 당뇨약 1정",
  },
  {
    id: "evening",
    time: "20:00",
    name: "저녁 약",
    detail: "혈압약 1정 · 영양제 1정",
  },
].map((item) => ({ ...item, startsOn: localDateKey() }));
const initialCompanion = { companionId: "buddy-1", level: 1, experience: 0 };
const initialDevice = {
  deviceId: "virtual-pillbox",
  battery: 82,
  connected: true,
};

function Logo() {
  return (
    <div className="brand">
      <svg className="mark" viewBox="0 0 40 40" aria-hidden="true">
        <rect x="1" y="1" width="38" height="38" rx="12" fill="#1E453B" />
        <circle cx="16" cy="18" r="3" fill="#FBF8F1" />
        <circle cx="24" cy="18" r="3" fill="#FBF8F1" />
      </svg>
      <div>
        <strong>MedHabit Buddy</strong>
        <small>보호자용 대시보드</small>
      </div>
    </div>
  );
}

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function submit(e, register = false) {
    e.preventDefault();
    setError("");
    try {
      await (
        register ? createUserWithEmailAndPassword : signInWithEmailAndPassword
      )(auth, email, password);
    } catch {
      setError("로그인할 수 없습니다. 입력값을 확인하세요.");
    }
  }
  return (
    <main className="login-shell">
      <form className="login-card" onSubmit={submit}>
        <Logo />
        <h1>보호자 로그인</h1>
        <label>
          이메일
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label>
          비밀번호
          <input
            type="password"
            minLength="6"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        {error && <p className="form-error">{error}</p>}
        <button>로그인</button>
        <button
          className="secondary"
          type="button"
          onClick={(e) => submit(e, true)}
        >
          처음 사용하기
        </button>
      </form>
    </main>
  );
}

function ScheduleForm({ value, onSave, onCancel }) {
  const [form, setForm] = useState(
    value ?? { time: "08:00", name: "", detail: "" },
  );
  useEffect(
    () => setForm(value ?? { time: "08:00", name: "", detail: "" }),
    [value],
  );
  const field = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  return (
    <form
      className="schedule-form"
      onSubmit={(e) => {
        e.preventDefault();
        onSave({
          ...form,
          id: value?.id ?? crypto.randomUUID(),
          startsOn: value?.startsOn ?? localDateKey(),
        });
      }}
    >
      <input
        aria-label="복용 시각"
        type="time"
        value={form.time}
        onChange={field("time")}
        required
      />
      <input
        aria-label="일정 이름"
        value={form.name}
        onChange={field("name")}
        placeholder="일정 이름"
        required
      />
      <input
        aria-label="약 이름과 수량"
        value={form.detail}
        onChange={field("detail")}
        placeholder="약 이름과 수량"
        required
      />
      <button>저장</button>
      {value && (
        <button type="button" className="secondary" onClick={onCancel}>
          취소
        </button>
      )}
    </form>
  );
}

function Companion({ companion, reward }) {
  const progress = (companion.experience / XP_PER_LEVEL) * 100;
  const issued =
    reward?.issuedAt?.toDate?.() ??
    (reward?.issuedAt ? new Date(reward.issuedAt) : null);
  return (
    <section className="section device">
      <div className="section-head">
        <h2>알약이</h2>
        <span>LV.{companion.level}</span>
      </div>
      <div className="screen-wrap">
        <div className="screen">
          <div className="pet">•ᴗ•</div>
        </div>
      </div>
      <div className="xp">
        <i style={{ width: `${progress}%` }} />
      </div>
      <div className="device-meta">
        <strong>LV.{companion.level}</strong>
        <span>
          {companion.experience}/{XP_PER_LEVEL} · 다음 레벨{" "}
          {Math.round(progress)}%
        </span>
      </div>
      <div className="reward-banner">
        🎁{" "}
        <span>
          <strong>{reward?.code ?? "LV.7 최초 달성 시 테스트 쿠폰"}</strong>
          {reward && (
            <small>
              {reward.status === "used" ? "사용 완료" : "발급"} ·{" "}
              {issued?.toLocaleString("ko-KR")}
            </small>
          )}
        </span>
      </div>
    </section>
  );
}

function DeviceSettings({
  device,
  companion,
  reported,
  schedules,
  reward,
  onSend,
  onDevice,
  onReported,
  onBack,
}) {
  const mismatch = companionDiffers(companion, reported);
  return (
    <section className="section settings-page">
      <div className="section-head">
        <h1>기기 상태</h1>
        <button className="back" onClick={onBack}>
          돌아가기
        </button>
      </div>
      {mismatch && (
        <p className="sync-warning">
          동기화 필요: 웹 LV.{companion.level} {companion.experience}/7 · 기기
          LV.{reported.level} {reported.experience}/7
        </p>
      )}
      <dl className="device-status">
        <div>
          <dt>연결</dt>
          <dd>{device.connected ? "온라인" : "오프라인"}</dd>
        </div>
        <div>
          <dt>배터리</dt>
          <dd>{device.battery}%</dd>
        </div>
        <div>
          <dt>쿠폰</dt>
          <dd>
            {reward
              ? reward.status === "used"
                ? "사용 완료"
                : "발급"
              : "없음"}
          </dd>
        </div>
      </dl>
      <form
        className="settings-form"
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          onDevice({
            ...device,
            battery: Number(f.get("battery")),
            connected: f.get("connected") === "on",
          });
        }}
      >
        <label>
          테스트 배터리
          <input
            name="battery"
            type="number"
            min="0"
            max="100"
            defaultValue={device.battery}
          />
        </label>
        <label>
          <input
            name="connected"
            type="checkbox"
            defaultChecked={device.connected}
          />{" "}
          연결됨
        </label>
        <button>기기 상태 저장</button>
      </form>
      <form
        className="settings-form inline"
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          onReported({
            companionId: companion.companionId,
            level: Number(f.get("level")),
            experience: Number(f.get("experience")),
          });
        }}
      >
        <label>
          기기 보고 레벨
          <input
            name="level"
            type="number"
            min="1"
            defaultValue={reported?.level ?? companion.level}
          />
        </label>
        <label>
          경험치
          <input
            name="experience"
            type="number"
            min="0"
            max="6"
            defaultValue={reported?.experience ?? companion.experience}
          />
        </label>
        <button>알약이 상태 보고</button>
      </form>
      <div className="event-buttons">
        <h2>가상 하드웨어</h2>
        <small>테스트 이벤트는 오늘의 해당 일정 시각으로 전송됩니다.</small>
        {schedules.map((s) => (
          <button
            key={s.id}
            onClick={() => onSend(s, scheduledAt(s.time, new Date()))}
          >
            {s.time} {s.name} · 복약 성공 이벤트 전송
          </button>
        ))}
      </div>
    </section>
  );
}

function GuardianSettings({ guardian, onSave, onBack }) {
  return (
    <section className="section settings-page">
      <div className="section-head">
        <h1>보호자 설정</h1>
        <button className="back" onClick={onBack}>
          돌아가기
        </button>
      </div>
      <form
        className="settings-form"
        onSubmit={(e) => {
          e.preventDefault();
          const form = new FormData(e.currentTarget);
          onSave({
            name: form.get("name").trim(),
            phone: form.get("phone").trim(),
          });
        }}
      >
        <label>
          보호자 이름
          <input
            name="name"
            defaultValue={guardian.name}
            maxLength="30"
            required
          />
        </label>
        <label>
          알림 받을 연락처
          <input
            name="phone"
            type="tel"
            defaultValue={guardian.phone}
            pattern="[0-9+ -]{8,20}"
            placeholder="010-1234-5678"
            required
          />
        </label>
        <button>연락처 저장</button>
      </form>
      {guardian.phone && (
        <div className="saved-contacts">
          <h2>저장된 연락처</h2>
          <div>
            <strong>{guardian.name}</strong>
            <a href={`tel:${guardian.phone}`}>{guardian.phone}</a>
          </div>
        </div>
      )}
    </section>
  );
}

function Dashboard({ user }) {
  const uid = user?.uid;
  const [view, setView] = useState("dashboard");
  const [schedules, setSchedules] = useState(firebaseReady ? [] : defaults);
  const [records, setRecords] = useState([]);
  const [events, setEvents] = useState([]);
  const [eventPage, setEventPage] = useState(1);
  const [companion, setCompanion] = useState(initialCompanion);
  const [reported, setReported] = useState(null);
  const [device, setDevice] = useState(initialDevice);
  const [reward, setReward] = useState(null);
  const [guardian, setGuardian] = useState({ name: "", phone: "" });
  const [editing, setEditing] = useState(null);
  const [message, setMessage] = useState("");
  const [clock, setClock] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setClock(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!uid || !db) return;
    const path = (...parts) => doc(db, "users", uid, ...parts);
    const stops = [
      onSnapshot(
        doc(db, "users", uid),
        (s) => s.data()?.guardian && setGuardian(s.data().guardian),
      ),
      onSnapshot(collection(db, "users", uid, "schedules"), (s) =>
        setSchedules(
          s.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .sort((a, b) => a.time.localeCompare(b.time)),
        ),
      ),
      onSnapshot(collection(db, "users", uid, "records"), (s) =>
        setRecords(s.docs.map((d) => d.data())),
      ),
      onSnapshot(collection(db, "users", uid, "events"), (s) =>
        setEvents(
          s.docs
            .map((d) => d.data())
            .sort((a, b) =>
              String(b.occurredAt).localeCompare(String(a.occurredAt)),
            ),
        ),
      ),
      onSnapshot(
        path("companion", "current"),
        (s) => s.exists() && setCompanion(s.data()),
      ),
      onSnapshot(path("companion", "reported"), (s) =>
        setReported(s.exists() ? s.data() : null),
      ),
      onSnapshot(
        path("devices", "current"),
        (s) => s.exists() && setDevice(s.data()),
      ),
      onSnapshot(path("rewards", "level-7"), (s) =>
        setReward(s.exists() ? s.data() : null),
      ),
    ];
    (async () => {
      const root = doc(db, "users", uid);
      const userData = (await getDoc(root)).data();
      if (!userData?.scheduleMigrationVersion) {
        const list = await getDocs(collection(db, "users", uid, "schedules"));
        if (list.empty) {
          const source = userData?.schedules?.length
            ? userData.schedules
            : defaults;
          for (const [index, item] of source.entries()) {
            await setDoc(path("schedules", item.id ?? `legacy-${index}`), {
              time: item.time,
              name: item.name,
              detail: item.detail,
              startsOn: item.startsOn ?? localDateKey(),
            });
          }
        }
        await setDoc(root, { scheduleMigrationVersion: 1 }, { merge: true });
      }
      if (!(await getDoc(path("companion", "current"))).exists()) {
        await setDoc(path("companion", "current"), initialCompanion);
      }
      if (!(await getDoc(path("devices", "current"))).exists()) {
        await setDoc(path("devices", "current"), initialDevice);
      }
    })().catch(() => setMessage("초기 데이터를 불러오지 못했습니다."));
    return () => stops.forEach((stop) => stop());
  }, [uid]);

  useEffect(() => {
    const now = new Date(clock);
    [0, -1].forEach((days) =>
      schedules.forEach((s) => {
        const due = scheduledAt(s.time, now);
        due.setDate(due.getDate() + days);
        const date = localDateKey(due);
        if (
          date < (s.startsOn ?? localDateKey(now)) ||
          now - due <= 30 * 60000 ||
          records.some((r) => r.date === date && r.scheduleId === s.id)
        )
          return;
        const record = {
          id: `${date}_${s.id}`,
          date,
          scheduleId: s.id,
          status: "missed",
          occurredAt: now.toISOString(),
        };
        if (uid && db) {
          const ref = doc(db, "users", uid, "records", record.id);
          runTransaction(db, async (tx) => {
            if (!(await tx.get(ref)).exists()) tx.set(ref, record);
          }).catch(() => {});
        } else setRecords((r) => [...r, record]);
      }),
    );
  }, [schedules, records, uid, clock]);

  async function saveSchedule(item) {
    try {
      const clean = {
        time: item.time,
        name: item.name.trim(),
        detail: item.detail.trim(),
        startsOn: item.startsOn,
      };
      if (uid && db) {
        await setDoc(doc(db, "users", uid, "schedules", item.id), clean);
      } else {
        setSchedules((s) =>
          [
            ...s.filter((x) => x.id !== item.id),
            { id: item.id, ...clean },
          ].sort((a, b) => a.time.localeCompare(b.time)),
        );
      }
      setEditing(null);
      setMessage("저장되었습니다.");
    } catch {
      setMessage("일정을 저장하지 못했습니다.");
    }
  }
  async function removeSchedule(id) {
    if (!confirm("이 복약 일정을 삭제할까요?")) return;
    try {
      if (uid && db) await deleteDoc(doc(db, "users", uid, "schedules", id));
      else setSchedules((s) => s.filter((x) => x.id !== id));
    } catch {
      setMessage("일정을 삭제하지 못했습니다.");
    }
  }
  async function removeEvent(id) {
    if (!confirm("이 이벤트 로그를 삭제할까요?")) return;
    try {
      if (uid && db) await deleteDoc(doc(db, "users", uid, "events", id));
      else setEvents((items) => items.filter((item) => item.eventId !== id));
      setMessage("이벤트 로그를 삭제했습니다.");
    } catch {
      setMessage("이벤트 로그를 삭제하지 못했습니다.");
    }
  }
  async function clearEvents() {
    if (!confirm("약통 이벤트 로그를 모두 삭제할까요?")) return;
    try {
      if (uid && db)
        await Promise.all(
          (await getDocs(collection(db, "users", uid, "events"))).docs.map(
            (item) => deleteDoc(item.ref),
          ),
        );
      else setEvents([]);
      setMessage("이벤트 로그를 삭제했습니다.");
    } catch {
      setMessage("이벤트 로그를 삭제하지 못했습니다.");
    }
  }
  async function sendSuccess(schedule, occurredAt = new Date()) {
    const now = new Date(occurredAt);
    if (!isOnTime(schedule.time, now))
      return setMessage("예정 시간 전후 30분 안에서만 성공 처리됩니다.");
    const due = nearestSchedule(schedule.time, now);
    const date = localDateKey(due);
    const event = {
      eventId: crypto.randomUUID(),
      deviceId: device.deviceId,
      scheduleId: schedule.id,
      type: "medication_success",
      occurredAt: now.toISOString(),
    };
    const record = {
      id: `${date}_${schedule.id}`,
      date,
      scheduleId: schedule.id,
      status: "done",
      occurredAt: event.occurredAt,
    };
    if (!uid || !db) {
      if (records.some((r) => r.id === record.id && r.status === "done"))
        return setMessage("이미 처리된 복약 일정입니다.");
      const next = gainExperience(companion);
      setEvents((e) => [event, ...e]);
      setRecords((r) => [...r.filter((x) => x.id !== record.id), record]);
      setCompanion({ ...companion, ...next });
      if (companion.level === 6 && next.level === 7 && !reward)
        setReward({
          code: "MEDHABIT-LV7-TEST",
          status: "issued",
          issuedAt: event.occurredAt,
        });
      return setMessage("복약 성공 이벤트를 처리했습니다.");
    }
    const ref = (...parts) => doc(db, "users", uid, ...parts);
    const eventRef = ref("events", event.eventId);
    const recordRef = ref("records", record.id);
    const companionRef = ref("companion", "current");
    const scheduleRef = ref("schedules", schedule.id);
    const rewardRef = ref("rewards", "level-7");
    try {
      const processed = await runTransaction(db, async (tx) => {
        const [oldEvent, oldRecord, currentDoc, currentSchedule, oldReward] =
          await Promise.all([
            tx.get(eventRef),
            tx.get(recordRef),
            tx.get(companionRef),
            tx.get(scheduleRef),
            tx.get(rewardRef),
          ]);
        if (
          oldEvent.exists() ||
          oldRecord.data()?.status === "done" ||
          !currentSchedule.exists() ||
          currentSchedule.data().time !== schedule.time ||
          !isOnTime(currentSchedule.data().time, event.occurredAt)
        )
          return false;
        const current = currentDoc.data() ?? initialCompanion;
        const next = gainExperience(current);
        tx.set(eventRef, event);
        tx.set(recordRef, record);
        tx.set(companionRef, {
          companionId: current.companionId ?? "buddy-1",
          level: next.level,
          experience: next.experience,
          updatedAt: serverTimestamp(),
        });
        if (current.level === 6 && next.level === 7 && !oldReward.exists())
          tx.set(rewardRef, {
            code: "MEDHABIT-LV7-TEST",
            status: "issued",
            issuedAt: serverTimestamp(),
          });
        return true;
      });
      setMessage(
        processed
          ? "복약 성공 이벤트를 처리했습니다."
          : "이미 처리됐거나 변경된 일정입니다.",
      );
    } catch {
      setMessage("복약 이벤트를 처리하지 못했습니다.");
    }
  }
  const date = localDateKey();
  const status = (id) =>
    records.find((record) => record.date === date && record.scheduleId === id)
      ?.status ?? "pending";
  const mismatch = companionDiffers(companion, reported);
  const headline = medicationHeadline(schedules, records, new Date(clock));
  const missed = missedSchedules(schedules, records, new Date(clock));
  const eventPages = Math.max(1, Math.ceil(events.length / 8));
  const lastVisibleEvent = Math.min(eventPage, eventPages) * 8;
  const visibleEvents = events.slice(lastVisibleEvent - 8, lastVisibleEvent);
  useEffect(
    () => setEventPage((page) => Math.min(page, eventPages)),
    [eventPages],
  );
  const saveDevice = async (next) => {
    setDevice(next);
    if (uid && db) {
      await setDoc(doc(db, "users", uid, "devices", "current"), next);
    }
  };
  const saveReported = async (next) => {
    setReported(next);
    if (uid && db) {
      await setDoc(doc(db, "users", uid, "companion", "reported"), {
        ...next,
        updatedAt: serverTimestamp(),
      });
    }
  };
  const saveGuardian = async (next) => {
    try {
      setGuardian(next);
      if (uid && db)
        await setDoc(
          doc(db, "users", uid),
          { guardian: next },
          { merge: true },
        );
      setMessage("저장되었습니다.");
    } catch {
      setMessage("보호자 정보를 저장하지 못했습니다.");
    }
  };
  return (
    <main className="shell">
      <header className="topbar">
        <button className="logo-button" onClick={() => setView("dashboard")}>
          <Logo />
        </button>
        <nav className="topnav">
          <button onClick={() => setView("schedule")}>일정 수정</button>
          <button onClick={() => setView("guardian")}>보호자 설정</button>
          <button onClick={() => setView("device")}>기기 설정</button>
          {user && <button onClick={() => signOut(auth)}>로그아웃</button>}
        </nav>
      </header>
      {!firebaseReady && (
        <div className="demo-note">
          Firebase 미설정: 브라우저 테스트 모드입니다.
        </div>
      )}
      {message && (
        <p className="save-message" role="status">
          {message}
        </p>
      )}
      {view === "schedule" && (
        <section className="section settings-page">
          <div className="section-head">
            <h1>일정 수정</h1>
            <button className="back" onClick={() => setView("dashboard")}>
              돌아가기
            </button>
          </div>
          <ScheduleForm
            value={editing}
            onSave={saveSchedule}
            onCancel={() => setEditing(null)}
          />
          {schedules.map((s) => (
            <div className="row" key={s.id}>
              <b>{s.time}</b>
              <div className="desc">
                <strong>{s.name}</strong>
                <span>{s.detail}</span>
              </div>
              <div className="row-actions">
                <button onClick={() => setEditing(s)}>수정</button>
                <button className="delete" onClick={() => removeSchedule(s.id)}>
                  삭제
                </button>
              </div>
            </div>
          ))}
        </section>
      )}
      {view === "guardian" && (
        <GuardianSettings
          guardian={guardian}
          onSave={saveGuardian}
          onBack={() => setView("dashboard")}
        />
      )}
      {view === "device" && (
        <DeviceSettings
          {...{ device, companion, reported, schedules, reward }}
          onSend={sendSuccess}
          onDevice={saveDevice}
          onReported={saveReported}
          onBack={() => setView("dashboard")}
        />
      )}
      {view === "dashboard" && (
        <>
          <section className="hero">
            <div>
              <div className="hero-label">오늘의 복약 상태</div>
              <div className="hero-headline">{headline}</div>
            </div>
            <div className="hero-time">
              <div className="num">
                {schedules.find((s) => status(s.id) === "pending")?.time ??
                  "완료"}
              </div>
              <div className="lbl">다음 복약</div>
            </div>
          </section>
          <div className="grid">
            <div>
              <section className="section">
                <div className="section-head">
                  <h2>오늘의 일정</h2>
                </div>
                {schedules.map((s) => (
                  <div className="row" key={s.id}>
                    <b>{s.time}</b>
                    <div className="desc">
                      <strong>{s.name}</strong>
                      <span>{s.detail}</span>
                    </div>
                    <span className={`status ${status(s.id)}`}>
                      {status(s.id) === "done"
                        ? "복용 완료"
                        : status(s.id) === "missed"
                          ? "미복용"
                          : "복용 예정"}
                    </span>
                  </div>
                ))}
              </section>
              <section className="section">
                <div className="section-head">
                  <h2>약통 이벤트 로그</h2>
                  {events.length > 0 && (
                    <button className="delete" onClick={clearEvents}>
                      전체 삭제
                    </button>
                  )}
                </div>
                {visibleEvents.map((e) => (
                  <div className="row" key={e.eventId}>
                    <b>
                      {new Date(e.occurredAt).toLocaleTimeString("ko-KR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </b>
                    <div className="desc">
                      <strong>복약 성공</strong>
                      <span>{e.deviceId}</span>
                    </div>
                    <div className="row-actions">
                      <span className="status done">정상</span>
                      <button
                        className="delete"
                        onClick={() => removeEvent(e.eventId)}
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                ))}
                {eventPages > 1 && (
                  <nav className="pagination" aria-label="이벤트 로그 페이지">
                    <button
                      disabled={eventPage === 1}
                      onClick={() => setEventPage((p) => p - 1)}
                    >
                      이전
                    </button>
                    <span>
                      {eventPage} / {eventPages}
                    </span>
                    <button
                      disabled={eventPage === eventPages}
                      onClick={() => setEventPage((p) => p + 1)}
                    >
                      다음
                    </button>
                  </nav>
                )}
              </section>
            </div>
            <div>
              <Companion {...{ companion, reward }} />
              <section className="section">
                <div className="section-head">
                  <h2>알림</h2>
                </div>
                {missed.length ? (
                  missed.map((schedule) => (
                    <div className="alert" key={schedule.id}>
                      <div>
                        <strong>미복용 알림</strong>
                        <p>{schedule.name} 복용이 확인되지 않았습니다.</p>
                      </div>
                      <span className="status missed">확인 필요</span>
                    </div>
                  ))
                ) : (
                  <div className="alert">
                    <div>
                      <strong>미복용 알림</strong>
                      <p>예정 시간에서 30분이 지나면 여기에 표시됩니다.</p>
                    </div>
                  </div>
                )}
                <div className="alert">
                  <div>
                    <strong>기기 연결 상태</strong>
                    <p>
                      {device.connected
                        ? `온라인 · 배터리 ${device.battery}%`
                        : "오프라인"}
                    </p>
                    {mismatch && <p className="sync-warning">동기화 필요</p>}
                  </div>
                  <span
                    className={`status ${device.connected ? "done" : "missed"}`}
                  >
                    {device.connected ? "온라인" : "오프라인"}
                  </span>
                </div>
              </section>
            </div>
          </div>
        </>
      )}
    </main>
  );
}

function App() {
  const [user, setUser] = useState(undefined);
  useEffect(
    () => (firebaseReady ? onAuthStateChanged(auth, setUser) : setUser(null)),
    [],
  );
  if (user === undefined) return <div className="loading">불러오는 중…</div>;
  return firebaseReady && !user ? <Login /> : <Dashboard user={user} />;
}
createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
