import { Link } from "react-router-dom";

import { IntroductionHeader } from "../components/IntroductionHeader";

const assetRoot = "/assets/introduction";

export function ServiceIntroductionPage() {
  return (
    <main className="introduction-page service-introduction">
      <IntroductionHeader logoSrc={`${assetRoot}/service-mcm-logo.svg`} />
      <section className="service-introduction__hero">
        <img
          className="service-introduction__pattern"
          src={`${assetRoot}/service-pattern.png`}
          alt=""
        />
        <img
          className="service-introduction__emblem"
          src={`${assetRoot}/service-emblem.png`}
          alt="MCM"
        />
        <div className="service-introduction__copy">
          <p className="service-introduction__eyebrow">MCM JOURNEY PASSPORT</p>
          <h1>Where will your choice<br />take you?</h1>
          <p className="service-introduction__description">
            당신의 선택이 다음 제품과 공간, 이야기를 바꿉니다.<br />
            지금, 나만의 MCM Journey를 시작해보세요.
          </p>
          <Link className="service-introduction__cta" to="/journey-introduction">
            Journey 만나보기 <span aria-hidden="true">→</span>
          </Link>
        </div>
      </section>
    </main>
  );
}
