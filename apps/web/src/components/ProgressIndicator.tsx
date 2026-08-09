const STEPS = ["동의", "프로필", "예약", "질문", "Passport"] as const;

export function ProgressIndicator({ current }: { current: number }) {
  return (
    <ol className="progress-indicator" aria-label="예약 진행 단계">
      {STEPS.map((step, index) => (
        <li
          key={step}
          className={index <= current ? "is-complete" : undefined}
          aria-current={index === current ? "step" : undefined}
        >
          <span>{index + 1}</span>
          <small>{step}</small>
        </li>
      ))}
    </ol>
  );
}
