import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-header',
  imports: [CommonModule, RouterModule],
  template: `
    <nav class="navbar navbar-expand-lg navbar-dark bg-dark fixed-top">
      <div class="container-fluid">
        <a class="navbar-brand" routerLink="/">
          <i class="fas fa-map-marked-alt me-2"></i>
          SOA Tours
        </a>
        
        <div class="navbar-nav d-flex flex-row">
          <a class="nav-link me-3" routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}">
            <i class="fas fa-tachometer-alt me-1"></i>Dashboard
          </a>
          <a class="nav-link me-3" routerLink="/users" routerLinkActive="active">
            <i class="fas fa-users me-1"></i>Users
          </a>
          <a class="nav-link me-3" routerLink="/blogs" routerLinkActive="active">
            <i class="fas fa-blog me-1"></i>Blogs
          </a>
          <a class="nav-link me-3" routerLink="/tours" routerLinkActive="active">
            <i class="fas fa-route me-1"></i>Tours
          </a>
          <a class="nav-link" routerLink="/cart" routerLinkActive="active">
            <i class="fas fa-shopping-cart me-1"></i>Cart
          </a>
        </div>
      </div>
    </nav>
  `,
  styles: [`
    .navbar-brand {
      font-size: 1.5rem;
      font-weight: bold;
    }
    .nav-link:hover {
      color: #ffc107 !important;
    }
  `]
})
export class HeaderComponent {}