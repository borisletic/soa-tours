import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-cart',
  imports: [CommonModule],
  template: `
    <div class="container">
      <h2 class="text-white mb-4"><i class="fas fa-shopping-cart me-2"></i>Shopping Cart</h2>
      
      <div class="card">
        <div class="card-body">
          <h5 class="card-title">Commerce Service</h5>
          <p class="card-text">This service manages shopping cart and payment processing.</p>
          
          <button class="btn btn-primary" 
                  (click)="loadCart()" 
                  [disabled]="loading()">
            <i class="fas fa-sync-alt me-1"></i>
            {{loading() ? 'Loading...' : 'Load Cart'}}
          </button>
          
          <div *ngIf="response()" class="mt-3">
            <div class="alert alert-info">
              <strong>Response:</strong>
              <pre>{{response() | json}}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class CartComponent {
  loading = signal(false);
  response = signal<any>(null);

  constructor(private apiService: ApiService) {}

  loadCart(): void {
    this.loading.set(true);
    this.apiService.getCart().subscribe({
      next: (data) => {
        this.response.set(data);
        this.loading.set(false);
      },
      error: (error) => {
        this.response.set({ error: error.message });
        this.loading.set(false);
      }
    });
  }
}