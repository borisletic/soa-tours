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
                  [class.bg-success]="tour()!.status === 'published'"
                  [class.bg-warning]="tour()!.status === 'draft'"
                  [class.bg-secondary]="tour()!.status === 'archived'">
                  {{tour()!.status | titlecase}}
                </span>
                <span class="badge bg-primary fs-6">
                  {{tour()!.difficulty | titlecase}}
                </span>
                <span class="text-white-50">
                  <i class="fas fa-calendar-alt me-1"></i>
                  {{formatDate(tour()!.created_at)}}
                </span>
              </div>
              <p class="text-white-50">{{tour()!.description}}</p>
            </div>

            <!-- Quick Actions -->
            <div class="d-flex gap-2">
              <button 
                class="btn btn-outline-light btn-sm"
                (click)="$event.stopPropagation()">
                <i class="fas fa-share-alt me-1"></i>
                Share
              </button>
              
              <button 
                class="btn btn-outline-light btn-sm"
                (click)="$event.stopPropagation()">
                <i class="fas fa-heart me-1"></i>
                Save
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Main Content Grid -->
      <div class="row">
        <!-- Left Column: Tour Details -->
        <div class="col-lg-8">
          
          <!-- Tour Stats -->
          <div class="card mb-4">
            <div class="card-body">
              <div class="row text-center">
                <div class="col-md-3 mb-3">
                  <div class="h4 text-primary">{{tour()!.distance_km | number:'1.1-1'}} km</div>
                  <small class="text-muted">Distance</small>
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

          <!-- Transport Times -->
          <div class="card mb-4" *ngIf="tour()!.transport_times && tour()!.transport_times.length > 0">
            <div class="card-header">
              <h5 class="mb-0">
                <i class="fas fa-clock me-2"></i>
                Estimated Duration
              </h5>
            </div>
            <div class="card-body">
              <div class="row">
                <div class="col-md-4 mb-2" *ngFor="let transport of tour()!.transport_times">
                  <div class="d-flex align-items-center">
                    <i class="fas me-2" 
                       [class.fa-walking]="transport.transport_type === 'walking'"
                       [class.fa-bicycle]="transport.transport_type === 'bicycle'"
                       [class.fa-car]="transport.transport_type === 'car'"></i>
                    <div>
                      <div class="fw-bold">{{transport.duration_minutes}} min</div>
                      <small class="text-muted">{{transport.transport_type | titlecase}}</small>
                    </div>
                  </div>
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

              <!-- Not Purchased: Show Locked Keypoints -->
              <div *ngIf="!purchaseStatus()?.is_purchased && tour()!.keypoints.length > 1" 
                   class="text-center py-5">
                <i class="fas fa-lock fa-3x text-muted mb-3"></i>
                <h5 class="text-muted">Remaining {{tour()!.keypoints.length - 1}} keypoints locked</h5>
                <p class="text-muted mb-3">Purchase this tour to see the complete route and all keypoints</p>
              </div>
            </div>
          </div>

          <!-- Tags -->
          <div class="card mb-4" *ngIf="tour()!.tags && tour()!.tags.length > 0">
            <div class="card-header">
              <h5 class="mb-0">
                <i class="fas fa-tags me-2"></i>
                Tags
              </h5>
            </div>
            <div class="card-body">
              <div class="d-flex flex-wrap gap-2">
                <span 
                  *ngFor="let tag of tour()!.tags" 
                  class="badge bg-light text-dark">
                  {{tag}}
                </span>
              </div>
            </div>
          </div>

          <!-- Reviews -->
          <div class="card mb-4" *ngIf="tour()!.reviews && tour()!.reviews.length > 0">
            <div class="card-header">
              <h5 class="mb-0">
                <i class="fas fa-star me-2"></i>
                Reviews ({{tour()!.reviews.length}})
              </h5>
            </div>
            <div class="card-body">
              <div *ngFor="let review of tour()!.reviews" class="mb-3 border-bottom pb-3">
                <div class="d-flex justify-content-between mb-2">
                  <h6 class="mb-0">User {{review.user_id}}</h6>
                  <div>
                    <span class="badge bg-warning">{{review.rating}}/5</span>
                  </div>
                </div>
                <p class="text-muted mb-1">{{review.comment}}</p>
                <small class="text-muted">{{formatDate(review.created_at)}}</small>
              </div>
            </div>
          </div>
        </div>

        <!-- Right Column: Sidebar -->
        <div class="col-lg-4">
          
          <!-- Purchase/Start Section -->
          <div class="card mb-4 sticky-top" style="top: 20px;">
            <div class="card-body">
              
              <!-- START TOUR SECTION - NOVO! -->
              <div class="mb-4">
                <div class="text-center mb-3">
                  <h5 class="text-primary mb-2">
                    <i class="fas fa-play me-2"></i>
                    Ready to Explore?
                  </h5>
                  <p class="text-muted small mb-0">
                    Start the tour and track your progress through {{tour()!.keypoints.length}} keypoints
                  </p>
                </div>

                <div class="d-grid mb-3">
                  <button 
                    [class]="getStartTourButtonClass()"
                    (click)="startTour()"
                    [disabled]="startingTour() || (!purchaseStatus()?.is_purchased && tour()!.status === 'published')">
                    <i class="fas" 
                       [class.fa-play]="!startingTour()"
                       [class.fa-spinner]="startingTour()"
                       [class.fa-spin]="startingTour()"
                       class="me-2"></i>
                    {{getStartTourButtonText()}}
                  </button>
                </div>

                <!-- Status info -->
                <div class="small text-center text-muted">
                  <div *ngIf="tour()!.status === 'published' && !purchaseStatus()?.is_purchased">
                    <i class="fas fa-info-circle me-1"></i>
                    Purchase required to start this tour
                  </div>
                  <div *ngIf="tour()!.status === 'archived'">
                    <i class="fas fa-archive me-1"></i>
                    This is an archived tour
                  </div>
                  <div *ngIf="purchaseStatus()?.is_purchased">
                    <i class="fas fa-check-circle text-success me-1"></i>
                    You own this tour
                  </div>
                </div>
              </div>

              <!-- Existing Purchase Section -->
              <!-- Already Purchased -->
              <div *ngIf="purchaseStatus()?.is_purchased">
                <div class="alert alert-success text-center">
                  <h6>
                    <i class="fas fa-check-circle me-2"></i>
                    Tour Purchased
                  </h6>
                  <p class="mb-0">
                    You have full access to this tour
                  </p>
                  <div class="d-grid gap-2 mt-3">
                    <button 
                      class="btn btn-outline-primary"
                      (click)="viewPurchases()">
                      <i class="fas fa-receipt me-2"></i>
                      View All Purchases
                    </button>
                  </div>
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
                    Go to Cart
                  </button>
                </div>
              </div>

              <!-- Draft/Archived Status -->
              <div *ngIf="tour()!.status === 'draft'" class="alert alert-warning text-center">
                <h6>
                  <i class="fas fa-edit me-2"></i>
                  Draft Tour
                </h6>
                <p class="mb-0">This tour is still in draft mode</p>
              </div>

              <div *ngIf="tour()!.status === 'archived'" class="alert alert-info text-center">
                <h6>
                  <i class="fas fa-archive me-2"></i>
                  Archived Tour
                </h6>
                <p class="mb-0">This tour has been archived but can still be started</p>
              </div>
            </div>
          </div>

          <!-- Tour Info Card -->
          <div class="card">
            <div class="card-header">
              <h6 class="mb-0">
                <i class="fas fa-info-circle me-2"></i>
                Tour Information
              </h6>
            </div>
            <div class="card-body">
              <div class="row mb-2">
                <div class="col-6 text-muted">Author:</div>
                <div class="col-6">User {{tour()!.author_id}}</div>
              </div>
              <div class="row mb-2">
                <div class="col-6 text-muted">Created:</div>
                <div class="col-6">{{formatDate(tour()!.created_at)}}</div>
              </div>
              <div class="row mb-2" *ngIf="tour()!.published_at">
                <div class="col-6 text-muted">Published:</div>
                <div class="col-6">{{formatDate(tour()!.published_at ?? '')}}</div>
              </div>
              <div class="row mb-2">
                <div class="col-6 text-muted">Last Update:</div>
                <div class="col-6">{{formatDate(tour()!.updated_at)}}</div>
              </div>
              <div class="row">
                <div class="col-6 text-muted">Distance:</div>
                <div class="col-6">{{tour()!.distance_km | number:'1.1-1'}} km</div>
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

  startingTour = signal<boolean>(false);

  tourId: string = '';

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
    const tour = this.tour();
    if (!tour) return;

    this.startingTour.set(true);
    
    this.apiService.startTour(tour.id).subscribe({
      next: (response) => {
        this.startingTour.set(false);
        
        // Navigate with the correct tourId
        this.router.navigate(['/tour-execution'], { 
          queryParams: { tourId: tour.id } 
        });
      },
      error: (error) => {
        this.startingTour.set(false);
        
        let errorMessage = 'Failed to start tour.';
        if (error.error?.error) {
          errorMessage = error.error.error;
        }
        
        if (errorMessage.includes('Position Simulator')) {
          if (confirm(errorMessage + '\n\nWould you like to go to Position Simulator now?')) {
            this.router.navigate(['/position-simulator']);
          }
        } else if (errorMessage.includes('active tour')) {
          if (confirm(errorMessage + '\n\nWould you like to check your active tour?')) {
            // Navigate to tour execution with the correct tourId
            this.router.navigate(['/tour-execution'], { 
              queryParams: { tourId: tour.id } 
            });
          }
        } else {
          alert(errorMessage);
        }
      }
    });
  }

  canStartTour(): boolean {
    const tour = this.tour();
    if (!tour) return false;

    // Za sada turisti mogu pokrenuti objavljene i arhivirane ture
    // Kada se uvede kupovina, trebaju biti kupljene
    return tour.status === 'published' || tour.status === 'archived';
  }

  getStartTourButtonText(): string {
    const tour = this.tour();
    if (!tour) return 'Start Tour';
    
    if (this.startingTour()) return 'Starting...';
    
    const purchased = this.purchaseStatus();
    if (!purchased?.is_purchased && tour.status === 'published') {
      return 'Purchase Required';
    }
    
    return 'Start Tour';
  }

  getStartTourButtonClass(): string {
    const tour = this.tour();
    if (!tour) return 'btn btn-secondary';
    
    const purchased = this.purchaseStatus();
    if (!purchased?.is_purchased && tour.status === 'published') {
      return 'btn btn-warning';
    }
    
    return 'btn btn-success btn-lg';
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