import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-users',
  imports: [CommonModule],
  template: `
    <div class="container">
      <h2 class="text-white mb-4"><i class="fas fa-users me-2"></i>User Management</h2>
      
      <div class="card">
        <div class="card-body">
          <h5 class="card-title">Stakeholders Service</h5>
          <p class="card-text">This service manages user authentication and profiles.</p>
          
          <button class="btn btn-primary" 
                  (click)="loadUsers()" 
                  [disabled]="loading()">
            <i class="fas fa-sync-alt me-1"></i>
            {{loading() ? 'Loading...' : 'Load Users'}}
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
export class UsersComponent {
  loading = signal(false);
  response = signal<any>(null);

  constructor(private apiService: ApiService) {}

  loadUsers(): void {
    this.loading.set(true);
    this.apiService.getUsers().subscribe({
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