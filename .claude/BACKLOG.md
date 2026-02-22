# BACKLOG — Адаптатор резюме

*Refreshed on 2026-02-22*

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
- [x] Исправлен баг pdf-parse (импорт из lib/pdf-parse.js)
- [x] Исправлена загрузка .env (node --env-file флаг)
- [x] Тёмная тема (prefers-color-scheme через CSS переменные)
- [x] Кнопка копирования результата с анимацией
- [x] Счётчик символов у поля вакансии
- [x] Ввод резюме через ссылку Google Docs
- [x] Ввод вакансии через URL (с предупреждением об ограничениях)
- [x] Dev-дропдаун выбора модели OpenAI
- [x] DOCX: единый стиль (Calibri 12/13pt), буллеты, разделение секций, имя 18pt

## Active Tasks

- [ ] Удалить dev-дропдаун модели перед деплоем

## Backlog

- [ ] Деплой: фронт → Netlify, API → Railway
- [ ] Free tier лимит (3-5 адаптаций на аккаунт)
- [ ] Минимальные e2e тесты
- [ ] Улучшенное логирование (morgan/structured)
- [ ] RLS политики UPDATE/DELETE для таблицы adaptations
