import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';

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
              <label class="form-label">Tour Name</label>
              <input 
                type="text" 
                class="form-control" 
                [(ngModel)]="tourData.name"
                placeholder="Enter tour name">
            </div>
            
            <div class="col-md-6 mb-3">
              <label class="form-label">Difficulty</label>
              <select class="form-select" [(ngModel)]="tourData.difficulty">
                <option value="">Select difficulty</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
          </div>
          
          <div class="mb-3">
            <label class="form-label">Description</label>
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
          
          <button 
            class="btn btn-primary"
            (click)="createTour()"
            [disabled]="loading">
            <i class="fas fa-plus me-1"></i>
            Create Tour
          </button>
        </div>
      </div>

      <div *ngIf="createdTour" class="card mb-4">
        <div class="card-body">
          <h5 class="card-title">Add Keypoints</h5>
          
          <div class="row">
            <div class="col-md-6 mb-3">
              <label class="form-label">Name</label>
              <input 
                type="text" 
                class="form-control" 
                [(ngModel)]="newKeypoint.name"
                placeholder="Museum, Park, etc.">
            </div>
            
            <div class="col-md-6 mb-3">
              <label class="form-label">Description</label>
              <input 
                type="text" 
                class="form-control" 
                [(ngModel)]="newKeypoint.description"
                placeholder="Brief description">
            </div>
          </div>
          
          <div class="row">
            <div class="col-md-6 mb-3">
              <label class="form-label">Latitude</label>
              <input 
                type="number" 
                class="form-control" 
                [(ngModel)]="newKeypoint.latitude"
                step="0.000001"
                placeholder="44.8176">
            </div>
            
            <div class="col-md-6 mb-3">
              <label class="form-label">Longitude</label>
              <input 
                type="number" 
                class="form-control" 
                [(ngModel)]="newKeypoint.longitude"
                step="0.000001"
                placeholder="20.4633">
            </div>
          </div>
          
          <button 
            class="btn btn-success"
            (click)="addKeypoint()"
            [disabled]="loading">
            <i class="fas fa-map-pin me-1"></i>
            Add Keypoint
          </button>
        </div>
      </div>

      <div *ngIf="createdTour" class="card">
        <div class="card-body">
          <h5 class="card-title">Tour Summary</h5>
          <p><strong>Name:</strong> {{createdTour.name}}</p>
          <p><strong>Status:</strong> {{createdTour.status}}</p>
          <p><strong>Keypoints:</strong> {{createdTour.keypoints?.length || 0}}</p>
          
          <button 
            class="btn btn-primary me-2"
            (click)="viewTours()">
            View My Tours
          </button>
        </div>
      </div>

      <div *ngIf="response" class="card mt-4">
        <div class="card-body">
          <h5 class="card-title">API Response</h5>
          <pre>{{response | json}}</pre>
        </div>
      </div>
    </div>
  `
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

  newKeypoint = {
    name: '',
    description: '',
    latitude: 0,
    longitude: 0,
    images: [] as string[]
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

  addKeypoint(): void {
    if (!this.newKeypoint.name || !this.newKeypoint.description || !this.createdTour) {
      alert('Please fill keypoint information');
      return;
    }

    this.loading = true;
    this.apiService.addKeypoint(this.createdTour.id, {
      name: this.newKeypoint.name,
      description: this.newKeypoint.description,
      latitude: this.newKeypoint.latitude,
      longitude: this.newKeypoint.longitude,
      images: this.newKeypoint.images
    }).subscribe({
      next: (data: any) => {
        this.response = data;
        this.loading = false;
        if (data.message) {
          // Clear form
          this.newKeypoint = {
            name: '',
            description: '',
            latitude: 0,
            longitude: 0,
            images: []
          };
          // Refresh tour data
          this.loadTourData();
        }
      },
      error: (error) => {
        this.response = { error: error.message };
        this.loading = false;
      }
    });
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

  viewTours(): void {
    this.router.navigate(['/my-tours']);
  }
}