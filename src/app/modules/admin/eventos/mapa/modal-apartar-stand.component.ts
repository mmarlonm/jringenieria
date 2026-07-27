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
          <mat-tab-group class="tabs-container" [(selectedIndex)]="0">
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
  `,
  styles: [`
    .dialog-wrapper {
      display: flex;
      flex-direction: column;
      height: 100%;
      background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
    }

    .dialog-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 24px 28px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border-radius: 12px 12px 0 0;
      box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4);

      .header-content {
        display: flex;
        align-items: center;
        gap: 16px;

        h2 {
          margin: 0;
          font-size: 24px;
          font-weight: 600;
          letter-spacing: -0.5px;
        }
      }

      .stand-badge {
        background: rgba(255, 255, 255, 0.2);
        color: white;
        padding: 6px 14px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        backdrop-filter: blur(10px);
      }

      .close-btn {
        color: white;
      }
    }

    mat-dialog-content {
      flex: 1;
      overflow-y: auto;
      padding: 0;
      background: white;

      &::-webkit-scrollbar {
        width: 6px;
      }

      &::-webkit-scrollbar-track {
        background: #f1f1f1;
      }

      &::-webkit-scrollbar-thumb {
        background: #667eea;
        border-radius: 3px;

        &:hover {
          background: #764ba2;
        }
      }
    }

    .dialog-form {
      display: flex;
      flex-direction: column;
      height: 100%;
    }

    .tabs-container {
      ::ng-deep {
        .mat-mdc-tab-labels {
          background: white;
          border-bottom: 2px solid #f0f0f0;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);

          .mat-mdc-tab {
            min-width: 120px !important;
            font-weight: 500;
            color: #64748b;

            .tab-icon {
              margin-right: 8px;
              font-size: 18px;
            }

            &.mat-mdc-tab-active {
              color: #667eea;

              .tab-icon {
                color: #667eea;
              }
            }
          }

          .mdc-tab-indicator__content {
            background: linear-gradient(90deg, #667eea, #764ba2) !important;
          }
        }

        .mat-mdc-tab-body {
          padding: 0 !important;
        }
      }
    }

    .tab-content {
      padding: 28px;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 8px;

      .group-label {
        font-size: 12px;
        font-weight: 700;
        color: #667eea;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
    }

    .full-width {
      width: 100%;
    }

    mat-form-field {
      ::ng-deep {
        .mat-mdc-form-field {
          width: 100%;
        }

        .mat-mdc-text-field-wrapper {
          padding-bottom: 0 !important;
        }

        .mdc-text-field {
          border-radius: 8px;
        }

        .mat-mdc-form-field-error {
          font-size: 11px;
        }
      }

      .mat-icon {
        color: #667eea;
      }
    }

    .textarea-custom {
      font-family: 'Roboto', sans-serif !important;
      font-size: 14px;
    }

    .upload-zone {
      position: relative;
      border: 2px dashed #d0d7e8;
      border-radius: 12px;
      padding: 32px;
      background: #f8fafc;
      transition: all 0.3s ease;
      cursor: pointer;

      &:hover {
        border-color: #667eea;
        background: #f0f4ff;
      }

      &.has-logo,
      &.has-images {
        border-style: solid;
        padding: 16px;
      }

      .file-input {
        display: none;
      }
    }

    .upload-placeholder {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      padding: 20px;
      cursor: pointer;

      .upload-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        color: #667eea;
      }

      .upload-text {
        font-size: 14px;
        font-weight: 600;
        color: #1e293b;
        margin: 0;
      }

      .upload-hint {
        font-size: 12px;
        color: #94a3b8;
        margin: 0;
      }
    }

    .logo-preview-wrapper {
      position: relative;
      display: inline-block;
      border-radius: 8px;
      overflow: hidden;
      background: white;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);

      .logo-image {
        max-width: 160px;
        max-height: 120px;
        display: block;
        padding: 12px;
      }

      .remove-logo-btn {
        position: absolute;
        top: 4px;
        right: 4px;
        background: rgba(239, 68, 68, 0.9);
        color: white;
        width: 32px;
        height: 32px;

        &:hover {
          background: rgba(239, 68, 68, 1);
        }
      }
    }

    .imagenes-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
      gap: 12px;
      margin-top: 16px;

      .imagen-item {
        position: relative;
        aspect-ratio: 1;
        border-radius: 8px;
        overflow: hidden;
        background: #f1f5f9;
        border: 1px solid #e2e8f0;
        transition: transform 0.2s;
        cursor: pointer;

        &:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 16px rgba(102, 126, 234, 0.2);

          .imagen-overlay {
            opacity: 1;
          }
        }

        .imagen-preview {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .imagen-overlay {
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity 0.2s;

          .delete-img-btn {
            color: white;
            background: rgba(239, 68, 68, 0.9);

            &:hover {
              background: rgba(239, 68, 68, 1);
            }
          }
        }
      }

      .add-more-btn {
        aspect-ratio: 1;
        border-radius: 8px;
        border: 2px dashed #d0d7e8;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 8px;
        cursor: pointer;
        transition: all 0.2s;
        color: #667eea;
        font-weight: 500;

        &:hover {
          border-color: #667eea;
          background: #f0f4ff;
        }

        mat-icon {
          font-size: 28px;
          width: 28px;
          height: 28px;
        }
      }
    }

    .imagen-count {
      font-size: 12px;
      color: #94a3b8;
      text-align: center;
      margin-top: 12px;
    }

    .info-box {
      display: flex;
      gap: 12px;
      padding: 16px;
      background: #f0f4ff;
      border-left: 4px solid #667eea;
      border-radius: 8px;
      margin-top: 12px;

      mat-icon {
        color: #667eea;
        flex-shrink: 0;
      }

      p {
        font-size: 13px;
        color: #64748b;
        margin: 0;
      }
    }

    mat-dialog-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      padding: 20px 28px;
      background: white;
      border-top: 1px solid #e2e8f0;

      .cancel-btn {
        color: #64748b;

        &:hover {
          background: #f1f5f9;
        }
      }

      .save-btn {
        padding: 10px 28px;
        font-weight: 600;
        background: linear-gradient(135deg, #667eea, #764ba2);
        color: white;
        min-width: 180px;

        mat-icon {
          margin-right: 8px;
        }

        &:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        &:not(:disabled) {
          &:hover {
            box-shadow: 0 8px 24px rgba(102, 126, 234, 0.4);
          }
        }
      }
    }

    ::ng-deep {
      .mat-mdc-dialog-container {
        border-radius: 12px !important;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3) !important;
      }
    }
  `]
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
