export function LoadingState({ message = "불러오는 중입니다." }: { message?: string }) {
  return (
    <div className="state-panel" role="status" aria-live="polite">
      <span className="loading-mark" aria-hidden="true" />
      <p>{message}</p>
    </div>
  );
}
