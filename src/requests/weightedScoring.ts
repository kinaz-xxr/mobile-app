import type { RawScores } from "@/types/weightedScoring";
import { axiosInstance } from "./axiosConfig";

export type SavedScore = {
  project_id: number;
  rubric_version: 1 | 2;
  revision: number;
  scores: RawScores;
  pitching_checks: boolean[] | null;
  total_score: number;
};
export async function getOwnScores(): Promise<SavedScore[]> {
  return (
    await axiosInstance.get<{ scores: SavedScore[] }>(
      "/api/v13/judges/me/scores"
    )
  ).data.scores;
}
export async function saveWeightedScore(
  projectId: number,
  scores: RawScores,
  checks: boolean[],
  revision: number,
  requestId: string
): Promise<SavedScore> {
  return (
    await axiosInstance.put<SavedScore>(`/api/v13/judges/scores/${projectId}`, {
      ...scores,
      pitching_checks: checks,
      expected_revision: revision,
      request_id: requestId,
      rubric_version: 2,
    })
  ).data;
}
