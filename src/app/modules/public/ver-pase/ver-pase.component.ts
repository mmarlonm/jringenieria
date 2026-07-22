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
    <div class="fixed inset-0 overflow-y-auto overflow-x-hidden bg-gradient-to-br from-slate-50 via-[#e6eff5] to-slate-200 select-none dark:from-slate-900 dark:via-slate-950 dark:to-slate-900">
      
      <!-- Loader -->
      <div *ngIf="cargando" class="flex flex-col items-center justify-center text-slate-600 dark:text-slate-300 absolute inset-0 bg-gradient-to-br from-slate-50 via-[#e6eff5] to-slate-200 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 z-50">
        <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#005082] mb-4"></div>
        <p class="text-xs font-bold uppercase tracking-widest text-[#005082] dark:text-[#38bdf8] animate-pulse">Obteniendo pase...</p>
      </div>

      <!-- Main Container -->
      <div class="flex flex-col items-center justify-start sm:justify-center min-h-full p-0 sm:p-4 md:p-6">
        
        <!-- Error State -->
        <div *ngIf="!cargando && error" class="w-full min-h-screen sm:min-h-0 sm:max-w-sm bg-white dark:bg-slate-950 border-0 sm:border border-slate-100 dark:border-slate-900 rounded-none sm:rounded-3xl p-8 flex flex-col items-center justify-center text-center text-slate-800 dark:text-slate-100 shadow-none sm:shadow-2xl">
          <mat-icon class="icon-size-16 text-rose-500 mb-4">error_outline</mat-icon>
          <h3 class="text-lg font-bold">Pase no encontrado</h3>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-2 max-w-xs leading-relaxed">
            El enlace o código QR de pase digital no coincide con ningún asistente registrado en el sistema.
          </p>
        </div>

        <!-- Profile / Pass Card -->
        <div *ngIf="!cargando && !error && asistente" 
             class="w-full min-h-screen sm:min-h-0 sm:max-w-sm bg-white dark:bg-slate-950 border-0 sm:border border-slate-100 dark:border-slate-900/50 rounded-none sm:rounded-3xl overflow-hidden shadow-none sm:shadow-2xl text-slate-800 dark:text-slate-100 transition-all duration-300 relative flex flex-col">
            
            <!-- Pass QR Header with SVG Waves -->
            <div class="relative w-full overflow-visible bg-slate-200 dark:bg-slate-800 flex-shrink-0 flex flex-col items-center justify-center p-8 pt-12 pb-16">
              
              <!-- Premium QR Code container frame (Responsive size w-48 to w-56) -->
              <div class="relative bg-white p-5 rounded-3xl shadow-2xl border-4 border-white dark:border-slate-900 shadow-indigo-950/20 z-25 group transform transition-transform hover:scale-[1.02]">
                <!-- Target Corner Reticles -->
                <div class="absolute top-3 left-3 w-5 h-5 border-t-4 border-l-4 border-[#005082] rounded-tl"></div>
                <div class="absolute top-3 right-3 w-5 h-5 border-t-4 border-r-4 border-[#005082] rounded-tr"></div>
                <div class="absolute bottom-3 left-3 w-5 h-5 border-b-4 border-l-4 border-[#005082] rounded-bl"></div>
                <div class="absolute bottom-3 right-3 w-5 h-5 border-b-4 border-r-4 border-[#005082] rounded-br"></div>
                
                <img [src]="'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=' + asistente.tokenQR" alt="QR Code" class="w-48 h-48 sm:w-52 sm:h-52 block rounded-2xl relative z-10">
              </div>

              <!-- Double Curve Wave Overlay (Brand Green + Brand Blue + White card background) -->
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 200" class="absolute bottom-0 left-0 w-full fill-current block select-none pointer-events-none z-10" style="margin-bottom: -1px;">
                  <!-- Green Wave (Back) -->
                  <path fill="#008232" d="M0,80 C320,180 960,20 1440,110 L1440,200 L0,200 Z"></path>
                  <!-- Blue Wave (Middle) -->
                  <path fill="#005082" d="M0,110 C320,200 960,50 1440,130 L1440,200 L0,200 Z"></path>
                  <!-- White Card Body Cut (Front) -->
                  <path fill="currentColor" class="text-white dark:text-slate-950" d="M0,130 C320,210 960,80 1440,150 L1440,200 L0,200 Z"></path>
              </svg>
              
              <!-- Overlapping Event Badge -->
              <div class="absolute right-6 -bottom-6 z-20 flex items-center justify-center w-12 h-12 rounded-full shadow-lg border-4 border-white dark:border-slate-950 bg-[#005082] text-white">
                  <mat-icon class="icon-size-6">bolt</mat-icon>
              </div>
            </div>

            <!-- Card Body -->
            <div class="p-6 pt-8 relative flex-grow flex flex-col justify-between">
                
                <div>
                    <!-- Header Text Area with dashed vertical line -->
                    <div class="pl-4 space-y-1 border-l-[2.5px] border-dashed"
                         [ngClass]="asistente.tipoAsistente === 'General' ? 'border-[#005082]' : 'border-[#008232]'">
                        <span class="text-[9px] font-black uppercase tracking-widest"
                              [ngClass]="asistente.tipoAsistente === 'General' ? 'text-[#005082] dark:text-[#38bdf8]' : 'text-[#008232] dark:text-emerald-400'">
                            {{ asistente.tipoAsistente }}
                        </span>
                        <h2 class="text-2xl font-black tracking-tight text-slate-800 dark:text-slate-50 leading-tight">
                            {{ asistente.nombreCompleto }}
                        </h2>
                        <p class="text-xs font-semibold text-slate-500 dark:text-slate-400">
                            Pase de Acceso Digital
                        </p>
                        <p class="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider" *ngIf="asistente.empresaRepresenta || asistente.universidadRepresentas">
                            {{ asistente.empresaRepresenta || asistente.universidadRepresentas }}
                        </p>
                    </div>

                    <!-- Details Area -->
                    <div class="mt-8 space-y-3.5">
                        
                        <!-- Correo Electrónico -->
                        <div class="flex items-center gap-4 p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100/50 dark:border-slate-800/40">
                            <div class="flex items-center justify-center w-11 h-11 rounded-full bg-[#005082] text-white shadow-md flex-shrink-0">
                                <mat-icon class="icon-size-5">email</mat-icon>
                            </div>
                            <div class="flex flex-col min-w-0">
                                <span class="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Correo Registrado</span>
                                <span class="text-sm font-extrabold text-slate-700 dark:text-slate-200 truncate break-all">{{ asistente.correoElectronico }}</span>
                            </div>
                        </div>

                        <!-- ID Registro -->
                        <div class="flex items-center gap-4 p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100/50 dark:border-slate-800/40">
                            <div class="flex items-center justify-center w-11 h-11 rounded-full bg-[#008232] text-white shadow-md flex-shrink-0">
                                <mat-icon class="icon-size-5">vpn_key</mat-icon>
                            </div>
                            <div class="flex flex-col min-w-0">
                                <span class="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Token ID</span>
                                <span class="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 truncate">{{ asistente.tokenQR }}</span>
                            </div>
                        </div>

                    </div>
                </div>

                <!-- Footer details -->
                <div class="mt-8 pt-4 border-t border-slate-100 dark:border-slate-900 text-center flex-shrink-0">
                    <p class="text-slate-400 dark:text-slate-650 text-[10px] font-bold uppercase tracking-wider">Presenta el código en tu pantalla para escanear</p>
                    <p class="text-slate-400 dark:text-slate-550 text-[9px] mt-0.5">Foro Energiza &copy; 2026. Todos los derechos reservados.</p>
                </div>

            </div>

        </div>

      </div>

    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }
    @keyframes laserSweep {
      0% { top: 12px; }
      50% { top: calc(100% - 16px); }
      100% { top: 12px; }
    }
    .animate-laser-sweep {
      animation: laserSweep 3s infinite ease-in-out;
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
