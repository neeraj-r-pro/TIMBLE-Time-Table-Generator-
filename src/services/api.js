// API service for making HTTP requests to the backend

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Helper function to get auth token
const getAuthToken = () => {
  return localStorage.getItem('token');
};

// Helper function to make API requests
const apiRequest = async (endpoint, options = {}) => {
  const token = getAuthToken();

  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API request error:', error);
    throw error;
  }
};

// Auth API
export const authAPI = {
  register: async (userData) => {
    return apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  login: async (credentials) => {
    const response = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });

    // Store token if login successful
    if (response.token) {
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
    }

    return response;
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  getCurrentUser: () => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },
};

// Institutions API
export const institutionsAPI = {
  getAll: async () => {
    return apiRequest('/institutions');
  },

  getById: async (id) => {
    return apiRequest(`/institutions/${id}`);
  },

  create: async (institutionData) => {
    return apiRequest('/institutions', {
      method: 'POST',
      body: JSON.stringify(institutionData),
    });
  },

  update: async (id, institutionData) => {
    return apiRequest(`/institutions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(institutionData),
    });
  },

  delete: async (id) => {
    return apiRequest(`/institutions/${id}`, {
      method: 'DELETE',
    });
  },
};

// Faculties API
export const facultiesAPI = {
  getAll: async (institutionId = null) => {
    const query = institutionId ? `?institutionId=${institutionId}` : '';
    return apiRequest(`/faculties${query}`);
  },

  getById: async (id) => {
    return apiRequest(`/faculties/${id}`);
  },

  create: async (facultyData) => {
    return apiRequest('/faculties', {
      method: 'POST',
      body: JSON.stringify(facultyData),
    });
  },

  update: async (id, facultyData) => {
    return apiRequest(`/faculties/${id}`, {
      method: 'PUT',
      body: JSON.stringify(facultyData),
    });
  },

  delete: async (id) => {
    return apiRequest(`/faculties/${id}`, {
      method: 'DELETE',
    });
  },

  // Faculty-side institution management
  getMyInstitutions: async () => {
    return apiRequest('/faculties/my-institutions');
  },

  linkInstitutionByCode: async (code) => {
    return apiRequest('/faculties/link-institution', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  },

  unlinkInstitution: async (institutionId) => {
    return apiRequest(`/faculties/unlink-institution/${institutionId}`, {
      method: 'DELETE',
    });
  },
};

// Rooms API
export const roomsAPI = {
  getAll: async (institutionId = null) => {
    const query = institutionId ? `?institutionId=${institutionId}` : '';
    return apiRequest(`/rooms${query}`);
  },

  getById: async (id) => {
    return apiRequest(`/rooms/${id}`);
  },

  create: async (roomData) => {
    return apiRequest('/rooms', {
      method: 'POST',
      body: JSON.stringify(roomData),
    });
  },

  update: async (id, roomData) => {
    return apiRequest(`/rooms/${id}`, {
      method: 'PUT',
      body: JSON.stringify(roomData),
    });
  },

  delete: async (id) => {
    return apiRequest(`/rooms/${id}`, {
      method: 'DELETE',
    });
  },
};

// Students API
export const studentsAPI = {
  getAll: async (classFilter = null) => {
    const query = classFilter && classFilter !== 'all' ? `?class=${encodeURIComponent(classFilter)}` : '';
    return apiRequest(`/students${query}`);
  },

  getById: async (id) => {
    return apiRequest(`/students/${id}`);
  },

  create: async (studentData) => {
    return apiRequest('/students', {
      method: 'POST',
      body: JSON.stringify(studentData),
    });
  },

  update: async (id, studentData) => {
    return apiRequest(`/students/${id}`, {
      method: 'PUT',
      body: JSON.stringify(studentData),
    });
  },

  delete: async (id) => {
    return apiRequest(`/students/${id}`, {
      method: 'DELETE',
    });
  },
};

// Batches API
export const batchesAPI = {
  getAll: async (timetableId = null, institutionId = null) => {
    const params = new URLSearchParams();
    if (timetableId) params.append('timetableId', timetableId);
    if (institutionId) params.append('institutionId', institutionId);
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiRequest(`/batches${query}`);
  },

  getById: async (id) => {
    return apiRequest(`/batches/${id}`);
  },

  create: async (batchData) => {
    return apiRequest('/batches', {
      method: 'POST',
      body: JSON.stringify(batchData),
    });
  },

  update: async (id, batchData) => {
    return apiRequest(`/batches/${id}`, {
      method: 'PUT',
      body: JSON.stringify(batchData),
    });
  },

  delete: async (id) => {
    return apiRequest(`/batches/${id}`, {
      method: 'DELETE',
    });
  },
};

// Subjects API
export const subjectsAPI = {
  getAll: async (batchId = null, institutionId = null) => {
    const params = new URLSearchParams();
    if (batchId) params.append('batchId', batchId);
    if (institutionId) params.append('institutionId', institutionId);
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiRequest(`/subjects${query}`);
  },

  getById: async (id) => {
    return apiRequest(`/subjects/${id}`);
  },

  create: async (subjectData) => {
    return apiRequest('/subjects', {
      method: 'POST',
      body: JSON.stringify(subjectData),
    });
  },

  update: async (id, subjectData) => {
    return apiRequest(`/subjects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(subjectData),
    });
  },

  delete: async (id) => {
    return apiRequest(`/subjects/${id}`, {
      method: 'DELETE',
    });
  },

  deleteBulk: async (ids) => {
    return apiRequest('/subjects/bulk', {
      method: 'DELETE',
      body: JSON.stringify({ ids }),
    });
  },
};

