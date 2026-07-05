# MedHabit Buddy

> 현재 Spark 버전은 가상 하드웨어 테스트용입니다. 브라우저가 기록과 경험치를 계산하므로 사용자가 자신의 데이터를 조작하는 것을 보안 경계에서 막지 않습니다. 실제 운영은 Cloud Function에서 기기 인증과 상태 계산을 수행해야 합니다.

## 실행

```bash
corepack pnpm install
corepack pnpm dev
```

Firebase Console에서 **Authentication > 이메일/비밀번호**와 **Firestore**를 활성화한 뒤,
`.env.example`을 `.env.local`로 복사해 웹 앱 설정값을 입력합니다. 설정 전에는 목업 데이터로 실행됩니다.

```bash
corepack pnpm build
firebase deploy
```

Firestore 대시보드 데이터는 `users/{로그인 uid}` 문서에 저장하며, 필드 형태는
`src/main.jsx`의 `sample` 객체와 같습니다.

