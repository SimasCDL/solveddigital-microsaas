/** Small white payment-method chips (visual only). */
export function PaymentLogos() {
  const chip =
    "inline-flex h-7 items-center justify-center rounded-md border border-line bg-white px-2";
  return (
    <div className="mt-2.5 flex flex-wrap items-center justify-center gap-[7px]">
      <span className={chip}>
        <svg width="34" height="12" viewBox="0 0 34 12" aria-label="Visa">
          <text
            x="17"
            y="10.5"
            textAnchor="middle"
            fontFamily="Arial,Helvetica,sans-serif"
            fontSize="12"
            fontWeight="800"
            fontStyle="italic"
            fill="#1434CB"
            letterSpacing="0.4"
          >
            VISA
          </text>
        </svg>
      </span>
      <span className={chip}>
        <svg width="28" height="18" viewBox="0 0 28 18" aria-label="Mastercard">
          <circle cx="10.5" cy="9" r="7.5" fill="#EB001B" />
          <circle cx="17.5" cy="9" r="7.5" fill="#F79E1B" />
          <path
            d="M14 3.4a7.5 7.5 0 0 0 0 11.2 7.5 7.5 0 0 0 0-11.2z"
            fill="#FF5F00"
          />
        </svg>
      </span>
      <span className={chip}>
        <svg width="34" height="20" viewBox="0 0 34 20" aria-label="Amex">
          <rect width="34" height="20" rx="3" fill="#1F72CD" />
          <text
            x="17"
            y="13.5"
            textAnchor="middle"
            fontFamily="Arial,Helvetica,sans-serif"
            fontSize="7.5"
            fontWeight="800"
            fill="#fff"
            letterSpacing="0.3"
          >
            AMEX
          </text>
        </svg>
      </span>
      <span className={chip}>
        <svg width="42" height="16" viewBox="0 0 42 16" aria-label="Apple Pay">
          <path
            d="M9.2 5c-.5 0-1.1.3-1.5.3-.4 0-1-.3-1.6-.3C5 5 3.9 5.9 3.9 7.6c0 1.7 1.2 3.6 1.9 3.6.3 0 .6-.2 1.1-.2s.7.2 1.1.2c.7 0 1.8-1.8 1.8-2.7-1-.4-1.2-2-.3-2.7-.4-.5-1-.6-1.3-.6zm.1-1.1c.3-.4.5-.9.4-1.4-.4 0-.9.3-1.2.6-.3.3-.5.8-.4 1.3.5 0 1-.2 1.2-.5z"
            fill="#000"
          />
          <text
            x="14"
            y="12"
            fontFamily="Arial,Helvetica,sans-serif"
            fontSize="11"
            fontWeight="600"
            fill="#000"
          >
            Pay
          </text>
        </svg>
      </span>
      <span className={chip}>
        <svg width="44" height="16" viewBox="0 0 44 16" aria-label="Google Pay">
          <text
            x="0"
            y="12"
            fontFamily="Arial,Helvetica,sans-serif"
            fontSize="12"
            fontWeight="700"
          >
            <tspan fill="#4285F4">G</tspan>
            <tspan fill="#5F6368"> Pay</tspan>
          </text>
        </svg>
      </span>
      <span className={chip}>
        <svg width="42" height="18" viewBox="0 0 42 18" aria-label="Shop Pay">
          <rect width="42" height="18" rx="4" fill="#5A31F4" />
          <text
            x="21"
            y="13"
            textAnchor="middle"
            fontFamily="Arial,Helvetica,sans-serif"
            fontSize="10"
            fontWeight="800"
            fill="#fff"
            letterSpacing="0.2"
          >
            shop
          </text>
        </svg>
      </span>
      <span className={chip}>
        <svg width="30" height="18" viewBox="0 0 30 18" aria-label="UnionPay">
          <rect x="0.5" y="1" width="9" height="16" rx="2" fill="#E21836" />
          <rect x="10.5" y="1" width="9" height="16" rx="2" fill="#00447C" />
          <rect x="20.5" y="1" width="9" height="16" rx="2" fill="#007B84" />
        </svg>
      </span>
    </div>
  );
}
