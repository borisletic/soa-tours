import { Component, OnInit, signal, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ApiService } from '../../services/api.service';
import * as L from 'leaflet';

interface Position {
  user_id: number;
  latitude: number;
  longitude: number;
  timestamp: Date;
  accuracy?: number;
}

@Component({
  selector: 'app-position-simulator',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="container-fluid">
      <div class="row">
        <div class="col-12">
          <div class="card shadow-lg">
            <div class="card-header bg-primary text-white">
              <h2 class="mb-0">
                <i class="fas fa-location-arrow me-2"></i>
                Position Simulator
              </h2>
              <p class="mb-0">Click on the map to set your current position</p>
            </div>
            
            <div class="card-body p-0">
              <!-- Position Info -->
              <div class="bg-light p-3 border-bottom">
                <div class="row">
                  <div class="col-md-6">
                    <div class="d-flex align-items-center">
                      <i class="fas fa-crosshairs text-primary me-2"></i>
                      <div>
                        <strong>Current Position:</strong>
                        <span *ngIf="currentPosition()" class="ms-2">
                          {{currentPosition()?.latitude != null ? (currentPosition()!.latitude).toFixed(6) : ''}}, {{currentPosition()?.longitude != null ? (currentPosition()!.longitude).toFixed(6) : ''}}
                        </span>
                        <span *ngIf="!currentPosition()" class="text-muted ms-2">
                          Not set - click on map to set position
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div class="col-md-6 text-end">
                    <button 
                      class="btn btn-outline-secondary me-2"
                      (click)="centerMapOnPosition()"
                      [disabled]="!currentPosition()">
                      <i class="fas fa-expand-arrows-alt me-1"></i>
                      Center Map
                    </button>
                    
                    <button 
                      class="btn btn-warning"
                      (click)="clearPosition()"
                      [disabled]="!currentPosition()">
                      <i class="fas fa-trash me-1"></i>
                      Clear Position
                    </button>
                  </div>
                </div>
                
                <div class="row mt-2" *ngIf="currentPosition()">
                  <div class="col-12">
                    <small class="text-muted">
                      <i class="fas fa-clock me-1"></i>
                      Last updated: {{formatTimestamp(currentPosition()?.timestamp!)}}
                    </small>
                  </div>
                </div>
              </div>

              <!-- Active Tour Integration Section - NOVO! -->
              <div class="row mb-4" *ngIf="activeTour()">
                <div class="col-12">
                  <div class="card border-warning">
                    <div class="card-header bg-warning text-dark">
                      <h5 class="mb-0">
                        <i class="fas fa-route me-2"></i>
                        Active Tour Integration
                      </h5>
                    </div>
                    <div class="card-body">
                      <div class="row">
                        <div class="col-md-8">
                          <h6 class="text-primary">Tour in Progress</h6>
                          <p class="mb-2">
                            <strong>Status:</strong> 
                            <span class="badge bg-primary ms-1">{{activeTour()!.status | titlecase}}</span>
                          </p>
                          <p class="mb-2">
                            <strong>Progress:</strong> 
                            {{activeTour()!.completed_keypoints?.length || 0}} keypoints completed
                          </p>
                          <p class="mb-3">
                            <strong>Started:</strong> 
                            {{activeTour()!.started_at | date:'medium'}}
                          </p>

                          <!-- Nearby Keypoints -->
                          <div *ngIf="nearbyKeypoints().length > 0" class="mb-3">
                            <h6 class="text-success">
                              <i class="fas fa-map-marker-alt me-1"></i>
                              Nearby Keypoints (within 100m)
                            </h6>
                            <div class="row">
                              <div class="col-md-6 mb-2" *ngFor="let keypoint of nearbyKeypoints()">
                                <div class="card border-success">
                                  <div class="card-body py-2">
                                    <div class="d-flex justify-content-between align-items-center">
                                      <div>
                                        <h6 class="mb-1">{{keypoint.name}}</h6>
                                        <small class="text-muted">
                                          {{keypoint.distance | number:'1.0-0'}}m away
                                        </small>
                                      </div>
                                      <button 
                                        class="btn btn-sm btn-success"
                                        (click)="moveToKeypoint(keypoint)"
                                        [disabled]="loading()">
                                        <i class="fas fa-location-arrow me-1"></i>
                                        Go Here
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div *ngIf="nearbyKeypoints().length === 0" class="text-muted">
                            <i class="fas fa-info-circle me-1"></i>
                            No keypoints nearby. Move closer to discover tour keypoints.
                          </div>
                        </div>

                        <div class="col-md-4">
                          <div class="d-grid gap-2">
                            <button 
                              class="btn btn-warning"
                              (click)="simulateTourProgress()"
                              [disabled]="loading()">
                              <i class="fas fa-fast-forward me-2"></i>
                              Quick Progress
                            </button>
                            
                            <button 
                              class="btn btn-outline-primary"
                              routerLink="/tour-execution">
                              <i class="fas fa-eye me-2"></i>
                              View Active Tour
                            </button>
                            
                            <button 
                              class="btn btn-outline-secondary btn-sm"
                              (click)="checkActiveTour()">
                              <i class="fas fa-sync-alt me-1"></i>
                              Refresh Tour Data
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- Map Container -->
              <div id="position-map" class="position-map"></div>

              <!-- Tour Simulation Help - NOVO! -->
              <div class="row mb-4" *ngIf="activeTour()">
                <div class="col-12">
                  <div class="card border-info">
                    <div class="card-header bg-light">
                      <h6 class="mb-0">
                        <i class="fas fa-lightbulb me-2 text-warning"></i>
                        Tour Testing Tips
                      </h6>
                    </div>
                    <div class="card-body">
                      <div class="row">
                        <div class="col-md-6">
                          <h6 class="text-info">How to test tour execution:</h6>
                          <ol class="small">
                            <li>Use "Quick Progress" to move to next keypoint automatically</li>
                            <li>Or manually set coordinates near a keypoint location</li>
                            <li>Position updates trigger automatic keypoint detection (50m radius)</li>
                            <li>Check "Active Tour" page to see real-time progress</li>
                          </ol>
                        </div>
                        <div class="col-md-6">
                          <h6 class="text-success">Auto-checking:</h6>
                          <p class="small mb-2">
                            The active tour automatically checks your position every 10 seconds to detect when you're near keypoints.
                          </p>
                          <div class="alert alert-info py-2">
                            <small>
                              <i class="fas fa-info-circle me-1"></i>
                              Keypoints are detected within 50 meters of your position.
                            </small>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- Instructions -->
              <div class="p-3 bg-info bg-opacity-10 border-top">
                <div class="row">
                  <div class="col-md-8">
                    <h6><i class="fas fa-info-circle me-2"></i>How to use:</h6>
                    <ul class="mb-0 small">
                      <li>Click anywhere on the map to set your current position</li>
                      <li>Your position will be saved and used for tour execution</li>
                      <li>The blue marker shows your current location</li>
                      <li>Use the controls to zoom and navigate the map</li>
                    </ul>
                  </div>
                  
                  <div class="col-md-4 text-end">
                    <div class="btn-group" role="group">
                      <button 
                        class="btn btn-success"
                        (click)="goToTours()"
                        [disabled]="!currentPosition()">
                        <i class="fas fa-route me-1"></i>
                        View Tours
                      </button>
                      
                      <button 
                        class="btn btn-primary"
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
        </div>
      </div>
      
      <!-- Loading/Error States -->
      <div class="row mt-3" *ngIf="loading() || error()">
        <div class="col-12">
          <div class="alert alert-info" *ngIf="loading()">
            <i class="fas fa-spinner fa-spin me-2"></i>
            {{loadingMessage()}}
          </div>
          
          <div class="alert alert-danger" *ngIf="error()" role="alert">
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
    .position-map {
      height: 70vh;
      width: 100%;
      min-height: 500px;
      border: none;
    }
    
    .card {
      border: none;
      border-radius: 15px;
      overflow: hidden;
    }
    
    .card-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
    }
    
    .btn-group .btn {
      border-radius: 8px;
    }
    
    .btn-group .btn:not(:last-child) {
      margin-right: 8px;
    }
    
    .alert {
      border-radius: 10px;
      border: none;
    }
    
    .bg-info.bg-opacity-10 {
      background-color: rgba(13, 202, 240, 0.1) !important;
    }
  `]
})
export class PositionSimulatorComponent implements OnInit, AfterViewInit {
  // Postojeći signali
  currentPosition = signal<Position | null>(null);
  loading = signal<boolean>(false);
  loadingMessage = signal<string>('');
  error = signal<string>('');

  // NOVI signali za tour integration
  activeTour = signal<any | null>(null);
  nearbyKeypoints = signal<any[]>([]);

  // Leaflet map and marker
  private map: L.Map | null = null;
  private currentMarker: L.Marker | null = null;

  // Default coordinates for Belgrade, Serbia
  private defaultLat = 44.8176;
  private defaultLng = 20.4633;

  // Mock koordinate - dodaj još lokacija
  mockLocations = [
    { name: 'Belgrade Center', lat: 44.7866, lng: 20.4489 },
    { name: 'Novi Sad Center', lat: 45.2671, lng: 19.8335 },
    { name: 'Niš Center', lat: 43.3209, lng: 21.8958 },
    { name: 'Kragujevac Center', lat: 44.0165, lng: 20.9114 },
    { name: 'Subotica Center', lat: 46.0996, lng: 19.6675 },
    { name: 'Kalemegdan Park', lat: 44.8206, lng: 20.4513 },
    { name: 'Skadarlija', lat: 44.8167, lng: 20.4598 },
    { name: 'Zemun Quay', lat: 44.8431, lng: 20.4014 },
    { name: 'Ada Ciganlija', lat: 44.7894, lng: 20.4070 },
    { name: 'Avala Tower', lat: 44.6934, lng: 20.5142 }
  ];

  constructor(
    private apiService: ApiService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadCurrentPosition();
    this.checkActiveTour();
  }

  ngAfterViewInit(): void {
    // Small delay to ensure DOM is ready
    setTimeout(() => {
      this.initializeMap();
    }, 100);
  }

  // NOVA METODA: Provjeri aktivnu turu
  checkActiveTour(): void {
    this.apiService.getUserExecutions().subscribe({
      next: (response) => {
        const executions = response?.executions || [];
        const activeTour = executions.find(exec => exec.status === 'active');
        this.activeTour.set(activeTour || null);
        
        if (activeTour) {
          console.log('Active tour found:', activeTour);
          this.loadTourKeypoints(activeTour.tour_id);
        }
      },
      error: () => {
        this.activeTour.set(null);
      }
    });
  }

  // NOVA METODA: Učitaj keypoints aktivne ture
  private loadTourKeypoints(tourId: string): void {
    this.apiService.getTourById(tourId).subscribe({
      next: (response) => {
        const tour = response.tour || response;
        if (tour.keypoints) {
          this.checkNearbyKeypoints(tour.keypoints);
        }
      },
      error: (error) => {
        console.warn('Failed to load tour keypoints:', error);
      }
    });
  }

  // NOVA METODA: Provjeri bliske ključne tačke
  private checkNearbyKeypoints(keypoints: any[]): void {
    const currentPos = this.currentPosition();
    if (!currentPos || !keypoints) {
      this.nearbyKeypoints.set([]);
      return;
    }

    const nearby = keypoints.filter(keypoint => {
      const distance = this.calculateDistance(
        currentPos.latitude, 
        currentPos.longitude,
        keypoint.latitude, 
        keypoint.longitude
      );
      return distance <= 0.1; // 100 meters
    }).map(keypoint => ({
      ...keypoint,
      distance: this.calculateDistance(
        currentPos.latitude, 
        currentPos.longitude,
        keypoint.latitude, 
        keypoint.longitude
      ) * 1000 // Convert to meters
    }));

    this.nearbyKeypoints.set(nearby);
  }

  // NOVA METODA: Postavi poziciju na keypoint
  moveToKeypoint(keypoint: any): void {
    const positionData = {
      latitude: keypoint.latitude + (Math.random() - 0.5) * 0.0001, // Small random offset
      longitude: keypoint.longitude + (Math.random() - 0.5) * 0.0001,
      accuracy: 10
    };

    this.updatePosition(positionData);
  }

  // NOVA METODA: Quick action za test scenarije
  simulateTourProgress(): void {
    const tour = this.activeTour();
    if (!tour) {
      alert('No active tour found. Please start a tour first.');
      return;
    }

    this.loading.set(true);
    this.loadingMessage.set('Moving to next keypoint...');
    
    this.apiService.getTourById(tour.tour_id).subscribe({
      next: (response) => {
        const tourData = response.tour || response;
        const keypoints = tourData.keypoints || [];
        
        console.log('Tour keypoints:', keypoints);
        console.log('Completed keypoints:', tour.completed_keypoints);
        
        if (keypoints.length === 0) {
          this.loading.set(false);
          this.loadingMessage.set('');
          alert('This tour has no keypoints.');
          return;
        }

        // ISPRAVLJENA LOGIKA - koristi pravilno mapiranje
        const completedOrders = tour.completed_keypoints?.map((kp: any) => kp.keypoint_index) || [];
        console.log('Completed orders:', completedOrders);
        
        // Sortiraj keypoints po order i nađi prvi necompletiran
        const sortedKeypoints = keypoints.sort((a: any, b: any) => a.order - b.order);
        const nextKeypoint = sortedKeypoints.find((keypoint: any) => !completedOrders.includes(keypoint.order));
        
        console.log('Next keypoint:', nextKeypoint);

        if (nextKeypoint) {
          // Dodaj mali random offset da ne bude tačno na keypoint
          const lat = nextKeypoint.latitude + (Math.random() - 0.5) * 0.0002;
          const lng = nextKeypoint.longitude + (Math.random() - 0.5) * 0.0002;
          
          this.setPosition(lat, lng);
          
          setTimeout(() => {
            this.loading.set(false);
            this.loadingMessage.set('');
            alert(`Moved to keypoint: ${nextKeypoint.name}`);
          }, 1000);
        } else {
          this.loading.set(false);
          this.loadingMessage.set('');
          alert('All keypoints completed!');
        }
      },
      error: (error) => {
        this.loading.set(false);
        this.loadingMessage.set('');
        console.error('Failed to load tour data:', error);
        alert('Failed to load tour data.');
      }
    });
  }

  // Helper method for distance calculation
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    return distance;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI/180);
  }

  // AŽURIRANA metoda updatePosition da pozove i setPosition
  private updatePosition(positionData: any): void {
    this.setPosition(positionData.latitude, positionData.longitude);
  }

  // Postojeće metode ostaju iste...
  
  private initializeMap(): void {
    try {
      // Initialize map centered on Belgrade or user's last position
      const position = this.currentPosition();
      const lat = position ? position.latitude : this.defaultLat;
      const lng = position ? position.longitude : this.defaultLng;

      this.map = L.map('position-map').setView([lat, lng], 13);

      // Add OpenStreetMap tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(this.map);

      // Add current position marker if exists
      if (position) {
        this.addPositionMarker(position.latitude, position.longitude);
      }

      // Add click event listener
      this.map.on('click', (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        this.setPosition(lat, lng);
      });

      // Fix for Leaflet marker icons in Angular
      this.fixLeafletIcons();

    } catch (error) {
      console.error('Error initializing map:', error);
      this.error.set('Failed to initialize map. Please refresh the page.');
    }
  }

  private fixLeafletIcons(): void {
    const iconDefault = L.icon({
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png', 
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    });
    L.Marker.prototype.options.icon = iconDefault;
  }

  private loadCurrentPosition(): void {
    const user = this.apiService.getCurrentUser();
    if (!user) {
      this.error.set('Please log in to use the position simulator.');
      return;
    }

    this.loading.set(true);
    this.loadingMessage.set('Loading your current position...');

    this.apiService.getCurrentPosition(user.id).subscribe({
      next: (response: any) => {
        this.loading.set(false);
        if (response.position) {
          this.currentPosition.set({
            user_id: response.position.user_id,
            latitude: response.position.latitude,
            longitude: response.position.longitude,
            timestamp: new Date(response.position.timestamp),
            accuracy: response.position.accuracy
          });
          
          // Check nearby keypoints when position loads
          if (this.activeTour()) {
            this.loadTourKeypoints(this.activeTour()!.tour_id);
          }
        }
      },
      error: (error) => {
        this.loading.set(false);
        console.log('No previous position found, that\'s OK for first time use');
        // This is expected for first time users, so no error message
      }
    });
  }

  private setPosition(latitude: number, longitude: number): void {
    const user = this.apiService.getCurrentUser();
    if (!user) {
      this.error.set('Please log in to set position.');
      return;
    }

    const positionData = {
      latitude,
      longitude,
      accuracy: 10.0
    };

    this.apiService.updatePosition(user.id, positionData).subscribe({
      next: (response: any) => {
        this.currentPosition.set({
          user_id: user.id,
          latitude,
          longitude,
          timestamp: new Date(),
          accuracy: 10.0
        });

        // Update marker on map
        this.addPositionMarker(latitude, longitude);
        
        // Check nearby keypoints after position update
        if (this.activeTour()) {
          this.loadTourKeypoints(this.activeTour()!.tour_id);
        }
      },
      error: (error) => {
        console.error('Error saving position:', error);
      }
    });
  }

  private addPositionMarker(latitude: number, longitude: number): void {
    if (!this.map) return;

    if (this.currentMarker) {
      this.map.removeLayer(this.currentMarker);
    }

    // Standard marker with custom icon color
    this.currentMarker = L.marker([latitude, longitude], {
      icon: L.icon({
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      })
    })
    .bindPopup(`
      <div>
        <strong>Your Current Position</strong><br>
        Latitude: ${latitude.toFixed(6)}<br>
        Longitude: ${longitude.toFixed(6)}<br>
        <small>Click map to update</small>
      </div>
    `)
    .addTo(this.map);

    // Otvori popup
    this.currentMarker.openPopup();
  }

  centerMapOnPosition(): void {
    const position = this.currentPosition();
    if (!position || !this.map) return;

    this.map.setView([position.latitude, position.longitude], 15);
    if (this.currentMarker) {
      this.currentMarker.openPopup();
    }
  }

  clearPosition(): void {
    const user = this.apiService.getCurrentUser();
    if (!user) return;

    if (confirm('Are you sure you want to clear your current position?')) {
      this.loading.set(true);
      this.loadingMessage.set('Clearing position...');

      this.apiService.clearPosition(user.id).subscribe({
        next: () => {
          this.loading.set(false);
          this.currentPosition.set(null);
          
          // Remove marker from map
          if (this.currentMarker && this.map) {
            this.map.removeLayer(this.currentMarker);
            this.currentMarker = null;
          }

          this.loadingMessage.set('Position cleared successfully!');
          setTimeout(() => this.loadingMessage.set(''), 2000);
        },
        error: (error) => {
          this.loading.set(false);
          this.error.set('Failed to clear position. Please try again.');
          console.error('Error clearing position:', error);
        }
      });
    }
  }

  formatTimestamp(timestamp: Date): string {
    try {
      return new Date(timestamp).toLocaleString('sr-RS', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch {
      return 'Invalid date';
    }
  }

  goToTours(): void {
    this.router.navigate(['/tours']);
  }

  goBack(): void {
    this.router.navigate(['/']);
  }
}