// Schedules API
export const schedulesAPI = {
  getAll: async (dayOfWeek = null) => {
    const query = dayOfWeek ? `?dayOfWeek=${dayOfWeek}` : '';
    return apiRequest(`/schedules${query}`);
  },

  create: async (schedules) => {
    return apiRequest('/schedules', {
      method: 'POST',
      body: JSON.stringify({ schedules }),
    });
  },

  deleteByDay: async (dayOfWeek) => {
    return apiRequest(`/schedules/day/${dayOfWeek}`, {
      method: 'DELETE',
    });
  },

  deleteByTimetable: async (timetableId) => {
    return apiRequest(`/schedules/day/all?timetableId=${timetableId}`, {
      method: 'DELETE',
    });
  },
};

// Timetables API (timetable entries)
export const timetablesAPI = {
  getAll: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.batchId) params.append('batchId', filters.batchId);
    if (filters.facultyId) params.append('facultyId', filters.facultyId);
    if (filters.dayOfWeek) params.append('dayOfWeek', filters.dayOfWeek);
    if (filters.timetableId) params.append('timetableId', filters.timetableId);

    const query = params.toString() ? `?${params.toString()}` : '';
    return apiRequest(`/timetables${query}`);
  },

  getByBatch: async (batchId) => {
    return apiRequest(`/timetables/batch/${batchId}`);
  },

  getByFaculty: async (facultyId) => {
    return apiRequest(`/timetables/faculty/${facultyId}`);
  },

  create: async (entryData) => {
    return apiRequest('/timetables', {
      method: 'POST',
      body: JSON.stringify(entryData),
    });
  },

  createBulk: async (entries) => {
    return apiRequest('/timetables/bulk', {
      method: 'POST',
      body: JSON.stringify({ entries }),
    });
  },

  update: async (id, entryData) => {
    return apiRequest(`/timetables/${id}`, {
      method: 'PUT',
      body: JSON.stringify(entryData),
    });
  },

  delete: async (id) => {
    return apiRequest(`/timetables/${id}`, {
      method: 'DELETE',
    });
  },

  deleteEntries: async (timetableId) => {
    return apiRequest(`/timetables/timetable/${timetableId}`, {
      method: 'DELETE',
    });
  },
};

// Timetable Management API (timetable records with codes)
export const timetableManagementAPI = {
  getAll: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.institutionId) params.append('institutionId', filters.institutionId);
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiRequest(`/timetable-management${query}`);
  },

  getById: async (id) => {
    return apiRequest(`/timetable-management/${id}`);
  },

  getByCode: async (code) => {
    return apiRequest(`/timetable-management/code/${encodeURIComponent(code)}`);
  },

  getByCodeFull: async (code) => {
    return apiRequest(`/timetable-management/code/${encodeURIComponent(code)}/full`);
  },

  create: async (timetableData) => {
    return apiRequest('/timetable-management', {
      method: 'POST',
      body: JSON.stringify(timetableData),
    });
  },

  update: async (id, timetableData) => {
    return apiRequest(`/timetable-management/${id}`, {
      method: 'PUT',
      body: JSON.stringify(timetableData),
    });
  },

  delete: async (id) => {
    return apiRequest(`/timetable-management/${id}`, {
      method: 'DELETE',
    });
  },
};

// Preferences API
export const preferencesAPI = {
  getByFaculty: async (facultyId, timetableId = null) => {
    const params = timetableId ? `?timetableId=${encodeURIComponent(timetableId)}` : '';
    return apiRequest(`/preferences/faculty/${facultyId}${params}`);
  },

  update: async (facultyId, preferences) => {
    return apiRequest(`/preferences/faculty/${facultyId}`, {
      method: 'POST',
      body: JSON.stringify(preferences),
    });
  },

  getAllForTimetable: async (timetableId) => {
    return apiRequest(`/preferences/timetable/${timetableId}`);
  },
};

// Semesters API
export const semestersAPI = {
  getAll: async (institutionId = null) => {
    const query = institutionId ? `?institutionId=${institutionId}` : '';
    return apiRequest(`/semesters${query}`);
  },

  getById: async (id) => {
    return apiRequest(`/semesters/${id}`);
  },

  create: async (data) => {
    return apiRequest('/semesters', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id, data) => {
    return apiRequest(`/semesters/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete: async (id) => {
    return apiRequest(`/semesters/${id}`, {
      method: 'DELETE',
    });
  },

  getBatches: async (semesterId) => {
    return apiRequest(`/semesters/${semesterId}/batches`);
  },

  linkBatches: async (semesterId, batchIds) => {
    return apiRequest(`/semesters/${semesterId}/batches`, {
      method: 'POST',
      body: JSON.stringify({ batchIds }),
    });
  },

  unlinkBatch: async (semesterId, batchId) => {
    return apiRequest(`/semesters/${semesterId}/batches/${batchId}`, {
      method: 'DELETE',
    });
  },
};


