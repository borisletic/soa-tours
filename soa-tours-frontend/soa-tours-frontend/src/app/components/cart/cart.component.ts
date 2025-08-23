// soa-tours-frontend/src/app/components/cart/cart.component.ts
import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ApiService, ShoppingCart, CartItem } from '../../services/api.service';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="container mt-4">
      <!-- Header -->
      <div class="row mb-4">
        <div class="col-12">
          <h2 class="text-white mb-3">
            <i class="fas fa-shopping-cart me-2"></i>
            Shopping Cart
          </h2>
          <nav aria-label="breadcrumb">
            <ol class="breadcrumb">
              <li class="breadcrumb-item">
                <a href="/" class="text-light">Home</a>
              </li>
              <li class="breadcrumb-item active text-white-50" aria-current="page">
                Shopping Cart
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
        <p class="text-white mt-2">Loading your cart...</p>
      </div>

      <!-- Error State -->
      <div *ngIf="error()" class="alert alert-danger">
        <i class="fas fa-exclamation-triangle me-2"></i>
        {{error()}}
      </div>

      <!-- Cart Content -->
      <div *ngIf="!loading() && !error()">
        
        <!-- Empty Cart -->
        <div *ngIf="!cart() || cart()!.items.length === 0" class="card">
          <div class="card-body text-center py-5">
            <i class="fas fa-shopping-cart fa-4x text-muted mb-3"></i>
            <h4>Your cart is empty</h4>
            <p class="text-muted">Browse our tours and add some to your cart!</p>
            <button 
              class="btn btn-primary"
              (click)="browseTours()">
              <i class="fas fa-route me-2"></i>
              Browse Tours
            </button>
          </div>
        </div>

        <!-- Cart with Items -->
        <div *ngIf="cart() && cart()!.items.length > 0">
          <div class="row">
            <div class="col-lg-8">
              <!-- Cart Items -->
              <div class="card mb-4">
                <div class="card-header">
                  <h5 class="mb-0">
                    <i class="fas fa-list me-2"></i>
                    Cart Items ({{cart()!.items.length}})
                  </h5>
                </div>
                <div class="card-body p-0">
                  <div 
                    *ngFor="let item of cart()!.items; let i = index" 
                    class="cart-item"
                    [class.border-bottom]="i < cart()!.items.length - 1">
                    
                    <div class="row align-items-center p-3">
                      <div class="col-md-6">
                        <h6 class="mb-1">{{item.tour_name}}</h6>
                        <small class="text-muted">
                          Tour ID: {{item.tour_id}}
                        </small>
                      </div>
                      
                      <div class="col-md-3 text-center">
                        <span class="h5 text-success mb-0">
                          {{item.price | currency:'EUR':'symbol':'1.2-2'}}
                        </span>
                      </div>
                      
                      <div class="col-md-3 text-end">
                        <button 
                          class="btn btn-sm btn-outline-danger"
                          (click)="removeFromCart(item.tour_id)"
                          [disabled]="removing() === item.tour_id">
                          <i class="fas fa-trash me-1"></i>
                          {{removing() === item.tour_id ? 'Removing...' : 'Remove'}}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="col-lg-4">
              <!-- Cart Summary -->
              <div class="card sticky-top">
                <div class="card-header bg-primary text-white">
                  <h5 class="mb-0">
                    <i class="fas fa-calculator me-2"></i>
                    Order Summary
                  </h5>
                </div>
                <div class="card-body">
                  <div class="d-flex justify-content-between mb-3">
                    <span>Items ({{cart()!.items.length}}):</span>
                    <span>{{cart()!.total_price | currency:'EUR':'symbol':'1.2-2'}}</span>
                  </div>
                  
                  <div class="d-flex justify-content-between mb-3">
                    <span>Shipping:</span>
                    <span class="text-success">Free</span>
                  </div>
                  
                  <hr>
                  
                  <div class="d-flex justify-content-between mb-4">
                    <strong>Total:</strong>
                    <strong class="h5 text-primary">
                      {{cart()!.total_price | currency:'EUR':'symbol':'1.2-2'}}
                    </strong>
                  </div>

                  <div class="d-grid gap-2">
                    <button 
                      class="btn btn-success btn-lg"
                      (click)="checkout()"
                      [disabled]="checkingOut()">
                      <i class="fas fa-credit-card me-2"></i>
                      {{checkingOut() ? 'Processing...' : 'Proceed to Checkout'}}
                    </button>
                    
                    <button 
                      class="btn btn-outline-secondary"
                      (click)="browseTours()">
                      <i class="fas fa-arrow-left me-2"></i>
                      Continue Shopping
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Checkout Success Modal -->
      <div class="modal fade" [class.show]="showSuccessModal()" 
           [style.display]="showSuccessModal() ? 'block' : 'none'" 
           tabindex="-1" style="background-color: rgba(0,0,0,0.5)">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header bg-success text-white">
              <h5 class="modal-title">
                <i class="fas fa-check-circle me-2"></i>
                Purchase Complete!
              </h5>
            </div>
            <div class="modal-body text-center py-4">
              <i class="fas fa-trophy fa-3x text-success mb-3"></i>
              <h4>Thank you for your purchase!</h4>
              <p class="text-muted">
                You have successfully purchased {{purchaseResult()?.tokens.length || 0}} tour(s).
                You can now access all tour details and keypoints.
              </p>
              <p class="mb-0">
                <strong>Total paid: {{purchaseResult()?.total | currency:'EUR':'symbol':'1.2-2'}}</strong>
              </p>
            </div>
            <div class="modal-footer">
              <button 
                class="btn btn-primary me-2"
                (click)="viewPurchases()">
                <i class="fas fa-list me-1"></i>
                View My Purchases
              </button>
              <button 
                class="btn btn-secondary"
                (click)="closeSuccessModal()">
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .cart-item:hover {
      background-color: #f8f9fa;
    }
    
    .sticky-top {
      top: 20px;
    }
    
    .modal.show {
      display: block !important;
    }
  `]
})
export class CartComponent implements OnInit {
  loading = signal(false);
  error = signal<string | null>(null);
  cart = signal<ShoppingCart | null>(null);
  removing = signal<string | null>(null);
  checkingOut = signal(false);
  showSuccessModal = signal(false);
  purchaseResult = signal<any>(null);

  constructor(
    private apiService: ApiService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadCart();
  }

  loadCart(): void {
    this.loading.set(true);
    this.error.set(null);

    this.apiService.getCart().subscribe({
      next: (response) => {
        this.cart.set(response.cart);
        this.loading.set(false);
      },
      error: (error) => {
        this.error.set(error.error?.error || 'Failed to load cart');
        this.loading.set(false);
      }
    });
  }

  removeFromCart(tourId: string): void {
    this.removing.set(tourId);

    this.apiService.removeFromCart(tourId).subscribe({
      next: () => {
        this.removing.set(null);
        this.loadCart(); // Reload cart to get updated totals
      },
      error: (error) => {
        this.removing.set(null);
        alert('Failed to remove item from cart: ' + (error.error?.error || error.message));
      }
    });
  }

  checkout(): void {
    if (!this.cart() || this.cart()!.items.length === 0) {
      return;
    }

    this.checkingOut.set(true);

    this.apiService.checkout().subscribe({
      next: (response) => {
        this.checkingOut.set(false);
        this.purchaseResult.set(response);
        this.showSuccessModal.set(true);
        this.cart.set(null); // Clear cart
      },
      error: (error) => {
        this.checkingOut.set(false);
        alert('Checkout failed: ' + (error.error?.error || error.message));
      }
    });
  }

  browseTours(): void {
    this.router.navigate(['/tours']);
  }

  viewPurchases(): void {
    this.router.navigate(['/purchases']);
    this.closeSuccessModal();
  }

  closeSuccessModal(): void {
    this.showSuccessModal.set(false);
    this.purchaseResult.set(null);
  }
}