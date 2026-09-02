const API_BASE_URL = "http://localhost:8000/api/v1";

export interface RegisterPayload {
  name: string;
  phone_number: string;
  password: string;
  preferred_language: string;
}

export interface LoginPayload {
  phone_number: string;
  password: string;
}

export interface Farm {
  id: number;
  user_id: number;
  name: string;
  location: string;
  latitude: number;
  longitude: number;
  area_hectares: number;
  soil_type: string;
  crop_type: string;
  crop_growth_stage: string;
  irrigation_type: string;
  water_source: string;
  mulching_used: string;
  region: string;
  created_at: string;
}

export interface FarmCreatePayload {
  name: string;
  location: string;
  latitude: number;
  longitude: number;
  area_hectares: number;
  soil_type: string;
  crop_type: string;
  crop_growth_stage: string;
  irrigation_type: string;
  water_source: string;
  mulching_used: string;
  region: string;
}

export type FarmUpdatePayload = Partial<FarmCreatePayload>;

async function handleResponse(response: Response) {
  // DELETE returns 204 No Content — no body to parse
  if (response.status === 204) return null;

  const data = await response.json();
  if (!response.ok) {
    const message = Array.isArray(data.detail)
      ? data.detail[0]?.msg ?? "Something went wrong"
      : data.detail ?? "Something went wrong";
    throw new Error(message);
  }
  return data;
}

export async function registerUser(payload: RegisterPayload) {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleResponse(response);
}

export async function loginUser(payload: LoginPayload) {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleResponse(response);
}

// --- Authenticated requests ---
export async function apiFetch(path: string, options: RequestInit = {}) {
  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (response.status === 401) {
    localStorage.removeItem("access_token");
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  }

  return handleResponse(response);
}

export async function getFarms(): Promise<Farm[]> {
  return apiFetch("/farms/");
}

export async function getFarm(farmId: number): Promise<Farm> {
  return apiFetch(`/farms/${farmId}`);
}

export async function createFarm(payload: FarmCreatePayload): Promise<Farm> {
  return apiFetch("/farms/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateFarm(farmId: number, payload: FarmUpdatePayload): Promise<Farm> {
  return apiFetch(`/farms/${farmId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deleteFarm(farmId: number): Promise<null> {
  return apiFetch(`/farms/${farmId}`, { method: "DELETE" });
}

export interface Sensor {
  id: number;
  farm_id: number;
  sensor_type: string;
  sensor_identifier: string;
  status: string;
  installed_at: string;
}

export interface SensorCreatePayload {
  farm_id: number;
  sensor_type: string;
  sensor_identifier: string;
}

export interface SensorReading {
  id: number;
  sensor_id: number;
  value: number;
  recorded_at: string;
}

export async function getSensors(): Promise<Sensor[]> {
  return apiFetch("/sensors/");
}

export async function createSensor(payload: SensorCreatePayload): Promise<Sensor> {
  return apiFetch("/sensors/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getSensorReadings(sensorId: number): Promise<SensorReading[]> {
  return apiFetch(`/sensor-readings/sensor/${sensorId}`);
}

export interface Prediction {
  water_required_mm: number;
  irrigation_need: string;
  confidence: string;
  soil_moisture_used: number;
  season: string;
  recommendation: string;
  generated_at: string;
}

export async function getPrediction(farmId: number): Promise<Prediction> {
  return apiFetch(`/farms/${farmId}/predict-irrigation`);
}

export interface IrrigationEvent {
  id: number;
  farm_id: number;
  water_amount_mm: number;
  source: string;
  irrigated_at: string;
  created_at: string;
}

export interface IrrigationEventCreatePayload {
  water_amount_mm: number;
  irrigated_at: string;
}

export async function getIrrigationEvents(farmId: number): Promise<IrrigationEvent[]> {
  return apiFetch(`/farms/${farmId}/irrigation-events`);
}

export async function logIrrigationEvent(
  farmId: number,
  payload: IrrigationEventCreatePayload
): Promise<IrrigationEvent> {
  return apiFetch(`/farms/${farmId}/irrigation-events`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export interface ScheduleEvent {
  day_offset: number;
  date: string;
  time_slot: string;
  water_amount_mm: number;
  reason: string;
}

export interface Schedule {
  need_level: string;
  confidence: string;
  total_water_required_mm: number;
  scheduled_mm: number;
  unscheduled_mm: number;
  events: ScheduleEvent[];
  summary: string;
}

export async function getSchedule(farmId: number): Promise<Schedule> {
  return apiFetch(`/farms/${farmId}/schedule`);
}
