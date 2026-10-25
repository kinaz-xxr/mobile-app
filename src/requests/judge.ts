import {
  JudgeLoginRequest,
  JudgeLoginResponse,
  JudgeRegisterRequest,
  JudgeRegisterResponse,
  JudgeSchedulesResponse,
  SavedHackerActionResponse,
  IsHackerSavedResponse,
  SponsorByPinResponse,
} from "@/types/judge";
import { PaginatedResponse } from "@/types/pagination";
import { axiosInstance } from "./axiosConfig";
import { HackerProfile } from "./hacker";

export const judgeEndpoints = {
  SPONSOR_BY_PIN: "/api/v13/judges/sponsor-by-pin",
  LOGIN: "/api/v13/judges/session",
  REGISTER: "/api/v13/admins/judges/register",
  GET_SCHEDULES: "/api/v13/judges/{judge_id}/schedules",
  SAVE_HACKER: "/api/v13/judges/save-hacker/{hacker_id}",
  UNSAVE_HACKER: "/api/v13/judges/save-hacker/{hacker_id}",
  GET_SAVED_HACKERS: "/api/v13/judges/saved-hackers",
  IS_HACKER_SAVED: "/api/v13/judges/is-hacker-saved/{hacker_id}",
};

/**
 * Get sponsor information by PIN
 */
export const getSponsorByPin = async (
  pin: number
): Promise<SponsorByPinResponse> => {
  const response = await axiosInstance.post<SponsorByPinResponse>(
    judgeEndpoints.SPONSOR_BY_PIN,
    { pin }
  );
  return response.data;
};

/**
 * Login as a judge using PIN and judge ID
 */
export const judgeLogin = async (
  credentials: JudgeLoginRequest
): Promise<JudgeLoginResponse> => {
  const response = await axiosInstance.post<JudgeLoginResponse>(
    judgeEndpoints.LOGIN,
    credentials
  );
  return { ...response.data, token: response.data.access_token };
};

/**
 * Register a new judge with name and PIN
 */
export const registerJudge = async (
  registrationData: JudgeRegisterRequest
): Promise<JudgeRegisterResponse> => {
  const response = await axiosInstance.post<JudgeRegisterResponse>(
    judgeEndpoints.REGISTER,
    registrationData
  );
  const tokens = await judgeLogin({
    pin: registrationData.pin,
    judge_id: response.data.judge_id,
  });
  return { ...response.data, ...tokens };
};

/**
 * Get all schedules for a specific judge
 */
export const getJudgeSchedules = async (
  judgeId: number
): Promise<JudgeSchedulesResponse> => {
  const response = await axiosInstance.get<JudgeSchedulesResponse>(
    judgeEndpoints.GET_SCHEDULES.replace("{judge_id}", judgeId.toString())
  );
  return response.data;
};

/**
 * Save a hacker for the authenticated judge
 */
export const saveHacker = async (
  hackerId: number
): Promise<SavedHackerActionResponse> => {
  const response = await axiosInstance.post<SavedHackerActionResponse>(
    judgeEndpoints.SAVE_HACKER.replace("{hacker_id}", hackerId.toString())
  );
  return response.data;
};

/**
 * Unsave a hacker for the authenticated judge
 */
export const unsaveHacker = async (
  hackerId: number
): Promise<SavedHackerActionResponse> => {
  const response = await axiosInstance.delete<SavedHackerActionResponse>(
    judgeEndpoints.UNSAVE_HACKER.replace("{hacker_id}", hackerId.toString())
  );
  return response.data;
};

/**
 * Get all saved hackers for the authenticated judge with pagination
 */
export const getSavedHackers = async (
  page: number = 1,
  pageSize: number = 20
): Promise<PaginatedResponse<HackerProfile>> => {
  const response = await axiosInstance.get<PaginatedResponse<HackerProfile>>(
    judgeEndpoints.GET_SAVED_HACKERS,
    {
      params: { page, page_size: pageSize },
    }
  );
  return response.data;
};

/**
 * Check if a specific hacker is saved by the authenticated judge
 */
export const isHackerSaved = async (
  hackerId: number
): Promise<IsHackerSavedResponse> => {
  const response = await axiosInstance.get<IsHackerSavedResponse>(
    judgeEndpoints.IS_HACKER_SAVED.replace("{hacker_id}", hackerId.toString())
  );
  return response.data;
};
