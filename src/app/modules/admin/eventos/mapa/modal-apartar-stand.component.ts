import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule } from '@angular/material/dialog';
import { MatChipsModule } from '@angular/material/chips';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressBarModule } from '@angular/material/progress-bar';

@Component({
  selector: 'dialog-apartar-stand',
  standalone: true,
  imports: [
    CommonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatChipsModule,
    MatTabsModule,
    MatProgressBarModule
  ],
  styleUrls: ['./modal-apartar-stand.component.scss'],
  template: `
    <div class="dialog-wrapper">
      <div class="dialog-header">
        <div class="header-content">
          <div class="stand-badge">{{ data.stand.label }}</div>
          <h2>Apartar Stand</h2>
        </div>
        <button mat-icon-button mat-dialog-close class="close-btn">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <mat-dialog-content>
        <form [formGroup]="data.form" class="dialog-form">
          <mat-tab-group class="tabs-container" [selectedIndex]="0">
            <!-- TAB 1: Empresa -->
            <mat-tab label="Empresa" class="tab-empresa">
              <ng-template mat-tab-label>
                <mat-icon class="tab-icon">business</mat-icon>
                <span>Empresa</span>
              </ng-template>

              <div class="tab-content">
                <!-- Profesional -->
                <div class="form-group">
                  <label class="group-label">Representante</label>
                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>Profesional/Empresa</mat-label>
                    <mat-select formControlName="asistenteId">
                      <mat-option *ngFor="let asistente of data.asistentesProfesionales" [value]="asistente.id">
                        {{ asistente.nombre }} ({{ asistente.empresa || asistente.ocupacion || 'General' }})
                      </mat-option>
                    </mat-select>
                    <mat-error *ngIf="data.form.get('asistenteId')?.hasError('required')">
                      Requerido
                    </mat-error>
                  </mat-form-field>
                </div>

                <!-- Nombre Empresa -->
                <div class="form-group">
                  <label class="group-label">Nombre de Empresa</label>
                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>Ej: Tech Solutions SA</mat-label>
                    <input matInput formControlName="empresa">
                    <mat-icon matPrefix>label</mat-icon>
                    <mat-error *ngIf="data.form.get('empresa')?.hasError('required')">
                      Requerido
                    </mat-error>
                  </mat-form-field>
                </div>

                <!-- Logo -->
                <div class="form-group">
                  <label class="group-label">Logo</label>
                  <div class="upload-zone" [class.has-logo]="data.logoPreview">
                    <input #logoUpload type="file" id="logo-upload" accept="image/*" class="file-input"
                           (change)="onLogoSelected($event)">

                    @if (data.logoPreview) {
                      <div class="logo-preview-wrapper">
                        <img [src]="data.logoPreview" alt="Logo" class="logo-image">
                        <button type="button" class="remove-logo-btn" (click)="removeLogoPreview()" mat-icon-button>
                          <mat-icon>close</mat-icon>
                        </button>
                      </div>
                    } @else {
                      <div class="upload-placeholder" (click)="logoUpload.click()">
                        <mat-icon class="upload-icon">cloud_upload</mat-icon>
                        <p class="upload-text">Sube tu logo aquí</p>
                        <p class="upload-hint">PNG, JPG - Máx 5MB</p>
                      </div>
                    }
                  </div>
                </div>

                <!-- Descripción -->
                <div class="form-group">
                  <label class="group-label">Descripción</label>
                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>¿A qué se dedica tu empresa?</mat-label>
                    <textarea matInput formControlName="descripcion" rows="4"
                              class="textarea-custom"></textarea>
                    <mat-icon matPrefix>description</mat-icon>
                    <mat-error *ngIf="data.form.get('descripcion')?.hasError('required')">
                      Requerido
                    </mat-error>
                  </mat-form-field>
                </div>
              </div>
            </mat-tab>

            <!-- TAB 2: Galería -->
            <mat-tab label="Galería" class="tab-gallery">
              <ng-template mat-tab-label>
                <mat-icon class="tab-icon">image</mat-icon>
                <span>Proyectos</span>
              </ng-template>

              <div class="tab-content">
                <div class="form-group">
                  <label class="group-label">Imágenes de Proyectos</label>
                  <div class="upload-zone gallery-zone" [class.has-images]="(data.imagenesPreviews || []).length > 0">
                    <input #imagenUpload type="file" id="imagen-upload" accept="image/*" multiple class="file-input"
                           (change)="onImagesSelected($event)">

                    @if ((data.imagenesPreviews || []).length === 0) {
                      <div class="upload-placeholder" (click)="imagenUpload.click()">
                        <mat-icon class="upload-icon">add_a_photo</mat-icon>
                        <p class="upload-text">Agregar Imágenes</p>
                        <p class="upload-hint">Hasta 10 imágenes • PNG, JPG</p>
                      </div>
                    }
                  </div>

                  @if ((data.imagenesPreviews || []).length > 0) {
                    <div class="imagenes-grid">
                      @for (img of data.imagenesPreviews; track $index) {
                        <div class="imagen-item">
                          <img [src]="img" [alt]="'Imagen ' + ($index + 1)" class="imagen-preview">
                          <div class="imagen-overlay">
                            <button type="button" class="delete-img-btn" (click)="removeImage($index)" mat-icon-button>
                              <mat-icon>delete_outline</mat-icon>
                            </button>
                          </div>
                        </div>
                      }
                      <div class="add-more-btn" (click)="imagenUpload.click()">
                        <mat-icon>add</mat-icon>
                        Agregar Más
                      </div>
                    </div>
                    <p class="imagen-count">{{ (data.imagenesPreviews || []).length }}/10 imágenes</p>
                  }
                </div>
              </div>
            </mat-tab>

            <!-- TAB 3: Contacto -->
            <mat-tab label="Contacto" class="tab-contact">
              <ng-template mat-tab-label>
                <mat-icon class="tab-icon">contacts</mat-icon>
                <span>B2B</span>
              </ng-template>

              <div class="tab-content">
                <div class="form-group">
                  <label class="group-label">Información de Contacto</label>
                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>Nombre de Contacto</mat-label>
                    <input matInput formControlName="contactoNombre">
                    <mat-icon matPrefix>person</mat-icon>
                  </mat-form-field>
                </div>

                <div class="form-group">
                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>Email</mat-label>
                    <input matInput type="email" formControlName="contactoEmail">
                    <mat-icon matPrefix>email</mat-icon>
                  </mat-form-field>
                </div>

                <div class="form-group">
                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>Teléfono</mat-label>
                    <input matInput formControlName="contactoTelefono">
                    <mat-icon matPrefix>phone</mat-icon>
                  </mat-form-field>
                </div>

                <div class="form-group">
                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>Sitio Web (Opcional)</mat-label>
                    <input matInput formControlName="contactoEnlace" placeholder="https://ejemplo.com">
                    <mat-icon matPrefix>language</mat-icon>
                  </mat-form-field>
                </div>

                <div class="info-box">
                  <mat-icon>info</mat-icon>
                  <p>Esta información será visible para otros visitantes del evento</p>
                </div>
              </div>
            </mat-tab>
          </mat-tab-group>
        </form>
      </mat-dialog-content>

      <mat-dialog-actions class="dialog-actions">
        <button mat-button mat-dialog-close class="cancel-btn">Cancelar</button>
        <button mat-raised-button color="primary"
                (click)="guardarStand()"
                [disabled]="!data.form.valid"
                class="save-btn">
          <mat-icon>check_circle</mat-icon>
          Apartar Stand
        </button>
      </mat-dialog-actions>
    </div>
  `
})
export class ModalApartarStand {
  constructor(@Inject(MAT_DIALOG_DATA) public data: any) {
    this.data.logoPreview = null;
    this.data.imagenesPreviews = [];
    this.data.logoBase64 = null;
    this.data.imagenesBase64 = [];
  }

  onLogoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.convertFileToBase64(file, (base64) => {
        this.data.logoBase64 = base64;
        this.data.logoPreview = base64;
        this.data.form.patchValue({ logoUrl: base64 });
      });
    }
  }

  removeLogoPreview(): void {
    this.data.logoPreview = null;
    this.data.logoBase64 = null;
    this.data.form.patchValue({ logoUrl: '' });
  }

  onImagesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files || []);

    files.forEach((file) => {
      if (this.data.imagenesPreviews.length < 10) {
        this.convertFileToBase64(file, (base64) => {
          this.data.imagenesPreviews.push(base64);
          this.data.imagenesBase64.push(base64);
        });
      }
    });
  }

  removeImage(index: number): void {
    this.data.imagenesPreviews.splice(index, 1);
    this.data.imagenesBase64.splice(index, 1);
  }

  private convertFileToBase64(file: File, callback: (base64: string) => void): void {
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      callback(base64);
    };
    reader.readAsDataURL(file);
  }

  guardarStand(): void {
    const formData = this.data.form.value;
    const datosCompletos = {
      ...formData,
      logoUrl: this.data.logoBase64,
      imagenes: this.data.imagenesBase64
    };
    this.data.onGuardar(datosCompletos);
  }
}
