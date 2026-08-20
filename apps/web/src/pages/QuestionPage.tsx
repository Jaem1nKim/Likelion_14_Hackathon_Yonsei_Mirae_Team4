import type { CreateReservationRequest } from "@mcm/shared";
import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";

import { errorMessage } from "../api/api-client";
import { createReservation } from "../api/reservation-api";
import { IntroductionHeader } from "../components/IntroductionHeader";
import { PrimaryButton } from "../components/PrimaryButton";
import { useReservationDraft } from "../state/reservation-draft";

const questionAssetRoot = "/assets/question";

const START_QUESTION = {
  code: "TODAY_INTENT",
  text: "오늘 매장에서 어떤 변화를 시도하고 싶나요?",
  answers: [
    {
      code: "DEEPEN_FAMILIAR",
      label: "익숙한 취향을 더 완성하고 싶어요",
      description: "지금 좋아하는 방향을 정교하게 이어갑니다.",
    },
    {
      code: "LIGHT_EXPLORATION",
      label: "새로운 스타일을 가볍게 시도하고 싶어요",
      description: "편안한 범위 안에서 새로운 조합을 살펴봅니다.",
    },
    {
      code: "BOLD_IMPRESSION",
      label: "평소와 다른 인상을 만들어보고 싶어요",
      description: "대비와 표현이 선명한 선택까지 확장합니다.",
    },
  ],
} as const;

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date(value));
}

export function QuestionPage() {
  const navigate = useNavigate();
  const { draft, ensureIdempotencyKey } = useReservationDraft();
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!draft) {
    return (
      <Navigate
        replace
        to="/reserve"
        state={{ notice: "예약 정보가 없어 매장 선택부터 다시 시작합니다." }}
      />
    );
  }
  const currentDraft = draft;

  const selectedAnswer = START_QUESTION.answers.find(
    (answer) => answer.code === selectedCode,
  );

  async function handleCreate() {
    if (!selectedAnswer || isSubmitting) {
      return;
    }
    setIsSubmitting(true);
    setError(null);

    const body: CreateReservationRequest = {
      storeId: currentDraft.store.id,
      reservedAt: currentDraft.reservedAt,
      startQuestionCode: START_QUESTION.code,
      startAnswerCode: selectedAnswer.code,
      startAnswerLabel: selectedAnswer.label,
    };

    try {
      const reservation = await createReservation(body, ensureIdempotencyKey());
      navigate(`/passport/${encodeURIComponent(reservation.id)}`, { replace: true });
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="question-figma-page">
      <IntroductionHeader logoSrc={`${questionAssetRoot}/mcm-logo.svg`} />
      <main className="question-figma-page__body">
        <header className="question-figma-page__heading">
          <h1>시작 질문</h1>
          <span aria-label="예약 단계 3 / 3">3 / 3</span>
        </header>
        <p className="question-figma-page__lead">
          취향과 기대하는 분위기를 알려주시면 매장 여정을 맞춤 구성해 드립니다.
        </p>

        <section className="question-reservation-card" aria-labelledby="question-reservation-title">
          <h2 id="question-reservation-title">예약 정보</h2>
          <div className="question-reservation-card__details">
            <div>
              <span>매장</span>
              <strong>{currentDraft.store.name}</strong>
              <small>{currentDraft.store.location}</small>
            </div>
            <div>
              <span>방문 일시</span>
              <strong>{formatDateTime(currentDraft.reservedAt)}</strong>
            </div>
          </div>
        </section>

        <section className="question-choice-card" aria-labelledby="start-question-title">
          <h2 id="start-question-title">{START_QUESTION.text}</h2>
          <p>오늘의 Journey 방향과 가장 가까운 응답 하나를 선택해 주세요.</p>
          <div className="question-choice-list">
            {START_QUESTION.answers.map((answer) => {
              const selected = answer.code === selectedCode;
              return (
                <button
                  key={answer.code}
                  type="button"
                  className={`question-choice${selected ? " is-selected" : ""}`}
                  aria-pressed={selected}
                  onClick={() => setSelectedCode(answer.code)}
                >
                  {selected ? (
                    <img src={`${questionAssetRoot}/radio-selected.svg`} alt="" />
                  ) : (
                    <span className="question-choice__radio" aria-hidden="true" />
                  )}
                  <span className="question-choice__copy">
                    <strong>{answer.label}</strong>
                    <small>{answer.description}</small>
                  </span>
                  <span className="question-choice__state">{selected ? "선택됨" : "선택"}</span>
                </button>
              );
            })}
          </div>
        </section>

        {error && <p className="question-figma-page__error" role="alert">{error}</p>}
        <div className="question-figma-actions">
          <button
            className="question-figma-button question-figma-button--secondary"
            type="button"
            disabled={isSubmitting}
            onClick={() => navigate("/reserve")}
          >
            이전
          </button>
          <PrimaryButton
            type="button"
            disabled={!selectedAnswer}
            isLoading={isSubmitting}
            onClick={() => void handleCreate()}
          >
            예약 완료하기
          </PrimaryButton>
        </div>
      </main>
    </div>
  );
}
