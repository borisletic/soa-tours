// src/app/components/tour-execution/tour-execution.component.ts
import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../services/api.service';

interface TourExecution {
  id: string;
  user_id: number;
  tour_id: string;
  status: 'active' | 'completed' | 'abandoned';
  current_position?: {
    latitude: number;
    longitude: number;
    timestamp: Date;
  };
  completed_keypoints: CompletedKeypoint[];
  started_at: Date;
  completed_at?: Date;
  abandoned_at?: Date;
  last_activity: Date;
}

interface CompletedKeypoint {
  keypoint_index: number;
  completed_at: Date;
  latitude: number;
  longitude: number;
}

interface CheckKeypointsResponse {
  near_keypoint: boolean;
  keypoint_index?: number;
  keypoint_name?: string;
  distance_to_keypoint?: number;
  completed_keypoint?: CompletedKeypoint;
  tour_execution: TourExecution;
}

@Component({
  selector: 'app-tour-execution',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="container">
      <div class="row">
        <div class="col-12">
          <div class="card shadow-lg">
            <div class="card-header" [class]="getHeaderClass()">
              <div class="d-flex justify-content-between align-items-center">
                <div>
                  <h3 class="mb-1">
                    <i [class]="getStatusIcon()"></i>
                    {{getStatusText()}}
                  </h3>
                  <p class="mb-0">Tour ID: {{tourId}}</p>
                </div>
                
                <div class="text-end">
                  <div class="btn-group">
                    <button 
                      class="btn btn-outline-light"
                      (click)="checkPosition()"
                      [disabled]="loading() || execution()?.status !== 'active'">
                      <i class="fas fa-sync-alt me-1" [class.fa-spin]="loading()"></i>
                      Check Position
                    </button>
                    
                    <button 
                      class="btn btn-danger"
                      (click)="abandonTour()"
                      [disabled]="loading() || execution()?.status !== 'active'"
                      *ngIf="execution()?.status === 'active'">
                      <i class="fas fa-times me-1"></i>
                      Abandon Tour
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="card-body">
              <!-- Current Status -->
              <div class="row mb-4">
                <div class="col-md-6">
                  <div class="info-card">
                    <h6><i class="fas fa-info-circle me-2"></i>Tour Status</h6>
                    <div class="d-flex align-items-center">
                      <span [class]="getStatusBadgeClass()">
                        {{execution()?.status | titlecase}}
                      </span>
                      <span class="ms-3 text-muted" *ngIf="execution()">
                        Started: {{formatDate(execution()!.started_at)}}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div class="col-md-6">
                  <div class="info-card">
                    <h6><i class="fas fa-map-marker-alt me-2"></i>Current Position</h6>
                    <div *ngIf="execution()?.current_position">
                      <small class="text-muted">
                        {{execution()!.current_position!.latitude.toFixed(6)}}, 
                        {{execution()!.current_position!.longitude.toFixed(6)}}
                      </small>
                      <br>
                      <small class="text-muted">
                        Updated: {{formatDate(execution()!.current_position!.timestamp)}}
                      </small>
                    </div>
                    <div *ngIf="!execution()?.current_position" class="text-warning">
                      <i class="fas fa-exclamation-triangle me-1"></i>
                      No position data
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- Progress -->
              <div class="mb-4" *ngIf="execution()">
                <h6><i class="fas fa-tasks me-2"></i>Progress</h6>
                <div class="progress mb-2">
                  <div 
                    class="progress-bar" 
                    [style.width.%]="getProgressPercentage()"
                    [class]="getProgressBarClass()">
                    {{getCompletedKeypoints().length}} / {{getTotalKeypoints()}} keypoints
                  </div>
                </div>
                <small class="text-muted">
                  {{getProgressPercentage()}}% complete
                </small>
              </div>
              
              <!-- Completed Keypoints -->
              <div class="mb-4" *ngIf="getCompletedKeypoints().length > 0">
                <h6><i class="fas fa-check-circle me-2"></i>Completed Keypoints</h6>
                <div class="completed-keypoints">
                  <div 
                    class="keypoint-item completed" 
                    *ngFor="let kp of getCompletedKeypoints()">
                    <div class="d-flex justify-content-between align-items-center">
                      <div>
                        <strong>Keypoint #{{kp.keypoint_index + 1}}</strong>
                        <br>
                        <small class="text-success">
                          <i class="fas fa-check me-1"></i>
                          Completed at {{formatDate(kp.completed_at)}}
                        </small>
                      </div>
                      <div class="text-end">
                        <small class="text-muted">
                          {{kp.latitude.toFixed(4)}}, {{kp.longitude.toFixed(4)}}
                        </small>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- Near Keypoint Alert -->
              <div class="alert alert-success" *ngIf="nearKeypoint()">
                <h6>
                  <i class="fas fa-location-arrow me-2"></i>
                  You're near a keypoint!
                </h6>
                <p class="mb-2">
                  <strong>{{nearKeypointName()}}</strong> 
                  ({{nearKeypointDistance()?.toFixed(1)}}m away)
                </p>
                <small>
                  Keypoint has been automatically marked as completed.
                </small>
              </div>
              
              <!-- Auto-check status -->
              <div class="alert alert-info" *ngIf="execution()?.status === 'active'">
                <div class="d-flex align-items-center justify-content-between">
                  <div>
                    <i class="fas fa-clock me-2"></i>
                    Auto-checking your position every 10 seconds...
                  </div>
                  <div>
                    <span class="badge bg-primary">
                      Next check: {{countdown()}}s
                    </span>
                  </div>
                </div>
              </div>
              
              <!-- Completion Message -->
              <div class="alert alert-success" *ngIf="execution()?.status === 'completed'">
                <h5>
                  <i class="fas fa-trophy me-2"></i>
                  Congratulations! Tour Completed!
                </h5>
                <p class="mb-0">
                  You completed the tour on {{formatDate(execution()!.completed_at!)}}
                </p>
              </div>
              
              <!-- Abandonment Message -->
              <div class="alert alert-warning" *ngIf="execution()?.status === 'abandoned'">
                <h6>
                  <i class="fas fa-times-circle me-2"></i>
                  Tour Abandoned
                </h6>
                <p class="mb-0">
                  Tour was abandoned on {{formatDate(execution()!.abandoned_at!)}}
                </p>
              </div>
            </div>
            
            <div class="card-footer">
              <div class="d-flex justify-content-between">
                <button 
                  class="btn btn-outline-secondary"
                  (click)="goToPositionSimulator()">
                  <i class="fas fa-location-arrow me-1"></i>
                  Position Simulator
                </button>
                
                <div>
                  <button 
                    class="btn btn-primary me-2"
                    (click)="goToTours()">
                    <i class="fas fa-route me-1"></i>
                    All Tours
                  </button>
                  
                  <button 
                    class="btn btn-secondary"
                    (click)="goBack()">
                    <i class="fas fa-arrow-left me-1"></i>
                    Back
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Loading/Error -->
      <div class="row mt-3" *ngIf="error()">
        <div class="col-12">
          <div class="alert alert-danger" role="alert">
            <i class="fas fa-exclamation-triangle me-2"></i>
            {{error()}}
            <button 
              type="button" 
              class="btn-close float-end" 
              (click)="error.set('')">
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .card {
      border: none;
      border-radius: 15px;
    }
    
    .info-card {
      background: #f8f9fa;
      border-radius: 8px;
      padding: 1rem;
      border-left: 4px solid #007bff;
    }
    
    .keypoint-item {
      background: #f8f9fa;
      border-radius: 8px;
      padding: 0.75rem;
      margin-bottom: 0.5rem;
      border-left: 4px solid #28a745;
    }
    
    .progress {
      height: 8px;
      border-radius: 4px;
    }
    
    .badge {
      font-size: 0.8rem;
    }
    
    .alert {
      border-radius: 8px;
    }
    
    .bg-success-gradient {
      background: linear-gradient(135deg, #28a745, #20c997);
    }
    
    .bg-danger-gradient {
      background: linear-gradient(135deg, #dc3545, #fd7e14);
    }
    
    .bg-warning-gradient {
      background: linear-gradient(135deg, #ffc107, #fd7e14);
    }
    
    .bg-primary-gradient {
      background: linear-gradient(135deg, #007bff, #6f42c1);
    }
  `]
})
export class TourExecutionComponent implements OnInit, OnDestroy {
  // Signals for reactive state
  execution = signal<TourExecution | null>(null);
  loading = signal<boolean>(false);
  error = signal<string>('');
  nearKeypoint = signal<boolean>(false);
  nearKeypointName = signal<string>('');
  nearKeypointDistance = signal<number | null>(null);
  countdown = signal<number>(10);

  // Tour ID from route
  tourId: string = '';

  // Auto-check interval
  private autoCheckInterval?: any;
  private countdownInterval?: any;

  // Computed values
  getCompletedKeypoints = computed(() => 
    this.execution()?.completed_keypoints || []
  );
  
  getTotalKeypoints = computed(() => {
    // This would ideally come from tour data, for now use a mock
    return 5; // Should be fetched from tour details
  });

  getProgressPercentage = computed(() => {
    const completed = this.getCompletedKeypoints().length;
    const total = this.getTotalKeypoints();
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  });

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private apiService: ApiService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.tourId = params['id'];
      if (this.tourId) {
        this.startTour();
      }
    });
  }

  ngOnDestroy(): void {
    this.stopAutoCheck();
  }

  private startTour(): void {
    this.loading.set(true);
    
    this.apiService.startTour(this.tourId).subscribe({
      next: (response: any) => {
        this.loading.set(false);
        if (response.tour_execution) {
          this.execution.set(response.tour_execution);
          this.startAutoCheck();
        }
      },
      error: (error) => {
        this.loading.set(false);
        this.error.set(error.error?.error || 'Failed to start tour. Please make sure you have set your position using the Position Simulator.');
      }
    });
  }

  private startAutoCheck(): void {
    // Start auto-checking every 10 seconds
    this.autoCheckInterval = setInterval(() => {
      this.checkPosition();
    }, 10000);

    // Start countdown timer
    this.startCountdown();
  }

  private startCountdown(): void {
    this.countdown.set(10);
    this.countdownInterval = setInterval(() => {
      const current = this.countdown();
      if (current > 1) {
        this.countdown.set(current - 1);
      } else {
        this.countdown.set(10); // Reset
      }
    }, 1000);
  }

  private stopAutoCheck(): void {
    if (this.autoCheckInterval) {
      clearInterval(this.autoCheckInterval);
      this.autoCheckInterval = null;
    }
    
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
  }

  checkPosition(): void {
    if (this.loading() || !this.execution() || this.execution()!.status !== 'active') {
      return;
    }

    this.loading.set(true);
    this.nearKeypoint.set(false);

    this.apiService.checkKeypoints().subscribe({
      next: (response: CheckKeypointsResponse) => {
        this.loading.set(false);
        this.execution.set(response.tour_execution);

        if (response.near_keypoint) {
          this.nearKeypoint.set(true);
          this.nearKeypointName.set(response.keypoint_name || '');
          this.nearKeypointDistance.set(response.distance_to_keypoint || null);

          // Clear the near keypoint notification after 5 seconds
          setTimeout(() => {
            this.nearKeypoint.set(false);
          }, 5000);
        }

        // Stop auto-check if tour is completed or abandoned
        if (response.tour_execution.status !== 'active') {
          this.stopAutoCheck();
        }
      },
      error: (error) => {
        this.loading.set(false);
        this.error.set(error.error?.error || 'Failed to check position');
      }
    });
  }

  abandonTour(): void {
    if (!this.execution() || this.execution()!.status !== 'active') {
      return;
    }

    if (!confirm('Are you sure you want to abandon this tour? This action cannot be undone.')) {
      return;
    }

    this.loading.set(true);

    this.apiService.abandonTour(this.execution()!.id).subscribe({
      next: () => {
        this.loading.set(false);
        this.stopAutoCheck();
        
        // Update execution status
        const updatedExecution = { ...this.execution()! };
        updatedExecution.status = 'abandoned';
        updatedExecution.abandoned_at = new Date();
        this.execution.set(updatedExecution);
      },
      error: (error) => {
        this.loading.set(false);
        this.error.set(error.error?.error || 'Failed to abandon tour');
      }
    });
  }

  // Status and styling helpers
  getStatusText(): string {
    const status = this.execution()?.status;
    switch (status) {
      case 'active': return 'Tour in Progress';
      case 'completed': return 'Tour Completed';
      case 'abandoned': return 'Tour Abandoned';
      default: return 'Loading...';
    }
  }

  getStatusIcon(): string {
    const status = this.execution()?.status;
    switch (status) {
      case 'active': return 'fas fa-play-circle text-white me-2';
      case 'completed': return 'fas fa-trophy text-white me-2';
      case 'abandoned': return 'fas fa-times-circle text-white me-2';
      default: return 'fas fa-spinner fa-spin text-white me-2';
    }
  }

  getHeaderClass(): string {
    const status = this.execution()?.status;
    switch (status) {
      case 'active': return 'card-header bg-primary-gradient text-white';
      case 'completed': return 'card-header bg-success-gradient text-white';
      case 'abandoned': return 'card-header bg-danger-gradient text-white';
      default: return 'card-header bg-secondary text-white';
    }
  }

  getStatusBadgeClass(): string {
    const status = this.execution()?.status;
    switch (status) {
      case 'active': return 'badge bg-primary';
      case 'completed': return 'badge bg-success';
      case 'abandoned': return 'badge bg-danger';
      default: return 'badge bg-secondary';
    }
  }

  getProgressBarClass(): string {
    const percentage = this.getProgressPercentage();
    if (percentage === 100) return 'bg-success';
    if (percentage >= 75) return 'bg-info';
    if (percentage >= 50) return 'bg-warning';
    return 'bg-danger';
  }

  // Utility methods
  formatDate(dateString: Date | string): string {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('sr-RS', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Invalid date';
    }
  }

  // Navigation methods
  goToPositionSimulator(): void {
    this.router.navigate(['/position-simulator']);
  }

  goToTours(): void {
    this.router.navigate(['/tours']);
  }

  goBack(): void {
    this.router.navigate(['/']);
  }

}