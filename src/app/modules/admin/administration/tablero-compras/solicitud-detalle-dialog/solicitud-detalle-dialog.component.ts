import { Component, Inject, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SolicitudCompraService } from '../../solicitudes-compra/solicitud-compra.service';
import { SolicitudCompra } from '../../solicitudes-compra/models/solicitud-compra.types';
import { UsersService } from 'app/modules/admin/security/users/users.service';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
    selector: 'solicitud-detalle-dialog',
    template: `
        <div class="flex flex-col md:min-w-160 max-h-[90vh] overflow-hidden bg-white text-default rounded-xl">
            
            <!-- Header -->
            <div class="flex flex-row items-center justify-between p-6 border-b bg-gray-50 dark:bg-transparent">
                <div class="flex flex-col">
                    <div class="text-2xl font-extrabold tracking-tight leading-none italic text-primary">Detalle de Solicitud</div>
                    <div class="mt-1 flex items-center text-secondary font-medium" *ngIf="solicitud">
                        Folio: <span class="ml-1 font-bold text-default">{{ solicitud.idSolicitud || data.idSolicitud }}</span>
                        <span class="ml-3" *ngIf="solicitud.folioOC">Folio OC: <span class="ml-1 font-bold text-amber-600">{{ solicitud.folioOC }}</span></span>
                        <span class="mx-2">•</span>
                        Status: <span class="ml-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-white uppercase" 
                                      [style.background-color]="getColorById(solicitud.idEstatus)">
                                    {{ solicitud.nombreEstatus }}
                                </span>
                    </div>
                </div>
                <button mat-icon-button (click)="close()">
                    <mat-icon [svgIcon]="'heroicons_solid:x-mark'"></mat-icon>
                </button>
            </div>

            <!-- Content -->
            <div class="flex-auto overflow-y-auto p-6 space-y-8" *ngIf="solicitud; else loading">
                
                <!-- General Info Grid -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div class="flex flex-col">
                        <span class="text-xs font-bold uppercase text-secondary tracking-wider">Sucursal / Área</span>
                        <span class="font-semibold">{{ solicitud.sucursal }} / {{ solicitud.areaSolicitante }}</span>
                    </div>
                    <div class="flex flex-col">
                        <span class="text-xs font-bold uppercase text-secondary tracking-wider">Solicitante</span>
                        <span class="font-semibold text-primary">{{ getSolicitanteName(solicitud.idPersonaSolicitante) }}</span>
                    </div>
                    <div class="flex flex-col">
                        <span class="text-xs font-bold uppercase text-secondary tracking-wider">Fecha Requerida</span>
                        <span class="font-semibold text-red-600">{{ solicitud.fechaRequerida | date:'dd MMM, yyyy' }}</span>
                    </div>
                    <div class="flex flex-col">
                        <span class="text-xs font-bold uppercase text-secondary tracking-wider">Prioridad</span>
                        <span class="font-bold" [ngClass]="{'text-red-500': solicitud.prioridad === 'Urgente', 'text-amber-500': solicitud.prioridad === 'Alta'}">
                            {{ solicitud.prioridad }}
                        </span>
                    </div>
                    <div class="flex flex-col">
                        <span class="text-xs font-bold uppercase text-secondary tracking-wider">Tipo de Compra</span>
                        <span class="font-medium italic">{{ solicitud.tipoCompra }}</span>
                    </div>
                    <div class="flex flex-col">
                        <span class="text-xs font-bold uppercase text-secondary tracking-wider">Matriz Eisenhower</span>
                        <div class="mt-1 px-3 py-1.5 rounded-full text-[11px] font-bold inline-flex items-center gap-2 whitespace-nowrap shadow-sm border border-black/5 w-fit"
                             [style.background-color]="getCuadranteColor(solicitud.cuadranteId) + '20'">
                            <div class="w-3 h-3 rounded-full" [style.background-color]="getCuadranteColor(solicitud.cuadranteId)"></div>
                            <span class="leading-none pt-px" [style.color]="getCuadranteColor(solicitud.cuadranteId)">
                                {{ getCuadranteName(solicitud.cuadranteId) }}
                            </span>
                        </div>
                    </div>
                    <div class="flex flex-col">
                        <span class="text-xs font-bold uppercase text-secondary tracking-wider">Centro de Costo</span>
                        <span class="font-medium">{{ solicitud.centroCosto }}</span>
                    </div>
                    <div class="flex flex-col">
                        <span class="text-xs font-bold uppercase text-secondary tracking-wider">Moneda / Monto</span>
                        <span class="font-bold text-primary">{{ solicitud.moneda }} {{ solicitud.monto | number:'1.2-2' }}</span>
                    </div>
                    <div class="flex flex-col" *ngIf="solicitud.rfc">
                        <span class="text-xs font-bold uppercase text-secondary tracking-wider">RFC Proveedor</span>
                        <span class="font-medium uppercase">{{ solicitud.rfc }}</span>
                    </div>
                </div>

                <mat-divider></mat-divider>

                <!-- Items Table -->
                <div class="flex flex-col" *ngIf="solicitud.detalles && solicitud.detalles.length > 0; else noItems">
                    <div class="flex items-center mb-4">
                        <mat-icon class="icon-size-5 mr-2 text-primary" [svgIcon]="'heroicons_solid:list-bullet'"></mat-icon>
                        <span class="text-lg font-bold">Listado de Partidas</span>
                    </div>
                    <div class="overflow-x-auto border rounded-xl">
                        <table class="w-full text-left bg-transparent border-collapse">
                            <thead>
                                <tr class="bg-gray-50 dark:bg-gray-800 text-[10px] font-bold uppercase text-secondary">
                                    <th class="px-4 py-3">Part.</th>
                                    <th class="px-4 py-3">Material / Servicio</th>
                                    <th class="px-4 py-3">Especificación</th>
                                    <th class="px-4 py-3 text-right">Cant.</th>
                                    <th class="px-4 py-3 text-right">Monto</th>
                                    <th class="px-4 py-3 text-center">Unidad</th>
                                    <th class="px-4 py-3">Pendiente</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr *ngFor="let item of solicitud.detalles" class="border-t border-gray-100 dark:border-gray-800 hover:bg-gray-50/50">
                                    <td class="px-4 py-3 text-xs font-bold">{{ item.partida }}</td>
                                    <td class="px-4 py-3 font-semibold">{{ item.materialServicio }}</td>
                                    <td class="px-4 py-3 text-xs text-secondary italic">{{ item.descripcionEspecificacion || '-' }}</td>
                                    <td class="px-4 py-3 text-right font-bold text-primary">{{ item.cantidad }}</td>
                                    <td class="px-4 py-3 text-right font-bold tabular-nums">{{ item.monto | number:'1.2-2' }}</td>
                                    <td class="px-4 py-3 text-center text-xs">{{ item.unidad }}</td>
                                    <td class="px-4 py-3 text-right font-black text-red-500">{{ item.pendiente }}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
                <ng-template #noItems>
                    <div class="p-6 border border-dashed rounded-xl text-center text-secondary italic">
                        No hay partidas registradas en esta solicitud.
                    </div>
                </ng-template>

                <!-- Fiscal Data (CONTPAQi) -->
                <div class="p-6 bg-emerald-50/50 dark:bg-emerald-900/10 rounded-2xl border border-emerald-100 dark:border-emerald-900/20" 
                     *ngIf="(solicitud.datosFacturaContpaqi || solicitud.datosFiscales) as df">
                    <div class="flex items-center mb-4 text-emerald-700 dark:text-emerald-400">
                        <mat-icon class="icon-size-5 mr-2" [svgIcon]="'heroicons_solid:document-check'"></mat-icon>
                        <span class="text-base font-bold uppercase tracking-tight">Validación Fiscal (CONTPAQi)</span>
                    </div>
                    <div class="grid grid-cols-2 lg:grid-cols-5 gap-4">
                        <div class="flex flex-col">
                            <span class="text-[10px] font-bold text-secondary uppercase tracking-wider">Factura</span>
                            <span class="text-sm font-black text-emerald-600">{{ (df.totalFactura || 0) | currency:'MXN':'symbol-narrow':'1.2-2' }}</span>
                        </div>
                        <div class="flex flex-col">
                            <span class="text-[10px] font-bold text-secondary uppercase tracking-wider">Folio Interno</span>
                            <span class="text-sm font-bold text-amber-600 leading-tight">{{ df.folioInternoFactura || '-' }}</span>
                        </div>
                        <div class="flex flex-col">
                            <span class="text-[10px] font-bold text-secondary uppercase tracking-wider">Razón Social</span>
                            <span class="text-xs font-bold text-gray-700 truncate" [matTooltip]="df.nombreProveedor">
                                {{ df.nombreProveedor || '-' }}
                            </span>
                        </div>
                        <div class="flex flex-col">
                            <span class="text-[10px] font-bold text-secondary uppercase tracking-wider">RFC</span>
                            <span class="text-xs font-bold text-gray-700">{{ df.rfcProveedor || '-' }}</span>
                        </div>
                        <div class="flex flex-col">
                            <span class="text-[10px] font-bold text-secondary uppercase tracking-wider">UUID</span>
                            <span class="text-[9px] font-mono font-bold text-gray-500 break-all leading-tight">
                                {{ df.folioFiscal_UUID || 'No disponible' }}
                            </span>
                        </div>
                    </div>
                </div>

                <!-- Observations & Files -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <!-- Observations -->
                    <div class="flex flex-col p-4 bg-amber-50/50 dark:bg-amber-900/10 rounded-2xl border border-amber-100 dark:border-amber-900/20">
                        <span class="text-xs font-bold uppercase text-amber-600 dark:text-amber-400 tracking-wider mb-2">Comentarios y Observaciones</span>
                        <p class="text-sm italic leading-relaxed text-gray-700 dark:text-gray-300">
                            {{ solicitud.comentariosObservaciones || 'Sin observaciones registradas.' }}
                        </p>
                    </div>

                    <!-- Files -->
                    <div class="flex flex-col">
                        <div class="flex items-center mb-3">
                            <mat-icon class="icon-size-5 mr-2 text-primary" [svgIcon]="'heroicons_solid:paper-clip'"></mat-icon>
                            <span class="text-base font-bold text-gray-800 dark:text-gray-100">Archivos Adjuntos</span>
                        </div>
                        <div class="flex flex-wrap gap-2">
                            <div *ngIf="archivos.length === 0" class="text-xs text-secondary italic p-4 border border-dashed rounded-xl w-full text-center">
                                No hay archivos adjuntos
                            </div>
                            <div *ngFor="let file of archivos" 
                                 (click)="descargarArchivo(file.nombreArchivo)"
                                 class="flex items-center p-2 rounded-lg border bg-white dark:bg-gray-800 hover:bg-primary/5 hover:border-primary cursor-pointer transition-all shadow-sm group">
                                <mat-icon class="icon-size-6 mr-2 text-secondary group-hover:text-primary" [svgIcon]="'heroicons_solid:document-text'"></mat-icon>
                                <div class="flex flex-col">
                                    <span class="text-xs font-bold truncate max-w-40">{{ file.nombreArchivo }}</span>
                                    <span class="text-[9px] text-primary font-bold">Descargar</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <ng-template #loading>
                <div class="flex flex-col items-center justify-center p-20">
                    <mat-icon class="animate-spin icon-size-10 text-primary mb-4" [svgIcon]="'heroicons_solid:arrow-path'"></mat-icon>
                    <span class="font-medium text-secondary">Cargando información detallada...</span>
                </div>
            </ng-template>

            <!-- Footer Actions -->
            <div class="flex items-center justify-end p-6 border-t bg-gray-50 dark:bg-transparent">
                <button mat-flat-button color="primary" class="rounded-lg px-8 py-2 font-bold uppercase tracking-wider" (click)="close()">
                    Cerrar Detalle
                </button>
            </div>
        </div>
    `,
    standalone: true,
    encapsulation: ViewEncapsulation.None,
    imports: [
        CommonModule,
        MatDialogModule,
        MatButtonModule,
        MatIconModule,
        MatDividerModule,
        MatTableModule,
        MatTooltipModule
    ]
})
export class SolicitudDetalleDialogComponent implements OnInit {
    solicitud: SolicitudCompra | null = null;
    archivos: any[] = [];
    usuarios: any[] = [];

