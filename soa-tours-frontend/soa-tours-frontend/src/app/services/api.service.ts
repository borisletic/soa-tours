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

export interface Blog {
  id: string;
  title: string;
  description: string;
  author_id: number;
  images: string[];
  likes: number[];
  comments: Comment[];
  created_at: string;
  updated_at: string;
}

export interface Comment {
  user_id: number;
  text: string;
  created_at: string;
  updated_at: string;
}

export interface CreateBlogRequest {
  title: string;
  description: string;
  images?: string[];
}

export interface UpdateBlogRequest {
  title?: string;
  description?: string;
  images?: string[];
}

export interface FollowResponse {
  message: string;
  following_id?: number;
  unfollowed_id?: number;
}

export interface FollowCheckResponse {
  is_following: boolean;
  target_user_id: number;
}

export interface FollowWithUser {
  id: number;
  follower_id: number;
  following_id: number;
  created_at: string;
  username: string;
  first_name: string;
  last_name: string;
}

export interface FollowingResponse {
  following: FollowWithUser[];
  count: number;
}

export interface FollowersResponse {
  followers: FollowWithUser[];
  count: number;
}

export interface CanCommentResponse {
  can_comment: boolean;
  reason: string;
  author_id: number;
}

// Tour interfaces
export interface CreateTourRequest {
  name: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  tags: string[];
}

export interface UpdateTourRequest {
  name?: string;
  description?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  price?: number;
  distance_km?: number;
  tags?: string[];
  status?: 'draft' | 'published' | 'archived';
}

export interface AddKeypointRequest {
  name: string;
  description: string;
  latitude: number;
  longitude: number;
  images: string[];
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

  // Blog API calls
  getBlogs(page: number = 1, limit: number = 10, userId?: number): Observable<{blogs: Blog[], pagination: any}> {
    const currentUserId = userId || this.getCurrentUserId();
    const headers = new HttpHeaders({
      'X-User-ID': currentUserId.toString()
    });
    return this.http.get<{blogs: Blog[], pagination: any}>(`${this.CONTENT_API}/blogs?page=${page}&limit=${limit}`, { headers });
  }

  getBlogById(id: string): Observable<{blog: Blog}> {
    return this.http.get<{blog: Blog}>(`${this.CONTENT_API}/blogs/${id}`);
  }

  createBlog(data: CreateBlogRequest, userId?: number): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      ...(userId && { 'X-User-ID': userId.toString() })
    });
    
    return this.http.post(`${this.CONTENT_API}/blogs`, data, { headers });
  }

  updateBlog(id: string, data: UpdateBlogRequest, userId?: number): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      ...(userId && { 'X-User-ID': userId.toString() })
    });
    
    return this.http.put(`${this.CONTENT_API}/blogs/${id}`, data, { headers });
  }

  deleteBlog(id: string, userId?: number): Observable<any> {
    const headers = new HttpHeaders({
      ...(userId && { 'X-User-ID': userId.toString() })
    });
    
    return this.http.delete(`${this.CONTENT_API}/blogs/${id}`, { headers });
  }

  likeBlog(id: string, userId?: number): Observable<any> {
    const currentUserId = userId || this.getCurrentUserId();
    const headers = new HttpHeaders({ 'X-User-ID': currentUserId.toString() });
    return this.http.post(`${this.CONTENT_API}/blogs/${id}/like`, {}, { headers });
  }

  unlikeBlog(id: string, userId?: number): Observable<any> {
    const currentUserId = userId || this.getCurrentUserId();
    const headers = new HttpHeaders({ 'X-User-ID': currentUserId.toString() });
    return this.http.delete(`${this.CONTENT_API}/blogs/${id}/like`, { headers });
  }

  addComment(blogId: string, text: string, userId?: number): Observable<any> {
  const currentUserId = userId || this.getCurrentUserId();
  const headers = new HttpHeaders({ 
    'Content-Type': 'application/json',
    'X-User-ID': currentUserId.toString() 
  });
  return this.http.post(`${this.CONTENT_API}/blogs/${blogId}/comments`, { text }, { headers });

  
}

 

  // Commerce API calls
  getCommerceHealth(): Observable<any> {
    return this.http.get(`${this.COMMERCE_API}/health`);
  }

  getCart(): Observable<any> {
    return this.http.get(`${this.COMMERCE_API}/cart`);
  }

  // Tour methods
createTour(data: CreateTourRequest, userId?: number): Observable<any> {
  const currentUserId = userId || this.getCurrentUserId();
  const headers = new HttpHeaders({
    'Content-Type': 'application/json',
    'X-User-ID': currentUserId.toString()
  });
  return this.http.post(`${this.CONTENT_API}/tours`, data, { headers });
}

