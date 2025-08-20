import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ServiceStatus {
  gateway: boolean;
  stakeholders: boolean;
  content: boolean;
  commerce: boolean;
}

export interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  is_blocked: boolean;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: number;
  user_id: number;
  first_name: string;
  last_name: string;
  profile_image: string;
  biography: string;
  motto: string;
  created_at: string;
  updated_at: string;
}

export interface UserWithProfile {
  id: number;
  username: string;
  email: string;
  role: string;
  is_blocked: boolean;
  created_at: string;
  updated_at: string;
  profile?: Profile;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  role: 'guide' | 'tourist';
  first_name?: string;
  last_name?: string;
  biography?: string;
  motto?: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  message: string;
  user: {
    id: number;
    username: string;
    email: string;
    role: string;
  };
}

export interface UpdateProfileRequest {
  first_name?: string;
  last_name?: string;
  profile_image?: string;
  biography?: string;
  motto?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private readonly API_BASE = 'http://localhost:8080';
  private readonly STAKEHOLDERS_API = 'http://localhost:8081';
  private readonly CONTENT_API = 'http://localhost:8082';
  private readonly COMMERCE_API = 'http://localhost:8083';

  // Angular Signal for reactive service status
  public servicesStatus = signal<ServiceStatus>({
    gateway: false,
    stakeholders: false,
    content: false,
    commerce: false
  });

  constructor(private http: HttpClient) {
    this.checkServicesHealth();
  }

  private httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json'
    })
  };

  // Health Checks
  checkServicesHealth(): void {
    const services = [
      { name: 'gateway' as keyof ServiceStatus, url: `${this.API_BASE}/health` },
      { name: 'stakeholders' as keyof ServiceStatus, url: `${this.STAKEHOLDERS_API}/health` },
      { name: 'content' as keyof ServiceStatus, url: `${this.CONTENT_API}/health` },
      { name: 'commerce' as keyof ServiceStatus, url: `${this.COMMERCE_API}/health` }
    ];

    services.forEach(service => {
      this.http.get(service.url).subscribe({
        next: () => {
          this.servicesStatus.update(status => ({
            ...status,
            [service.name]: true
          }));
        },
        error: () => {
          this.servicesStatus.update(status => ({
            ...status,
            [service.name]: false
          }));
        }
      });
    });
  }

  // Gateway API calls
  getGatewayStatus(): Observable<any> {
    return this.http.get(`${this.API_BASE}/health`);
  }

  // Authentication API calls
  register(data: RegisterRequest): Observable<any> {
    return this.http.post(`${this.STAKEHOLDERS_API}/auth/register`, data, this.httpOptions);
  }

  login(data: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.STAKEHOLDERS_API}/auth/login`, data, this.httpOptions);
  }

  // User API calls
  getUsers(): Observable<{users: UserWithProfile[], count: number}> {
    return this.http.get<{users: UserWithProfile[], count: number}>(`${this.STAKEHOLDERS_API}/users`);
  }

  getUserById(id: number): Observable<{user: UserWithProfile}> {
    return this.http.get<{user: UserWithProfile}>(`${this.STAKEHOLDERS_API}/users/${id}`);
  }

  getUserHealth(): Observable<any> {
    return this.http.get(`${this.STAKEHOLDERS_API}/health`);
  }

  // Profile API calls
  getUserProfile(userId: number): Observable<{profile: Profile}> {
    return this.http.get<{profile: Profile}>(`${this.STAKEHOLDERS_API}/users/${userId}/profile`);
  }

  updateUserProfile(userId: number, data: UpdateProfileRequest): Observable<any> {
    return this.http.put(`${this.STAKEHOLDERS_API}/users/${userId}/profile`, data, this.httpOptions);
  }

  getProfiles(): Observable<{profiles: any[], count: number}> {
    return this.http.get<{profiles: any[], count: number}>(`${this.STAKEHOLDERS_API}/profiles`);
  }

  // Content API calls
  getContentHealth(): Observable<any> {
    return this.http.get(`${this.CONTENT_API}/health`);
  }

  getBlogs(): Observable<any> {
    return this.http.get(`${this.CONTENT_API}/blogs`);
  }

  getTours(): Observable<any> {
    return this.http.get(`${this.CONTENT_API}/tours`);
  }

  // Commerce API calls
  getCommerceHealth(): Observable<any> {
    return this.http.get(`${this.COMMERCE_API}/health`);
  }

  getCart(): Observable<any> {
    return this.http.get(`${this.COMMERCE_API}/cart`);
  }

  // Test all endpoints
  testAllEndpoints(): Observable<any[]> {
    const endpoints = [
      this.getGatewayStatus(),
      this.getUserHealth(),
      this.getUsers(),
      this.getContentHealth(),
      this.getBlogs(),
      this.getTours(),
      this.getCommerceHealth(),
      this.getCart()
    ];

    return new Observable(observer => {
      const results: any[] = [];
      let completed = 0;

      endpoints.forEach((endpoint, index) => {
        endpoint.subscribe({
          next: (data) => {
            results[index] = { success: true, data };
            completed++;
            if (completed === endpoints.length) {
              observer.next(results);
              observer.complete();
            }
          },
          error: (error) => {
            results[index] = { success: false, error: error.message };
            completed++;
            if (completed === endpoints.length) {
              observer.next(results);
              observer.complete();
            }
          }
        });
      });
    });
  }

  // User management utilities
  getCurrentUser(): User | null {
    const userStr = localStorage.getItem('currentUser');
    return userStr ? JSON.parse(userStr) : null;
  }

  isLoggedIn(): boolean {
    return this.getCurrentUser() !== null;
  }

  isAdmin(): boolean {
    const user = this.getCurrentUser();
    return user?.role === 'admin';
  }

  isGuide(): boolean {
    const user = this.getCurrentUser();
    return user?.role === 'guide';
  }

  isTourist(): boolean {
    const user = this.getCurrentUser();
    return user?.role === 'tourist';
  }

  logout(): void {
    localStorage.removeItem('currentUser');
  }
}