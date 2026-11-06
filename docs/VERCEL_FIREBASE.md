# Vercel 배포와 향후 Firebase 준비

## 지금 필요한 환경변수

**필수 환경변수: 0개.** Vercel의 Environment Variables는 비워 두면 됩니다.

현재는 브라우저의 `sessionStorage`에만 임시 저장합니다. Firebase, DB 서버, API, 로그인, 서버 함수와 외부 SDK는 사용하지 않습니다. `DATABASE_URL`, Firebase 키, `NEXT_PUBLIC_*`, `VITE_*`를 만들 필요가 없습니다.

## Vercel 새 프로젝트 설정

GitHub 저장소 `https://github.com/byki0304/myaitreasures`를 Import합니다.

| 설정 | 값 |
| --- | --- |
| Framework Preset | Other |
| Root Directory | 저장소 루트 `./` (기본값 그대로) |
| Build Command | `node scripts/build-vercel.mjs` |
| Output Directory | `dist` |
| Install Command | 비워 둠 — 앱 의존성 설치 없음 |
| Environment Variables | 없음 |

루트 `vercel.json`에 프레임워크·빌드·출력 경로를 기록했습니다. 대시보드에 과거 Override가 있다면 위 값과 맞춥니다. Vercel 빌드는 Node로 이미 생성된 루트 HTML을 `dist/index.html`로 복사합니다. 문서·원본 이미지·소스를 웹 공개 경로에 복사하지 않습니다.

소스를 수정한 뒤에는 로컬에서 `python3 build.py`로 루트 HTML을 갱신하고 함께 커밋합니다. Vercel 빌드에는 Python 설치가 필요하지 않습니다. 단순 HTML도 정적 배포할 수 있으며, 이 프로젝트는 배포 파일을 분리하기 위해 작은 패키징 단계를 사용합니다.

