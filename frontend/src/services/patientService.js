import { api } from '@/api/client';

/** Lapisan layanan tipis di atas REST API — bisa diperluas per domain */
export function fetchPatients(params) {
  return api.get('/api/v1/patients', { params });
}

export function fetchPatient(id) {
  return api.get(`/api/v1/patients/${id}`);
}

export function createPatient(body) {
  return api.post('/api/v1/patients', body);
}

export function updatePatient(id, body) {
  return api.put(`/api/v1/patients/${id}`, body);
}

export function deletePatient(id) {
  return api.delete(`/api/v1/patients/${id}`);
}
