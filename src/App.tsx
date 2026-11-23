import {
  FormEvent,
  ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"

type PromoState =
  | "default"
  | "input"
  | "loading"
  | "success"
  | "error"
  | "removed"
  | "recalculated"
  | "invalidated"
  | "limitError"

const assets = "/assets"
const money = (value: number) => `${value.toLocaleString("ru-RU")} ₽`

function Icon({
  name,
  size = 20,
  alt = "",
}: {
  name: string
  size?: number
  alt?: string
}) {
  return <img src={`${assets}/${name}`} width={size} height={size} alt={alt} />
}

function DiscountColorIcon({ applied = false }: { applied?: boolean }) {
  return (
    <span
      className={`color-icon color-icon--promo ${
        applied ? "color-icon--applied" : ""
      }`}
      aria-hidden="true"
    >
      <img src={`${assets}/${applied ? "418da.svg" : "2cd6e.svg"}`} alt="" />
    </span>
  )
}

function TextButton({
  children,
  onClick,
  className = "",
  ariaLabel,
  disabled,
}: {
  children: ReactNode
  onClick?: () => void
  className?: string
  ariaLabel?: string
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      className={`text-button ${className}`}
      onClick={onClick}
      aria-label={ariaLabel}
      disabled={disabled}
    >
      {children}
    </button>
  )
}

function Field({
  label,
  ariaLabel,
  placeholder,
  value,
  onChange,
  error,
  type = "text",
}: {
  label?: string
  ariaLabel?: string
  placeholder?: string
  value?: string
  onChange?: (value: string) => void
  error?: string
  type?: string
}) {
  const errorId = `field-${encodeURIComponent(
    ariaLabel ?? label ?? "input",
  )}-error`

  return (
    <label className="field">
      {label && <span>{label}</span>}
      <input
        type={type}
        aria-label={ariaLabel}
        placeholder={placeholder}
        value={value}
        onChange={
          onChange ? (event) => onChange(event.target.value) : undefined
        }
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
      />
      {error && (
        <span className="field-error" id={errorId} role="alert">
          {error}
        </span>
      )}
    </label>
  )
}

function Card({
  children,
  className = "",
}: {
  children: ReactNode
  className?: string
}) {
  return <section className={`card ${className}`}>{children}</section>
}

function Row({
  label,
  value,
  strong,
  muted,
}: {
  label: string
  value: string
  strong?: boolean
  muted?: boolean
}) {
  return (
    <div
      className={`price-row ${strong ? "price-row--strong" : ""} ${
        muted ? "price-row--muted" : ""
      }`}
    >
      <span>{label}</span>
      <span>{value}</span>
    </div>
  )
}

function EditButton({
  onClick,
  label,
}: {
  onClick?: () => void
  label: string
}) {
  return (
    <TextButton className="icon-button" onClick={onClick} ariaLabel={label}>
      <Icon name="1abec.svg" />
    </TextButton>
  )
}

const errorMessages: Record<string, string> = {
  EXPIRED: "Срок действия промокода закончился",
  SERVICES: "Промокод не действует на выбранные услуги",
  MIN3000: "Минимальная сумма к оплате записи — 15 000 ₽",
  UNAVAILABLE: "Промокод недоступен",
  BRANCH: "Промокод не действует в этом филиале",
  SPECIALIST: "Промокод не действует на услуги этого специалиста",
}

function Promo({
  state,
  setState,
  code,
  setCode,
  discount,
  setDiscount,
  phone,
}: {
  state: PromoState
  setState: (state: PromoState) => void
  code: string
  setCode: (code: string) => void
  discount: number
  setDiscount: (discount: number) => void
  phone: string
}) {
  const inputAreaRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState(
    state === "error"
      ? "Такого промокода нет. Проверьте код и попробуйте еще раз"
      : "",
  )

  const applyPromo = (event: FormEvent) => {
    event.preventDefault()
    if (!code.trim()) {
      setError("Введите промокод.")
      setState("error")
      return
    }
    setError("")
    setState("loading")
    window.setTimeout(() => {
      const normalized = code.trim().toUpperCase()
      setCode(normalized)
      if (normalized === "WELCOME20") {
        setDiscount(200)
        setState("success")
      } else if (normalized === "LIMIT") {
        if (phone.trim()) {
          setError("Вы уже использовали этот промокод")
          setState("error")
        } else {
          setDiscount(200)
          setState("success")
        }
      } else {
        setError(
          errorMessages[normalized] ??
            "Такого промокода нет. Проверьте код и попробуйте еще раз",
        )
        setState("error")
      }
    }, 900)
  }

  const removePromo = () => {
    setCode("")
    setDiscount(0)
    setError("")
    setState("removed")
  }

  const closePromo = () => {
    if (state === "loading") return
    setError("")
    setState("default")
  }

  useEffect(() => {
    if (!["input", "error", "loading"].includes(state)) return

    const isMobile = window.matchMedia("(max-width: 699px)").matches
    if (!isMobile) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    if (state !== "loading") {
      window.requestAnimationFrame(() => {
        inputAreaRef.current?.querySelector("input")?.focus()
      })
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") closePromo()
    }
    window.addEventListener("keydown", handleEscape)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener("keydown", handleEscape)
    }
  }, [state])

  if (state === "default" || state === "removed") {
    return (
      <TextButton className="promo-trigger" onClick={() => setState("input")}>
        <span>Промокод</span>
        <span className="promo-chevron promo-chevron--closed">
          <img src={`${assets}/87487.svg`} alt="" />
        </span>
      </TextButton>
    )
  }

  if (state === "success" || state === "recalculated") {
    return (
      <TextButton
        className="promo-applied"
        onClick={() => setState("input")}
        ariaLabel="Изменить промокод"
      >
        <div className="promo-applied__copy">
          <span className="promo-label">Промокод</span>
          <strong>{code}</strong>
        </div>
        <span className="promo-applied__chevron" aria-hidden="true">
          <img src={`${assets}/3ba68.svg`} alt="" />
        </span>
      </TextButton>
    )
  }

  if (state === "limitError") {
    return (
      <div className="promo-applied-with-error" aria-live="polite">
        <TextButton
          className="promo-applied"
          onClick={() => setState("input")}
          ariaLabel="Изменить промокод"
        >
          <div className="promo-applied__copy">
            <span className="promo-label">Промокод</span>
            <strong>{code}</strong>
          </div>
          <span className="promo-applied__chevron" aria-hidden="true">
            <img src={`${assets}/3ba68.svg`} alt="" />
          </span>
        </TextButton>
        <span className="promo-card-error" role="alert">
          Вы уже использовали этот промокод
        </span>
      </div>
    )
  }

  if (state === "invalidated") {
    return (
      <div className="promo-invalid" aria-live="polite">
        <div className="promo-invalid__head">
          <div>
            <span className="promo-label">Промокод</span>
            <strong>{code}</strong>
          </div>
          <TextButton className="promo-remove" onClick={removePromo}>
            Удалить
          </TextButton>
        </div>
        <p className="promo-warning">
          <span aria-hidden="true">!</span>
          Промокод больше не действует для выбранной записи.
        </p>
        <TextButton
          className="promo-replace"
          onClick={() => {
            setCode("")
            setState("input")
          }}
        >
          Ввести другой промокод
        </TextButton>
      </div>
    )
  }

  return (
    <>
      <TextButton
        className="promo-expanded-heading"
        onClick={closePromo}
        disabled={state === "loading"}
      >
        <span>Промокод</span>
        <span className="promo-chevron promo-chevron--open">
          <img src={`${assets}/87487.svg`} alt="" />
        </span>
      </TextButton>
      <div
        className="promo-overlay"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) closePromo()
        }}
      >
        <section
          className="promo-sheet"
          role="dialog"
          aria-labelledby="promo-sheet-title"
        >
          <div className="promo-sheet__handle" aria-hidden="true" />
          <div className="promo-sheet__header">
            <h2 id="promo-sheet-title">Промокод</h2>
            <TextButton
              className="promo-sheet__close"
              onClick={closePromo}
              ariaLabel="Закрыть"
              disabled={state === "loading"}
            >
              <span aria-hidden="true">×</span>
            </TextButton>
          </div>
          <div ref={inputAreaRef}>
            <form className="promo-form" onSubmit={applyPromo}>
              <Field
                ariaLabel="Промокод"
                placeholder="Введите код"
                value={code}
                onChange={(value) => {
                  setCode(value)
                  if (error) setError("")
                }}
                error={error}
              />
              <button
                className="secondary-button"
                type="submit"
                disabled={state === "loading"}
              >
                {state === "loading" ? (
                  <>
                    <span className="spinner" aria-hidden="true" />
                    Применяем…
                  </>
                ) : (
                  "Применить"
                )}
              </button>
            </form>
          </div>
        </section>
      </div>
    </>
  )
}

