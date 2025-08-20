import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';

interface Service {
  name: string;
  description: string;
  icon: string;
  status: boolean;
  port: number;
}

interface Endpoint {
  method: string;
  url: string;
  status: boolean;
}

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule],
  template: `
    <div class="container-fluid">
      <div class="row">
        <div class="col-12">
          <div class="hero-section text-center text-white py-5 mb-4">
            <h1 class="display-4 fw-bold mb-3">
              <i class="fas fa-map-marked-alt me-3"></i>
              SOA Tours
            </h1>
            <p class="lead">Microservices-Based Tourist Platform</p>
            <p class="fs-5">Service-Oriented Architecture Project - Angular 20</p>
          </div>
        </div>
      </div>

      <div class="row g-4 mb-4">
        <div class="col-md-3" *ngFor="let service of services()">
          <div class="card h-100 service-card" 
               [class.service-online]="service.status" 
               [class.service-offline]="!service.status">
            <div class="card-body text-center">
              <i [class]="service.icon + ' fa-3x mb-3'"></i>
              <h5 class="card-title">{{service.name}}</h5>
              <p class="card-text">{{service.description}}</p>
              <div class="status-indicator mb-3">
                <span [class]="'badge ' + (service.status ? 'bg-success' : 'bg-danger')">
                  {{service.status ? 'Online' : 'Offline'}}
                </span>
              </div>
              <button class="btn btn-primary btn-sm" 
                      (click)="testService(service)" 
                      [disabled]="testing()">
                <i class="fas fa-heartbeat me-1"></i>
                {{testing() ? 'Testing...' : 'Test Health'}}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="row g-4 mb-4">
        <div class="col-md-6">
          <div class="card feature-card">
            <div class="card-body">
              <h5 class="card-title">
                <i class="fas fa-cogs me-2"></i>
                Architecture Features
              </h5>
              <ul class="list-unstyled">
                <li><i class="fas fa-check-circle text-success me-2"></i>Microservices Architecture</li>
                <li><i class="fas fa-check-circle text-success me-2"></i>Docker Containerization</li>
                <li><i class="fas fa-check-circle text-success me-2"></i>API Gateway Pattern</li>
                <li><i class="fas fa-check-circle text-success me-2"></i>MySQL Database (Relational)</li>
                <li><i class="fas fa-check-circle text-success me-2"></i>MongoDB Database (NoSQL)</li>
                <li><i class="fas fa-check-circle text-success me-2"></i>RESTful APIs</li>
                <li><i class="fas fa-check-circle text-success me-2"></i>Angular 20 Frontend</li>
                <li><i class="fas fa-clock text-warning me-2"></i>gRPC Communication (Planned)</li>
              </ul>
            </div>
          </div>
        </div>

        <div class="col-md-6">
          <div class="card feature-card">
            <div class="card-body">
              <h5 class="card-title">
                <i class="fas fa-network-wired me-2"></i>
                Service Endpoints
              </h5>
              <div class="endpoint-list">
                <div class="endpoint-item mb-2" *ngFor="let endpoint of endpoints()">
                  <span class="badge bg-info me-2">{{endpoint.method}}</span>
                  <code>{{endpoint.url}}</code>
                  <span class="float-end">
                    <span [class]="'badge ' + (endpoint.status ? 'bg-success' : 'bg-secondary')">
                      {{endpoint.status ? 'Active' : 'Unknown'}}
                    </span>
                  </span>
                </div>
              </div>
              <button class="btn btn-outline-primary btn-sm mt-3" 
                      (click)="testAllEndpoints()" 
                      [disabled]="testing()">
                <i class="fas fa-vial me-1"></i>
                {{testing() ? 'Testing All...' : 'Test All Endpoints'}}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="row" *ngIf="testResults().length > 0">
        <div class="col-12">
          <div class="card">
            <div class="card-body">
              <h5 class="card-title">
                <i class="fas fa-clipboard-list me-2"></i>
                Test Results
              </h5>
              <div class="test-results">
                <div class="alert" 
                     *ngFor="let result of testResults(); let i = index" 
                     [class.alert-success]="!result.error" 
                     [class.alert-danger]="result.error">
                  <strong>Test {{i + 1}}:</strong> 
                  {{result.error ? 'Failed - ' + result.error : 'Success - ' + (result | json)}}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .hero-section {
      background: rgba(0, 0, 0, 0.1);
      border-radius: 15px;
      backdrop-filter: blur(10px);
    }

    .service-card {
      transition: transform 0.3s ease, box-shadow 0.3s ease;
      border: none;
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(10px);
    }

    .service-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
    }

    .service-online {
      border-left: 4px solid #28a745;
    }

    .service-offline {
      border-left: 4px solid #dc3545;
    }

    .feature-card {
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(10px);
      border: none;
      height: 100%;
    }

    .endpoint-item {
      padding: 8px;
      background: rgba(248, 249, 250, 0.5);
      border-radius: 5px;
      font-family: monospace;
      font-size: 0.9rem;
    }

    .test-results {
      max-height: 300px;
      overflow-y: auto;
    }

    code {
      color: #0d6efd;
    }
  `]
})
export class DashboardComponent implements OnInit {
  // Angular 20 signals
  testing = signal(false);
  testResults = signal<any[]>([]);
  
  // Computed signals for reactive UI
  servicesStatus = computed(() => this.apiService.servicesStatus());
  
  services = computed(() => [
    {
      name: 'API Gateway',
      description: 'Central entry point for all requests',
      icon: 'fas fa-door-open text-primary',
      status: this.servicesStatus().gateway,
      port: 8080
    },
    {
      name: 'Stakeholders',
      description: 'User management and authentication',
      icon: 'fas fa-users text-success',
      status: this.servicesStatus().stakeholders,
      port: 8081
    },
    {
      name: 'Content',
      description: 'Blogs and tours management',
      icon: 'fas fa-newspaper text-info',
      status: this.servicesStatus().content,
      port: 8082
    },
    {
      name: 'Commerce',
      description: 'Shopping cart and payments',
      icon: 'fas fa-shopping-cart text-warning',
      status: this.servicesStatus().commerce,
      port: 8083
    }
  ]);

  endpoints = signal<Endpoint[]>([
    { method: 'GET', url: 'localhost:8080/health', status: false },
    { method: 'GET', url: 'localhost:8081/health', status: false },
    { method: 'GET', url: 'localhost:8081/users', status: false },
    { method: 'GET', url: 'localhost:8082/health', status: false },
    { method: 'GET', url: 'localhost:8082/blogs', status: false },
    { method: 'GET', url: 'localhost:8082/tours', status: false },
    { method: 'GET', url: 'localhost:8083/health', status: false },
    { method: 'GET', url: 'localhost:8083/cart', status: false }
  ]);

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    // Services status is automatically reactive through computed signals
  }

  testService(service: Service): void {
    this.testing.set(true);
    console.log(`Testing ${service.name} service...`);
    
    setTimeout(() => {
      this.testing.set(false);
    }, 1000);
  }

  testAllEndpoints(): void {
    this.testing.set(true);
    this.testResults.set([]);

    this.apiService.testAllEndpoints().subscribe({
      next: (results) => {
        this.testResults.set(results);
        this.testing.set(false);
        
        // Update endpoint statuses
        this.endpoints.update(endpoints => 
          endpoints.map((endpoint, index) => ({
            ...endpoint,
            status: !results[index]?.error
          }))
        );
      },
      error: (error) => {
        console.error('Testing failed:', error);
        this.testing.set(false);
      }
    });
  }
}