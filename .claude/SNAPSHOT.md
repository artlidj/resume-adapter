# SNAPSHOT — Адаптатор резюме

*Last updated: 2026-02-22 (session 2)*

## Current State

- Framework mode: active
- Active branch: `main`
- Status: MVP работает, основные фичи готовы

## Project Overview

Инструмент для адаптации резюме под конкретную вакансию (ATS-совместимость).

**Стек:**
- Frontend: React 18 + TypeScript + Vite (порт 5173)
- Backend: Express + Node.js + TypeScript (порт 8787)
- БД/Auth: Supabase (PostgreSQL + RLS)
- LLM: OpenAI gpt-4o-mini / gpt-4o / gpt-4.1-mini (выбор модели)
- DOCX: docx библиотека для генерации Word файлов

## What's Done

- [x] Monorepo структура (apps/web + apps/api)
- [x] Frontend: форма загрузки резюме + описание вакансии
- [x] Auth UI: раздельные формы входа и регистрации
- [x] Supabase: проект создан, .env настроены, таблица `adaptations` создана
- [x] Backend: Express + multer + валидация файлов
- [x] Парсинг файлов: PDF (pdf-parse), DOCX (mammoth), TXT
- [x] Security: helmet.js, rate limiting, MIME validation
- [x] OpenAI интеграция: gpt-4o-mini, response_format json_object
- [x] Отображение результата: match score, ключевые слова, адаптированный текст
- [x] Генерация DOCX: единый стиль Calibri, заголовки секций, буллеты, поля
- [x] **Исправлены баги запуска**: .env загрузка, pdf-parse, esbuild darwin-arm64
- [x] **Тёмная тема**: автоматическая через prefers-color-scheme
- [x] **Кнопка копирования**: с анимацией "Скопировано!"
- [x] **Счётчик символов**: у поля вакансии с цветовой индикацией
- [x] **Ввод через ссылку**: Google Docs для резюме и вакансии, generic URL для вакансии
- [x] **Выбор модели OpenAI**: dev-дропдаун (gpt-4o-mini, gpt-4o, gpt-4.1-mini)
- [x] **DOCX улучшения**: разделение между секциями, имя 18pt, контакты 12pt, буллеты
- [x] **Refinement loop**: поле уточнений под результатом → POST /adapt/refine → OpenAI → обновление на месте

## What's Next

- [ ] Удалить dev-дропдаун модели перед продакшеном
- [ ] Деплой: фронт на Netlify, API на Railway
- [ ] Free tier лимит (3-5 адаптаций на аккаунт)
- [ ] Минимальные e2e тесты

## Current Focus

MVP готов к тестированию. Следующий шаг — деплой.
