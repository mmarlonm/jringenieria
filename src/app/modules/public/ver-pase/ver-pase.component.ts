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
    <div class="relative flex flex-col items-center justify-center min-h-screen w-full bg-slate-950 text-slate-100 font-sans overflow-x-hidden p-4 select-none">
      
      <!-- Mesh Glow Background Elements -->
      <div class="absolute top-[-10%] left-[-10%] w-[60%] h-[50%] rounded-full bg-indigo-500/10 blur-[130px] pointer-events-none"></div>
      <div class="absolute bottom-[-10%] right-[-10%] w-[60%] h-[50%] rounded-full bg-emerald-500/5 blur-[130px] pointer-events-none"></div>
      
      <div class="max-w-sm w-full rounded-3xl overflow-hidden shadow-2xl dark:shadow-[0_0_50px_rgba(99,102,241,0.1)] border border-slate-800/80 bg-slate-900/60 backdrop-blur-xl relative transition-all duration-300 animate-fade-in z-10">
        
        <!-- Header del Pase -->
        <div class="relative w-full bg-gradient-to-tr from-indigo-700 to-indigo-500 p-8 text-center border-b border-indigo-500/20">
          <div class="absolute top-4 left-4 flex items-center gap-2">
            <div class="h-6 w-6 rounded-lg bg-white/10 flex items-center justify-center backdrop-blur-sm">
              <mat-icon class="text-white icon-size-3.5" svgIcon="heroicons_outline:bolt"></mat-icon>
            </div>
            <span class="text-[9px] font-black tracking-widest text-indigo-200 uppercase">Foro Energiza</span>
          </div>

          <div class="mx-auto h-16 w-16 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center shadow-lg mb-4 mt-2">
            <mat-icon class="text-white icon-size-8 animate-pulse" svgIcon="heroicons_outline:qr-code"></mat-icon>
          </div>
          <h2 class="text-xl font-black tracking-tight text-white uppercase">Pase de Acceso</h2>
          <p class="text-indigo-200 text-xs font-semibold mt-1">Presenta este código en el acceso principal</p>
        </div>

        <!-- Contenido principal -->
        <div class="p-8 flex flex-col items-center text-center">
          
          <ng-container *ngIf="cargando">
            <mat-progress-spinner mode="indeterminate" diameter="40" class="my-6"></mat-progress-spinner>
            <p class="text-slate-400 text-xs font-semibold uppercase tracking-wider animate-pulse">Cargando detalles...</p>
          </ng-container>

          <ng-container *ngIf="error">
            <div class="my-6 flex flex-col items-center">
              <div class="p-4 bg-rose-500/10 border border-rose-500/25 rounded-full mb-4">
                <mat-icon class="text-rose-500 icon-size-10" svgIcon="heroicons_outline:exclamation-circle"></mat-icon>
              </div>
              <p class="text-base font-black text-rose-400 uppercase tracking-wide">{{ error }}</p>
            </div>
            <p class="text-slate-400 text-xs font-medium leading-relaxed px-4">Verifica que el enlace recibido por WhatsApp o Correo sea el correcto.</p>
          </ng-container>

          <ng-container *ngIf="asistente && !cargando && !error">
            
            <span class="px-3.5 py-1 rounded-full text-[9px] font-black tracking-widest uppercase mb-4 border"
                  [ngClass]="{
                      'bg-amber-500/10 text-amber-400 border-amber-500/20': asistente.tipoAsistente === 'General',
                      'bg-pink-500/10 text-pink-400 border-pink-500/20': asistente.tipoAsistente === 'Estudiante'
                  }">
              {{ asistente.tipoAsistente }}
            </span>

            <h3 class="text-xl font-black text-white leading-tight mb-6">{{ asistente.nombreCompleto }}</h3>

            <!-- Código QR con bordes premium y sweep de lectura -->
            <div class="relative bg-white p-4.5 rounded-3xl shadow-inner mb-6 border border-slate-700/80 shadow-indigo-500/5 group">
              <!-- Corner reticles -->
              <div class="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-indigo-500 rounded-tl"></div>
              <div class="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-indigo-500 rounded-tr"></div>
              <div class="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-indigo-500 rounded-bl"></div>
              <div class="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-indigo-500 rounded-br"></div>

              <img [src]="'https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=' + asistente.tokenQR" alt="QR Code" class="w-48 h-48 block rounded-xl">
            </div>

            <!-- Details Block -->
            <div class="w-full space-y-3 bg-slate-950/40 rounded-2xl p-4 border border-slate-800 text-left text-xs mb-4">
              <div class="flex justify-between items-center py-1 border-b border-slate-900/60">
                <span class="text-slate-500 font-bold uppercase tracking-wider text-[9px]">Correo</span>
                <span class="text-slate-300 font-bold max-w-[200px] truncate">{{ asistente.correoElectronico }}</span>
              </div>
              <div class="flex justify-between items-center py-1" *ngIf="asistente.empresaRepresenta || asistente.universidadRepresentas">
                <span class="text-slate-500 font-bold uppercase tracking-wider text-[9px]">Organización</span>
                <span class="text-slate-300 font-bold max-w-[200px] truncate">{{ asistente.empresaRepresenta || asistente.universidadRepresentas }}</span>
              </div>
            </div>

            <div class="w-full text-center">
              <p class="text-slate-600 font-mono text-[9px]">
                ID: {{ asistente.tokenQR }}
              </p>
              <p class="text-slate-500 text-[10px] font-semibold mt-1">
                Pase personal y no transferible.
              </p>
            </div>

          </ng-container>

        </div>
      </div>

      <!-- Pie de página -->
      <div class="mt-8 text-center text-slate-600 text-[10px] font-bold tracking-wide z-10">
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
    @keyframes fadeIn {
      0% { opacity: 0; transform: translateY(12px); }
      100% { opacity: 1; transform: translateY(0); }
    }
    .animate-fade-in {
      animation: fadeIn 0.45s cubic-bezier(0.16, 1, 0.3, 1) forwards;
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