    constructor(
        public dialogRef: MatDialogRef<SolicitudDetalleDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: { idSolicitud: number },
        private _service: SolicitudCompraService,
        private _usersService: UsersService
    ) { }

    ngOnInit(): void {
        this.loadDetail();
    }

    loadDetail(): void {
        forkJoin({
            solicitud: this._service.getPorId(this.data.idSolicitud),
            consolidado: this._service.getDetalleConsolidado(this.data.idSolicitud).pipe(catchError(() => of(null))),
            users: this._usersService.getUsers()
        }).subscribe(res => {
            this.solicitud = {
                ...res.solicitud,
                datosFiscales: res.consolidado?.datosFiscales || res.solicitud?.datosFacturaContpaqi
            } as any;
            this.usuarios = res.users || [];
            this.loadFiles();
        });
    }

    getSolicitanteName(id: number): string {
        if (!this.usuarios || this.usuarios.length === 0) return `ID: ${id}`;
        const user = this.usuarios.find(u => u.id === id || u.usuarioId === id);
        return user ? (user.nombreUsuario || user.nombre || user.email) : `ID: ${id}`;
    }

    loadFiles(): void {
        this._service.getArchivos(this.data.idSolicitud).subscribe(res => {
            // Robust handling of different API response formats
            let filesList = [];
            if (Array.isArray(res)) {
                filesList = res;
            } else if (res && res.archivos && Array.isArray(res.archivos)) {
                filesList = res.archivos;
            } else if (res && res.data && Array.isArray(res.data)) {
                filesList = res.data;
            }
            
            this.archivos = filesList.map(nombre => ({ nombreArchivo: nombre }));
        });
    }

