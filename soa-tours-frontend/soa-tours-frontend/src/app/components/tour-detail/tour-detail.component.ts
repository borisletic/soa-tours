// soa-tours-frontend/src/app/components/tour-detail/tour-detail.component.ts
import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService, Tour, TourPurchaseInfo } from '../../services/api.service';

@Component({
  selector: 'app-tour-detail',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="container mt-4">
      <!-- Loading State -->
      <div *ngIf="loading()" class="text-center">
        <div class="spinner-border text-light" role="status"></div>
        <p class="text-white mt-2">Loading tour details...</p>
      </div>

      <!-- Error State -->
      <div *ngIf="error()" class="alert alert-danger">
        <i class="fas fa-exclamation-triangle me-2"></i>
        {{error()}}
      </div>

      <!-- Tour Content -->
      <div *ngIf="tour() && !loading() && !error()">
        
        <!-- Header Section -->
        <div class="row mb-4">
          <div class="col-12">
            <nav aria-label="breadcrumb">
              <ol class="breadcrumb">
                <li class="breadcrumb-item">
                  <a href="/" class="text-light">Home</a>
                </li>
                <li class="breadcrumb-item">
                  <a href="/tours" class="text-light">Tours</a>
                </li>
                <li class="breadcrumb-item active text-white-50">
                  {{tour()!.name}}
                </li>
              </ol>
            </nav>

            <div class="d-flex justify-content-between align-items-start">
              <div>
                <h1 class="text-white mb-2">{{tour()!.name}}</h1>
                <div class="d-flex gap-2 align-items-center mb-3">
                  <span 
                    class="badge fs-6"
                    [ngClass]="{
                      'bg-success': tour()!.difficulty === 'easy',
                      'bg-warning': tour()!.difficulty === 'medium',
                      'bg-danger': tour()!.difficulty === 'hard'
                    }">
                    {{tour()!.difficulty | titlecase}}
                  </span>
                  <span 
                    class="badge fs-6"
                    [ngClass]="{
                      'bg-success': tour()!.status === 'published',
                      'bg-warning': tour()!.status === 'draft',
                      'bg-secondary': tour()!.status === 'archived'
                    }">
                    {{tour()!.status | titlecase}}
                  </span>
                  <span *ngIf="purchaseStatus()?.is_purchased" class="badge bg-primary fs-6">
                    <i class="fas fa-check me-1"></i>Purchased
                  </span>
                </div>
              </div>
              
              <div class="text-end">
                <div class="h2 text-primary mb-0">
                  {{tour()!.price | currency:'EUR':'symbol':'1.2-2'}}
                </div>
                <small class="text-muted">per person</small>
              </div>
            </div>
          </div>
        </div>

        <div class="row">
          <div class="col-lg-8">
            <!-- Description -->
            <div class="card mb-4">
              <div class="card-header">
                <h5 class="mb-0">
                  <i class="fas fa-info-circle me-2"></i>
                  Description
                </h5>
              </div>
              <div class="card-body">
                <p class="card-text">{{tour()!.description}}</p>
              </div>
            </div>

            <!-- Transport Times -->
            <div *ngIf="tour()!.transport_times && tour()!.transport_times.length > 0" class="card mb-4">
              <div class="card-header">
                <h5 class="mb-0">
                  <i class="fas fa-clock me-2"></i>
                  Transport Times
                </h5>
              </div>
              <div class="card-body">
                <div class="row">
                  <div 
                    *ngFor="let tt of tour()!.transport_times" 
                    class="col-md-4 mb-3">
                    <div class="text-center p-3 border rounded">
                      <i class="fas fa-2x mb-2" [ngClass]="{
                        'fa-walking text-success': tt.transport_type === 'walking',
                        'fa-bicycle text-warning': tt.transport_type === 'bicycle',
                        'fa-car text-info': tt.transport_type === 'car'
                      }"></i>
                      <div class="fw-bold">{{tt.duration_minutes}} min</div>
                      <small class="text-muted">{{tt.transport_type | titlecase}}</small>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Tour Stats -->
            <div class="card mb-4">
              <div class="card-header">
                <h5 class="mb-0">
                  <i class="fas fa-chart-bar me-2"></i>
                  Tour Statistics
                </h5>
              </div>
              <div class="card-body">
                <div class="row text-center">
                  <div class="col-md-3 mb-3">
                    <div class="h4 text-primary">{{tour()!.distance_km || 0}}</div>
                    <small class="text-muted">Kilometers</small>
                  </div>
                  <div class="col-md-3 mb-3">
                    <div class="h4 text-success">
                      {{purchaseStatus()?.is_purchased ? tour()!.keypoints.length : '?'}}
                    </div>
                    <small class="text-muted">Keypoints</small>
                  </div>
                  <div class="col-md-3 mb-3">
                    <div class="h4 text-warning">{{tour()!.reviews.length || 0}}</div>
                    <small class="text-muted">Reviews</small>
                  </div>
                  <div class="col-md-3 mb-3">
                    <div class="h4 text-info">{{tour()!.tags.length || 0}}</div>
                    <small class="text-muted">Tags</small>
                  </div>
                </div>
              </div>
            </div>

            <!-- Keypoints Section -->
            <div class="card mb-4">
              <div class="card-header d-flex justify-content-between align-items-center">
                <h5 class="mb-0">
                  <i class="fas fa-map-marker-alt me-2"></i>
                  Tour Route & Keypoints
                </h5>
                <span *ngIf="!purchaseStatus()?.is_purchased" class="badge bg-warning">
                  <i class="fas fa-lock me-1"></i>
                  Purchase Required
                </span>
              </div>
              <div class="card-body">
                
                <!-- First Keypoint (Always Visible) -->
                <div *ngIf="tour()!.keypoints && tour()!.keypoints.length > 0" class="mb-4">
                  <div class="d-flex align-items-start">
                    <div class="keypoint-number me-3">
                      <span class="badge bg-primary rounded-circle">1</span>
                    </div>
                    <div>
                      <h6 class="mb-1">{{tour()!.keypoints[0].name}} 
                        <small class="text-success">(Starting Point)</small>
                      </h6>
                      <p class="text-muted mb-2">{{tour()!.keypoints[0].description}}</p>
                      <small class="text-muted">
                        <i class="fas fa-map-pin me-1"></i>
                        {{tour()!.keypoints[0].latitude.toFixed(4)}}, {{tour()!.keypoints[0].longitude.toFixed(4)}}
                      </small>
                    </div>
                  </div>
                </div>

                <!-- Purchased: Show All Keypoints -->
                <div *ngIf="purchaseStatus()?.is_purchased && tour()!.keypoints.length > 1">
                  <div 
                    *ngFor="let keypoint of tour()!.keypoints.slice(1); let i = index" 
                    class="mb-4">
                    <div class="d-flex align-items-start">
                      <div class="keypoint-number me-3">
                        <span class="badge bg-success rounded-circle">{{i + 2}}</span>
                      </div>
                      <div>
                        <h6 class="mb-1">{{keypoint.name}}</h6>
                        <p class="text-muted mb-2">{{keypoint.description}}</p>
                        <small class="text-muted">
                          <i class="fas fa-map-pin me-1"></i>
                          {{keypoint.latitude.toFixed(4)}}, {{keypoint.longitude.toFixed(4)}}
                        </small>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Not Purchased: Show Teaser -->
                <div *ngIf="!purchaseStatus()?.is_purchased" class="alert alert-info">
                  <div class="row align-items-center">
                    <div class="col-md-8">
                      <h6 class="alert-heading">
                        <i class="fas fa-eye-slash me-2"></i>
                        Hidden Content
                      </h6>
                      <p class="mb-0">
                        This tour contains {{tour()!.keypoints.length - 1}} additional keypoints. 
                        Purchase the tour to see the complete route with all locations, descriptions, and coordinates.
                      </p>
                    </div>
                    <div class="col-md-4 text-center">
                      <i class="fas fa-lock fa-2x text-muted"></i>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Reviews Section -->
            <div *ngIf="tour()!.reviews && tour()!.reviews.length > 0" class="card mb-4">
              <div class="card-header">
                <h5 class="mb-0">
                  <i class="fas fa-star me-2"></i>
                  Reviews ({{tour()!.reviews.length}})
                </h5>
              </div>
              <div class="card-body">
                <div 
                  *ngFor="let review of tour()!.reviews.slice(0, 3)" 
                  class="mb-3 pb-3 border-bottom">
                  <div class="d-flex justify-content-between align-items-start mb-2">
                    <div>
                      <strong>User {{review.user_id}}</strong>
                      <div class="text-warning">
                        <i 
                          *ngFor="let star of [1,2,3,4,5]" 
                          class="fas"
                          [class.fa-star]="star <= review.rating"
                          [class.fa-star-o]="star > review.rating">
                        </i>
                      </div>
                    </div>
                    <small class="text-muted">
                      {{formatDate(review.created_at)}}
                    </small>
                  </div>
                  <p class="mb-0">{{review.comment}}</p>
                </div>
                
                <div *ngIf="tour()!.reviews.length > 3" class="text-center">
                  <small class="text-muted">
                    And {{tour()!.reviews.length - 3}} more reviews...
                  </small>
                </div>
              </div>
            </div>
          </div>

          <div class="col-lg-4">
            <!-- Purchase Actions -->
            <div class="card mb-4 sticky-top" style="top: 20px;">
              <div class="card-header bg-primary text-white">
                <h5 class="mb-0">
                  <i class="fas fa-shopping-cart me-2"></i>
                  Purchase Options
                </h5>
              </div>
              <div class="card-body">
                
                <!-- Already Purchased -->
                <div *ngIf="purchaseStatus()?.is_purchased" class="text-center">
                  <i class="fas fa-trophy fa-3x text-success mb-3"></i>
                  <h5 class="text-success">You own this tour!</h5>
                  <p class="text-muted mb-4">
                    You have full access to all keypoints and can start the tour anytime.
                  </p>
                  <div class="d-grid gap-2">
                    <button 
                      class="btn btn-success btn-lg"
                      (click)="startTour()">
                      <i class="fas fa-play me-2"></i>
                      Start Tour
                    </button>
                    <button 
                      class="btn btn-outline-primary"
                      (click)="viewPurchases()">
                      <i class="fas fa-receipt me-2"></i>
                      View All Purchases
                    </button>
                  </div>
                </div>

                <!-- Available for Purchase -->
                <div *ngIf="!purchaseStatus()?.is_purchased && tour()!.status === 'published'">
                  <div class="text-center mb-4">
                    <div class="h2 text-primary mb-0">
                      {{tour()!.price | currency:'EUR':'symbol':'1.2-2'}}
                    </div>
                    <small class="text-muted">One-time purchase</small>
                  </div>

                  <div class="mb-3">
                    <h6>What's included:</h6>
                    <ul class="list-unstyled">
                      <li><i class="fas fa-check text-success me-2"></i>Complete route map</li>
                      <li><i class="fas fa-check text-success me-2"></i>All {{tour()!.keypoints.length}} keypoints</li>
                      <li><i class="fas fa-check text-success me-2"></i>GPS coordinates</li>
                      <li><i class="fas fa-check text-success me-2"></i>Tour execution tracking</li>
                      <li><i class="fas fa-check text-success me-2"></i>Lifetime access</li>
                    </ul>
                  </div>

                  <div class="d-grid gap-2">
                    <button 
                      *ngIf="!isInCart()"
                      class="btn btn-success btn-lg"
                      (click)="addToCart()"
                      [disabled]="addingToCart()">
                      <i class="fas fa-cart-plus me-2"></i>
                      {{addingToCart() ? 'Adding...' : 'Add to Cart'}}
                    </button>

                    <div *ngIf="isInCart()">
                      <button class="btn btn-warning btn-lg w-100 mb-2" disabled>
                        <i class="fas fa-check me-2"></i>
                        In Your Cart
                      </button>
                      <button 
                        class="btn btn-outline-danger w-100"
                        (click)="removeFromCart()"
                        [disabled]="removingFromCart()">
                        <i class="fas fa-trash me-2"></i>
                        {{removingFromCart() ? 'Removing...' : 'Remove from Cart'}}
                      </button>
                    </div>

                    <button 
                      class="btn btn-outline-primary"
                      (click)="goToCart()">
                      <i class="fas fa-shopping-cart me-2"></i>
                      View Cart
                    </button>
                  </div>
                </div>

                <!-- Archived Tour -->
                <div *ngIf="tour()!.status === 'archived'" class="text-center">
                  <i class="fas fa-archive fa-3x text-muted mb-3"></i>
                  <h5 class="text-muted">Tour Archived</h5>
                  <p class="text-muted">
                    This tour is no longer available for purchase.
                  </p>
                </div>
              </div>
            </div>

            <!-- Tags -->
            <div *ngIf="tour()!.tags && tour()!.tags.length > 0" class="card">
              <div class="card-header">
                <h6 class="mb-0">
                  <i class="fas fa-tags me-2"></i>
                  Tags
                </h6>
              </div>
              <div class="card-body">
                <div class="d-flex gap-1 flex-wrap">
                  <span 
                    *ngFor="let tag of tour()!.tags" 
                    class="badge bg-secondary">
                    {{tag}}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .keypoint-number .badge {
      width: 30px;
      height: 30px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.875rem;
    }
    
    .sticky-top {
      top: 20px;
    }
  `]
})
export class TourDetailComponent implements OnInit {
  loading = signal(false);
  error = signal<string | null>(null);
  tour = signal<Tour | null>(null);
  purchaseStatus = signal<TourPurchaseInfo | null>(null);
  addingToCart = signal(false);
  removingFromCart = signal(false);
  inCart = signal(false);

  private tourId: string = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private apiService: ApiService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.tourId = params['id'];
      if (this.tourId) {
        this.loadTourDetails();
        this.checkPurchaseStatus();
        this.checkCartStatus();
      }
    });
  }

  loadTourDetails(): void {
    this.loading.set(true);
    this.error.set(null);

    this.apiService.getTourById(this.tourId).subscribe({
      next: (response) => {
        this.tour.set(response.tour || response);
        this.loading.set(false);
      },
      error: (error) => {
        this.error.set(error.error?.error || 'Failed to load tour details');
        this.loading.set(false);
      }
    });
  }

  checkPurchaseStatus(): void {
    this.apiService.checkTourPurchase(this.tourId).subscribe({
      next: (status) => {
        this.purchaseStatus.set(status);
      },
      error: () => {
        // Assume not purchased if check fails
        this.purchaseStatus.set({ 
          tour_id: this.tourId, 
          is_purchased: false 
        });
      }
    });
  }

  checkCartStatus(): void {
    this.apiService.getCart().subscribe({
      next: (response) => {
        const isInCart = response.cart.items.some(item => item.tour_id === this.tourId);
        this.inCart.set(isInCart);
      },
      error: () => {
        this.inCart.set(false);
      }
    });
  }

  addToCart(): void {
    const tour = this.tour();
    if (!tour) return;

    this.addingToCart.set(true);

    const request = {
      tour_id: tour.id,
      tour_name: tour.name,
      price: tour.price
    };

    this.apiService.addToCart(request).subscribe({
      next: () => {
        this.addingToCart.set(false);
        this.inCart.set(true);
      },
      error: (error) => {
        this.addingToCart.set(false);
        alert('Failed to add to cart: ' + (error.error?.error || error.message));
      }
    });
  }

  removeFromCart(): void {
    this.removingFromCart.set(true);

    this.apiService.removeFromCart(this.tourId).subscribe({
      next: () => {
        this.removingFromCart.set(false);
        this.inCart.set(false);
      },
      error: (error) => {
        this.removingFromCart.set(false);
        alert('Failed to remove from cart: ' + (error.error?.error || error.message));
      }
    });
  }

  startTour(): void {
    this.router.navigate(['/tour-execution'], { 
      queryParams: { tourId: this.tourId } 
    });
  }

  goToCart(): void {
    this.router.navigate(['/cart']);
  }

  viewPurchases(): void {
    this.router.navigate(['/purchases']);
  }

  isInCart(): boolean {
    return this.inCart();
  }

  formatDate(dateString: Date | string): string {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('sr-RS', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    } catch {
      return 'Invalid date';
    }
  }
}