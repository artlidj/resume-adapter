# BACKLOG — Адаптатор резюме

*Refreshed on 2026-02-20*

## Completed

- [x] Monorepo структура (apps/web + apps/api)
- [x] Frontend: форма загрузки + вакансия + Auth UI
- [x] Supabase: проект, .env, таблица adaptations, RLS политики
- [x] Backend: Express + multer + парсинг PDF/DOCX/TXT
- [x] Security: helmet, rate limiting, MIME validation, input limits
- [x] Auth UI: раздельные формы входа/регистрации, имя пользователя в session bar
- [x] Интеграция OpenAI (system prompt + gpt-4o-mini + createAdaptation функция)
- [x] Отображение результата на фронтенде (адаптированный текст, keywords, match score)
- [x] Генерация DOCX для скачивания (docx библиотека + endpoint /adapt/download)

## Active Tasks

- [ ] Отладка ошибки адаптации (frontend показывает "Не удалось адаптировать")
- [ ] Базовая защита от галлюцинаций (сверка дат/компаний с исходником)

## Backlog

- [ ] Деплой: фронт → Netlify, API → Railway
- [ ] Free tier лимит (3-5 адаптаций на аккаунт)
- [ ] Минимальные e2e тесты
- [ ] Улучшенное логирование (morgan/structured)
- [ ] RLS политики UPDATE/DELETE для таблицы adaptations
