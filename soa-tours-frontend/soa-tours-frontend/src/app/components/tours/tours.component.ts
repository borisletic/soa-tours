import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-tours',
  imports: [CommonModule],
  template: `
    <div class="container">
      <h2 class="text-white mb-4"><i class="fas fa-route me-2"></i>Tour Management</h2>
      
      <div class="card">
        <div class="card-body">
          <h5 class="card-title">Content Service - Tours</h5>
          <p class="card-text">This service manages tour listings and information.</p>
          
          <button class="btn btn-primary" 
                  (click)="loadTours()" 
                  [disabled]="loading()">
            <i class="fas fa-sync-alt me-1"></i>
            {{loading() ? 'Loading...' : 'Load Tours'}}
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
export class ToursComponent {
  loading = signal(false);
  response = signal<any>(null);

  constructor(private apiService: ApiService) {}

  loadTours(): void {
    this.loading.set(true);
    this.apiService.getTours().subscribe({
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