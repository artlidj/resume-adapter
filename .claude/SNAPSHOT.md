# SNAPSHOT — Адаптатор резюме

*Last updated: 2026-02-20*

## Current State

- Framework mode: active
- Active branch: `main`
- Status: MVP в разработке (OpenAI интеграция добавлена, требуется отладка)

## Project Overview

Инструмент для адаптации резюме под конкретную вакансию (ATS-совместимость).

**Стек:**
- Frontend: React 18 + TypeScript + Vite (порт 5173)
- Backend: Express + Node.js + TypeScript (порт 8787)
- БД/Auth: Supabase (PostgreSQL + RLS)
- LLM: OpenAI gpt-4o-mini (интегрировано)
- DOCX: docx библиотека для генерации Word файлов

## What's Done

- [x] Monorepo структура (apps/web + apps/api)
- [x] Frontend: форма загрузки резюме + описание вакансии
- [x] Auth UI: раздельные формы входа и регистрации с именем пользователя
- [x] Supabase: проект создан, .env настроены, таблица `adaptations` создана
- [x] Backend: Express + multer + валидация файлов
- [x] Парсинг файлов: PDF (pdf-parse), DOCX (mammoth), TXT
- [x] Security: helmet.js, rate limiting (20 req/15min), MIME validation, jobDescription limits
- [x] **OpenAI интеграция**: SDK установлен, система промпт создан, функция createAdaptation() с gpt-4o-mini
- [x] **Отображение результата**: match score, ключевые слова, адаптированный текст на фронтенде
- [x] **Генерация DOCX**: библиотека docx, endpoint /adapt/download, скачивание Word документа

## What's Next

- [ ] **Отладка**: исправить ошибку "Не удалось адаптировать" (требует проверки логов)
- [ ] Защита от галлюцинаций (базовая валидация ответа)
- [ ] Деплой: фронт на Netlify, API на Railway

## Current Focus

Отладка OpenAI интеграции — требуется проверка логов API и browser console для выявления причины ошибки адаптации.