    descargarArchivo(nombreArchivo: string): void {
        this._service.descargarArchivo(this.data.idSolicitud, nombreArchivo).subscribe(blob => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = nombreArchivo;
            a.click();
            window.URL.revokeObjectURL(url);
        });
    }

    getColorById(id: number): string {
        const colors = {
            1: '#880E4F', // Creada
            2: '#E91E63', // Revisión
            3: '#FF9800', // Cotización
            4: '#8BC34A', // Aprobación
            5: '#03A9F4', // OC
            6: '#2196F3', // Tránsito
            7: '#3F51B5', // Recibido
            8: '#1A237E'  // Cerrada
        };
        return colors[id] || '#64748b';
    }

    getCuadranteName(id: number | null | undefined): string {
        switch (id) {
            case 1: return 'Importante y Urgente';
            case 2: return 'Importante, No Urgente';
            case 3: return 'No Importante, Urgente';
            case 4: return 'No Importante, No Urgente';
            default: return 'Sin asignar';
        }
    }

    getCuadranteColor(id: number | null | undefined): string {
        switch (id) {
            case 1: return '#f43f5e'; // bg-rose-500
            case 2: return '#fbbf24'; // bg-amber-400
            case 3: return '#34d399'; // bg-emerald-400
            case 4: return '#38bdf8'; // bg-sky-400
            default: return '#94a3b8'; // gray-400
        }
    }

    close(): void {
        this.dialogRef.close();
    }
}
