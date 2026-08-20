import type { ConsentResponse, PreferenceType, UserProfileResponse } from "@mcm/shared";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { errorMessage } from "../api/api-client";
import { getUserConsent } from "../api/consent-api";
import { getUserProfile } from "../api/user-api";
import { CustomerHeader } from "../components/CustomerHeader";
import { ErrorState } from "../components/ErrorState";
import { LoadingState } from "../components/LoadingState";
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
  const [consent, setConsent] = useState<ConsentResponse["currentConsent"]>(null);
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
    void Promise.all([
      getUserProfile(user.id, controller.signal),
      getUserConsent(user.id, controller.signal),
    ])
      .then(([nextProfile, nextConsent]) => {
        setProfile(nextProfile);
        setConsent(nextConsent.currentConsent);
      })
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
    <div className="profile-experience-page">
      <CustomerHeader className="profile-experience-header" />
      <main>
        {isLoading && (
          <div className="profile-experience-state">
            <LoadingState message="취향 프로필을 불러오고 있습니다." />
          </div>
        )}
        {!isLoading && error && (
          <div className="profile-experience-state">
            <ErrorState message={error} onRetry={() => setAttempt((value) => value + 1)} />
          </div>
        )}
        {!isLoading && !error && profile && (
          <>
            <section className="profile-experience-hero" aria-labelledby="profile-page-title">
              <div className="profile-experience-hero__inner">
                <div className="profile-experience-identity">
                  <p>MY JOURNEY PROFILE</p>
                  <h1 id="profile-page-title">나의 Journey Profile</h1>
                  <div className="profile-experience-person">
                    <span className="profile-experience-monogram" aria-hidden="true">
                      {profile.user.name.trim().charAt(0) || "M"}
                    </span>
                    <div>
                      <strong>{profile.user.name}</strong>
                      <span>{profile.user.profileType ?? "Journey Customer"}</span>
                      <small>{profile.user.email}</small>
                    </div>
                  </div>
                </div>
                <blockquote>{profile.tasteProfile.summary}</blockquote>
              </div>
            </section>

            <div className="profile-experience-body">
              <div className="profile-experience-main">
                <section className="profile-experience-section" aria-labelledby="scores-title">
                  <header>
                    <p>01 · PERSONALITY</p>
                    <h2 id="scores-title">나의 성향</h2>
                    <span>현재 Journey 개인화에 반영되는 취향 지표입니다.</span>
                  </header>
                  <div className="profile-experience-scores">
                    {SCORE_LABELS.map(([label, key]) => {
                      const score = profile.tasteProfile[key];
                      return (
                        <div className="profile-experience-score" key={key}>
                          <div>
                            <span>{label}</span>
                            <strong>{score}</strong>
                          </div>
                          <div
                            className="profile-experience-score__track"
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

                <section className="profile-experience-section" aria-labelledby="preferences-title">
                  <header>
                    <p>02 · PREFERENCES</p>
                    <h2 id="preferences-title">Journey 취향 선호</h2>
                    <span>상품 추천과 Journey 구성에서 참고하는 선호 축입니다.</span>
                  </header>
                  <div className="profile-experience-preferences">
                    {Array.from(groupedPreferences.entries()).map(([type, preferences]) => (
                      <div className="profile-experience-preference" key={type}>
                        <h3>{PREFERENCE_LABELS[type]}</h3>
                        <div>
                          {preferences.map((preference) => (
                            <span key={`${type}-${preference.value}`}>
                              {preference.value} <small>{preference.score}</small>
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              <aside className="profile-experience-consent" aria-labelledby="consent-status-title">
                <header>
                  <p>PERSONALIZATION SETTINGS</p>
                  <h2 id="consent-status-title">데이터 활용 동의</h2>
                  <span>Journey 개인화에 사용되는 정보의 현재 설정입니다.</span>
                </header>
                <dl>
                  <div>
                    <dt><span>필수</span>Journey 진행 및 제품 선택 데이터 이용</dt>
                    <dd className={consent?.journeyDataAllowed ? "is-allowed" : "is-disabled"}>
                      {consent?.journeyDataAllowed ? "동의함" : "동의 필요"}
                    </dd>
                  </div>
                  <div>
                    <dt><span>선택</span>온라인 관심·행동 정보 활용</dt>
                    <dd className={consent?.behaviorDataAllowed ? "is-allowed" : "is-disabled"}>
                      {consent?.behaviorDataAllowed ? "동의함" : "동의하지 않음"}
                    </dd>
                  </div>
                </dl>
                <p className="profile-experience-consent__note">
                  선택 정보 제공에 동의하지 않아도 Journey를 이용할 수 있습니다.
                </p>
                <button type="button" onClick={() => navigate("/consent")}>동의 설정 변경</button>
              </aside>
            </div>

            <section className="profile-experience-cta" aria-label="Journey 예약">
              <div>
                <p>NEXT JOURNEY</p>
                <h2>새로운 선택을 시작해보세요.</h2>
              </div>
              <button type="button" onClick={() => navigate("/reserve")}>매장 방문 예약하기 <span aria-hidden="true">→</span></button>
            </section>
          </>
        )}
        {!isLoading && !error && !profile && (
          <div className="profile-experience-state">
            <ErrorState message="TasteProfile을 찾을 수 없습니다." />
          </div>
        )}
      </main>
    </div>
  );
}
