// soa-tours-frontend/src/app/components/purchases/purchases.component.ts
import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ApiService, PurchaseToken } from '../../services/api.service';

@Component({
  selector: 'app-purchases',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="container mt-4">
      <!-- Header -->
      <div class="row mb-4">
        <div class="col-12">
          <h2 class="text-white mb-3">
            <i class="fas fa-receipt me-2"></i>
            My Purchases
          </h2>
          <nav aria-label="breadcrumb">
            <ol class="breadcrumb">
              <li class="breadcrumb-item">
                <a href="/" class="text-light">Home</a>
              </li>
              <li class="breadcrumb-item active text-white-50" aria-current="page">
                My Purchases
              </li>
            </ol>
          </nav>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="loading()" class="text-center">
        <div class="spinner-border text-light" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
        <p class="text-white mt-2">Loading your purchases...</p>
      </div>

      <!-- Error State -->
      <div *ngIf="error()" class="alert alert-danger">
        <i class="fas fa-exclamation-triangle me-2"></i>
        {{error()}}
      </div>

      <!-- Purchases Content -->
      <div *ngIf="!loading() && !error()">
        
        <!-- No Purchases -->
        <div *ngIf="purchases().length === 0" class="card">
          <div class="card-body text-center py-5">
            <i class="fas fa-receipt fa-4x text-muted mb-3"></i>
            <h4>No purchases yet</h4>
            <p class="text-muted">You haven't purchased any tours yet. Browse our collection and find your perfect adventure!</p>
            <button 
              class="btn btn-primary me-2"
              (click)="browseTours()">
              <i class="fas fa-route me-2"></i>
              Browse Tours
            </button>
            <button 
              class="btn btn-outline-secondary"
              (click)="viewCart()">
              <i class="fas fa-shopping-cart me-2"></i>
              View Cart
            </button>
          </div>
        </div>

        <!-- Purchases List -->
        <div *ngIf="purchases().length > 0">
          <div class="row mb-3">
            <div class="col-12">
              <div class="d-flex justify-content-between align-items-center">
                <p class="text-white mb-0">
                  <i class="fas fa-info-circle me-2"></i>
                  You have purchased {{purchases().length}} tour(s)
                </p>
                <div>
                  <button 
                    class="btn btn-outline-light btn-sm me-2"
                    (click)="loadPurchases()">
                    <i class="fas fa-sync-alt me-1"></i>
                    Refresh
                  </button>
                  <button 
                    class="btn btn-primary btn-sm"
                    (click)="browseTours()">
                    <i class="fas fa-plus me-1"></i>
                    Buy More Tours
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div class="row">
            <div 
              *ngFor="let purchase of purchases()" 
              class="col-lg-6 col-xl-4 mb-4">
              
              <div class="card h-100">
                <div class="card-header bg-success text-white">
                  <div class="d-flex justify-content-between align-items-center">
                    <h6 class="mb-0">
                      <i class="fas fa-ticket-alt me-2"></i>
                      Purchase Token
                    </h6>
                    <span class="badge bg-light text-success">
                      <i class="fas fa-check me-1"></i>
                      Active
                    </span>
                  </div>
                </div>

                <div class="card-body">
                  <div class="mb-3">
                    <label class="form-label small text-muted">Tour ID:</label>
                    <div class="font-monospace small bg-light p-2 rounded">
                      {{purchase.tour_id}}
                    </div>
                  </div>

                  <div class="mb-3">
                    <label class="form-label small text-muted">Purchase Token:</label>
                    <div class="font-monospace small bg-light p-2 rounded text-truncate">
                      {{purchase.token}}
                    </div>
                  </div>

                  <div class="mb-3">
                    <label class="form-label small text-muted">Purchased:</label>
                    <div class="small">
                      <i class="fas fa-calendar-alt me-1"></i>
                      {{formatDate(purchase.purchased_at)}}
                    </div>
                  </div>

                  <div *ngIf="purchase.expires_at" class="mb-3">
                    <label class="form-label small text-muted">Expires:</label>
                    <div class="small text-warning">
                      <i class="fas fa-clock me-1"></i>
                      {{formatDate(purchase.expires_at)}}
                    </div>
                  </div>
                </div>

                <div class="card-footer">
                  <div class="d-grid gap-2">
                    <button 
                      class="btn btn-primary btn-sm"
                      (click)="viewTourDetails(purchase.tour_id)">
                      <i class="fas fa-eye me-1"></i>
                      View Tour Details
                    </button>
                    <button 
                      class="btn btn-outline-success btn-sm"
                      (click)="startTour(purchase.tour_id)">
                      <i class="fas fa-play me-1"></i>
                      Start Tour
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Purchase Statistics -->
      <div *ngIf="purchases().length > 0" class="row mt-4">
        <div class="col-12">
          <div class="card bg-dark text-white">
            <div class="card-body">
              <h5 class="card-title">
                <i class="fas fa-chart-bar me-2"></i>
                Purchase Statistics
              </h5>
              <div class="row text-center">
                <div class="col-md-3">
                  <div class="stat-item">
                    <h3 class="text-primary">{{purchases().length}}</h3>
                    <small class="text-muted">Total Tours Purchased</small>
                  </div>
                </div>
                <div class="col-md-3">
                  <div class="stat-item">
                    <h3 class="text-success">{{getActivePurchases()}}</h3>
                    <small class="text-muted">Active Purchases</small>
                  </div>
                </div>
                <div class="col-md-3">
                  <div class="stat-item">
                    <h3 class="text-info">{{getRecentPurchases()}}</h3>
                    <small class="text-muted">This Month</small>
                  </div>
                </div>
                <div class="col-md-3">
                  <div class="stat-item">
                    <h3 class="text-warning">{{getUniqueMonths()}}</h3>
                    <small class="text-muted">Months Active</small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .stat-item h3 {
      font-size: 2rem;
      font-weight: bold;
      margin-bottom: 0.25rem;
    }
    
    .card-footer .btn {
      font-size: 0.875rem;
    }
    
    .font-monospace {
      font-family: 'Courier New', monospace;
    }
  `]
})
export class PurchasesComponent implements OnInit {
  loading = signal(false);
  error = signal<string | null>(null);
  purchases = signal<PurchaseToken[]>([]);

  constructor(
    private apiService: ApiService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadPurchases();
  }

  loadPurchases(): void {
    this.loading.set(true);
    this.error.set(null);

    this.apiService.getPurchases().subscribe({
      next: (response) => {
        this.purchases.set(response.purchases);
        this.loading.set(false);
      },
      error: (error) => {
        this.error.set(error.error?.error || 'Failed to load purchases');
        this.loading.set(false);
      }
    });
  }

  viewTourDetails(tourId: string): void {
    this.router.navigate(['/tours', tourId]);
  }

  startTour(tourId: string): void {
    this.router.navigate(['/tour-execution'], { queryParams: { tourId } });
  }

  browseTours(): void {
    this.router.navigate(['/tours']);
  }

  viewCart(): void {
    this.router.navigate(['/cart']);
  }

  formatDate(dateString: Date | string): string {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('sr-RS', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Invalid date';
    }
  }

  getActivePurchases(): number {
    return this.purchases().filter(p => p.is_active).length;
  }

  getRecentPurchases(): number {
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    
    return this.purchases().filter(p => 
      new Date(p.purchased_at) >= oneMonthAgo
    ).length;
  }

  getUniqueMonths(): number {
    const months = new Set();
    this.purchases().forEach(p => {
      const date = new Date(p.purchased_at);
      const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
      months.add(monthKey);
    });
    return months.size;
  }
}