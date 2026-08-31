// German Steel deployment. EXPO_PUBLIC_API_URL can still override this for a
// staging or local backend without changing source code.
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || 'http://ec2-18-211-58-135.compute-1.amazonaws.com:8081';

export const apiUrl = (path) =>
  `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
