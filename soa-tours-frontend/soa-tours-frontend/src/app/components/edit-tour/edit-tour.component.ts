import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { ApiService } from '../../services/api.service';

interface TransportTime {
  transport_type: 'walking' | 'bicycle' | 'car';
  duration_minutes: number;
}

@Component({
  selector: 'app-edit-tour',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container">
      <div class="d-flex justify-content-between align-items-center mb-4">
        <h2 class="text-white">
          <i class="fas fa-edit me-2"></i>Edit Tour
        </h2>
        <button 
          class="btn btn-secondary"
          (click)="goBack()">
          <i class="fas fa-arrow-left me-1"></i>
          Back to My Tours
        </button>
      </div>

      <!-- Loading State -->
      <div *ngIf="loading" class="text-center">
        <div class="spinner-border text-light" role="status"></div>
        <p class="text-white mt-2">Loading tour details...</p>
      </div>

      <!-- Error State -->
      <div *ngIf="error" class="alert alert-danger">
        <i class="fas fa-exclamation-triangle me-2"></i>
        {{error}}
      </div>

      <!-- Edit Form -->
      <div *ngIf="!loading && !error && tourData.name" class="card mb-4">
        <div class="card-body">
          <h5 class="card-title">Tour Information</h5>
          
          <div class="row">
            <div class="col-md-6 mb-3">
              <label class="form-label">Tour Name *</label>
              <input 
                type="text" 
                class="form-control" 
                [(ngModel)]="tourData.name"
                placeholder="Enter tour name">
            </div>
            
            <div class="col-md-6 mb-3">
              <label class="form-label">Difficulty *</label>
              <select class="form-select" [(ngModel)]="tourData.difficulty">
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
          </div>

          <div class="row">
            <div class="col-md-6 mb-3">
              <label class="form-label">Price (€) *</label>
              <div class="input-group">
                <span class="input-group-text">€</span>
                <input 
                  type="number" 
                  class="form-control" 
                  [(ngModel)]="tourData.price"
                  placeholder="0.00"
                  min="0"
                  step="0.01">
              </div>
              <small class="text-muted">Current price: €{{tourData.price || 0}}</small>
            </div>
            
            <div class="col-md-6 mb-3">
              <label class="form-label">Status</label>
              <select class="form-select" [(ngModel)]="tourData.status">
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>
          
          <div class="mb-3">
            <label class="form-label">Description *</label>
            <textarea 
              class="form-control" 
              rows="4"
              [(ngModel)]="tourData.description"
              placeholder="Describe your tour"></textarea>
          </div>
          
          <div class="mb-3">
            <label class="form-label">Tags (comma-separated)</label>
            <input 
              type="text" 
              class="form-control" 
              [(ngModel)]="tagsInput"
              placeholder="history, walking, culture, nature"
              (blur)="updateTags()">
          </div>

          <!-- Transport Times Section -->
          <div class="mb-4">
            <h6>Transport Times</h6>
            <div class="row">
              <div class="col-md-4 mb-2">
                <label class="form-label small">Walking (minutes)</label>
                <input 
                  type="number" 
                  class="form-control form-control-sm" 
                  [(ngModel)]="walkingTime"
                  min="0"
                  placeholder="0">
              </div>
              <div class="col-md-4 mb-2">
                <label class="form-label small">Cycling (minutes)</label>
                <input 
                  type="number" 
                  class="form-control form-control-sm" 
                  [(ngModel)]="cyclingTime"
                  min="0"
                  placeholder="0">
              </div>
              <div class="col-md-4 mb-2">
                <label class="form-label small">Driving (minutes)</label>
                <input 
                  type="number" 
                  class="form-control form-control-sm" 
                  [(ngModel)]="drivingTime"
                  min="0"
                  placeholder="0">
              </div>
            </div>
          </div>
          
          <div class="d-flex gap-2">
            <button 
              class="btn btn-primary"
              (click)="updateTour()"
              [disabled]="updating">
              <i class="fas fa-save me-1"></i>
              {{updating ? 'Updating...' : 'Update Tour'}}
            </button>
            
            <button 
              class="btn btn-outline-secondary"
              (click)="goBack()">
              <i class="fas fa-times me-1"></i>
              Cancel
            </button>
          </div>
        </div>
      </div>

      <!-- Success/Error Messages -->
      <div *ngIf="successMessage" class="alert alert-success">
        <i class="fas fa-check-circle me-2"></i>
        {{successMessage}}
      </div>

      <div *ngIf="updateError" class="alert alert-danger">
        <i class="fas fa-exclamation-triangle me-2"></i>
        {{updateError}}
      </div>
    </div>
  `,
  styles: [`
    .card {
      border: none;
      border-radius: 15px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
  `]
})
export class EditTourComponent implements OnInit {
  loading: boolean = false;
  updating: boolean = false;
  error: string = '';
  updateError: string = '';
  successMessage: string = '';
  
  tourId: string = '';
  tourData: any = {
    name: '',
    description: '',
    difficulty: '',
    price: 0,
    status: 'draft',
    tags: []
  };

  tagsInput: string = '';
  walkingTime: number = 0;
  cyclingTime: number = 0;
  drivingTime: number = 0;

  constructor(
    private apiService: ApiService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.tourId = params['id'];
      if (this.tourId) {
        this.loadTourDetails();
      }
    });
  }

  loadTourDetails(): void {
    this.loading = true;
    this.error = '';

    this.apiService.getTourById(this.tourId).subscribe({
      next: (response: any) => {
        const tour = response.tour || response;
        this.tourData = {
          name: tour.name,
          description: tour.description,
          difficulty: tour.difficulty,
          price: tour.price || 0,
          status: tour.status,
          tags: tour.tags || []
        };
        
        this.tagsInput = tour.tags ? tour.tags.join(', ') : '';
        
        // Load transport times if available
        if (tour.transport_times) {
          const walking = tour.transport_times.find((t: any) => t.transport_type === 'walking');
          const cycling = tour.transport_times.find((t: any) => t.transport_type === 'bicycle');
          const driving = tour.transport_times.find((t: any) => t.transport_type === 'car');
          
          this.walkingTime = walking ? walking.duration_minutes : 0;
          this.cyclingTime = cycling ? cycling.duration_minutes : 0;
          this.drivingTime = driving ? driving.duration_minutes : 0;
        }
        
        this.loading = false;
      },
      error: (error) => {
        this.error = error.error?.error || 'Failed to load tour details';
        this.loading = false;
      }
    });
  }

  updateTags(): void {
    if (this.tagsInput.trim()) {
      this.tourData.tags = this.tagsInput
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);
    } else {
      this.tourData.tags = [];
    }
  }

  updateTour(): void {
    if (!this.tourData.name || !this.tourData.description || !this.tourData.difficulty) {
      this.updateError = 'Please fill all required fields';
      return;
    }

    if (this.tourData.price < 0) {
      this.updateError = 'Price cannot be negative';
      return;
    }

    this.updating = true;
    this.updateError = '';
    this.successMessage = '';

    // Prepare transport times
    const transportTimes = [];
    if (this.walkingTime > 0) {
      transportTimes.push({ transport_type: 'walking', duration_minutes: this.walkingTime });
    }
    if (this.cyclingTime > 0) {
      transportTimes.push({ transport_type: 'bicycle', duration_minutes: this.cyclingTime });
    }
    if (this.drivingTime > 0) {
      transportTimes.push({ transport_type: 'car', duration_minutes: this.drivingTime });
    }

    const updateData = {
      ...this.tourData,
      transport_times: transportTimes
    };

    this.apiService.updateTour(this.tourId, updateData).subscribe({
      next: (response: any) => {
        this.updating = false;
        this.successMessage = 'Tour updated successfully!';
        
        // Clear success message after 3 seconds
        setTimeout(() => {
          this.successMessage = '';
        }, 3000);
      },
      error: (error) => {
        this.updating = false;
        this.updateError = error.error?.error || 'Failed to update tour';
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/my-tours']);
  }
}