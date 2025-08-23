// src/app/components/tour-execution/tour-execution.component.ts
import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService, Position } from '../../services/api.service';

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
                <p class="mb-0" *ngIf="tourDetails()">
                  {{tourDetails().name}} 
                  <span class="badge bg-light text-dark ms-2">{{tourDetails().difficulty | titlecase}}</span>
                </p>
                <p class="mb-0" *ngIf="!tourDetails()">Tour ID: {{tourId}}</p>
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

            <!-- Auto-check countdown -->
            <div class="mt-2" *ngIf="execution()?.status === 'active'">
              <div class="d-flex align-items-center justify-content-between">
                <small class="text-light opacity-75">
                  <i class="fas fa-clock me-1"></i>
                  Next position check in {{countdown()}} seconds
                </small>
                <div class="progress" style="width: 100px; height: 4px;">
                  <div class="progress-bar bg-light" 
                       [style.width.%]="(10 - countdown()) * 10"></div>
                </div>
              </div>
            </div>
          </div>
          
          <div class="card-body">
            <!-- Near Keypoint Alert -->
            <div class="alert alert-success alert-dismissible" 
                 *ngIf="nearKeypoint()" 
                 role="alert">
              <h6 class="alert-heading">
                <i class="fas fa-map-marker-alt me-2"></i>
                Keypoint Reached!
              </h6>
              <p class="mb-1">
                You've reached <strong>{{nearKeypointName()}}</strong>
                <span *ngIf="nearKeypointDistance()" class="text-muted">
                  ({{nearKeypointDistance()! | number:'1.0-1'}}m away)
                </span>
              </p>
              <small class="text-muted">This keypoint has been automatically marked as completed.</small>
            </div>

            <!-- Progress Section -->
            <div class="row mb-4">
              <div class="col-md-8">
                <div class="info-card">
                  <div class="d-flex justify-content-between align-items-center mb-2">
                    <h6 class="mb-0">Tour Progress</h6>
                    <span [class]="getStatusBadgeClass()">
                      {{execution()?.status || 'Loading'}}
                    </span>
                  </div>
                  
                  <div class="progress mb-2" style="height: 10px;">
                    <div 
                      class="progress-bar" 
                      [class]="getProgressBarClass()"
                      [style.width.%]="getProgressPercentage()"
                      role="progressbar">
                    </div>
                  </div>
                  
                  <div class="d-flex justify-content-between">
                    <small class="text-muted">
                      {{getCompletedKeypoints().length}} / {{getTotalKeypoints()}} keypoints completed
                    </small>
                    <small class="text-muted">
                      {{getProgressPercentage()}}%
                    </small>
                  </div>
                </div>
              </div>

              <div class="col-md-4">
                <div class="info-card">
                  <h6 class="mb-2">Tour Duration</h6>
                  <div class="h5 text-primary mb-0" *ngIf="execution()?.started_at">
                    {{formatDuration(execution()!.started_at)}}
                  </div>
                  <small class="text-muted">Since start</small>
                </div>
              </div>
            </div>

            <!-- Current Status Info -->
            <div class="row mb-4">
              <div class="col-md-6">
                <div class="info-card">
                  <h6 class="mb-2">
                    <i class="fas fa-location-arrow me-1"></i>
                    Current Position
                  </h6>
                  <div *ngIf="currentPosition(); else noPosition">
                    <p class="mb-1">
                      <strong>Lat:</strong> {{currentPosition()!.latitude.toFixed(6)}}<br>
                      <strong>Lng:</strong> {{currentPosition()!.longitude.toFixed(6)}}
                    </p>
                    <small class="text-muted">
                      Updated: {{formatDate(currentPosition()!.timestamp)}}
                    </small>
                  </div>
                  <ng-template #noPosition>
                    <p class="text-muted mb-1">Position not available</p>
                    <button 
                      class="btn btn-sm btn-outline-primary"
                      (click)="goToPositionSimulator()">
                      Set Position
                    </button>
                  </ng-template>
                </div>
              </div>

              <div class="col-md-6">
                <div class="info-card">
                  <h6 class="mb-2">
                    <i class="fas fa-clock me-1"></i>
                    Last Activity
                  </h6>
                  <p class="mb-1" *ngIf="execution()?.last_activity">
                    {{formatDate(execution()!.last_activity)}}
                  </p>
                  <small class="text-muted">Position check or keypoint completion</small>
                </div>
              </div>
            </div>

            <!-- Completed Keypoints -->
            <div class="mb-4" *ngIf="getCompletedKeypoints().length > 0">
              <h6 class="mb-3">
                <i class="fas fa-check-circle me-2 text-success"></i>
                Completed Keypoints ({{getCompletedKeypoints().length}})
              </h6>
              <div class="row">
                <div 
                  class="col-md-6 mb-2" 
                  *ngFor="let keypoint of getCompletedKeypoints()">
                  <div class="keypoint-item">
                    <div class="d-flex justify-content-between align-items-start">
                      <div>
                        <h6 class="mb-1">
                          <span class="badge bg-success rounded-circle me-2">
                            {{keypoint.keypoint_index}}
                          </span>
                          Keypoint {{keypoint.keypoint_index}}
                        </h6>
                        <small class="text-muted">
                          Completed: {{formatDate(keypoint.completed_at)}}
                        </small>
                      </div>
                      <i class="fas fa-check-circle text-success"></i>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Tour Details -->
            <div class="mb-4" *ngIf="tourDetails()">
              <h6 class="mb-3">
                <i class="fas fa-info-circle me-2"></i>
                Tour Information
              </h6>
              <div class="row">
                <div class="col-md-6">
                  <small class="text-muted">Distance:</small>
                  <p class="mb-2">{{tourDetails().distance_km | number:'1.1-1'}} km</p>
                </div>
                <div class="col-md-6">
                  <small class="text-muted">Total Keypoints:</small>
                  <p class="mb-2">{{tourDetails().keypoints?.length || 0}}</p>
                </div>
                <div class="col-12" *ngIf="tourDetails().description">
                  <small class="text-muted">Description:</small>
                  <p class="mb-2">{{tourDetails().description}}</p>
                </div>
              </div>
            </div>

            <!-- Completion Message -->
            <div class="alert alert-success" *ngIf="execution()?.status === 'completed'">
              <h6>
                <i class="fas fa-trophy me-2"></i>
                Congratulations! Tour Completed
              </h6>
              <p class="mb-0">
                You completed the tour on {{formatDate(execution()!.completed_at!)}}
              </p>
              <p class="mb-0 mt-2">
                Total duration: {{formatDuration(execution()!.started_at)}}
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
              <p class="mb-0 mt-1">
                Duration: {{formatDuration(execution()!.started_at)}}
              </p>
            </div>
          </div>
          
          <div class="card-footer">
            <div class="d-flex justify-content-between">
              <div>
                <button 
                  class="btn btn-outline-secondary me-2"
                  (click)="goToPositionSimulator()">
                  <i class="fas fa-location-arrow me-1"></i>
                  Position Simulator
                </button>

                <button 
                  class="btn btn-outline-info"
                  (click)="goToTourDetail()"
                  *ngIf="tourId">
                  <i class="fas fa-info-circle me-1"></i>
                  Tour Details
                </button>
              </div>
              
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

  // Novi signali za praćenje ture
  tourDetails = signal<any | null>(null);
  currentPosition = signal<Position | null>(null);

  // Tour ID iz route parametra
  tourId: string = '';

  // Auto-check interval
  private autoCheckInterval?: any;
  private countdownInterval?: any;

  // Computed values
  getCompletedKeypoints = computed(() => 
    this.execution()?.completed_keypoints || []
  );
  
  getTotalKeypoints = computed(() => {
    // Uzmi iz tour details umesto hardcoded
    return this.tourDetails()?.keypoints?.length || 0;
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
    // Čita tourId iz query parametara ili route parametara
    this.route.queryParams.subscribe(params => {
      if (params['tourId']) {
        this.tourId = params['tourId'];
        this.startTour();
      }
    });
    
    if (!this.tourId) {
      this.route.params.subscribe(params => {
        if (params['id']) {
          this.tourId = params['id'];
          this.startTour();
        }
      });
    }
  }

  ngOnDestroy(): void {
    this.stopAutoCheck();
  }

  private startTour(): void {
    if (!this.tourId) {
      this.error.set('No tour ID provided');
      return;
    }

    this.loading.set(true);
    
    // DODAJ OVO - učitaj tour details
    this.loadTourDetails();
    
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
        this.error.set(error.error?.error || 'Failed to start tour.');
      }
    });
  }

  private loadTourDetails(): void {
    this.apiService.getTourById(this.tourId).subscribe({
      next: (response) => {
        this.tourDetails.set(response.tour || response);
      },
      error: (error) => {
        console.warn('Failed to load tour details:', error);
      }
    });
}

  private startAutoCheck(): void {
    // Počni auto-checking svakih 10 sekundi
    this.autoCheckInterval = setInterval(() => {
      this.checkPosition();
    }, 10000);

    // Počni countdown timer
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

        // Ažuriraj trenutnu poziciju
        if (response.tour_execution.current_position) {
          this.currentPosition.set(response.tour_execution.current_position as Position);
        }

        if (response.near_keypoint) {
          this.nearKeypoint.set(true);
          this.nearKeypointName.set(response.keypoint_name || '');
          this.nearKeypointDistance.set(response.distance_to_keypoint || null);

          // Obriši obaveštenje nakon 5 sekundi
          setTimeout(() => {
            this.nearKeypoint.set(false);
          }, 5000);
        }

        // Zaustavi auto-check ako je tura završena ili napuštena
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
        
        // Ažuriraj execution status
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

  formatDuration(startDate: Date | string): string {
    try {
      const start = new Date(startDate);
      const now = new Date();
      const diffMs = now.getTime() - start.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      
      if (diffMins < 1) return 'Just started';
      if (diffMins < 60) return `${diffMins} min`;
      
      const hours = Math.floor(diffMins / 60);
      const mins = diffMins % 60;
      return `${hours}h ${mins}min`;
    } catch {
      return 'Unknown';
    }
  }

  // Navigation methods
  goToPositionSimulator(): void {
    this.router.navigate(['/position-simulator']);
  }

  goToTours(): void {
    this.router.navigate(['/tours']);
  }

  goToTourDetail(): void {
    if (this.tourId) {
      this.router.navigate(['/tours', this.tourId]);
    }
  }

  goBack(): void {
    this.router.navigate(['/']);
  }

}