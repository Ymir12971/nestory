export type ChildGender = 'boy' | 'girl' | 'prefer_not_to_say';
export type HeightUnit  = 'cm' | 'in';
export type WeightUnit  = 'kg' | 'lb';

// GET /children and GET /children/:id response item
export interface Child {
  id: string;
  name: string;
  birthDate: string;            // YYYY-MM-DD
  gender: ChildGender | null;
  avatarUrl: string | null;
  ageMonths: number;            // computed by server at response time
  heightValue: number | null;
  heightUnit: HeightUnit | null;
  heightRecordedAt: string | null;
  weightValue: number | null;
  weightUnit: WeightUnit | null;
  weightRecordedAt: string | null;
  isActive: boolean;            // derived from users.active_child_id
  createdAt: string;
}

// POST /children body
export interface ChildCreate {
  name: string;            // required, ≤ 50 chars
  birthDate: string;       // required, YYYY-MM-DD
  gender?: ChildGender;
  heightValue?: number;
  heightUnit?: HeightUnit; // required when heightValue is present
  weightValue?: number;
  weightUnit?: WeightUnit; // required when weightValue is present
  avatarUrl?: string;      // upload to storage first; ≤ 500 chars
}

// PATCH /children/:id body — all fields optional
export type ChildPatch = Partial<ChildCreate>;

// PATCH /children/active body
export interface ChildActivePatch {
  childId: string;
}
