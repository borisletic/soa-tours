import { Component, OnInit, Input, Output, EventEmitter, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as L from 'leaflet';
import { ApiService } from '../../services/api.service';

interface Keypoint {
  name: string;
  description: string;
  latitude: number;
  longitude: number;
  images: string[];
  order: number;
}

interface Tour {
  id: string;
  name: string;
  keypoints: Keypoint[];
}

@Component({
  selector: 'app-tour-keypoints-map',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container-fluid">
      <div class="row">
        <div class="col-12">
          <div class="card shadow-lg">
            <div class="card-header bg-success text-white">
              <h4 class="mb-0">
                <i class="fas fa-map-marker-alt me-2"></i>
                Tour Keypoints Management
              </h4>
              <p class="mb-0">Click on map to add keypoints, right-click existing markers to edit/delete</p>
            </div>
            
            <div class="card-body p-0">
              <!-- Tour Info -->
              <div class="bg-light p-3 border-bottom">
                <div class="row">
                  <div class="col-md-8">
                    <h5>{{tour?.name || 'Loading...'}}</h5>
                    <div class="keypoints-summary">
                      <i class="fas fa-map-pin text-primary me-1"></i>
                      <strong>Keypoints:</strong> {{tour?.keypoints?.length || 0}} 
                      <span class="text-muted ms-2">
                        (Minimum 2 required for publishing)
                      </span>
                    </div>
                  </div>
                  
                  <div class="col-md-4 text-end">
                    <button 
                      class="btn btn-outline-primary me-2"
                      (click)="calculateTourDistance()"
                      [disabled]="!tour || tour.keypoints.length < 2">
                      <i class="fas fa-calculator me-1"></i>
                      Calculate Distance
                    </button>
                    
                    <button 
                      class="btn btn-primary"
                      (click)="drawTourRoute()"
                      [disabled]="!tour || tour.keypoints.length < 2">
                      <i class="fas fa-route me-1"></i>
                      Show Route
                    </button>
                  </div>
                </div>
              </div>
              
              <!-- Map Container -->
              <div id="keypoints-map" class="keypoints-map"></div>
              
              <!-- Instructions -->
              <div class="p-3 bg-info bg-opacity-10 border-top">
                <div class="row">
                  <div class="col-md-8">
                    <h6><i class="fas fa-info-circle me-2"></i>How to use:</h6>
                    <ul class="mb-0 small">
                      <li><strong>Add Keypoint:</strong> Left-click anywhere on the map</li>
                      <li><strong>Edit Keypoint:</strong> Right-click on an existing marker</li>
                      <li><strong>Delete Keypoint:</strong> Right-click marker and select delete</li>
                      <li><strong>Reorder:</strong> Use drag & drop in the keypoints list</li>
                    </ul>
                  </div>
                  
                  <div class="col-md-4 text-end">
                    <button 
                      class="btn btn-outline-secondary me-2"
                      (click)="clearAllKeypoints()"
                      [disabled]="!tour || tour.keypoints.length === 0">
                      <i class="fas fa-trash me-1"></i>
                      Clear All
                    </button>
                    
                    <button 
                      class="btn btn-secondary"
                      (click)="goBack()">
                      <i class="fas fa-arrow-left me-1"></i>
                      Back to Tour
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Keypoints List -->
      <div class="row mt-3" *ngIf="tour && tour.keypoints.length > 0">
        <div class="col-12">
          <div class="card">
            <div class="card-header">
              <h5><i class="fas fa-list me-2"></i>Keypoints List</h5>
            </div>
            <div class="card-body">
              <div class="keypoint-item" 
                   *ngFor="let keypoint of tour.keypoints; let i = index"
                   [class.keypoint-active]="selectedKeypointIndex === i">
                <div class="row align-items-center">
                  <div class="col-md-1 text-center">
                    <span class="keypoint-number">{{i + 1}}</span>
                  </div>
                  
                  <div class="col-md-3">
                    <strong>{{keypoint.name}}</strong>
                    <br>
                    <small class="text-muted">{{keypoint.description}}</small>
                  </div>
                  
                  <div class="col-md-3">
                    <small class="text-muted">
                      Lat: {{keypoint.latitude.toFixed(6)}}<br>
                      Lng: {{keypoint.longitude.toFixed(6)}}
                    </small>
                  </div>
                  
                  <div class="col-md-3">
                    <div class="distance-info" *ngIf="i > 0">
                      <i class="fas fa-ruler me-1"></i>
                      <small>{{getDistanceToNext(i-1)}} km from previous</small>
                    </div>
                  </div>
                  
                  <div class="col-md-2 text-end">
                    <button 
                      class="btn btn-sm btn-outline-primary me-1"
                      (click)="focusOnKeypoint(i)">
                      <i class="fas fa-eye"></i>
                    </button>
                    
                    <button 
                      class="btn btn-sm btn-outline-warning me-1"
                      (click)="editKeypoint(i)">
                      <i class="fas fa-edit"></i>
                    </button>
                    
                    <button 
                      class="btn btn-sm btn-outline-danger"
                      (click)="deleteKeypoint(i)">
                      <i class="fas fa-trash"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Keypoint Modal -->
    <div class="modal fade" [class.show]="showKeypointModal" [style.display]="showKeypointModal ? 'block' : 'none'" 
         tabindex="-1" style="background-color: rgba(0,0,0,0.5)">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">
              {{editingKeypointIndex >= 0 ? 'Edit' : 'Add'}} Keypoint
            </h5>
            <button type="button" class="btn-close" (click)="closeKeypointModal()"></button>
          </div>
          
          <div class="modal-body">
            <form #keypointForm="ngForm">
              <div class="mb-3">
                <label class="form-label">Name *</label>
                <input 
                  type="text" 
                  class="form-control" 
                  [(ngModel)]="currentKeypoint.name"
                  name="name"
                  required
                  placeholder="e.g., City Hall, Museum, Park">
              </div>
              
              <div class="mb-3">
                <label class="form-label">Description *</label>
                <textarea 
                  class="form-control" 
                  [(ngModel)]="currentKeypoint.description"
                  name="description"
                  required
                  rows="3"
                  placeholder="Brief description of this location..."></textarea>
              </div>
              
              <div class="mb-3">
                <label class="form-label">Position</label>
                <div class="row">
                  <div class="col-6">
                    <input 
                      type="number" 
                      class="form-control" 
                      [(ngModel)]="currentKeypoint.latitude"
                      name="latitude"
                      readonly
                      step="0.000001">
                    <small class="text-muted">Latitude</small>
                  </div>
                  <div class="col-6">
                    <input 
                      type="number" 
                      class="form-control" 
                      [(ngModel)]="currentKeypoint.longitude"
                      name="longitude"
                      readonly
                      step="0.000001">
                    <small class="text-muted">Longitude</small>
                  </div>
                </div>
                <small class="text-info">
                  <i class="fas fa-info-circle me-1"></i>
                  Position was set by clicking on the map
                </small>
              </div>
            </form>
          </div>
          
          <div class="modal-footer">
            <button 
              type="button" 
              class="btn btn-secondary" 
              (click)="closeKeypointModal()">
              Cancel
            </button>
            <button 
              type="button" 
              class="btn btn-primary" 
              (click)="saveKeypoint()"
              [disabled]="!currentKeypoint.name || !currentKeypoint.description">
              {{editingKeypointIndex >= 0 ? 'Update' : 'Add'}} Keypoint
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .keypoints-map {
      height: 60vh;
      width: 100%;
      min-height: 400px;
    }
    
    .keypoint-item {
      border: 1px solid #dee2e6;
      border-radius: 8px;
      padding: 1rem;
      margin-bottom: 0.5rem;
      transition: all 0.2s ease;
    }
    
    .keypoint-item:hover {
      background-color: #f8f9fa;
      border-color: #007bff;
    }
    
    .keypoint-active {
      background-color: #e3f2fd !important;
      border-color: #007bff !important;
    }
    
    .keypoint-number {
      background: #007bff;
      color: white;
      border-radius: 50%;
      width: 30px;
      height: 30px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
    }
    
    .modal.show {
      display: block !important;
    }
    
    .distance-info {
      color: #6c757d;
      font-size: 0.875rem;
    }
  `]
})
export class TourKeypointsMapComponent implements OnInit, AfterViewInit {
  @Input() tourId!: string;
  @Output() tourUpdated = new EventEmitter<any>();

  tour: Tour | null = null;
  map: L.Map | null = null;
  markers: L.Marker[] = [];
  routeLine: L.Polyline | null = null;
  
  showKeypointModal = false;
  editingKeypointIndex = -1;
  selectedKeypointIndex = -1;
  
  currentKeypoint: Partial<Keypoint> = {};

  // Belgrade coordinates as default center
  private defaultLat = 44.8176;
  private defaultLng = 20.4633;

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    this.loadTour();
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.initializeMap();
    }, 100);
  }

  private loadTour(): void {
    if (!this.tourId) return;
    
    this.apiService.getTourById(this.tourId).subscribe({
      next: (response: any) => {
        if (response.tour) {
          this.tour = response.tour;
          this.updateMapMarkers();
        }
      },
      error: (error) => {
        console.error('Error loading tour:', error);
      }
    });
  }

  private initializeMap(): void {
    try {
      this.map = L.map('keypoints-map').setView([this.defaultLat, this.defaultLng], 12);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(this.map);

      // Add click event listener for adding keypoints
      this.map.on('click', (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        this.openKeypointModal(lat, lng);
      });

      this.updateMapMarkers();
    } catch (error) {
      console.error('Error initializing map:', error);
    }
  }

  private updateMapMarkers(): void {
    if (!this.map || !this.tour) return;

    // Clear existing markers
    this.markers.forEach(marker => this.map!.removeLayer(marker));
    this.markers = [];

    // Add markers for each keypoint
    this.tour.keypoints.forEach((keypoint, index) => {
      const marker = L.marker([keypoint.latitude, keypoint.longitude])
        .bindPopup(`
          <div>
            <strong>${keypoint.name}</strong><br>
            ${keypoint.description}<br>
            <small>Keypoint #${index + 1}</small>
          </div>
        `)
        .addTo(this.map!);

      // Right-click for edit/delete
      marker.on('contextmenu', () => {
        this.editKeypoint(index);
      });

      this.markers.push(marker);
    });

    // Draw route if more than 1 keypoint
    if (this.tour.keypoints.length > 1) {
      this.drawTourRoute();
    }
  }

  private openKeypointModal(lat: number, lng: number, editIndex: number = -1): void {
    this.editingKeypointIndex = editIndex;
    
    if (editIndex >= 0 && this.tour) {
      // Editing existing keypoint
      this.currentKeypoint = { ...this.tour.keypoints[editIndex] };
    } else {
      // Adding new keypoint
      this.currentKeypoint = {
        name: '',
        description: '',
        latitude: lat,
        longitude: lng,
        images: [],
        order: this.tour?.keypoints.length || 0
      };
    }
    
    this.showKeypointModal = true;
  }

  closeKeypointModal(): void {
    this.showKeypointModal = false;
    this.editingKeypointIndex = -1;
    this.currentKeypoint = {};
  }

  saveKeypoint(): void {
    if (!this.currentKeypoint.name || !this.currentKeypoint.description || !this.tour) return;

    const keypointData = {
      name: this.currentKeypoint.name,
      description: this.currentKeypoint.description,
      latitude: this.currentKeypoint.latitude!,
      longitude: this.currentKeypoint.longitude!,
      images: this.currentKeypoint.images || []
    };

    if (this.editingKeypointIndex >= 0) {
      // Update existing keypoint
      this.apiService.updateKeypoint(this.tour.id, this.editingKeypointIndex, keypointData).subscribe({
        next: () => {
          this.closeKeypointModal();
          this.loadTour();
        },
        error: (error) => console.error('Error updating keypoint:', error)
      });
    } else {
      // Add new keypoint
      this.apiService.addKeypoint(this.tour.id, keypointData).subscribe({
        next: () => {
          this.closeKeypointModal();
          this.loadTour();
        },
        error: (error) => console.error('Error adding keypoint:', error)
      });
    }
  }

  editKeypoint(index: number): void {
    if (!this.tour) return;
    const keypoint = this.tour.keypoints[index];
    this.openKeypointModal(keypoint.latitude, keypoint.longitude, index);
  }

  deleteKeypoint(index: number): void {
    if (!this.tour) return;
    
    if (confirm('Are you sure you want to delete this keypoint?')) {
      this.apiService.removeKeypoint(this.tour.id, index).subscribe({
        next: () => {
          this.loadTour();
        },
        error: (error) => console.error('Error deleting keypoint:', error)
      });
    }
  }

  focusOnKeypoint(index: number): void {
    if (!this.tour || !this.map) return;
    
    const keypoint = this.tour.keypoints[index];
    this.map.setView([keypoint.latitude, keypoint.longitude], 16);
    this.selectedKeypointIndex = index;
    
    if (this.markers[index]) {
      this.markers[index].openPopup();
    }
  }

  drawTourRoute(): void {
    if (!this.tour || !this.map || this.tour.keypoints.length < 2) return;

    // Remove existing route
    if (this.routeLine) {
      this.map.removeLayer(this.routeLine);
    }

    // Create route from keypoints
    const coordinates = this.tour.keypoints.map(kp => [kp.latitude, kp.longitude] as [number, number]);
    
    this.routeLine = L.polyline(coordinates, {
      color: '#007bff',
      weight: 3,
      opacity: 0.7,
      dashArray: '5, 10'
    }).addTo(this.map);

    // Fit map to route bounds
    this.map.fitBounds(this.routeLine.getBounds(), { padding: [20, 20] });
  }

  calculateTourDistance(): void {
    if (!this.tour || this.tour.keypoints.length < 2) return;

    let totalDistance = 0;
    
    for (let i = 1; i < this.tour.keypoints.length; i++) {
      const prev = this.tour.keypoints[i - 1];
      const curr = this.tour.keypoints[i];
      
      totalDistance += this.calculateDistance(
        prev.latitude, prev.longitude,
        curr.latitude, curr.longitude
      );
    }

    // Update tour distance
    this.apiService.updateTour(this.tour.id, { distance_km: totalDistance }).subscribe({
      next: () => {
        this.loadTour();
        alert(`Tour distance calculated: ${totalDistance.toFixed(2)} km`);
      },
      error: (error) => console.error('Error updating tour distance:', error)
    });
  }

  getDistanceToNext(index: number): string {
    if (!this.tour || index >= this.tour.keypoints.length - 1) return '';
    
    const current = this.tour.keypoints[index];
    const next = this.tour.keypoints[index + 1];
    
    const distance = this.calculateDistance(
      current.latitude, current.longitude,
      next.latitude, next.longitude
    );
    
    return distance.toFixed(2);
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI/180);
  }

  clearAllKeypoints(): void {
    if (!confirm('Are you sure you want to remove all keypoints?')) return;
    
    // This would require a backend endpoint to clear all keypoints
    // For now, delete one by one
    if (this.tour) {
      for (let i = this.tour.keypoints.length - 1; i >= 0; i--) {
        this.deleteKeypoint(i);
      }
    }
  }

  goBack(): void {
    this.tourUpdated.emit(this.tour);
  }
}