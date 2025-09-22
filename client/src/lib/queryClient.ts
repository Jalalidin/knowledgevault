import { QueryClient, QueryFunction } from "@tanstack/react-query";

// Token management
let cachedToken: string | null = null;
let tokenExpiration: number = 0;

async function getAuthToken(): Promise<string | null> {
  // Check if we have a valid cached token
  if (cachedToken && Date.now() < tokenExpiration) {
    return cachedToken;
  }

  try {
    // Get JWT token from Node.js bridge
    const response = await fetch('/api/auth/token', {
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error('Failed to get auth token');
    }
    
    const data = await response.json();
    cachedToken = data.access_token;
    // Set expiration slightly before actual expiration (25 minutes instead of 30)
    tokenExpiration = Date.now() + (25 * 60 * 1000); 
    
    return cachedToken;
  } catch (error) {
    console.log('No auth token available:', error);
    return null;
  }
}

// All API calls will go through Node.js (same origin) which will proxy to Python backend
const API_BASE_URL = ""; // Empty string means same-origin requests

function getFullUrl(path: string): string {
  // If path already has a protocol, return as-is
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  
  // All /api routes now go through Node.js (same-origin)
  // Node.js will proxy non-auth routes to Python backend
  if (path.startsWith("/api")) {
    return path; // Same-origin request
  }
  
  // Otherwise, return the path as-is (for relative paths)
  return path;
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const fullUrl = getFullUrl(url);
  
  // Determine if we need to add auth token (for Python backend requests)
  const needsToken = !url.startsWith("/api/auth") && !url.startsWith("/api/login") && 
                     !url.startsWith("/api/logout") && !url.startsWith("/api/callback") && 
                     url.startsWith("/api");
  
  const headers: Record<string, string> = data ? { "Content-Type": "application/json" } : {};
  
  // Add JWT token for Python backend requests
  if (needsToken) {
    const token = await getAuthToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  const res = await fetch(fullUrl, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    let url = queryKey[0] as string;
    
    // Handle query parameters if the second element is an object
    if (queryKey.length > 1 && typeof queryKey[1] === 'object' && queryKey[1] !== null) {
      const params = new URLSearchParams();
      const queryParams = queryKey[1] as Record<string, string>;
      
      for (const [key, value] of Object.entries(queryParams)) {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      }
      
      if (params.toString()) {
        url += '?' + params.toString();
      }
    } else if (queryKey.length > 1) {
      // Fallback to join for non-object keys
      url = queryKey.join("/");
    }

    const fullUrl = getFullUrl(url);
    
    // Determine if we need to add auth token (for Python backend requests)
    const needsToken = !url.startsWith("/api/auth") && !url.startsWith("/api/login") && 
                       !url.startsWith("/api/logout") && !url.startsWith("/api/callback") && 
                       url.startsWith("/api");
    
    const headers: Record<string, string> = {};
    
    // Add JWT token for Python backend requests
    if (needsToken) {
      const token = await getAuthToken();
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
    }


    const res = await fetch(fullUrl, {
      headers,
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
