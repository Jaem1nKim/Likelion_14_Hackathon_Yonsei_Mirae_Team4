import type { InteractionType, StepRecommendationView } from "@mcm/shared";

const TYPE_LABEL = {
  MATCH: "추천",
  COMPARE: "비교",
  CHALLENGE: "새로운 시도",
} as const;

type Props = {
  recommendation: StepRecommendationView;
  selected: boolean;
  rejected: boolean;
  pending: boolean;
  disabled: boolean;
  onInteraction: (type: InteractionType) => void;
};

export function ProductRecommendationCard({
  recommendation,
  selected,
  rejected,
  pending,
  disabled,
  onInteraction,
}: Props) {
  const { product } = recommendation;
  return (
    <article className={`product-card${selected ? " is-selected" : ""}`}>
      <button
        type="button"
        className="product-select-target"
        aria-pressed={selected}
        aria-label={`${product.name} 선택`}
        disabled={disabled || pending || selected || rejected}
        onClick={() => onInteraction("SELECTED")}
      >
        <span className="product-media">
          <img
            src={product.imageUrl}
            alt={product.name}
            onError={(event) => {
              event.currentTarget.hidden = true;
              event.currentTarget.parentElement?.classList.add("image-unavailable");
            }}
          />
          <span className="image-fallback" aria-hidden="true">MCM</span>
        </span>
        <span className="product-card-copy">
          <span className={`recommendation-badge recommendation-${recommendation.type.toLowerCase()}`}>
            {TYPE_LABEL[recommendation.type]}
          </span>
          <strong>{product.name}</strong>
          <span className="product-meta">
            {product.category} · {product.color}
            {product.material ? ` · ${product.material}` : ""}
            {product.size ? ` · ${product.size}` : ""}
          </span>
          <span className="recommendation-reason">{recommendation.reason}</span>
          {selected && <span className="selected-label">선택됨</span>}
          {rejected && !selected && <span className="rejected-label">제외 기록됨</span>}
        </span>
      </button>
      <div className="product-card-actions">
        {selected ? (
          <button
            type="button"
            className="button button-text"
            disabled={disabled || pending}
            onClick={() => onInteraction("DESELECTED")}
          >
            선택 취소
          </button>
        ) : (
          <button
            type="button"
            className="button button-text"
            disabled={disabled || pending || rejected}
            onClick={() => onInteraction("REJECTED")}
          >
            이 제품은 제외할게요
          </button>
        )}
        {pending && <span className="inline-pending" role="status">저장 중</span>}
      </div>
    </article>
  );
}