getTours(authorId?: number): Observable<any> {
  let url = `${this.CONTENT_API}/tours`;
  if (authorId) {
    url += `?author_id=${authorId}`;
  }
  const headers = new HttpHeaders({
    'X-User-ID': (authorId || this.getCurrentUserId()).toString()
  });
  return this.http.get(url, { headers });
}

getTourById(id: string): Observable<any> {
  return this.http.get(`${this.CONTENT_API}/tours/${id}`);
}

updateTour(id: string, data: UpdateTourRequest, userId?: number): Observable<any> {
  const currentUserId = userId || this.getCurrentUserId();
  const headers = new HttpHeaders({
    'Content-Type': 'application/json',
    'X-User-ID': currentUserId.toString()
  });
  return this.http.put(`${this.CONTENT_API}/tours/${id}`, data, { headers });
}

addKeypoint(tourId: string, data: AddKeypointRequest, userId?: number): Observable<any> {
  const currentUserId = userId || this.getCurrentUserId();
  const headers = new HttpHeaders({
    'Content-Type': 'application/json',
    'X-User-ID': currentUserId.toString()
  });
  return this.http.post(`${this.CONTENT_API}/tours/${tourId}/keypoints`, data, { headers });
}

removeKeypoint(tourId: string, order: number, userId?: number): Observable<any> {
  const currentUserId = userId || this.getCurrentUserId();
  const headers = new HttpHeaders({
    'X-User-ID': currentUserId.toString()
  });
  return this.http.delete(`${this.CONTENT_API}/tours/${tourId}/keypoints/${order}`, { headers });
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

  // Follow functionality
  followUser(userId: number, currentUserId: number = 1): Observable<FollowResponse> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'X-User-ID': currentUserId.toString()
    });
    return this.http.post<FollowResponse>(`${this.STAKEHOLDERS_API}/follow/${userId}`, {}, { headers });
  }

  unfollowUser(userId: number, currentUserId: number = 1): Observable<FollowResponse> {
    const headers = new HttpHeaders({
      'X-User-ID': currentUserId.toString()
    });
    return this.http.delete<FollowResponse>(`${this.STAKEHOLDERS_API}/follow/${userId}`, { headers });
  }

  checkFollowing(userId: number, currentUserId: number = 1): Observable<FollowCheckResponse> {
    const headers = new HttpHeaders({
      'X-User-ID': currentUserId.toString()
    });
    return this.http.get<FollowCheckResponse>(`${this.STAKEHOLDERS_API}/follow/check/${userId}`, { headers });
  }

  getFollowing(currentUserId: number = 1): Observable<FollowingResponse> {
    const headers = new HttpHeaders({
      'X-User-ID': currentUserId.toString()
    });
    return this.http.get<FollowingResponse>(`${this.STAKEHOLDERS_API}/following`, { headers });
  }

  getFollowers(currentUserId: number = 1): Observable<FollowersResponse> {
    const headers = new HttpHeaders({
      'X-User-ID': currentUserId.toString()
    });
    return this.http.get<FollowersResponse>(`${this.STAKEHOLDERS_API}/followers`, { headers });
  }

  canComment(authorId: number, currentUserId: number = 1): Observable<CanCommentResponse> {
    const headers = new HttpHeaders({
      'X-User-ID': currentUserId.toString()
    });
    return this.http.get<CanCommentResponse>(`${this.STAKEHOLDERS_API}/can-comment/${authorId}`, { headers });
  }

  // Enhanced blog functionality with follow checking
  getRealBlogs(currentUserId: number = 1): Observable<{blogs: Blog[], pagination: any}> {
    const headers = new HttpHeaders({
      'X-User-ID': currentUserId.toString()
    });
    return this.http.get<{blogs: Blog[], pagination: any}>(`${this.CONTENT_API}/blogs`, { headers });
  }

  addCommentWithFollowCheck(blogId: string, text: string, currentUserId: number = 1): Observable<any> {
    const headers = new HttpHeaders({ 
      'Content-Type': 'application/json',
      'X-User-ID': currentUserId.toString() 
    });
    return this.http.post(`${this.CONTENT_API}/blogs/${blogId}/comments`, { text }, { headers });
  }

  // Utility methods for follow system
  getCurrentUserId(): number {
    const user = this.getCurrentUser();
    return user?.id || 1; // Fallback to user ID 1 for testing
  }

  isFollowing(userId: number, followingList: number[]): boolean {
    return followingList.includes(userId);
  }

  canUserComment(authorId: number, currentUserId?: number, followingList?: number[]): boolean {
    const userId = currentUserId || this.getCurrentUserId();
    const following = followingList || [];
    
    // User can always comment on their own blog
    if (userId === authorId) {
      return true;
    }
    
    // User can comment if they follow the author
    return following.includes(authorId);
  }
}