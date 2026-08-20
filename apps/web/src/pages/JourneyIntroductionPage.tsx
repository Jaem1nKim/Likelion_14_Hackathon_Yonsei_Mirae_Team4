import { useNavigate } from "react-router-dom";

import { IntroductionHeader } from "../components/IntroductionHeader";
import { useDemoUser } from "../hooks/useDemoUser";

const assetRoot = "/assets/introduction";

const journeyCards = [
  {
    image: "journey-preference.png",
    title: "취향에서 Journey를 시작하세요",
    description: "간단한 질문을 통해 오늘 탐색하고 싶은 분위기와 스타일을 선택합니다.",
  },
  {
    image: "journey-selection.png",
    title: "마음이 가는 제품을 선택하세요",
    description: "매장에서 제품을 직접 보고 선택해보세요. 선택할 때마다 다음 제품과 탐색할 공간이 달라집니다.",
  },
  {
    image: "journey-signature.png",
    title: "나만의 Journey Signature를 완성하세요",
    description: "여정 끝에는 당신의 선택을 담은 스타일 이야기와 MCM Look이 완성됩니다.",
  },
] as const;

function startDestination(role: "CUSTOMER" | "STAFF" | undefined) {
  if (role === "CUSTOMER") {
    return "/reserve";
  }
  if (role === "STAFF") {
    return "/staff/reservations";
  }
  return "/login";
}

export function JourneyIntroductionPage() {
  const navigate = useNavigate();
  const { user, isInitializing } = useDemoUser();

  return (
    <main className="introduction-page journey-introduction">
      <IntroductionHeader logoSrc={`${assetRoot}/journey-mcm-logo.svg`} />

      <section className="journey-introduction__hero" aria-label="MCM Journey Passport">
        <img src={`${assetRoot}/journey-hero.png`} alt="MCM Journey Passport" />
        <div className="journey-introduction__hero-title" aria-hidden="true">
          <strong>MCM</strong>
          <span>JOURNEY PASSPORT</span>
        </div>
      </section>

      <section className="journey-introduction__content">
        <div className="journey-introduction__lead">
          <h1>당신의 선택으로 시작되는 MCM Journey</h1>
          <p>
            마음이 가는 제품을 직접 선택해보세요. 당신의 선택이 다음 제품과 공간, 새로운 이야기로 이어집니다.<br />
            브랜드의 세계를 자유롭게 탐험하세요.
          </p>
          <button
            className="journey-introduction__cta"
            type="button"
            disabled={isInitializing}
            onClick={() => {
              const destination = startDestination(user?.role);
              navigate(
                destination,
                destination === "/login" ? { state: { from: "/reserve" } } : undefined,
              );
            }}
          >
            Journey 시작하기
          </button>
        </div>

        <div className="journey-introduction__steps">
          <h2>여정은 이렇게 펼쳐집니다</h2>
          <div className="journey-introduction__cards">
            {journeyCards.map((card) => (
              <article className="journey-introduction__card" key={card.title}>
                <img src={`${assetRoot}/${card.image}`} alt="" />
                <h3>{card.title}</h3>
                <p>{card.description}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="journey-introduction__panels">
          <article>
            <h2>여정 끝에 남는, 당신만의 Journey Signature</h2>
            <p>
              당신이 선택한 제품과 스타일의 흐름을 하나의 이름, 이야기 그리고 MCM Look으로 만나보세요.<br />
              완성된 Journey는 계정에 저장해 언제든 다시 확인할 수 있으며, 다음 시즌·팝업·컬렉션이 시작되면 새로운 Journey 챕터로 다시 이어집니다.
            </p>
          </article>
          <article>
            <h2>어떤 MCM을 만나게 될지는, Journey를 시작하기 전까지 알 수 없습니다</h2>
            <p>당신의 선택을 따라 새로운 MCM을 발견해보세요.</p>
          </article>
        </div>
      </section>
    </main>
  );
}
