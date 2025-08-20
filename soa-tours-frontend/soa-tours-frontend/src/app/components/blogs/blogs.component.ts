import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-blogs',
  imports: [CommonModule],
  template: `
    <div class="container">
      <h2 class="text-white mb-4"><i class="fas fa-blog me-2"></i>Blog Management</h2>
      
      <div class="card">
        <div class="card-body">
          <h5 class="card-title">Content Service - Blogs</h5>
          <p class="card-text">This service manages blog posts and content.</p>
          
          <button class="btn btn-primary" 
                  (click)="loadBlogs()" 
                  [disabled]="loading()">
            <i class="fas fa-sync-alt me-1"></i>
            {{loading() ? 'Loading...' : 'Load Blogs'}}
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
export class BlogsComponent {
  loading = signal(false);
  response = signal<any>(null);

  constructor(private apiService: ApiService) {}

  loadBlogs(): void {
    this.loading.set(true);
    this.apiService.getBlogs().subscribe({
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