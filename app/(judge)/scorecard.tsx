import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import * as Crypto from "expo-crypto";
import { useQueryClient } from "@tanstack/react-query";
import {
  getOwnScores,
  saveWeightedScore,
  type SavedScore,
} from "@/requests/weightedScoring";
import {
  CRITERIA,
  weightedTotal,
  type RawScores,
} from "@/types/weightedScoring";

export default function Scorecard() {
  const params = useLocalSearchParams<{ projectId: string }>();
  const projectId = Number(params.projectId);
  const queryClient = useQueryClient();
  const [saved, setSaved] = useState<SavedScore | null>(null);
  const [values, setValues] = useState<Partial<RawScores>>({});
  const [checks, setChecks] = useState<boolean[]>([
    false,
    false,
    false,
    false,
    false,
  ]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [message, setMessage] = useState("");
  const loadGeneration = useRef(0);
  const [loadedProjectId, setLoadedProjectId] = useState<number | null>(null);
  const pending = useRef<{ fingerprint: string; id: string } | null>(null);
  const inFlight = useRef(false);

  const load = useCallback(async () => {
    const generation = ++loadGeneration.current;
    setLoading(true);
    setLoadFailed(false);
    try {
      if (!Number.isSafeInteger(projectId) || projectId <= 0)
        throw new Error("Invalid project");
      const scores = await getOwnScores();
      if (generation !== loadGeneration.current) return;
      setLoadedProjectId(projectId);
      const score = scores.find((s) => s.project_id === projectId) ?? null;
      setSaved(score);
      setConflict(false);
      pending.current = null;
      setValues(score?.rubric_version === 2 ? score.scores : {});
      setChecks(score?.pitching_checks ?? [false, false, false, false, false]);
      setMessage(
        score?.rubric_version === 1
          ? "An organizer must migrate this project's previous-rubric score before it can be edited."
          : ""
      );
    } catch {
      if (generation !== loadGeneration.current) return;
      setLoadFailed(true);
      setMessage(
        "Could not load your saved score. Check your connection or sign in again."
      );
    } finally {
      if (generation === loadGeneration.current) setLoading(false);
    }
  }, [projectId]);
  useEffect(() => {
    load();
    return () => {
      loadGeneration.current += 1;
    };
  }, [load]);
  const legacy = saved?.rubric_version === 1;
  const complete =
    loadedProjectId === projectId &&
    CRITERIA.every(
      (c) =>
        Number.isInteger(values[c.key]) &&
        (values[c.key] ?? -1) >= (c.key === "pitching" ? 0 : 1) &&
        (values[c.key] ?? 6) <= 5
    ) &&
    [1, 2, 3, 5].includes(values.time ?? -1);

  async function submit() {
    if (!complete || inFlight.current || loadFailed || conflict || legacy)
      return;
    inFlight.current = true;
    setBusy(true);
    const generation = loadGeneration.current;
    const scores = values as RawScores;
    const fingerprint = JSON.stringify({ scores, checks });
    if (pending.current?.fingerprint !== fingerprint)
      pending.current = { fingerprint, id: Crypto.randomUUID() };
    try {
      const result = await saveWeightedScore(
        projectId,
        scores,
        checks,
        saved?.revision ?? 0,
        pending.current.id
      );
      if (generation !== loadGeneration.current) {
        await queryClient.invalidateQueries({ queryKey: ["judge-own-scores"] });
        return;
      }
      setSaved(result);
      pending.current = null;
      setMessage("Score saved. You can continue editing.");
      await queryClient.invalidateQueries({ queryKey: ["judge-own-scores"] });
    } catch (error: any) {
      if (generation !== loadGeneration.current) return;
      if (error?.response?.status === 409) {
        setConflict(true);
        setMessage(
          "This score changed on another device or uses the previous rubric. Load the saved score before editing."
        );
      } else
        setMessage(
          "Could not confirm the save. Retry to check the same request, or load the saved score. Your changes remain on this screen."
        );
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f9f9f9" }}>
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 48 }}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.back()}
          style={{ paddingVertical: 12 }}
        >
          <Text style={{ color: "#21516b" }}>Back to project</Text>
        </Pressable>
        <Text
          style={{
            color: "#1b1b1b",
            fontSize: 26,
            fontWeight: "600",
            marginTop: 16,
          }}
        >
          {saved ? "Edit your score" : "Score project"}
        </Text>
        <Text style={{ color: "#585858", marginTop: 8 }}>
          Weighted total: {complete ? weightedTotal(values as RawScores) : "?"}
          /100. You can edit after saving.
        </Text>
        {loading ? (
          <ActivityIndicator style={{ margin: 24 }} />
        ) : (
          <View>
            {CRITERIA.map((c) => (
              <View
                key={c.key}
                style={{
                  borderBottomWidth: 1,
                  borderBottomColor: "#d7d7d7",
                  paddingVertical: 24,
                }}
              >
                <Text
                  style={{ fontSize: 18, fontWeight: "600", color: "#1b1b1b" }}
                >
                  {c.label}: {c.weight}%
                </Text>
                <Text
                  style={{ marginTop: 8, lineHeight: 22, color: "#585858" }}
                >
                  {c.description}
                </Text>
                {c.key === "pitching" ? (
                  <View>
                    {c.levels.map((level, i) => (
                      <Pressable
                        accessibilityRole="checkbox"
                        accessibilityState={{
                          checked: checks[i],
                          disabled: busy || loadFailed || legacy || conflict,
                        }}
                        disabled={busy || loadFailed || legacy || conflict}
                        key={level.value}
                        onPress={() => {
                          const next = [...checks];
                          next[i] = !next[i];
                          setChecks(next);
                          setValues((v) => ({
                            ...v,
                            pitching: next.filter(Boolean).length,
                          }));
                        }}
                        style={{
                          padding: 14,
                          marginTop: 8,
                          borderRadius: 8,
                          backgroundColor: checks[i] ? "#bff6ff" : "white",
                        }}
                      >
                        <Text style={{ color: "#1b1b1b" }}>
                          {checks[i] ? "[x] " : "[ ] "}
                          {level.text}
                        </Text>
                      </Pressable>
                    ))}
                    {values.pitching === undefined && (
                      <Pressable
                        onPress={() => {
                          setChecks([false, false, false, false, false]);
                          setValues((v) => ({ ...v, pitching: 0 }));
                        }}
                      >
                        <Text style={{ color: "#21516b", paddingVertical: 16 }}>
                          None met (0/5)
                        </Text>
                      </Pressable>
                    )}
                  </View>
                ) : (
                  c.levels.map((level) => (
                    <Pressable
                      accessibilityRole="radio"
                      accessibilityState={{
                        checked: values[c.key] === level.value,
                        disabled: busy || loadFailed || legacy || conflict,
                      }}
                      disabled={busy || loadFailed || legacy || conflict}
                      key={level.value}
                      onPress={() =>
                        setValues((v) => ({ ...v, [c.key]: level.value }))
                      }
                      style={{
                        padding: 14,
                        marginTop: 8,
                        borderRadius: 8,
                        backgroundColor:
                          values[c.key] === level.value ? "#bff6ff" : "white",
                      }}
                    >
                      <Text style={{ color: "#1b1b1b", lineHeight: 22 }}>
                        {level.value}: {level.text}
                      </Text>
                    </Pressable>
                  ))
                )}
              </View>
            ))}
          </View>
        )}
        {!!message && (
          <Text
            accessibilityLiveRegion="polite"
            style={{
              marginVertical: 18,
              color: conflict || loadFailed ? "#82181a" : "#21516b",
              lineHeight: 22,
            }}
          >
            {message}
          </Text>
        )}
        <Pressable
          accessibilityRole="button"
          disabled={
            loading || busy || !complete || loadFailed || legacy || conflict
          }
          onPress={submit}
          style={{
            marginTop: 24,
            borderRadius: 8,
            backgroundColor: "#21516b",
            opacity:
              loading || busy || !complete || loadFailed || legacy || conflict
                ? 0.5
                : 1,
            padding: 16,
          }}
        >
          <Text
            style={{ color: "white", textAlign: "center", fontWeight: "600" }}
          >
            {busy ? "Saving..." : saved ? "Save changes" : "Save score"}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={load}
          style={{ paddingVertical: 18 }}
        >
          <Text style={{ color: "#21516b", textAlign: "center" }}>
            Load saved score
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
