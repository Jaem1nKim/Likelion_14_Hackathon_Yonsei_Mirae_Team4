import type { JourneyAggregate, JourneyStage } from "@mcm/shared";

const STAGES: Array<{ stage: JourneyStage; label: string }> = [
  { stage: "BAG", label: "BAG" },
  { stage: "APPAREL", label: "APPAREL" },
  { stage: "ACCESSORY", label: "ACCESSORY" },
];

export function JourneyStageProgress({ aggregate }: { aggregate: JourneyAggregate }) {
  const completed = new Set(aggregate.completedSteps.map((step) => step.stage));

  return (
    <ol className="journey-progress" aria-label="Journey 진행 단계">
      {STAGES.map((item, index) => {
        const isCompleted = completed.has(item.stage);
        const isCurrent = aggregate.journey.currentStage === item.stage;
        return (
          <li
            key={item.stage}
            className={isCompleted ? "is-complete" : isCurrent ? "is-current" : ""}
            aria-current={isCurrent ? "step" : undefined}
          >
            <span>{isCompleted ? "완료" : index + 1}</span>
            <strong>{item.label}</strong>
            <small>{isCompleted ? "선택 완료" : isCurrent ? "현재 단계" : "예정"}</small>
          </li>
        );
      })}
    </ol>
  );
}