function initialState(): PromoState {
  const value = new URLSearchParams(window.location.search).get(
    "state",
  ) as PromoState | null
  return [
    "default",
    "input",
    "loading",
    "success",
    "error",
    "removed",
    "recalculated",
    "invalidated",
    "limitError",
  ].includes(value ?? "")
    ? value as PromoState
    : "default"
}

function SuccessAction({
  icon,
  label,
  primary,
  onClick,
}: {
  icon: string
  label: ReactNode
  primary?: boolean
  onClick?: () => void
}) {
  return (
    <button className="success-action" type="button" onClick={onClick}>
      <span
        className={`success-action__icon ${
          primary ? "success-action__icon--primary" : ""
        }`}
      >
        <img src={`${assets}/${icon}`} alt="" />
      </span>
      <span>{label}</span>
    </button>
  )
}

function SuccessPage({
  total,
  phone,
  onClose,
}: {
  total: number
  phone: string
  onClose: () => void
}) {
  return (
    <main className="success-page">
      <header className="success-navbar">
        <TextButton
          className="success-close"
          onClick={onClose}
          ariaLabel="Закрыть"
        >
          <img src={`${assets}/61290.svg`} alt="" />
        </TextButton>
        <img
          className="success-brand-avatar"
          src={`${assets}/43e9e.png`}
          alt=""
        />
        <div className="success-brand-copy">
          <strong>Beauty Nails Bar Pro</strong>
          <span>Москва, пр-т Мира дом 211</span>
        </div>
      </header>

      <div className="success-content">
        <section className="appointment-card">
          <div className="success-status">
            <img src={`${assets}/e0ddf.svg`} alt="" />
            <span>Оплата прошла успешно</span>
          </div>
          <div className="success-date">
            <h1>Вторник, 10 мая</h1>
            <strong>08:30 — 09:10</strong>
          </div>
          <div className="success-master">
            <img src={`${assets}/43824.png`} alt="" />
            <div>
              <strong>Мария Воробьева</strong>
              <span>Старший nail-маникюра</span>
              <div className="success-rating">
                <span className="success-stars" aria-label="Рейтинг 5 из 5">
                  {Array.from({ length: 5 }, (_, index) => (
                    <img key={index} src={`${assets}/6f96a.svg`} alt="" />
                  ))}
                </span>
                <small>625 отзывов</small>
              </div>
            </div>
          </div>
        </section>

        <nav className="success-actions" aria-label="Действия с записью">
          <SuccessAction
            icon="18bf1.svg"
            label="Записаться ещё"
            primary
            onClick={onClose}
          />
          <SuccessAction
            icon="cf254.svg"
            label={
              <>
                Добавить
                <br />в календарь
              </>
            }
          />
          <SuccessAction icon="cef98.svg" label="Перенести запись" />
          <SuccessAction icon="ac775.svg" label="Отменить запись" />
        </nav>

        <section className="success-section success-services">
          <div className="success-section__heading">
            <h2>Услуги</h2>
            <span className="paid-tag">
              <img src={`${assets}/cadaf.svg`} alt="" />
              Оплачено
            </span>
          </div>
          <div className="success-service-row">
            <div>
              <strong>Маникюр без сколов</strong>
              <span>3 часа</span>
            </div>
            <div>
              <strong>{money(total)}</strong>
              <small>100% предоплата</small>
            </div>
          </div>
        </section>

        <section className="gift-banner">
          <h2>Подарок за запись</h2>
          <button type="button">Забрать</button>
          <img src={`${assets}/fe8dc.png`} alt="" />
        </section>

        <section className="success-section success-contacts">
          <h2>Контакты</h2>
          <div className="contact-row contact-row--brand">
            <img src={`${assets}/43e9e.png`} alt="" />
            <span>Beauty Nails Bar Pro</span>
          </div>
          <div className="contact-row">
            <img src={`${assets}/507f0.svg`} alt="" />
            <span>Москва, пр-т Мира дом 211</span>
            <button type="button" aria-label="Скопировать адрес">
              <img src={`${assets}/df7e1.svg`} alt="" />
            </button>
          </div>
          <img
            className="contact-map"
            src={`${assets}/504ce.png`}
            alt="Карта проезда"
          />
          <div className="contact-row">
            <img src={`${assets}/08ef5.svg`} alt="" />
            <span>{phone.trim() || "+7 999 123-11-11"}</span>
          </div>
          <div className="contact-row">
            <img src={`${assets}/61cf9.svg`} alt="" />
            <span>https://dauotkysit.com</span>
          </div>
        </section>
      </div>
    </main>
  )
}

