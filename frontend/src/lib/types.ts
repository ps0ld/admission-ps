export interface DataSource {
  name: string;
  url: string | null;
  kind: string;
}

export interface Course {
  id: number;
  name: string;
  level: string;
  stream_required: string | null;
  duration_years: number | null;
  min_percentage: number | null;
  eligibility_notes: string | null;
  admission_route: string | null;
  annual_fees_inr: number | null;
  fees_verified: boolean;
}

export interface CollegeSummary {
  id: number;
  slug: string;
  name: string;
  short_name: string | null;
  state: string;
  city: string;
  institution_type: string;
  ownership: string;
  website: string | null;
  admission_url: string | null;
  entrance_exams: string[];
  admission_routes: string[];
  verification_status: "verified" | "unverified";
  last_verified_on: string | null;
}

export interface CollegeDetail extends CollegeSummary {
  established_year: number | null;
  aishe_code: string | null;
  description: string | null;
  data_source: DataSource | null;
  courses: Course[];
}

export interface CollegePage {
  items: CollegeSummary[];
  total: number;
  page: number;
  page_size: number;
}

export interface FacetValue {
  value: string;
  count: number;
}

export interface Facets {
  states: FacetValue[];
  institution_types: FacetValue[];
  ownerships: FacetValue[];
  exams: FacetValue[];
}

export interface CoverageRow {
  institution_type: string;
  count: number;
  verified: number;
  status: "missing" | "unverified" | "partial";
}

export interface Coverage {
  total_colleges: number;
  verified_colleges: number;
  states_covered: number;
  rows: CoverageRow[];
  note: string;
}

export interface CollegeQuery {
  q?: string;
  state?: string;
  institution_type?: string;
  ownership?: string;
  exam?: string;
  verified_only?: boolean;
  sort?: "name" | "state" | "newest";
  page?: number;
  page_size?: number;
}

// ---- Admission Predictor (POST /api/finder/recommend) ----

export type Qualification = "10th" | "12th" | "diploma";
export type Stream = "PCM" | "PCB" | "Commerce" | "Arts" | "Other";
export type EligibilityStatus = "eligible" | "not_eligible" | "insufficient_data";

export interface FinderRequest {
  qualification: Qualification;
  percentage_10?: number;
  percentage_12?: number;
  stream?: Stream;
  diploma_percentage?: number;
  diploma_branch?: string;
  preferred_course?: string;
  state?: string;
}

export interface FinderCourse {
  course: string;
  level: string;
  status: EligibilityStatus;
  reason: string;
  admission_route: string | null;
}

export interface FinderResult {
  slug: string;
  name: string;
  city: string;
  state: string;
  ownership: string;
  website: string | null;
  admission_url: string | null;
  verification_status: "verified" | "unverified";
  status: EligibilityStatus;
  reason: string;
  courses: FinderCourse[];
}

export interface FinderResponse {
  count: number;
  results: FinderResult[];
  note: string;
}