공식 근거: [Vercel Build 설정](https://vercel.com/docs/builds/configure-a-build), [vercel.json 설정](https://vercel.com/docs/project-configuration/vercel-json), [환경변수](https://vercel.com/docs/environment-variables).

## 앱 설치 아이콘

- 모바일(홈 화면·PWA): `assets/icons/icon-192.png`, `icon-512.png`, `icon-maskable-*.png`(Android 원형 마스크용), `apple-touch-icon.png`(iOS).
- 데스크톱: `assets/icons/icon-desktop-*.png`(투명 배경), `icon-desktop.ico`(Windows 바로가기용), 루트 `favicon.ico`.
- 설치 정보는 루트 `site.webmanifest`에 있고, `build.py`가 `index.html`에 연결합니다. Vercel 빌드는 매니페스트와 아이콘을 `dist`로 함께 복사합니다(원본 `assets/icons/source/` 제외).
- 아이콘을 바꾸려면 `assets/icons/source/`의 원본 두 장을 교체하고 `python scripts/make-icons.py`를 실행합니다.

## 브라우저 임시 저장의 범위

- 저장 위치: 사용자 기기 브라우저의 `sessionStorage`.
- 저장 키: `my-ai-treasures:session:v1`.
- 저장 내용: 모임 정보, 참여자, 지출·세금·부담 참여자, 통화, 언어, 화면, 선택 멤버. 결과는 복원한 입력으로 다시 계산합니다.
- 같은 탭의 새로고침: 복원합니다. 입력 도중 페이지가 다시 로드되어도 마지막으로 저장된 값을 다시 보여 줍니다.
- 새 정산 확인: 초기화한 상태를 임시 저장합니다. 새로고침해도 이전 정산이 돌아오지 않습니다.
- 처음으로: 입력과 통화를 유지하고 한국어 시작 화면으로 돌아갑니다.
- 저장은 출처(도메인)와 탭별로 분리됩니다. 다른 기기나 별도 탭과 자동 동기화하지 않습니다.
- 탭·창을 닫으면 일반적으로 세션이 끝나지만, 브라우저의 닫은 탭 복구·세션 복원·탭 복제에 따라 내용이 복원되거나 복제될 수 있습니다. 즉시 비우려면 새 정산을 사용합니다.
- 프리뷰 URL과 운영 도메인이 다르면 저장 내용도 별개입니다.
- 저장 차단·용량 초과 시 안내하고 현재 메모리에서 계속 실행합니다. 이 경우 새로고침 복원은 불가능합니다.

이전의 '새로고침하면 초기화' 정책은 이번 요청으로 변경되었습니다. 브라우저 임시 저장은 영구 백업이 아닙니다.

## 모바일에서 직접 확인

1. Vercel 배포 URL을 휴대폰에서 엽니다.
2. 세로: 하단 메뉴 2행과 입력칸이 화면 밖으로 넘치지 않는지 확인합니다.
3. 일부 입력 후 새로고침하여 복원되는지 확인합니다.
4. 가로로 회전: 하단 메뉴 1행으로 바뀌고 값이 유지되는지 확인합니다.
5. 계산 후 멤버별 메시지 작성·복사·닫기를 확인합니다.
6. 언어를 바꾸고 새로고침하여 언어·화면·값이 복원되는지 확인합니다.
7. 새 정산 확인 후 새로고침하여 이전 데이터가 돌아오지 않는지 확인합니다.

## 향후 Firebase: 준비된 코드와 남은 작업

`src/storage.js`는 비동기 `load()`, `save(snapshot)`, `clear()` 저장 인터페이스를 제공합니다.

- 현재: `createSessionStore()`를 사용합니다.
- 향후: `createFirebaseStore({db, uid, doc, getDoc, setDoc, deleteDoc})`를 제공합니다. Firebase 모듈을 인증 후 주입하는 형태이며 지금은 호출하지 않습니다.
- 예정 경로: `users/{uid}/settlements/current`.
- `firebase/firestore.rules`에는 인증된 소유자만 자기 문서에 접근하는 규칙 초안이 있습니다. 아직 배포되지 않았습니다.
- 루트 `firebase.json`은 Firebase CLI가 위 규칙 파일을 사용하도록 지정합니다. 프로젝트를 만든 뒤 `firebase use --add`로 프로젝트를 연결하고 `firebase deploy --only firestore:rules`로 규칙을 배포합니다.
- Firebase Authentication의 **Authorized domains**에 Vercel 운영 도메인(예: `myaitreasures.vercel.app`)과 사용자 지정 도메인을 추가해야 로그인이 동작합니다.
- Firebase 생성 시 수행할 일: 프로젝트·Web App 등록 → Firestore 생성 → 인증 방식 구현 → Firebase 모듈과 설정 주입 → 저장 어댑터 교체 → 규칙·입력 스키마·오프라인/오류 동작을 검증합니다.
- 브라우저 세션 데이터를 DB로 자동 업로드하지 않습니다. 마이그레이션이나 동기화는 추후 별도로 결정합니다.

현재 로그인과 DB가 없으므로 Firebase 키를 입력하는 것만으로 연결되지는 않습니다. 어댑터와 규칙 초안은 향후 구현 지점이며 완성된 DB 기능이 아닙니다.

## 향후에 사용할 수 있는 환경변수 이름

아래는 **향후 Firebase 빌드 설정 이름**입니다. 지금은 등록하지 않습니다. 이름 목록은 루트 `.env.example`에도 있습니다.

`scripts/build-vercel.mjs`는 Vercel 빌드 시 이 환경변수가 하나라도 있으면 `dist/index.html`의 `</head>` 앞에 `window.TREASURES_FIREBASE_CONFIG`로 공개 Web 설정을 주입합니다. 하나라도 설정했다면 `FIREBASE_API_KEY`, `FIREBASE_PROJECT_ID`, `FIREBASE_APP_ID`는 모두 필요하며, 빠지면 빌드가 실패합니다. 아무것도 없으면 주입하지 않고 지금처럼 동작합니다. 현재 앱 코드는 이 값을 아직 읽지 않습니다.

환경변수를 추가·변경한 뒤에는 Vercel에서 **Redeploy**해야 반영됩니다.

| 제안 이름 | Firebase Web 설정 필드 | 향후 용도 |
| --- | --- | --- |
| `FIREBASE_API_KEY` | `apiKey` | Web 앱 연결 설정 |
| `FIREBASE_PROJECT_ID` | `projectId` | 프로젝트 식별 |
| `FIREBASE_APP_ID` | `appId` | Web 앱 식별 |
| `FIREBASE_AUTH_DOMAIN` | `authDomain` | 로그인 도입 시 인증 설정 |
| `FIREBASE_STORAGE_BUCKET` | `storageBucket` | 파일 저장 기능을 도입할 때만 |
| `FIREBASE_MESSAGING_SENDER_ID` | `messagingSenderId` | Firebase 제공 설정 중 해당 서비스 사용 시 |
| `FIREBASE_MEASUREMENT_ID` | `measurementId` | Analytics를 도입할 때만. 현재 계획 없음 |

Firestore를 사용할 계획이므로 Realtime Database의 `databaseURL`은 지금 필요하지 않습니다. Firebase 콘솔에서 제공한 Web 설정 값을 그대로 사용하고 값을 추측하지 않습니다.

Firebase Web 설정은 브라우저에 공개되는 연결 식별 정보입니다. 데이터 접근은 인증과 Security Rules로 통제해야 합니다. Admin SDK 서비스 계정·private key는 브라우저 코드에 넣지 않습니다.

공식 근거: [Firebase Web 설정](https://firebase.google.com/docs/web/setup), [Firebase Web 옵션](https://firebase.google.com/docs/web/learn-more), [Firebase API 키](https://firebase.google.com/docs/projects/api-keys).
