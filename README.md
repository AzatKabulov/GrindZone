# GrindZone

Личный трекер дисциплины для iPhone: задачи, план дня по тайм-слотам, цели и заметки.
Сделан на **Expo SDK 58**, работает в **Expo Go**. Дизайн следует Apple Human Interface Guidelines
и использует нативные компоненты iOS, а не их имитацию.

## Как это выглядит и ощущается

- **Шрифты Apple.** SF Pro для интерфейса, SF Pro Rounded для цифр (как в «Фитнесе»), New York для цитаты дня.
  Используются системные шрифты iPhone, никаких сторонних.
- **Нативная навигация.** Настоящий таб-бар iOS (Liquid Glass на iOS 26, сворачивается при прокрутке), большие заголовки,
  кнопки и выпадающие меню в шапке с SF Symbols, нативный поиск в заметках.
- **Системные цвета** iOS (тёмная и светлая тема), скругления squircle, сгруппированные списки как в «Настройках».
- **Нативные контролы:** пикеры даты и времени, сегмент-контролы, переключатели, action sheets.

## Экраны

| Вкладка | Что делает |
|---|---|
| **Today** | Шапка как в App Store, цитата дня, кольца прогресса (задачи + тайм-блоки), стрик, уровень и XP, текущий блок с прогрессом, задачи на сегодня |
| **Tasks** | Как в «Напоминаниях»: Today / Upcoming / Inbox / Done, приоритет `!!!`, свайп вправо — выполнить, влево — удалить, строка «New Task» для быстрого ввода |
| **Plan** | Как в «Календаре»: неделя сверху (свайп — другая неделя), таймлайн дня, красная линия «сейчас», тап по пустому часу — новый блок, меню «Скопировать вчерашний план» / «Повторить завтра» |
| **Goals** | Цели по сферам (Body, Mind, Wealth…), кольцо прогресса по связанным задачам, дедлайн, «Mark as Achieved» |
| **Notes** | Как Apple Notes: Pinned / Today / Previous 7 Days, поиск, свайп — закрепить или удалить |
| Профиль | Аватар, уровень, Highlights (статистика), тема, 6 акцентов, вибрация, синхронизация |

### Награды

- Выполнил задачу: чекбокс «щёлкает», вибрация, сверху (из Dynamic Island) выезжает `+20 XP`.
- XP: High = 30, Medium = 20, Low = 10, тайм-блок = 15, цель = 250.
- Уровни и ранги: Recruit → Grinder → Operator → Hunter → Veteran → Elite → Apex → Titan → Legend.
- Закрыл все задачи дня: медаль **Perfect Day** с конфетти. Новый уровень: **Level Up**. Закрыл цель: **Goal Achieved**.

## Запуск на iPhone (Expo Go)

1. Установи **Expo Go** из App Store (последняя версия, SDK 58).
2. На компьютере (Node.js 20+):
   ```bash
   git clone https://github.com/AzatKabulov/GrindZone.git
   cd GrindZone
   git checkout claude/task-tracking-app-4vjjk7
   npm install
   npx expo start
   ```
3. Отсканируй QR-код камерой iPhone. Телефон и компьютер должны быть в одной Wi-Fi сети,
   иначе запусти `npx expo start --tunnel`.

### Чтобы приложение открывалось без компьютера

Свои серверы (AWS и т.п.) для этого не нужны: бэкенд уже работает в Supabase 24/7.
Нужно один раз опубликовать бандл в облако Expo (бесплатно, через EAS Update):

```bash
npx eas-cli@latest login            # бесплатный аккаунт expo.dev
npx eas-cli@latest init
npx eas-cli@latest update:configure
npx eas-cli@latest update --branch main --message "GrindZone"
```

Потом войди в тот же аккаунт в Expo Go, и проект будет открываться прямо оттуда, без запущенного компьютера.

## Аккаунт и данные

- Вход по email и паролю (Supabase-проект `GrindZone`). Вошёл с того же email на другом устройстве — всё подтянулось.
- **Offline-first:** всё сразу сохраняется на телефон и синхронизируется с облаком при изменениях, при открытии приложения
  и раз в 5 минут. Без интернета ничего не теряется.
- Row Level Security: каждый пользователь видит только свои строки.
- Можно пользоваться без аккаунта (Continue Without an Account). Когда потом создашь аккаунт, локальные данные загрузятся в него.
- GitHub Action `supabase-keepalive` дважды в неделю пингует бэкенд, чтобы бесплатный проект Supabase не засыпал.

**Рекомендуется один раз:** Supabase Dashboard → GrindZone → Authentication → Sign In / Providers → Email →
выключи **Confirm email**, чтобы регистрироваться без письма-подтверждения.

## Структура

```
src/
  app/
    (tabs)/_layout.tsx        нативный таб-бар (NativeTabs); _layout.web.tsx — замена для веб-превью
    (tabs)/(today)/           Today
    (tabs)/tasks|plan|goals|notes/   стек каждой вкладки (большие заголовки), goals/[id], notes/[id]
    task/[id].tsx block/[id].tsx settings.tsx   модальные экраны (Cancel / Done)
    sign-in.tsx
  components/   ui.tsx (Txt, Button, ListSection, Row…), Icon (SF Symbols), Rings, Checkbox, TaskRow,
                fields (нативные пикеры, сегменты, action sheet), header (кнопки шапки), FxHost (награды)
  store/        data.ts (локальное хранилище), sync.ts (синхронизация), actions.ts (награды), selectors.ts
  theme/        системные цвета iOS, типографика, шрифты
```

## Команды

```bash
npm start            # dev-сервер Expo
npm run web          # превью в браузере (вместо SF Pro — Inter, вместо New York — Newsreader)
npm run typecheck    # TypeScript
npm run lint         # ESLint
```
