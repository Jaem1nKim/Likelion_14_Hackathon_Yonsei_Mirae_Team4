type ErrorStateProps = {
  message: string;
  onRetry?: () => void;
};

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="state-panel state-panel-error" role="alert">
      <strong>요청을 완료하지 못했습니다.</strong>
      <p>{message}</p>
      {onRetry && (
        <button className="button button-secondary" type="button" onClick={onRetry}>
          다시 시도
        </button>
      )}
    </div>
  );
}
