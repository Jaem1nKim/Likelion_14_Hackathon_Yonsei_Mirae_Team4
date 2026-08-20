import type { PreferenceType, UserProfileResponse } from "@mcm/shared";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { errorMessage } from "../api/api-client";
import { getUserProfile } from "../api/user-api";
import { AppLayout } from "../components/AppLayout";
import { ErrorState } from "../components/ErrorState";
import { LoadingState } from "../components/LoadingState";
import { PageHeader } from "../components/PageHeader";
import { PrimaryButton } from "../components/PrimaryButton";
import { ProgressIndicator } from "../components/ProgressIndicator";
import { useDemoUser } from "../hooks/useDemoUser";

const PREFERENCE_LABELS: Record<PreferenceType, string> = {
  CATEGORY: "카테고리",
  COLOR: "컬러",
  STYLE: "스타일",
  MATERIAL: "소재",
  FUNCTION: "기능",
};

const SCORE_LABELS = [
  ["실용성", "practicalityScore"],
  ["표현성", "expressionScore"],
  ["새로움", "noveltyScore"],
  ["프로필 신뢰도", "confidenceScore"],
] as const;

export function ProfilePage() {
  const navigate = useNavigate();
  const { user } = useDemoUser();
  const [profile, setProfile] = useState<UserProfileResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!user) {
      return;
    }
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);
    void getUserProfile(user.id, controller.signal)
      .then(setProfile)
      .catch((caught: unknown) => {
        if (!(caught instanceof DOMException && caught.name === "AbortError")) {
          setError(errorMessage(caught));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      });
    return () => controller.abort();
  }, [attempt, user]);

  const groupedPreferences = useMemo(() => {
    const groups = new Map<PreferenceType, UserProfileResponse["tasteProfile"]["preferences"]>();
    for (const preference of profile?.tasteProfile.preferences ?? []) {
      const current = groups.get(preference.type) ?? [];
      current.push(preference);
      groups.set(preference.type, current);
    }
    return groups;
  }, [profile]);

  return (
    <AppLayout>
      <ProgressIndicator current={1} />
      <PageHeader
        eyebrow="YOUR TASTE SNAPSHOT"
        title="나의 Journey Profile"
        description="시드 데이터로 준비된 장기 취향과 성향을 확인하세요."
      />
      {isLoading && <LoadingState message="취향 프로필을 불러오고 있습니다." />}
      {!isLoading && error && (
        <ErrorState message={error} onRetry={() => setAttempt((value) => value + 1)} />
      )}
      {!isLoading && !error && profile && (
        <>
          <section className="profile-summary" aria-labelledby="profile-summary-title">
            <div>
              <p className="eyebrow">{profile.user.profileType ?? "CUSTOMER PROFILE"}</p>
              <h2 id="profile-summary-title">{profile.user.name}</h2>
            </div>
            <p>{profile.tasteProfile.summary}</p>
          </section>

          <section className="profile-section" aria-labelledby="scores-title">
            <div className="section-heading">
              <h2 id="scores-title">성향 점수</h2>
              <p>각 점수는 현재 데모 프로필의 시드 값입니다.</p>
            </div>
            <div className="score-grid">
              {SCORE_LABELS.map(([label, key]) => {
                const score = profile.tasteProfile[key];
                return (
                  <div className="score-item" key={key}>
                    <div>
                      <span>{label}</span>
                      <strong>{score}</strong>
                    </div>
                    <div
                      className="score-track"
                      role="progressbar"
                      aria-label={label}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={score}
                    >
                      <span style={{ width: `${Math.max(0, Math.min(100, score))}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="profile-section" aria-labelledby="preferences-title">
            <div className="section-heading">
              <h2 id="preferences-title">취향 선호</h2>
              <p>Journey에서 참고할 선호 축입니다.</p>
            </div>
            <div className="preference-groups">
              {Array.from(groupedPreferences.entries()).map(([type, preferences]) => (
                <div className="preference-group" key={type}>
                  <h3>{PREFERENCE_LABELS[type]}</h3>
                  <div className="tag-list">
                    {preferences.map((preference) => (
                      <span className="tag" key={`${type}-${preference.value}`}>
                        {preference.value} <small>{preference.score}</small>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <div className="page-actions">
            <PrimaryButton type="button" onClick={() => navigate("/reserve")}>
              매장 방문 예약하기
            </PrimaryButton>
          </div>
        </>
      )}
      {!isLoading && !error && !profile && (
        <ErrorState message="TasteProfile을 찾을 수 없습니다." />
      )}
    </AppLayout>
  );
}
