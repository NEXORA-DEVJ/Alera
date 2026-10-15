export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string | null;
  timestamp: string;
}

export interface SeismicEvent {
  id: string;
  source: string;
  externalId: string;
  magnitude: number;
  depthKm: number;
  latitude: number;
  longitude: number;
  epicenterDescription: string;
  originTime: string;
  reviewStatus: string;
}

export interface RiskEvaluation {
  level: 'NONE' | 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  distanceKm: number;
  summary: string;
  calculationSource: string;
}

export interface NearbySeismicEvent {
  event: SeismicEvent;
  riskEvaluation: RiskEvaluation;
}

export type IncidentType =
  | 'ACCIDENT'
  | 'FIRE'
  | 'FLOOD'
  | 'LANDSLIDE'
  | 'ROAD_BLOCK'
  | 'STRUCTURAL_DAMAGE'
  | 'DANGER_ON_ROAD'
  | 'OTHER';

export type IncidentStatus =
  | 'ACTIVE'
  | 'CONFIRMED_ACTIVE'
  | 'POSSIBLY_RESOLVED'
  | 'RESOLVED'
  | 'EXPIRED';

export interface CommunityIncident {
  id: string;
  reporterDeviceId: string;
  incidentType: IncidentType;
  description: string | null;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  status: IncidentStatus;
  positiveVotes: number;
  negativeVotes: number;
  reportedAt: string;
  expiresAt: string;
  images?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface NearbyCommunityIncident {
  incident: CommunityIncident;
  distanceMeters: number;
  distanceKm: number;
}