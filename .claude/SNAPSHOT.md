# SNAPSHOT — Адаптатор резюме

*Last updated: 2026-02-19*

## Current State

- Framework mode: active
- Active branch: `main`
- Status: MVP в разработке

## Project Overview

Инструмент для адаптации резюме под конкретную вакансию (ATS-совместимость).

**Стек:**
- Frontend: React 18 + TypeScript + Vite (порт 5173)
- Backend: Express + Node.js + TypeScript (порт 8787)
- БД/Auth: Supabase (PostgreSQL + RLS)
- LLM: OpenAI (планируется, пока мок)

## What's Done

- [x] Monorepo структура (apps/web + apps/api)
- [x] Frontend: форма загрузки резюме + описание вакансии
- [x] Auth UI: раздельные формы входа и регистрации с именем пользователя
- [x] Supabase: проект создан, .env настроены, таблица `adaptations` создана
- [x] Backend: Express + multer + валидация файлов
- [x] Парсинг файлов: PDF (pdf-parse), DOCX (mammoth), TXT
- [x] Security: helmet.js, rate limiting (20 req/15min), MIME validation, jobDescription limits
- [x] Mock адаптация (заглушка до подключения OpenAI)

## What's Next

- [ ] Интеграция OpenAI (system prompt + Chat Completions API)
- [ ] Страница результата (оригинал vs адаптированный + diff)
- [ ] Генерация PDF на выходе
- [ ] Защита от галлюцинаций (базовая валидация ответа)
- [ ] Деплой: фронт на Netlify, API на Railway

## Current Focus

Следующий шаг: интеграция OpenAI Chat Completions с system prompt для ATS-адаптации.
