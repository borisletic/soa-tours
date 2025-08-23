import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-navigation',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <nav class="navbar navbar-expand-lg navbar-dark bg-primary shadow">
      <div class="container">
        <a class="navbar-brand" routerLink="/">
          <i class="fas fa-map-marked-alt me-2"></i>
          SOA Tours
        </a>
        
        <button 
          class="navbar-toggler" 
          type="button" 
          data-bs-toggle="collapse" 
          data-bs-target="#navbarNav"
          (click)="toggleMobileMenu()"
        >
          <span class="navbar-toggler-icon"></span>
        </button>
        
        <div class="collapse navbar-collapse" id="navbarNav" [class.show]="showMobileMenu()">
          <ul class="navbar-nav me-auto">
            <li class="nav-item">
              <a class="nav-link" routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}">
                <i class="fas fa-tachometer-alt me-1"></i>
                Dashboard
              </a>
            </li>
            <li class="nav-item">
              <a class="nav-link" routerLink="/users" routerLinkActive="active">
                <i class="fas fa-users me-1"></i>
                Korisnici
              </a>
            </li>
            <li class="nav-item">
            <a class="nav-link" routerLink="/blogs" routerLinkActive="active">
              <i class="fas fa-blog me-1"></i>
              Blogovi
            </a>
          </li>
          <li class="nav-item">
            <a class="nav-link" routerLink="/follow" routerLinkActive="active">
              <i class="fas fa-users me-1"></i>
              Follow System
            </a>
          </li>
          <li class="nav-item">
            <a class="nav-link" routerLink="/enhanced-blogs" routerLinkActive="active">
              <i class="fas fa-blog me-1"></i>
              Enhanced Blogs
            </a>
          </li>
          <li class="nav-item">
            <a class="nav-link" routerLink="/create-tour" routerLinkActive="active">
              <i class="fas fa-plus me-1"></i>
              Create Tour
            </a>
          </li>
          <li class="nav-item">
            <a class="nav-link" routerLink="/my-tours" routerLinkActive="active">
              <i class="fas fa-route me-1"></i>
              My Tours
            </a>
          </li>
          <li class="nav-item">
            <a class="nav-link" routerLink="/position-simulator" routerLinkActive="active">
              <i class="fas fa-location-arrow me-1"></i>
              Position Simulator
            </a>
          </li>
          <li class="nav-item">
            <a class="nav-link text-white" href="/tours">
              <i class="fas fa-route me-1"></i>
              Tours
            </a>
          </li>
          <li class="nav-item">
            <a class="nav-link text-white" href="/cart">
              <i class="fas fa-shopping-cart me-1"></i>
              Cart
            </a>
          </li>
          <li class="nav-item">
            <a class="nav-link text-white" href="/purchases">
              <i class="fas fa-receipt me-1"></i>
              Purchases
            </a>
          </li>
          </ul>
          
          <ul class="navbar-nav">
            <!-- Service Status Indicator -->
            <li class="nav-item dropdown me-3">
              <a 
                class="nav-link dropdown-toggle" 
                href="#" 
                id="servicesDropdown" 
                role="button" 
                data-bs-toggle="dropdown"
                (click)="toggleServicesDropdown()"
              >
                <i class="fas fa-server me-1" [class]="getServicesStatusClass()"></i>
                Servisi
              </a>
              <ul class="dropdown-menu" [class.show]="showServicesDropdown()">
                <li *ngFor="let service of services()">
                  <span class="dropdown-item">
                    <i class="fas fa-circle me-2" [class]="service.status ? 'text-success' : 'text-danger'"></i>
                    {{ service.name }}
                  </span>
                </li>
              </ul>
            </li>
            
            <!-- User Menu -->
            <ng-container *ngIf="!isLoggedIn()">
              <li class="nav-item">
                <a class="nav-link" routerLink="/login">
                  <i class="fas fa-sign-in-alt me-1"></i>
                  Prijava
                </a>
              </li>
              <li class="nav-item">
                <a class="nav-link" routerLink="/register">
                  <i class="fas fa-user-plus me-1"></i>
                  Registracija
                </a>
              </li>
            </ng-container>
            
            <ng-container *ngIf="isLoggedIn()">
              <li class="nav-item dropdown">
                <a 
                  class="nav-link dropdown-toggle" 
                  href="#" 
                  id="userDropdown" 
                  role="button" 
                  data-bs-toggle="dropdown"
                  (click)="toggleUserDropdown()"
                >
                  <i [class]="getUserIcon()"></i>
                  {{ getCurrentUser()?.username }}
                </a>
                <ul class="dropdown-menu dropdown-menu-end" [class.show]="showUserDropdown()">
                  <li>
                    <a class="dropdown-item" [routerLink]="['/profile', getCurrentUser()?.id]">
                      <i class="fas fa-user me-2"></i>
                      Moj profil
                    </a>
                  </li>
                  <li *ngIf="isAdmin()">
                    <a class="dropdown-item" routerLink="/admin">
                      <i class="fas fa-cogs me-2"></i>
                      Admin panel
                    </a>
                  </li>
                  <li><hr class="dropdown-divider"></li>
                  <li>
                    <a class="dropdown-item" href="#" (click)="logout()">
                      <i class="fas fa-sign-out-alt me-2"></i>
                      Odjava
                    </a>
                  </li>
                </ul>
              </li>
            </ng-container>
          </ul>
        </div>
      </div>
    </nav>
  `,
  styles: [`
    .navbar-brand {
      font-weight: bold;
      font-size: 1.5rem;
    }
    
    .nav-link {
      transition: all 0.3s ease;
    }
    
    .nav-link:hover {
      background-color: rgba(255, 255, 255, 0.1);
      border-radius: 0.375rem;
    }
    
    .nav-link.active {
      background-color: rgba(255, 255, 255, 0.2);
      border-radius: 0.375rem;
    }
    
    .dropdown-menu {
      border: none;
      box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15);
      border-radius: 0.5rem;
    }
    
    .dropdown-item {
      transition: all 0.2s ease;
    }
    
    .dropdown-item:hover {
      background-color: #f8f9fa;
      transform: translateX(5px);
    }
    
    .fa-circle {
      font-size: 0.6rem;
    }
    
    @media (max-width: 991.98px) {
      .navbar-collapse {
        background-color: rgba(0, 0, 0, 0.1);
        border-radius: 0.5rem;
        margin-top: 0.5rem;
        padding: 1rem;
      }
    }
  `]
})
export class NavigationComponent {
  showMobileMenu = signal(false);
  showServicesDropdown = signal(false);
  showUserDropdown = signal(false);
  
  servicesStatus = computed(() => this.apiService.servicesStatus());
  
  services = computed(() => [
    {
      name: 'API Gateway',
      status: this.servicesStatus().gateway
    },
    {
      name: 'Stakeholders',
      status: this.servicesStatus().stakeholders
    },
    {
      name: 'Content',
      status: this.servicesStatus().content
    },
    {
      name: 'Commerce',
      status: this.servicesStatus().commerce
    }
  ]);

  constructor(
    private apiService: ApiService,
    private router: Router
  ) {}

  toggleMobileMenu(): void {
    this.showMobileMenu.update(show => !show);
  }

  toggleServicesDropdown(): void {
    this.showServicesDropdown.update(show => !show);
    this.showUserDropdown.set(false);
  }

  toggleUserDropdown(): void {
    this.showUserDropdown.update(show => !show);
    this.showServicesDropdown.set(false);
  }

  getServicesStatusClass(): string {
    const status = this.servicesStatus();
    const healthyCount = Object.values(status).filter(Boolean).length;
    
    if (healthyCount === 4) {
      return 'text-success';
    } else if (healthyCount >= 2) {
      return 'text-warning';
    } else {
      return 'text-danger';
    }
  }

  isLoggedIn(): boolean {
    return this.apiService.isLoggedIn();
  }

  isAdmin(): boolean {
    return this.apiService.isAdmin();
  }

  getCurrentUser(): any {
    return this.apiService.getCurrentUser();
  }

  getUserIcon(): string {
    const user = this.getCurrentUser();
    if (!user) return 'fas fa-user';
    
    const iconMap = {
      admin: 'fas fa-crown',
      guide: 'fas fa-map-signs',
      tourist: 'fas fa-camera'
    };
    
    return iconMap[user.role as keyof typeof iconMap] || 'fas fa-user';
  }

  logout(): void {
    this.apiService.logout();
    this.router.navigate(['/']);
    this.showUserDropdown.set(false);
  }
}