export default function App() {
  const [promoState, setPromoState] = useState<PromoState>(initialState)
  const [code, setCode] = useState(() =>
    ["loading", "success", "recalculated", "invalidated", "limitError"].includes(
      initialState(),
    )
      ? initialState() === "limitError"
        ? "LIMIT"
        : "WELCOME20"
      : initialState() === "error"
        ? "WELCOME"
        : "",
  )
  const [discount, setDiscount] = useState(() =>
    initialState() === "recalculated"
      ? 400
      : initialState() === "success"
        ? 200
        : 0,
  )
  const [phone, setPhone] = useState(() =>
    initialState() === "limitError" ? "+7 999 123-45-67" : "",
  )
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [marketingConsent, setMarketingConsent] = useState(false)
  const [personalDataConsent, setPersonalDataConsent] = useState(false)
  const [showValidationErrors, setShowValidationErrors] = useState(false)
  const [isPaid, setIsPaid] = useState(false)
  const basePrice = 6500
  const activeDiscount =
    promoState === "success" || promoState === "recalculated" ? discount : 0
  const isPromoApplied =
    promoState === "success" ||
    promoState === "recalculated" ||
    promoState === "limitError"
  const total = basePrice - activeDiscount
  const canPay =
    name.trim().length > 0 &&
    phone.replace(/\D/g, "").length >= 10 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) &&
    marketingConsent &&
    personalDataConsent

  useEffect(() => {
    document.documentElement.dataset.promoState = promoState
  }, [promoState])

  useEffect(() => {
    if (phone.trim() && code === "LIMIT" && promoState === "success") {
      setDiscount(0)
      setPromoState("limitError")
    }
  }, [code, phone, promoState])

  const editService = () => {
    if (promoState === "success") {
      setDiscount(400)
      setPromoState("recalculated")
    } else if (promoState === "recalculated") {
      setDiscount(0)
      setPromoState("invalidated")
    }
  }

  const editLabel = useMemo(
    () =>
      promoState === "success"
        ? "Изменить запись и пересчитать скидку"
        : promoState === "recalculated"
          ? "Изменить запись так, чтобы промокод перестал действовать"
          : "Изменить услуги",
    [promoState],
  )

  if (isPaid) {
    return (
      <SuccessPage
        total={total}
        phone={phone}
        onClose={() => setIsPaid(false)}
      />
    )
  }

  return (
    <main className="checkout">
      <header className="navbar">
        <TextButton className="back-button" ariaLabel="Назад">
          <Icon name="3eb49.svg" size={24} />
        </TextButton>
        <img className="brand-avatar" src={`${assets}/43e9e.png`} alt="" />
        <div className="brand-copy">
          <strong>Beauty Nails Bar Pro</strong>
          <span>Москва, пр-т Мира дом 211</span>
        </div>
      </header>

      <div className="page-stack">
        <Card className="details-card">
          <h1>Детали записи</h1>
          <div className="detail-row master-row">
            <img className="master-avatar" src={`${assets}/43824.png`} alt="" />
            <div className="detail-copy">
              <strong>Мария Воробьева</strong>
              <span>Старший nail-маникюра</span>
              <div className="rating">
                <span className="stars" aria-label="Рейтинг 5 из 5">
                  ★★★★★
                </span>
                <small>625 отзывов</small>
              </div>
            </div>
            <EditButton label="Изменить специалиста" />
          </div>
          <div className="detail-row">
            <span className="calendar-circle">
              <Icon name="fe7ed.svg" size={24} />
            </span>
            <div className="detail-copy">
              <span>Вторник, 10 мая</span>
              <strong>08:30 — 09:10</strong>
            </div>
            <EditButton label="Изменить дату и время" />
          </div>
          <div className="divider" />
          <div className="section-heading">
            <h2>Услуги</h2>
            <span>3 часа</span>
            <EditButton onClick={editService} label={editLabel} />
          </div>
          <div className="service-row">
            <div className="detail-copy">
              <strong>Маникюр без сколов</strong>
              <small className="service-prepayment">100% предоплата</small>
              <span>3 часа</span>
            </div>
            <div className="service-price">
              {activeDiscount > 0 ? (
                <>
                  <div className="service-price__current">
                    <strong>{money(total)}</strong>
                    <small className="service-discount-tag">-20%</small>
                  </div>
                  <span className="service-price__original">
                    {money(basePrice)}
                  </span>
                </>
              ) : (
                <strong>{money(basePrice)}</strong>
              )}
            </div>
          </div>
          <div className="divider" />
          <Row label="Предоплата" value={money(total)} />
        </Card>

        <Card
          className={`promo-card ${
            isPromoApplied ? "promo-card--applied" : ""
          }`}
        >
          <div className="promo-card__icon">
            <DiscountColorIcon applied={isPromoApplied} />
          </div>
          <div className="promo-card__content">
            <Promo
              state={promoState}
              setState={setPromoState}
              code={code}
              setCode={setCode}
              discount={discount}
              setDiscount={setDiscount}
              phone={phone}
            />
          </div>
        </Card>

        <Card className="data-card">
          <h2>Ваши данные</h2>
          <div className="divider" />
          <div className="fields">
            <Field
              label="Имя *"
              value={name}
              onChange={setName}
              error={
                showValidationErrors && !name.trim() ? "Введите имя" : undefined
              }
            />
            <Field
              label="Телефон *"
              placeholder="+7   (000) 000-00-00"
              type="tel"
              value={phone}
              onChange={setPhone}
              error={
                showValidationErrors && !phone.trim()
                  ? "Введите номер телефона"
                  : showValidationErrors &&
                      phone.replace(/\D/g, "").length < 10
                    ? "Введите корректный номер телефона"
                  : undefined
              }
            />
            <Field
              label="Почта *"
              placeholder="example@mail.ru"
              type="email"
              value={email}
              onChange={setEmail}
              error={
                showValidationErrors && !email.trim()
                  ? "Введите почту"
                  : showValidationErrors &&
                      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
                    ? "Введите корректную почту"
                  : undefined
              }
            />
            <label className="field">
              <span>Комментарий к записи</span>
              <textarea aria-label="Комментарий к записи" />
            </label>
          </div>
          <div className="reminder-row">
            <div>
              <span>Напоминание</span>
              <strong>За 1 час</strong>
            </div>
            <Icon name="c9c2f.svg" size={16} />
          </div>
        </Card>

        <aside className="notice-card">
          <Icon name="b304f.svg" size={24} />
          <p>
            Мытье головы не включено в стоимость услуги. Приходите с чистой
            головой или будьте готовы доплатить 1000 рублей
          </p>
        </aside>

        <Card className="price-card">
          <Row label="Предоплата" value={money(basePrice)} />
          <div className="divider" />
          {activeDiscount > 0 && (
            <>
              <Row label="Стоимость услуг" value={money(basePrice)} muted />
              <Row label="Промокод" value={`−${money(activeDiscount)}`} muted />
              <div className="divider" />
            </>
          )}
          <Row label="Итого" value={money(total)} strong />
        </Card>
      </div>

      <footer className="footer-card">
        <label
          className={`checkbox-row ${
            showValidationErrors && !marketingConsent
              ? "checkbox-row--error"
              : ""
          }`}
        >
          <input
            type="checkbox"
            checked={marketingConsent}
            onChange={(event) => setMarketingConsent(event.target.checked)}
          />
          <span>
            Я даю согласие на отправку информационно-рекламной рассылки
            организации <a href="#legal">ИНН 789789798</a>
          </span>
        </label>
        {showValidationErrors && !marketingConsent && (
          <p className="checkbox-error" role="alert">
            Необходимо ваше согласие
          </p>
        )}
        <label
          className={`checkbox-row ${
            showValidationErrors && !personalDataConsent
              ? "checkbox-row--error"
              : ""
          }`}
        >
          <input
            type="checkbox"
            checked={personalDataConsent}
            onChange={(event) => setPersonalDataConsent(event.target.checked)}
          />
          <span>
            Я предоставляю согласие на{" "}
            <a href="#privacy">обработку персональных данных</a> организации{" "}
            <a href="#legal">ИНН 789789798</a>
          </span>
        </label>
        {showValidationErrors && !personalDataConsent && (
          <p className="checkbox-error" role="alert">
            Необходимо ваше согласие
          </p>
        )}
        <button
          className="primary-button"
          type="button"
          onClick={() => {
            setShowValidationErrors(true)
            if (!canPay) return
            setIsPaid(true)
            window.scrollTo({ top: 0, behavior: "smooth" })
          }}
        >
          Оплатить&nbsp; {money(total)}
        </button>
        <p className="payment-note">У вас будет 15 минут на оплату</p>
        <p className="legal-copy">
          Нажимая на кнопку, я предоставляю ООО “Уайклаентс” согласие на
          обработку персональных данных, а также подтверждаю ознакомление и
          согласие с <a href="#privacy">Политикой конфиденциальности</a> и{" "}
          <a href="#terms">Пользовательским соглашением</a>.
        </p>
      </footer>
    </main>
  )
}
