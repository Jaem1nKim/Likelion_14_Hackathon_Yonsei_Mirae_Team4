import type { CreateReservationRequest } from "@mcm/shared";
import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";

import { errorMessage } from "../api/api-client";
import { createReservation } from "../api/reservation-api";
import { AppLayout } from "../components/AppLayout";
import { PageHeader } from "../components/PageHeader";
import { PrimaryButton } from "../components/PrimaryButton";
import { ProgressIndicator } from "../components/ProgressIndicator";
import { useReservationDraft } from "../state/reservation-draft";

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
    <AppLayout>
      <ProgressIndicator current={3} />
      <PageHeader
        eyebrow="TODAY'S DIRECTION"
        title="오늘의 Journey 방향"
        description="한 가지 응답이 매장에서 시작할 스타일 여정의 기준이 됩니다."
      />

      <section className="reservation-summary" aria-label="예약 요약">
        <div>
          <span>매장</span>
          <strong>{currentDraft.store.name}</strong>
          <small>{currentDraft.store.location}</small>
        </div>
        <div>
          <span>방문 일시</span>
          <strong>{formatDateTime(currentDraft.reservedAt)}</strong>
        </div>
      </section>

      <fieldset className="plain-fieldset question-fieldset">
        <legend>{START_QUESTION.text}</legend>
        <div className="choice-grid answer-grid">
          {START_QUESTION.answers.map((answer) => {
            const selected = answer.code === selectedCode;
            return (
              <button
                key={answer.code}
                type="button"
                className={`choice-card answer-card${selected ? " is-selected" : ""}`}
                aria-pressed={selected}
                onClick={() => setSelectedCode(answer.code)}
              >
                <span className="choice-content">
                  <strong>{answer.label}</strong>
                  <small>{answer.description}</small>
                </span>
                <span className="selection-label">{selected ? "선택됨" : "선택"}</span>
              </button>
            );
          })}
        </div>
      </fieldset>

      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="page-actions page-actions-split">
        <button className="button button-secondary" type="button" onClick={() => navigate("/reserve")}>
          이전
        </button>
        <PrimaryButton
          type="button"
          disabled={!selectedAnswer}
          isLoading={isSubmitting}
          onClick={() => void handleCreate()}
        >
          Journey Passport 만들기
        </PrimaryButton>
      </div>
    </AppLayout>
  );
}
