// Shape of every error body returned by the backend.
export interface ApiErrorBody {
  timestamp: string
  status: number
  error: string
  message: string
}
