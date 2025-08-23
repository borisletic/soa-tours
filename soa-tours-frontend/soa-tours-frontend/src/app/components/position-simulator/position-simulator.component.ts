import { Component, OnInit, signal, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
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
  imports: [CommonModule],
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
              
              <!-- Map Container -->
              <div id="position-map" class="position-map"></div>
              
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
  // Signals for reactive state
  currentPosition = signal<Position | null>(null);
  loading = signal<boolean>(false);
  loadingMessage = signal<string>('');
  error = signal<string>('');

  // Leaflet map and marker
  private map: L.Map | null = null;
  private currentMarker: L.Marker | null = null;

  // Default coordinates for Belgrade, Serbia
  private defaultLat = 44.8176;
  private defaultLng = 20.4633;

  constructor(
    private apiService: ApiService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadCurrentPosition();
  }

  ngAfterViewInit(): void {
    // Small delay to ensure DOM is ready
    setTimeout(() => {
      this.initializeMap();
    }, 100);
  }

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

    this.loading.set(true);
    this.loadingMessage.set('Saving your position...');

    const positionData = {
      latitude,
      longitude,
      accuracy: 10.0 // Simulated accuracy
    };

    this.apiService.updatePosition(user.id, positionData).subscribe({
      next: (response: any) => {
        this.loading.set(false);
        this.currentPosition.set({
          user_id: user.id,
          latitude,
          longitude,
          timestamp: new Date(),
          accuracy: 10.0
        });

        // Update marker on map
        this.addPositionMarker(latitude, longitude);
        
        // Show success message briefly
        this.loadingMessage.set('Position saved successfully!');
        setTimeout(() => this.loadingMessage.set(''), 2000);
      },
      error: (error) => {
        this.loading.set(false);
        this.error.set('Failed to save position. Please try again.');
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