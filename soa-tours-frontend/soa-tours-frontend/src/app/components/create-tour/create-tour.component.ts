import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';

interface TransportTime {
  transport_type: 'walking' | 'bicycle' | 'car';
  duration_minutes: number;
}

@Component({
  selector: 'app-create-tour',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container">
      <h2 class="text-white mb-4">
        <i class="fas fa-map-marked-alt me-2"></i>Create New Tour
      </h2>
      
      <div class="card mb-4">
        <div class="card-body">
          <h5 class="card-title">Basic Information</h5>
          
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
                <option value="">Select difficulty</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
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
            <label class="form-label">Tags (comma-separated) *</label>
            <input 
              type="text" 
              class="form-control" 
              [(ngModel)]="tagsInput"
              placeholder="history, walking, culture, nature"
              (blur)="updateTags()">
            <small class="text-muted">At least one tag is required for publishing</small>
          </div>
          
          <button 
            class="btn btn-primary"
            (click)="createTour()"
            [disabled]="loading">
            <i class="fas fa-plus me-1"></i>
            {{loading ? 'Creating...' : 'Create Tour'}}
          </button>
        </div>
      </div>

      <!-- Tour Management Section -->
      <div *ngIf="createdTour" class="card mb-4">
        <div class="card-header bg-success text-white">
          <h5 class="mb-0">
            <i class="fas fa-check-circle me-2"></i>
            Tour Created Successfully!
          </h5>
        </div>
        <div class="card-body">
          <div class="row">
            <div class="col-md-8">
              <h6 class="card-title">{{createdTour.name}}</h6>
              <p class="text-muted">{{createdTour.description}}</p>
              
              <div class="mb-2">
                <span class="badge bg-warning me-2">{{createdTour.status}}</span>
                <span class="badge bg-info me-2">{{createdTour.difficulty}}</span>
                <span class="badge bg-secondary">{{createdTour.tags?.length || 0}} tags</span>
              </div>
            </div>
            
            <div class="col-md-4 text-end">
              <div class="mb-2">
                <small class="text-muted">Tour ID:</small><br>
                <code class="small">{{createdTour.id}}</code>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Keypoints Management -->
      <div *ngIf="createdTour" class="card mb-4">
        <div class="card-header d-flex justify-content-between align-items-center">
          <h5 class="mb-0">
            <i class="fas fa-map-marker-alt me-2"></i>
            Manage Keypoints
          </h5>
          <span class="badge bg-primary">
            {{createdTour.keypoints?.length || 0}} keypoints
          </span>
        </div>
        
        <div class="card-body">
          <div class="row">
            <div class="col-md-8">
              <p class="text-muted mb-3">
                Use the interactive map to add keypoints to your tour. Click on the map to select locations.
              </p>
              
              <!-- Publishing Requirements -->
              <div class="publishing-requirements mb-3">
                <h6><i class="fas fa-list-check me-2"></i>Publishing Requirements:</h6>
                <ul class="list-unstyled">
                  <li [class]="getRequirementClass(hasBasicInfo())">
                    <i [class]="getRequirementIcon(hasBasicInfo())"></i>
                    Basic information (name, description, difficulty, tags)
                  </li>
                  <li [class]="getRequirementClass(hasMinimumKeypoints())">
                    <i [class]="getRequirementIcon(hasMinimumKeypoints())"></i>
                    At least 2 keypoints
                  </li>
                  <li [class]="getRequirementClass(hasTransportTimes())">
                    <i [class]="getRequirementIcon(hasTransportTimes())"></i>
                    At least one transport time
                  </li>
                </ul>
              </div>
              
              <!-- Keypoints Preview -->
              <div *ngIf="createdTour.keypoints && createdTour.keypoints.length > 0" class="keypoints-preview">
                <h6>Current Keypoints:</h6>
                <div class="keypoints-list">
                  <div class="keypoint-preview-item" 
                       *ngFor="let kp of createdTour.keypoints; let i = index">
                    <span class="keypoint-number">{{i + 1}}</span>
                    <div class="keypoint-info">
                      <strong>{{kp.name}}</strong>
                      <br>
                      <small class="text-muted">{{kp.description}}</small>
                    </div>
                    <div class="keypoint-coords text-end">
                      <small class="text-muted">
                        {{kp.latitude.toFixed(4)}}, {{kp.longitude.toFixed(4)}}
                      </small>
                    </div>
                  </div>
                </div>
              </div>
              
              <div *ngIf="!createdTour.keypoints || createdTour.keypoints.length === 0" class="text-center p-4">
                <i class="fas fa-map-marker-alt fa-3x text-muted mb-3"></i>
                <h6>No keypoints added yet</h6>
                <p class="text-muted">Use the map to add keypoints to your tour</p>
              </div>
            </div>
            
            <div class="col-md-4">
              <div class="d-grid gap-2">
                <button 
                  class="btn btn-success btn-lg"
                  (click)="openKeypointsMap()">
                  <i class="fas fa-map me-2"></i>
                  Manage Keypoints
                </button>
                
                <button 
                  class="btn btn-outline-info"
                  (click)="refreshTourData()">
                  <i class="fas fa-sync-alt me-2"></i>
                  Refresh Data
                </button>
              </div>
              
              <!-- Tour Stats -->
              <div class="tour-stats mt-3">
                <div class="stat-item">
                  <i class="fas fa-map-pin text-primary"></i>
                  <span class="stat-label">Keypoints:</span>
                  <span class="stat-value">{{createdTour.keypoints?.length || 0}}</span>
                </div>
                <div class="stat-item">
                  <i class="fas fa-ruler text-info"></i>
                  <span class="stat-label">Distance:</span>
                  <span class="stat-value">{{createdTour.distance_km || 0}} km</span>
                </div>
                <div class="stat-item">
                  <i class="fas fa-dollar-sign text-success"></i>
                  <span class="stat-label">Price:</span>
                  <span class="stat-value">{{createdTour.price || 0}} €</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Transport Times Management -->
      <div *ngIf="createdTour" class="card mb-4">
        <div class="card-header">
          <h5 class="mb-0">
            <i class="fas fa-clock me-2"></i>
            Transport Times
          </h5>
        </div>
        
        <div class="card-body">
          <div class="row">
            <div class="col-md-6">
              <p class="text-muted">
                Define how long it takes to complete the tour using different transport methods.
              </p>
              
              <!-- Add Transport Time Form -->
              <div class="add-transport-form">
                <h6>Add Transport Time:</h6>
                <div class="row">
                  <div class="col-md-6 mb-2">
                    <select class="form-select form-select-sm" [(ngModel)]="newTransportTime.transport_type">
                      <option value="">Select transport</option>
                      <option value="walking">Walking</option>
                      <option value="bicycle">Bicycle</option>
                      <option value="car">Car</option>
                    </select>
                  </div>
                  <div class="col-md-4 mb-2">
                    <input 
                      type="number" 
                      class="form-control form-control-sm" 
                      [(ngModel)]="newTransportTime.duration_minutes"
                      placeholder="Minutes"
                      min="1">
                  </div>
                  <div class="col-md-2 mb-2">
                    <button 
                      class="btn btn-sm btn-outline-primary w-100"
                      (click)="addTransportTime()"
                      [disabled]="!newTransportTime.transport_type || !newTransportTime.duration_minutes">
                      Add
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="col-md-6">
              <!-- Current Transport Times -->
              <div class="transport-times-list">
                <h6>Current Transport Times:</h6>
                <div *ngIf="createdTour.transport_times && createdTour.transport_times.length > 0">
                  <div class="transport-time-item" 
                       *ngFor="let tt of createdTour.transport_times">
                    <div class="d-flex justify-content-between align-items-center">
                      <div class="d-flex align-items-center">
                        <i class="fas me-2" [class]="getTransportIcon(tt.transport_type)"></i>
                        <span>{{getTransportLabel(tt.transport_type)}}</span>
                      </div>
                      <div class="d-flex align-items-center">
                        <span class="badge bg-secondary me-2">{{tt.duration_minutes}} min</span>
                        <button 
                          class="btn btn-sm btn-outline-danger"
                          (click)="removeTransportTime(tt.transport_type)">
                          <i class="fas fa-trash"></i>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div *ngIf="!createdTour.transport_times || createdTour.transport_times.length === 0" 
                     class="text-muted text-center p-3">
                  <i class="fas fa-clock fa-2x mb-2"></i>
                  <p>No transport times defined yet</p>
                  <small>Add at least one transport time to enable publishing</small>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div *ngIf="createdTour" class="card mb-4">
        <div class="card-body">
          <div class="row">
            <div class="col-md-8">
              <h5 class="card-title">Ready to Publish?</h5>
              <p class="text-muted">
                Make sure your tour meets all requirements before publishing.
              </p>
              
              <div class="publish-status">
                <div class="alert" [class]="canPublish() ? 'alert-success' : 'alert-warning'">
                  <i class="fas" [class]="canPublish() ? 'fa-check-circle' : 'fa-exclamation-triangle'"></i>
                  {{getPublishStatusMessage()}}
                </div>
              </div>
            </div>
            
            <div class="col-md-4 text-end">
              <div class="d-grid gap-2">
                <button 
                  class="btn btn-success btn-lg"
                  (click)="publishTour()"
                  [disabled]="!canPublish() || loading">
                  <i class="fas fa-rocket me-2"></i>
                  {{loading ? 'Publishing...' : 'Publish Tour'}}
                </button>
                
                <button 
                  class="btn btn-primary"
                  (click)="viewTours()">
                  <i class="fas fa-list me-2"></i>
                  View My Tours
                </button>
                
                <button 
                  class="btn btn-outline-secondary"
                  (click)="goBack()">
                  <i class="fas fa-arrow-left me-2"></i>
                  Back to Dashboard
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- API Response -->
      <div *ngIf="response" class="card mt-4">
        <div class="card-body">
          <h5 class="card-title">API Response</h5>
          <div class="alert" [class]="response.error ? 'alert-danger' : 'alert-info'">
            <pre>{{response | json}}</pre>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .keypoint-preview-item {
      display: flex;
      align-items: center;
      padding: 0.75rem;
      border: 1px solid #dee2e6;
      border-radius: 8px;
      margin-bottom: 0.5rem;
      background: #f8f9fa;
      transition: all 0.2s ease;
    }

    .keypoint-preview-item:hover {
      background: #e3f2fd;
      border-color: #007bff;
    }

    .keypoint-number {
      background: #007bff;
      color: white;
      border-radius: 50%;
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.9rem;
      font-weight: bold;
      margin-right: 1rem;
    }

    .keypoint-info {
      flex: 1;
    }

    .keypoint-coords {
      min-width: 120px;
    }

    .publishing-requirements ul li {
      padding: 0.25rem 0;
      transition: color 0.2s ease;
    }

    .requirement-met {
      color: #28a745;
    }

    .requirement-pending {
      color: #ffc107;
    }

    .transport-time-item {
      padding: 0.5rem;
      border: 1px solid #dee2e6;
      border-radius: 6px;
      margin-bottom: 0.5rem;
      background: #f8f9fa;
    }

    .add-transport-form {
      background: #f8f9fa;
      border-radius: 8px;
      padding: 1rem;
      margin-bottom: 1rem;
    }

    .tour-stats .stat-item {
      display: flex;
      align-items: center;
      padding: 0.5rem 0;
      border-bottom: 1px solid #eee;
    }

    .tour-stats .stat-item:last-child {
      border-bottom: none;
    }

    .tour-stats .stat-label {
      margin-left: 0.5rem;
      flex: 1;
    }

    .tour-stats .stat-value {
      font-weight: bold;
      color: #495057;
    }

    .card-header {
      border-radius: 15px 15px 0 0;
    }

    .card {
      border: none;
      border-radius: 15px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
  `]
})
export class CreateTourComponent implements OnInit {
  loading: boolean = false;
  response: any = null;
  createdTour: any = null;

  tourData = {
    name: '',
    description: '',
    difficulty: '',
    tags: [] as string[]
  };

  tagsInput: string = '';

  newTransportTime: TransportTime = {
    transport_type: 'walking',
    duration_minutes: 0
  };

  constructor(
    private apiService: ApiService,
    private router: Router
  ) {}

  ngOnInit(): void {}

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

  createTour(): void {
    if (!this.tourData.name || !this.tourData.description || !this.tourData.difficulty) {
      alert('Please fill all required fields');
      return;
    }

    this.loading = true;
    this.apiService.createTour({
      name: this.tourData.name,
      description: this.tourData.description,
      difficulty: this.tourData.difficulty as 'easy' | 'medium' | 'hard',
      tags: this.tourData.tags
    }).subscribe({
      next: (data: any) => {
        this.response = data;
        this.loading = false;
        if (data.tour) {
          this.createdTour = data.tour;
        }
      },
      error: (error) => {
        this.response = { error: error.message };
        this.loading = false;
      }
    });
  }

  openKeypointsMap(): void {
    if (this.createdTour) {
      this.router.navigate(['/tour-keypoints', this.createdTour.id]);
    }
  }

  refreshTourData(): void {
    this.loadTourData();
  }

  loadTourData(): void {
    if (!this.createdTour) return;
    
    this.apiService.getTourById(this.createdTour.id).subscribe({
      next: (data: any) => {
        if (data.tour) {
          this.createdTour = data.tour;
        }
      },
      error: (error) => {
        console.error('Failed to reload tour data:', error);
      }
    });
  }

  addTransportTime(): void {
    if (!this.newTransportTime.transport_type || !this.newTransportTime.duration_minutes || !this.createdTour) {
      return;
    }

    this.loading = true;
    this.apiService.addTransportTime(this.createdTour.id, this.newTransportTime).subscribe({
      next: () => {
        this.loading = false;
        this.newTransportTime = { transport_type: 'walking', duration_minutes: 0 };
        this.loadTourData();
      },
      error: (error) => {
        this.loading = false;
        console.error('Error adding transport time:', error);
        alert('Failed to add transport time. Please try again.');
      }
    });
  }

  removeTransportTime(transportType: string): void {
    if (!this.createdTour) return;

    if (confirm('Are you sure you want to remove this transport time?')) {
      this.apiService.removeTransportTime(this.createdTour.id, transportType).subscribe({
        next: () => {
          this.loadTourData();
        },
        error: (error) => {
          console.error('Error removing transport time:', error);
          alert('Failed to remove transport time. Please try again.');
        }
      });
    }
  }

  publishTour(): void {
    if (!this.canPublish()) {
      alert('Tour does not meet publishing requirements. Please check all requirements.');
      return;
    }

    if (confirm('Are you sure you want to publish this tour? Published tours will be visible to all users.')) {
      this.loading = true;
      this.apiService.updateTour(this.createdTour.id, { status: 'published' }).subscribe({
        next: (response) => {
          this.loading = false;
          this.response = response;
          this.loadTourData();
          alert('Tour published successfully!');
        },
        error: (error) => {
          this.loading = false;
          this.response = { error: error.error };
          alert('Failed to publish tour: ' + (error.error?.error || 'Unknown error'));
        }
      });
    }
  }

  // Helper methods
  hasBasicInfo(): boolean {
    return !!(this.createdTour?.name && 
             this.createdTour?.description && 
             this.createdTour?.difficulty && 
             this.createdTour?.tags?.length > 0);
  }

  hasMinimumKeypoints(): boolean {
    return (this.createdTour?.keypoints?.length || 0) >= 2;
  }

  hasTransportTimes(): boolean {
    return (this.createdTour?.transport_times?.length || 0) > 0;
  }

  canPublish(): boolean {
    return this.hasBasicInfo() && this.hasMinimumKeypoints() && this.hasTransportTimes();
  }

  getRequirementClass(met: boolean): string {
    return met ? 'requirement-met' : 'requirement-pending';
  }

  getRequirementIcon(met: boolean): string {
    return met ? 'fas fa-check-circle me-2' : 'fas fa-exclamation-circle me-2';
  }

  getPublishStatusMessage(): string {
    if (this.canPublish()) {
      return 'Your tour meets all requirements and is ready to be published!';
    }
    
    const missing = [];
    if (!this.hasBasicInfo()) missing.push('basic information');
    if (!this.hasMinimumKeypoints()) missing.push('minimum 2 keypoints');
    if (!this.hasTransportTimes()) missing.push('transport times');
    
    return `Missing: ${missing.join(', ')}`;
  }

  getTransportIcon(type: string): string {
    const icons = {
      walking: 'fa-walking',
      bicycle: 'fa-bicycle', 
      car: 'fa-car'
    };
    return icons[type as keyof typeof icons] || 'fa-question';
  }

  getTransportLabel(type: string): string {
    const labels = {
      walking: 'Walking',
      bicycle: 'Bicycle',
      car: 'Car'
    };
    return labels[type as keyof typeof labels] || type;
  }

  viewTours(): void {
    this.router.navigate(['/my-tours']);
  }

  goBack(): void {
    this.router.navigate(['/']);
  }
}