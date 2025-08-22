import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';

interface Tour {
  id: string;
  name: string;
  description: string;
  author_id: number;
  status: string;
  difficulty: string;
  price: number;
  distance_km: number;
  tags: string[];
  keypoints: any[];
  created_at: string;
  updated_at: string;
}

@Component({
  selector: 'app-my-tours',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container">
      <div class="d-flex justify-content-between align-items-center mb-4">
        <h2 class="text-white">
          <i class="fas fa-route me-2"></i>My Tours
        </h2>
        <button 
          class="btn btn-primary"
          (click)="createNewTour()">
          <i class="fas fa-plus me-1"></i>
          Create New Tour
        </button>
      </div>
      
      <!-- Filters -->
      <div class="card mb-4">
        <div class="card-body">
          <div class="row">
            <div class="col-md-3">
              <label class="form-label">Status Filter</label>
              <select class="form-select" [(ngModel)]="filters.status" (change)="applyFilters()">
                <option value="">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <div class="col-md-3">
              <label class="form-label">Difficulty Filter</label>
              <select class="form-select" [(ngModel)]="filters.difficulty" (change)="applyFilters()">
                <option value="">All Difficulties</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
            <div class="col-md-6">
              <label class="form-label">Actions</label>
              <div>
                <button 
                  class="btn btn-outline-primary me-2" 
                  (click)="loadTours()"
                  [disabled]="loading">
                  <i class="fas fa-sync-alt me-1"></i>
                  {{loading ? 'Loading...' : 'Refresh'}}
                </button>
                <button 
                  class="btn btn-outline-secondary" 
                  (click)="clearFilters()">
                  <i class="fas fa-times me-1"></i>
                  Clear Filters
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Tours List -->
      <div *ngIf="filteredTours.length > 0">
        <div *ngFor="let tour of filteredTours" class="card mb-4">
          <div class="card-body">
            <!-- Tour Header -->
            <div class="d-flex justify-content-between align-items-start mb-3">
              <div>
                <h5 class="card-title">
                  {{tour.name}}
                  <span class="ms-2 badge" [ngClass]="{
                    'bg-warning': tour.status === 'draft',
                    'bg-success': tour.status === 'published',
                    'bg-secondary': tour.status === 'archived'
                  }">
                    {{tour.status}}
                  </span>
                </h5>
                <small class="text-muted">
                  Created: {{formatDate(tour.created_at)}} | 
                  Updated: {{formatDate(tour.updated_at)}} |
                  ID: {{tour.id}}
                </small>
              </div>
              <div class="btn-group">
                <button 
                  class="btn btn-sm btn-outline-primary"
                  (click)="editTour(tour)">
                  <i class="fas fa-edit"></i>
                  Edit
                </button>
                <button 
                  class="btn btn-sm"
                  [ngClass]="{
                    'btn-success': tour.status === 'draft',
                    'btn-warning': tour.status === 'published'
                  }"
                  (click)="toggleStatus(tour)"
                  [disabled]="loading">
                  <i [class]="tour.status === 'draft' ? 'fas fa-eye' : 'fas fa-eye-slash'"></i>
                  {{tour.status === 'draft' ? 'Publish' : 'Unpublish'}}
                </button>
                <button 
                  class="btn btn-sm btn-outline-danger"
                  (click)="archiveTour(tour)"
                  [disabled]="loading || tour.status === 'archived'">
                  <i class="fas fa-archive"></i>
                  Archive
                </button>
              </div>
            </div>

            <!-- Tour Details -->
            <div class="row">
              <div class="col-md-8">
                <p class="card-text">{{tour.description}}</p>
                
                <div class="mb-2">
                  <strong>Difficulty:</strong> 
                  <span class="badge" [ngClass]="{
                    'bg-success': tour.difficulty === 'easy',
                    'bg-warning': tour.difficulty === 'medium',
                    'bg-danger': tour.difficulty === 'hard'
                  }">
                    {{tour.difficulty}}
                  </span>
                </div>
                
                <div class="mb-2">
                  <strong>Tags:</strong> 
                  <span *ngFor="let tag of tour.tags" class="badge bg-secondary me-1">
                    {{tag}}
                  </span>
                  <span *ngIf="tour.tags.length === 0" class="text-muted">No tags</span>
                </div>
              </div>
              
              <div class="col-md-4">
                <div class="text-end">
                  <p><strong>Price:</strong> {{tour.price}}</p>
                  <p><strong>Distance:</strong> {{tour.distance_km}} km</p>
                  <p><strong>Keypoints:</strong> {{tour.keypoints.length}}</p>
                </div>
              </div>
            </div>

            <!-- Keypoints Preview -->
            <div *ngIf="tour.keypoints.length > 0" class="mt-3">
              <h6>Keypoints ({{tour.keypoints.length}})</h6>
              <div class="row">
                <div *ngFor="let keypoint of getKeypointsPreview(tour)" class="col-md-4">
                  <div class="card card-body bg-light">
                    <small>
                      <strong>{{keypoint.order + 1}}. {{keypoint.name}}</strong><br>
                      {{keypoint.description}}<br>
                      <span class="text-muted">
                        {{formatCoordinate(keypoint.latitude)}}, {{formatCoordinate(keypoint.longitude)}}
                      </span>
                    </small>
                  </div>
                </div>
                <div *ngIf="tour.keypoints.length > 3" class="col-md-4">
                  <div class="card card-body bg-light text-center">
                    <small class="text-muted">
                      +{{tour.keypoints.length - 3}} more keypoints
                    </small>
                  </div>
                </div>
              </div>
            </div>
            
            <div *ngIf="tour.keypoints.length === 0" class="mt-3">
              <div class="alert alert-warning">
                <i class="fas fa-exclamation-triangle me-2"></i>
                No keypoints added yet. Add keypoints to complete your tour.
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- No Tours Message -->
      <div *ngIf="filteredTours.length === 0 && !loading" class="card">
        <div class="card-body text-center">
          <i class="fas fa-route fa-3x text-muted mb-3"></i>
          <h5>No tours found</h5>
          <p class="text-muted">
            {{tours.length === 0 ? 
              'You haven\'t created any tours yet.' : 
              'No tours match your current filters.'}}
          </p>
          <button 
            class="btn btn-primary"
            (click)="createNewTour()">
            <i class="fas fa-plus me-1"></i>
            Create Your First Tour
          </button>
        </div>
      </div>

      <!-- Response Display -->
      <div *ngIf="response" class="card mt-4">
        <div class="card-body">
          <h5 class="card-title">API Response</h5>
          <div class="alert" [ngClass]="{
            'alert-success': response.message && !response.error,
            'alert-danger': response.error
          }">
            <pre>{{response | json}}</pre>
          </div>
        </div>
      </div>
    </div>
  `
})
export class MyToursComponent implements OnInit {
  loading: boolean = false;
  response: any = null;
  tours: Tour[] = [];
  filteredTours: Tour[] = [];

  filters = {
    status: '',
    difficulty: ''
  };

  constructor(
    private apiService: ApiService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadTours();
  }

  loadTours(): void {
    this.loading = true;
    
    // Get current user ID and filter by author
    const currentUserId = this.apiService.getCurrentUserId();
    
    this.apiService.getTours(currentUserId).subscribe({
      next: (data: any) => {
        this.tours = data.tours || [];
        this.applyFilters();
        this.response = data;
        this.loading = false;
      },
      error: (error) => {
        this.response = { error: error.message };
        this.loading = false;
      }
    });
  }

  applyFilters(): void {
    let filtered = [...this.tours];

    if (this.filters.status) {
      filtered = filtered.filter(tour => tour.status === this.filters.status);
    }

    if (this.filters.difficulty) {
      filtered = filtered.filter(tour => tour.difficulty === this.filters.difficulty);
    }

    this.filteredTours = filtered;
  }

  clearFilters(): void {
    this.filters = {
      status: '',
      difficulty: ''
    };
    this.applyFilters();
  }

  createNewTour(): void {
    this.router.navigate(['/create-tour']);
  }

  editTour(tour: Tour): void {
    // Navigate to edit tour page (to be implemented)
    this.router.navigate(['/edit-tour', tour.id]);
  }

  toggleStatus(tour: Tour): void {
    const newStatus = tour.status === 'draft' ? 'published' : 'draft';
    this.updateTourStatus(tour, newStatus);
  }

  archiveTour(tour: Tour): void {
    this.updateTourStatus(tour, 'archived');
  }

  updateTourStatus(tour: Tour, status: string): void {
    this.loading = true;
    
    this.apiService.updateTour(tour.id, { status: status as 'draft' | 'published' | 'archived' }).subscribe({
      next: (data: any) => {
        this.response = data;
        this.loading = false;
        if (data.message) {
          // Refresh tours list
          this.loadTours();
        }
      },
      error: (error) => {
        this.response = { error: error.message };
        this.loading = false;
      }
    });
  }

  getKeypointsPreview(tour: Tour): any[] {
    return tour.keypoints.slice(0, 3);
  }

  formatCoordinate(coord: number): string {
    return coord.toFixed(4);
  }

  formatDate(dateString: string): string {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString();
  }
}