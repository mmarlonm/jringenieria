import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from 'environments/environment';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-public-ver-pase',
  standalone: true,
  imports: [CommonModule, MatProgressSpinnerModule, MatIconModule],
  template: `
    <div class="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white p-4">
      <div class="max-w-md w-full bg-slate-800 rounded-2xl shadow-xl overflow-hidden border border-slate-700">
        
        <!-- Header del Pase -->
        <div class="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-center">
          <mat-icon class="text-white text-5xl w-12 h-12 mb-2">qr_code_2</mat-icon>
          <h2 class="text-2xl font-bold tracking-tight">Pase de Acceso Digital</h2>
          <p class="text-blue-100 text-sm mt-1">Presenta este código en la entrada del evento</p>
        </div>

        <!-- Contenido principal -->
        <div class="p-8 flex flex-col items-center text-center">
          
          <ng-container *ngIf="cargando">
            <mat-progress-spinner mode="indeterminate" diameter="50" class="my-8"></mat-progress-spinner>
            <p class="text-slate-400">Cargando detalles de tu pase...</p>
          </ng-container>

          <ng-container *ngIf="error">
            <div class="my-6 text-red-500">
              <mat-icon class="text-5xl w-12 h-12">error_outline</mat-icon>
              <p class="font-semibold text-lg mt-2">{{ error }}</p>
            </div>
            <p class="text-slate-400 text-sm">Verifica que el enlace de tu WhatsApp o Correo sea el correcto.</p>
          </ng-container>

          <ng-container *ngIf="asistente && !cargando && !error">
            
            <!-- Nombre del Asistente -->
            <h3 class="text-xl font-bold text-slate-100 mb-1">{{ asistente.nombreCompleto }}</h3>
            <span class="px-3 py-1 bg-blue-500/10 text-blue-400 text-xs font-semibold rounded-full uppercase tracking-wider mb-6">
              {{ asistente.tipoAsistente }}
            </span>

            <!-- Código QR generado con qrserver -->
            <div class="bg-white p-4 rounded-xl shadow-inner mb-6 border-4 border-slate-700">
              <img [src]="'https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=' + asistente.tokenQR" alt="QR Code" class="w-48 h-48 block">
            </div>

            <!-- Email / Datos extra -->
            <p class="text-slate-300 text-sm mb-4">
              <strong>Correo:</strong> {{ asistente.correoElectronico }}
            </p>

            <div class="w-full border-t border-slate-700/50 pt-4 mt-2">
              <p class="text-slate-400 text-xs">
                ID de Registro: <span class="font-mono text-slate-500">{{ asistente.tokenQR }}</span>
              </p>
              <p class="text-slate-500 text-xs mt-1">
                Este pase es personal e intransferible.
              </p>
            </div>

          </ng-container>

        </div>
      </div>

      <!-- Pie de página -->
      <div class="mt-8 text-center text-slate-500 text-xs">
        <p>&copy; 2026 JR Ingeniería Eléctrica. Todos los derechos reservados.</p>
      </div>

    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }
  `]
})
export class PublicVerPaseComponent implements OnInit {
  private _route = inject(ActivatedRoute);
  private _http = inject(HttpClient);

  asistente: any = null;
  cargando = true;
  error: string | null = null;

  ngOnInit(): void {
    // Escuchar el parámetro token
    this._route.queryParams.subscribe(params => {
      const token = params['token'] || this._route.snapshot.paramMap.get('token');
      if (token) {
        this.cargarDatosAsistente(token);
      } else {
        this.error = 'Código de acceso no especificado.';
        this.cargando = false;
      }
    });
  }

  cargarDatosAsistente(token: string): void {
    const url = `${environment.apiUrl}/Asistentes/ver-pase/${token}`;
    this.cargando = true;
    this.error = null;

    this._http.get(url).subscribe({
      next: (data) => {
        this.asistente = data;
        this.cargando = false;
      },
      error: (err) => {
        console.error(err);
        this.error = 'No se encontró la información del pase o es inválido.';
        this.cargando = false;
      }
    });
  }
}
