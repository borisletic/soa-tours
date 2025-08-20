import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ServiceStatus {
  gateway: boolean;
  stakeholders: boolean;
  content: boolean;
  commerce: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private readonly API_BASE = 'http://localhost:8080';
  private readonly STAKEHOLDERS_API = 'http://localhost:8081';
  private readonly CONTENT_API = 'http://localhost:8082';
  private readonly COMMERCE_API = 'http://localhost:8083';

  // Angular 20 Signal for reactive service status
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

  // Stakeholders API calls
  getUsers(): Observable<any> {
    return this.http.get(`${this.STAKEHOLDERS_API}/users`);
  }

  getUserHealth(): Observable<any> {
    return this.http.get(`${this.STAKEHOLDERS_API}/health`);
  }

  // Content API calls
  getBlogs(): Observable<any> {
    return this.http.get(`${this.CONTENT_API}/blogs`);
  }

  getTours(): Observable<any> {
    return this.http.get(`${this.CONTENT_API}/tours`);
  }

  getContentHealth(): Observable<any> {
    return this.http.get(`${this.CONTENT_API}/health`);
  }

  // Commerce API calls
  getCart(): Observable<any> {
    return this.http.get(`${this.COMMERCE_API}/cart`);
  }

  getCommerceHealth(): Observable<any> {
    return this.http.get(`${this.COMMERCE_API}/health`);
  }

  // Test all endpoints
  testAllEndpoints(): Observable<any[]> {
    const endpoints = [
      this.getGatewayStatus(),
      this.getUserHealth(),
      this.getContentHealth(),
      this.getCommerceHealth(),
      this.getUsers(),
      this.getBlogs(),
      this.getTours(),
      this.getCart()
    ];

    return new Observable(observer => {
      Promise.all(endpoints.map(endpoint =>
        endpoint.toPromise().catch(err => ({ error: err.message }))
      )).then(results => {
        observer.next(results);
        observer.complete();
      });
    });
  }
}