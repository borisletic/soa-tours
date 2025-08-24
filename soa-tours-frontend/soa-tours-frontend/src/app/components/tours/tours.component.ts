// soa-tours-frontend/src/app/components/tours/tours.component.ts
import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService, Tour, TourPurchaseInfo } from '../../services/api.service';

@Component({
  selector: 'app-tours',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container mt-4">
      <!-- Header -->
      <div class="row mb-4">
        <div class="col-12">
          <h2 class="text-white mb-3">
            <i class="fas fa-route me-2"></i>
            Browse Tours
          </h2>
        </div>
      </div>

      <!-- Filters -->
      <div class="row mb-4">
        <div class="col-12">
          <div class="card">
            <div class="card-body">
              <div class="row align-items-end">
                <div class="col-md-3">
                  <label for="statusFilter" class="form-label">Status:</label>
                  <select 
                    id="statusFilter"
                    class="form-select" 
                    [(ngModel)]="filters.status"
                    (change)="applyFilters()">
                    <option value="">All Statuses</option>
                    <option value="published">Published Only</option>
                  </select>
                </div>
                
                <div class="col-md-3">
                  <label for="difficultyFilter" class="form-label">Difficulty:</label>
                  <select 
                    id="difficultyFilter"
                    class="form-select" 
                    [(ngModel)]="filters.difficulty"
                    (change)="applyFilters()">
                    <option value="">All Difficulties</option>
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>

                <div class="col-md-3">
                  <label for="priceFilter" class="form-label">Max Price (€):</label>
                  <input 
                    id="priceFilter"
                    type="number" 
                    class="form-control" 
                    [(ngModel)]="filters.maxPrice"
                    (input)="applyFilters()"
                    placeholder="Any price"
                    min="0">
                </div>
                
                <div class="col-md-3">
                  <button 
                    class="btn btn-outline-secondary w-100"
                    (click)="clearFilters()">
                    <i class="fas fa-times me-1"></i>
                    Clear Filters
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="loading()" class="text-center">
        <div class="spinner-border text-light" role="status"></div>
        <p class="text-white mt-2">Loading tours...</p>
      </div>

      <!-- Error State -->
      <div *ngIf="error()" class="alert alert-danger">
        <i class="fas fa-exclamation-triangle me-2"></i>
        {{error()}}
      </div>

      <!-- Tours Grid -->
      <div *ngIf="!loading() && !error()">
        
        <!-- Results Info -->
        <div class="row mb-3">
          <div class="col-12">
            <p class="text-white">
              Showing {{filteredTours().length}} of {{tours().length}} tours
            </p>
          </div>
        </div>

        <!-- No Tours -->
        <div *ngIf="filteredTours().length === 0" class="card">
          <div class="card-body text-center py-5">
            <i class="fas fa-search fa-4x text-muted mb-3"></i>
            <h4>No tours found</h4>
            <p class="text-muted">Try adjusting your filters or check back later for new tours.</p>
          </div>
        </div>

        <!-- Tours List -->
        <div class="row">
          <div 
            *ngFor="let tour of filteredTours()" 
            class="col-lg-6 col-xl-4 mb-4">
            
            <div class="card h-100 tour-card">
              <!-- Tour Status Badge -->
              <div class="position-absolute top-0 end-0 m-2">
                <span 
                  class="badge"
                  [ngClass]="{
                    'bg-success': tour.status === 'published',
                    'bg-warning': tour.status === 'draft',
                    'bg-secondary': tour.status === 'archived'
                  }">
                  {{tour.status | titlecase}}
                </span>
              </div>

              <!-- Purchase Status Badge -->
              <div 
                *ngIf="getPurchaseStatus(tour.id)?.is_purchased" 
                class="position-absolute top-0 start-0 m-2">
                <span class="badge bg-primary">
                  <i class="fas fa-check me-1"></i>
                  Purchased
                </span>
              </div>

              <div class="card-header">
                <h5 class="card-title mb-1">{{tour.name}}</h5>
                <div class="d-flex justify-content-between align-items-center">
                  <span 
                    class="badge"
                    [ngClass]="{
                      'bg-success': tour.difficulty === 'easy',
                      'bg-warning': tour.difficulty === 'medium',
                      'bg-danger': tour.difficulty === 'hard'
                    }">
                    {{tour.difficulty | titlecase}}
                  </span>
                  <span class="h6 text-primary mb-0">
                    {{tour.price | currency:'EUR':'symbol':'1.2-2'}}
                  </span>
                </div>
              </div>

              <div class="card-body">
                <p class="card-text text-muted">
                  {{tour.description.length > 100 ? 
                    (tour.description.substring(0, 100) + '...') : 
                    tour.description}}
                </p>

                <!-- Tour Stats -->
                <div class="row text-center mb-3">
                  <div class="col-4">
                    <small class="text-muted">Distance</small>
                    <div class="fw-bold">{{tour.distance_km || 0}} km</div>
                  </div>
                  <div class="col-4">
                    <small class="text-muted">Keypoints</small>
                    <div class="fw-bold">
                      {{getPurchaseStatus(tour.id)?.is_purchased ? tour.keypoints.length : '?'}}
                    </div>
                  </div>
                  <div class="col-4">
                    <small class="text-muted">Reviews</small>
                    <div class="fw-bold">{{tour.reviews.length || 0}}</div>
                  </div>
                </div>

                <!-- Transport Times (always visible) -->
                <div *ngIf="tour.transport_times && tour.transport_times.length > 0" class="mb-3">
                  <small class="text-muted">Transport times:</small>
                  <div class="d-flex gap-2 flex-wrap mt-1">
                    <span 
                      *ngFor="let tt of tour.transport_times"
                      class="badge bg-light text-dark">
                      <i class="fas me-1" [ngClass]="{
                        'fa-walking': tt.transport_type === 'walking',
                        'fa-bicycle': tt.transport_type === 'bicycle',
                        'fa-car': tt.transport_type === 'car'
                      }"></i>
                      {{tt.duration_minutes}}min
                    </span>
                  </div>
                </div>

                <!-- Tags -->
                <div *ngIf="tour.tags && tour.tags.length > 0" class="mb-3">
                  <div class="d-flex gap-1 flex-wrap">
                    <span 
                      *ngFor="let tag of tour.tags" 
                      class="badge bg-secondary">
                      {{tag}}
                    </span>
                  </div>
                </div>

                <!-- First keypoint info (always visible) -->
                <div *ngIf="tour.keypoints && tour.keypoints.length > 0" class="mb-3">
                  <small class="text-muted">Starting point:</small>
                  <div class="mt-1">
                    <strong>{{tour.keypoints[0].name}}</strong>
                    <p class="small text-muted mb-0">{{tour.keypoints[0].description}}</p>
                  </div>
                </div>

                <!-- Limited info for non-purchased tours -->
                <div *ngIf="!getPurchaseStatus(tour.id)?.is_purchased && tour.status !== 'archived'" class="alert alert-info small">
                  <i class="fas fa-info-circle me-2"></i>
                  Purchase this tour to see all keypoints and detailed route information.
                </div>

                <!-- Archived tour notice -->
                <div *ngIf="tour.status === 'archived'" class="alert alert-warning small">
                  <i class="fas fa-archive me-2"></i>
                  This tour is archived and cannot be purchased.
                </div>
              </div>

              <div class="card-footer">
                <div class="d-grid gap-2">
                  <!-- View Details Button -->
                  <button 
                    class="btn btn-outline-primary btn-sm"
                    (click)="viewTourDetails(tour.id)">
                    <i class="fas fa-eye me-1"></i>
                    View Details
                  </button>

                  <!-- Purchase/Cart Actions -->
                  <div *ngIf="!getPurchaseStatus(tour.id)?.is_purchased && tour.status === 'published'">
                    <button 
                      *ngIf="!isInCart(tour.id)"
                      class="btn btn-success btn-sm w-100"
                      (click)="addToCart(tour)"
                      [disabled]="addingToCart() === tour.id">
                      <i class="fas fa-cart-plus me-1"></i>
                      {{addingToCart() === tour.id ? 'Adding...' : 'Add to Cart'}}
                    </button>

                    <div *ngIf="isInCart(tour.id)" class="d-grid gap-1">
                      <button class="btn btn-warning btn-sm" disabled>
                        <i class="fas fa-check me-1"></i>
                        In Cart
                      </button>
                      <button 
                        class="btn btn-outline-danger btn-sm"
                        (click)="removeFromCart(tour.id)"
                        [disabled]="removingFromCart() === tour.id">
                        <i class="fas fa-trash me-1"></i>
                        {{removingFromCart() === tour.id ? 'Removing...' : 'Remove'}}
                      </button>
                    </div>
                  </div>

                  <!-- Already Purchased -->
                  <div *ngIf="getPurchaseStatus(tour.id)?.is_purchased">
                    <button 
                      class="btn btn-primary btn-sm w-100 mb-1"
                      (click)="startTour(tour.id)">
                      <i class="fas fa-play me-1"></i>
                      Start Tour
                    </button>
                    <small class="text-success d-block text-center">
                      <i class="fas fa-check me-1"></i>
                      You own this tour
                    </small>
                  </div>

                  <!-- Archived Tour -->
                  <div *ngIf="tour.status === 'archived'">
                    <button class="btn btn-secondary btn-sm w-100" disabled>
                      <i class="fas fa-archive me-1"></i>
                      Not Available
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Shopping Cart Floating Button -->
      <div class="position-fixed bottom-0 end-0 m-4" style="z-index: 1000;">
        <button 
          *ngIf="cartItemCount() > 0"
          class="btn btn-primary btn-lg rounded-circle position-relative"
          (click)="goToCart()"
          title="View Shopping Cart">
          <i class="fas fa-shopping-cart"></i>
          <span class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
            {{cartItemCount()}}
          </span>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .tour-card {
      transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
    }
    
    .tour-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 20px rgba(0,0,0,0.1);
    }
    
    .position-fixed .btn-lg {
      width: 60px;
      height: 60px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    }
  `]
})
export class ToursComponent implements OnInit {
  loading = signal(false);
  error = signal<string | null>(null);
  tours = signal<Tour[]>([]);
  filteredTours = signal<Tour[]>([]);
  purchaseStatuses = signal<Map<string, TourPurchaseInfo>>(new Map());
  cartItems = signal<Set<string>>(new Set());
  cartItemCount = signal(0);
  addingToCart = signal<string | null>(null);
  removingFromCart = signal<string | null>(null);

  filters = {
    status: 'published', // Default to published only
    difficulty: '',
    maxPrice: null as number | null
  };

  constructor(
    private apiService: ApiService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadTours();
    this.loadCart();
  }

  loadTours(): void {
    this.loading.set(true);
    this.error.set(null);

    // Get all tours (published only for tourists)
    this.apiService.getTours().subscribe({
      next: (response) => {
        const allTours = response.tours || [];
        // Filter to only show published tours to tourists
        const publishedTours = allTours.filter((tour: Tour) => tour.status === 'published');
        this.tours.set(publishedTours);
        this.applyFilters();
        this.loadPurchaseStatuses(publishedTours);
        this.loading.set(false);
      },
      error: (error) => {
        this.error.set(error.error?.error || 'Failed to load tours');
        this.loading.set(false);
      }
    });
  }

  loadPurchaseStatuses(tours: Tour[]): void {
    // Check purchase status for each tour
    const statusMap = new Map<string, TourPurchaseInfo>();
    
    tours.forEach(tour => {
      this.apiService.checkTourPurchase(tour.id).subscribe({
        next: (status) => {
          statusMap.set(tour.id, status);
          this.purchaseStatuses.set(new Map(statusMap));
        },
        error: () => {
          // Assume not purchased if check fails
          statusMap.set(tour.id, { tour_id: tour.id, is_purchased: false });
          this.purchaseStatuses.set(new Map(statusMap));
        }
      });
    });
  }

  loadCart(): void {
    this.apiService.getCart().subscribe({
      next: (response) => {
        // FIX: Add null/undefined checks for cart and items
        const items = response?.cart?.items || [];
        const itemIds = new Set(items.map(item => item.tour_id));
        this.cartItems.set(itemIds);
        this.cartItemCount.set(items.length);
      },
      error: () => {
        // Cart loading failed, continue without cart info
        this.cartItems.set(new Set());
        this.cartItemCount.set(0);
      }
    });
  }

  applyFilters(): void {
    let filtered = [...this.tours()];

    if (this.filters.status) {
      filtered = filtered.filter(tour => tour.status === this.filters.status);
    }

    if (this.filters.difficulty) {
      filtered = filtered.filter(tour => tour.difficulty === this.filters.difficulty);
    }

    if (this.filters.maxPrice !== null && this.filters.maxPrice >= 0) {
      filtered = filtered.filter(tour => tour.price <= this.filters.maxPrice!);
    }

    this.filteredTours.set(filtered);
  }

  clearFilters(): void {
    this.filters = {
      status: 'published',
      difficulty: '',
      maxPrice: null
    };
    this.applyFilters();
  }

  getPurchaseStatus(tourId: string): TourPurchaseInfo | undefined {
    return this.purchaseStatuses().get(tourId);
  }

  isInCart(tourId: string): boolean {
    return this.cartItems().has(tourId);
  }

  addToCart(tour: Tour): void {
    this.addingToCart.set(tour.id);

    const request = {
      tour_id: tour.id,
      tour_name: tour.name,
      price: tour.price
    };

    this.apiService.addToCart(request).subscribe({
      next: () => {
        this.addingToCart.set(null);
        this.loadCart(); // Refresh cart
      },
      error: (error) => {
        this.addingToCart.set(null);
        alert('Failed to add to cart: ' + (error.error?.error || error.message));
      }
    });
  }

  removeFromCart(tourId: string): void {
    this.removingFromCart.set(tourId);

    this.apiService.removeFromCart(tourId).subscribe({
      next: () => {
        this.removingFromCart.set(null);
        this.loadCart(); // Refresh cart
      },
      error: (error) => {
        this.removingFromCart.set(null);
        alert('Failed to remove from cart: ' + (error.error?.error || error.message));
      }
    });
  }

  viewTourDetails(tourId: string): void {
    this.router.navigate(['/tours', tourId]);
  }

  startTour(tourId: string): void {
    this.router.navigate(['/tour-execution'], { 
      queryParams: { tourId: tourId } 
    });
  }

  goToCart(): void {
    this.router.navigate(['/cart']);
  }
}