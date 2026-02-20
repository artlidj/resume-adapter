import { FormEvent, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { isSupabaseClientReady, supabase } from "./lib/supabase";

type Language = "en" | "ru";

type ValidationErrors = {
  resumeFile?: string;
  jobDescription?: string;
};

type SubmitState = "idle" | "loading" | "success" | "error";

type Translation = {
  title: string;
  subtitle: string;
  langLabel: string;
  steps: [string, string, string];
  fileLabel: string;
  fileCta: string;
  fileHint: string;
  fileMetaHint: string;
  fileLimitError: string;
  fileError: string;
  vacancyLabel: string;
  vacancyPlaceholder: string;
  vacancyHint: string;
  vacancyError: string;
  submit: string;
  processing: string;
  processingHint: string;
  success: string;
  error: string;
  successPrimary: string;
  successSecondary: string;
  privacyTitle: string;
  privacyBody: string;
  authTitle: string;
  authSubtitle: string;
  authTitleSignUp: string;
  authSubtitleSignUp: string;
  nameLabel: string;
  emailLabel: string;
  passwordLabel: string;
  signIn: string;
  signUp: string;
  signOut: string;
  switchToSignUp: string;
  switchToSignIn: string;
  authConfigError: string;
};

const translations: Record<Language, Translation> = {
  en: {
    title: "Resume Adapter",
    subtitle: "Upload your resume and paste a vacancy to generate an ATS-friendly version.",
    langLabel: "Language",
    steps: ["Upload resume", "Paste vacancy", "Get ATS result"],
    fileLabel: "Resume file",
    fileCta: "Choose file",
    fileHint: "Drag and drop or click to select.",
    fileMetaHint: "Maximum 10 MB. Supported formats: PDF, DOCX, TXT.",
    fileLimitError: "File is too large. Maximum size is 10 MB.",
    fileError: "Upload your resume file.",
    vacancyLabel: "Job description",
    vacancyPlaceholder: "Paste vacancy text here...",
    vacancyHint: "Tip: include full responsibilities and requirements.",
    vacancyError: "Paste a job description.",
    submit: "Adapt resume",
    processing: "Processing...",
    processingHint: "Analyzing vacancy and aligning keywords. Usually takes 10-30 seconds.",
    success: "Done. Resume adapted successfully.",
    error: "Failed to adapt. Please click again.",
    successPrimary: "Download draft",
    successSecondary: "Adapt again",
    privacyTitle: "Privacy",
    privacyBody: "Your resume is used only for adaptation. We do not store source files permanently.",
    authTitle: "Sign in",
    authSubtitle: "Welcome back. Sign in to your account.",
    authTitleSignUp: "Create account",
    authSubtitleSignUp: "Create account once, then adapt resumes in your private workspace.",
    nameLabel: "First name",
    emailLabel: "Email",
    passwordLabel: "Password",
    signIn: "Sign in",
    signUp: "Create account",
    signOut: "Sign out",
    switchToSignUp: "No account? Register",
    switchToSignIn: "Already have an account? Sign in",
    authConfigError: "Supabase auth is not configured in frontend env."
  },
  ru: {
    title: "Адаптатор резюме",
    subtitle: "Загрузите резюме и вставьте текст вакансии, чтобы получить ATS-friendly версию.",
    langLabel: "Язык",
    steps: ["Загрузите резюме", "Вставьте вакансию", "Получите ATS-результат"],
    fileLabel: "Файл резюме",
    fileCta: "Выберите файл",
    fileHint: "Перетащите файл сюда или нажмите для выбора.",
    fileMetaHint: "Максимум 10 MB. Поддерживаются форматы: PDF, DOCX, TXT.",
    fileLimitError: "Файл слишком большой. Максимальный размер 10 MB.",
    fileError: "Загрузите файл резюме.",
    vacancyLabel: "Текст вакансии",
    vacancyPlaceholder: "Вставьте текст вакансии...",
    vacancyHint: "Совет: вставьте полное описание обязанностей и требований.",
    vacancyError: "Вставьте текст вакансии.",
    submit: "Адаптировать резюме",
    processing: "Обрабатываем...",
    processingHint: "Анализируем вакансию и подбираем ключевые слова. Обычно это занимает 10-30 секунд.",
    success: "Готово. Резюме успешно адаптировано.",
    error: "Не удалось адаптировать. Нажмите кнопку снова.",
    successPrimary: "Скачать черновик",
    successSecondary: "Адаптировать снова",
    privacyTitle: "Конфиденциальность",
    privacyBody: "Ваше резюме используется только для адаптации. Исходные файлы не хранятся постоянно.",
    authTitle: "Вход",
    authSubtitle: "С возвращением. Войдите в свой аккаунт.",
    authTitleSignUp: "Регистрация",
    authSubtitleSignUp: "Создайте аккаунт один раз и работайте с адаптациями в личном пространстве.",
    nameLabel: "Имя",
    emailLabel: "Email",
    passwordLabel: "Пароль",
    signIn: "Войти",
    signUp: "Зарегистрироваться",
    signOut: "Выйти",
    switchToSignUp: "Нет аккаунта? Зарегистрироваться",
    switchToSignIn: "Уже есть аккаунт? Войти",
    authConfigError: "Supabase auth не настроен в переменных фронтенда."
  }
};

export default function App() {
  const maxFileSizeBytes = 10 * 1024 * 1024;
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8787";

  const [language, setLanguage] = useState<Language>("ru");
  const [session, setSession] = useState<Session | null>(null);

  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [authName, setAuthName] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [adaptedText, setAdaptedText] = useState("");
  const [keywordsUsed, setKeywordsUsed] = useState<string[]>([]);
  const [matchScore, setMatchScore] = useState<number>(0);

  const t = translations[language];

  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => data.subscription.unsubscribe();
  }, []);

  const fileInfo = useMemo(() => {
    if (!resumeFile) return null;
    const sizeMb = (resumeFile.size / (1024 * 1024)).toFixed(2);
    return `${resumeFile.name} (${sizeMb} MB)`;
  }, [resumeFile]);

  function getCurrentStep() {
    if (submitState === "success") return 3;
    if (submitState === "loading") return 2;
    if (resumeFile && jobDescription.trim()) return 2;
    if (resumeFile || jobDescription.trim()) return 1;
    return 0;
  }

  function resetResultState() {
    if (submitState !== "idle") setSubmitState("idle");
    if (adaptedText) setAdaptedText("");
    if (keywordsUsed.length > 0) setKeywordsUsed([]);
    if (matchScore > 0) setMatchScore(0);
  }

  function handleFileSelect(file: File | null) {
    setResumeFile(file);
    setErrors((prev) => ({ ...prev, resumeFile: undefined }));
    resetResultState();

    if (file && file.size > maxFileSizeBytes) {
      setErrors((prev) => ({ ...prev, resumeFile: t.fileLimitError }));
    }
  }

  async function requestAdaptation(file: File, vacancy: string): Promise<{ adaptedText: string; keywordsUsed: string[]; matchScore: number }> {
    const formData = new FormData();
    formData.append("resumeFile", file);
    formData.append("jobDescription", vacancy);

    const headers: HeadersInit = {};
    if (session?.access_token) {
      headers.Authorization = `Bearer ${session.access_token}`;
    }

    const response = await fetch(`${apiBaseUrl}/adapt`, {
      method: "POST",
      headers,
      body: formData
    });

    if (!response.ok) {
      throw new Error("Adaptation request failed");
    }

    const data = (await response.json()) as { adaptedText?: string; keywordsUsed?: string[]; matchScore?: number };
    if (!data.adaptedText) {
      throw new Error("Adapted text is missing in API response");
    }

    return {
      adaptedText: data.adaptedText,
      keywordsUsed: data.keywordsUsed || [],
      matchScore: data.matchScore || 0
    };
  }

  async function handleSignIn() {
    if (!supabase) return;
    setAuthLoading(true);
    setAuthError("");

    const { error } = await supabase.auth.signInWithPassword({
      email: authEmail.trim(),
      password: authPassword
    });

    if (error) setAuthError(error.message);
    setAuthLoading(false);
  }

  async function handleSignUp() {
    if (!supabase) return;
    setAuthLoading(true);
    setAuthError("");

    const { error } = await supabase.auth.signUp({
      email: authEmail.trim(),
      password: authPassword,
      options: { data: { name: authName.trim() } }
    });

    if (error) setAuthError(error.message);
    setAuthLoading(false);
  }

  async function handleSignOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
    setResumeFile(null);
    setJobDescription("");
    setErrors({});
    setSubmitState("idle");
    setAdaptedText("");
  }

  async function downloadDraft() {
    if (!adaptedText) return;

    try {
      const response = await fetch(`${apiBaseUrl}/adapt/download`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          adaptedText,
          keywordsUsed,
          matchScore
        })
      });

      if (!response.ok) {
        throw new Error("Failed to generate DOCX");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;

      const timestamp = new Date().toISOString().split("T")[0];
      link.download = `adapted-resume-${timestamp}.docx`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download error:", error);
      alert(language === "ru" ? "Не удалось скачать файл" : "Failed to download file");
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors: ValidationErrors = {};
    if (!resumeFile) nextErrors.resumeFile = t.fileError;
    if (!jobDescription.trim()) nextErrors.jobDescription = t.vacancyError;
    if (resumeFile && resumeFile.size > maxFileSizeBytes) nextErrors.resumeFile = t.fileLimitError;

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0 || !resumeFile) return;

    try {
      setSubmitState("loading");
      const result = await requestAdaptation(resumeFile, jobDescription.trim());
      setAdaptedText(result.adaptedText);
      setKeywordsUsed(result.keywordsUsed);
      setMatchScore(result.matchScore);
      setSubmitState("success");
    } catch {
      setSubmitState("error");
    }
  }

  return (
    <main className="page">
      <section className="card">
        <div className="header">
          <div>
            <h1>{t.title}</h1>
            <p className="subtitle">{t.subtitle}</p>
          </div>

          <div className="language-toggle" aria-label={t.langLabel}>
            <button type="button" className={language === "en" ? "lang-btn active" : "lang-btn"} onClick={() => setLanguage("en")}>
              EN
            </button>
            <button type="button" className={language === "ru" ? "lang-btn active" : "lang-btn"} onClick={() => setLanguage("ru")}>
              RU
            </button>
          </div>
        </div>

        {!session ? (
          <section className="auth-card">
            <h2>{authMode === "signin" ? t.authTitle : t.authTitleSignUp}</h2>
            <p>{authMode === "signin" ? t.authSubtitle : t.authSubtitleSignUp}</p>

            {!isSupabaseClientReady ? <p className="status error-text">{t.authConfigError}</p> : null}

            {authMode === "signup" ? (
              <label className="field">
                <span>{t.nameLabel}</span>
                <input type="text" value={authName} onChange={(event) => setAuthName(event.target.value)} placeholder="Иван" />
              </label>
            ) : null}

            <label className="field">
              <span>{t.emailLabel}</span>
              <input type="email" value={authEmail} onChange={(event) => setAuthEmail(event.target.value)} placeholder="you@example.com" />
            </label>

            <label className="field">
              <span>{t.passwordLabel}</span>
              <input type="password" value={authPassword} onChange={(event) => setAuthPassword(event.target.value)} placeholder="••••••••" />
            </label>

            <div className="actions">
              {authMode === "signin" ? (
                <button type="button" className="submit-btn" onClick={handleSignIn} disabled={!isSupabaseClientReady || authLoading}>
                  {t.signIn}
                </button>
              ) : (
                <button type="button" className="submit-btn" onClick={handleSignUp} disabled={!isSupabaseClientReady || authLoading}>
                  {t.signUp}
                </button>
              )}
            </div>

            <button
              type="button"
              className="link-btn"
              onClick={() => { setAuthMode(authMode === "signin" ? "signup" : "signin"); setAuthError(""); }}
            >
              {authMode === "signin" ? t.switchToSignUp : t.switchToSignIn}
            </button>

            {authError ? <p className="status error-text">{authError}</p> : null}
          </section>
        ) : (
          <>
            <div className="session-bar">
              <span>{session.user.user_metadata?.name || session.user.email}</span>
              <button type="button" className="ghost-btn" onClick={handleSignOut}>
                {t.signOut}
              </button>
            </div>

            <ol className="steps" aria-label="Flow steps">
              {t.steps.map((step, index) => {
                const stepNumber = index + 1;
                const currentStep = getCurrentStep();
                const className = stepNumber <= currentStep ? "step active" : "step";
                return (
                  <li key={step} className={className}>
                    <span className="step-number">{stepNumber}</span>
                    <span className="step-text">{step}</span>
                  </li>
                );
              })}
            </ol>

            <form onSubmit={handleSubmit} className="form">
              <div className="field">
                <span>{t.fileLabel}</span>
                <label className={resumeFile ? "dropzone has-file" : "dropzone"}>
                  <input className="file-input" type="file" accept=".pdf,.doc,.docx,.txt" onChange={(event) => handleFileSelect(event.target.files?.[0] ?? null)} />
                  <span className="dropzone-title">{fileInfo ?? t.fileCta}</span>
                  <span className="dropzone-subtitle">{t.fileHint}</span>
                </label>
                <small>{t.fileMetaHint}</small>
                {errors.resumeFile ? <small className="error">{errors.resumeFile}</small> : null}
              </div>

              <label className="field">
                <span>{t.vacancyLabel}</span>
                <textarea
                  rows={12}
                  placeholder={t.vacancyPlaceholder}
                  value={jobDescription}
                  onChange={(event) => {
                    setJobDescription(event.target.value);
                    setErrors((prev) => ({ ...prev, jobDescription: undefined }));
                    resetResultState();
                  }}
                />
                <small>{t.vacancyHint}</small>
                {errors.jobDescription ? <small className="error">{errors.jobDescription}</small> : null}
              </label>

              <button type="submit" className="submit-btn" disabled={submitState === "loading"}>
                {submitState === "loading" ? t.processing : t.submit}
              </button>

              {submitState === "loading" ? <p className="status neutral">{t.processingHint}</p> : null}
              {submitState === "success" ? (
                <>
                  <div className="status success success-box">
                    <p>{t.success}</p>
                    <div className="actions">
                      <button type="button" className="ghost-btn" onClick={downloadDraft}>
                        {t.successPrimary}
                      </button>
                      <button type="button" className="ghost-btn" onClick={resetResultState}>
                        {t.successSecondary}
                      </button>
                    </div>
                  </div>

                  <div className="result-panel">
                    <div className="result-header">
                      <h3>📊 {language === "ru" ? "Результат адаптации" : "Adaptation Result"}</h3>
                      <div className="match-score">
                        <span className="score-label">{language === "ru" ? "Совпадение:" : "Match Score:"}</span>
                        <span className="score-value">{matchScore}%</span>
                      </div>
                    </div>

                    {keywordsUsed.length > 0 ? (
                      <div className="keywords-section">
                        <h4>{language === "ru" ? "Ключевые слова из вакансии:" : "Keywords from job description:"}</h4>
                        <div className="keywords-list">
                          {keywordsUsed.map((keyword) => (
                            <span key={keyword} className="keyword-tag">{keyword}</span>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    <div className="adapted-text-section">
                      <h4>{language === "ru" ? "Адаптированное резюме:" : "Adapted Resume:"}</h4>
                      <div className="adapted-text-box">
                        <pre>{adaptedText}</pre>
                      </div>
                    </div>
                  </div>
                </>
              ) : null}
              {submitState === "error" ? <p className="status error-text">{t.error}</p> : null}
            </form>
          </>
        )}

        <aside className="privacy">
          <h2>{t.privacyTitle}</h2>
          <p>{t.privacyBody}</p>
        </aside>
      </section>
    </main>
  );
}
