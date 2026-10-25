// Judge types based on API documentation

import { JudgingScheduleItem } from "./judging";
export interface Judge {
  judge_id: number;
  judge_name: string;
  sponsor_id: number;
  created_at: string;
  updated_at: string;
}

export interface Sponsor {
  sponsor_id: number;
  sponsor_name: string;
  sponsor_tier: string;
  sponsor_contact: string;
  sponsor_email: string;
  sponsor_description: string;
  sponsor_website: string;
  logo_url: string;
  pin: number;
  is_active: boolean;
  created_at: string;
  judges: Judge[];
}

export interface SponsorByPinResponse {
  sponsor: Sponsor;
}

export interface JudgeLoginRequest {
  pin: number;
  judge_id: number;
}

export interface JudgeLoginResponse {
  token: string;
  access_token: string;
  refresh_token: string;
}

export interface JudgeRegisterRequest {
  pin: number;
  judge_name: string;
}

export interface JudgeRegisterResponse {
  access_token: string;
  refresh_token: string;
  judge_name: string;
  company_id: number;
  judge_id: number;
  token: string;
}

export interface JudgeSchedulesResponse {
  schedules: JudgingScheduleItem[];
}

export interface SavedHackerActionResponse {
  message: string;
  judge_id: number;
  hacker_id: number;
}

export interface IsHackerSavedResponse {
  is_saved: boolean;
}
