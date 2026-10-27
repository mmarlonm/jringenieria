import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subject, takeUntil } from 'rxjs';
import { ImagePreviewDialogComponent } from 'app/modules/admin/dashboards/tasks/task-media-dialog/task-media-dialog-viewer.component';
import { CotizacionEtapasService } from '../cotizacion-etapas.service';
import { CotizacionEtapasArchivoCasoDto } from '../cotizacion-etapas.models';
import { obtenerEtapaConfig } from '../etapas.config';

interface GrupoEvidencias {
    etapa: number;
    titulo: string;
    archivos: CotizacionEtapasArchivoCasoDto[];
}

/**
 * Evidencias que se subieron en cada etapa de la cotización, para verlas junto a los archivos del proyecto
 * (Seguimiento de Proyectos). Solo lectura: subir, cambiar o borrar se hace en el módulo de la etapa.
 */
@Component({
    selector: 'app-evidencias-etapas',
    standalone: true,
    imports: [CommonModule, MatButtonModule, MatIconModule, MatTooltipModule],
    templateUrl: './evidencias-etapas.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class EvidenciasEtapasComponent implements OnInit, OnDestroy {
    @Input({ required: true }) idSeguimiento!: number;

    grupos: GrupoEvidencias[] = [];
    cargando = true;
    error = false;

    private readonly _unsubscribeAll = new Subject<void>();

    constructor(
        private readonly _service: CotizacionEtapasService,
        private readonly _dialog: MatDialog,
        private readonly _cdr: ChangeDetectorRef
    ) {}

    ngOnInit(): void {
        this._service.archivosDelCaso(this.idSeguimiento)
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe({
                next: (archivos) => {
                    this.grupos = this._agrupar(archivos || []);
                    this.cargando = false;
                    this._cdr.markForCheck();
                },
                error: () => {
                    this.error = true;
                    this.cargando = false;
                    this._cdr.markForCheck();
                }
            });
    }

    ngOnDestroy(): void {
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }

    private _agrupar(archivos: CotizacionEtapasArchivoCasoDto[]): GrupoEvidencias[] {
        const porEtapa = new Map<number, CotizacionEtapasArchivoCasoDto[]>();
        for (const a of archivos) {
            porEtapa.set(a.etapa, [...(porEtapa.get(a.etapa) ?? []), a]);
        }
        return [...porEtapa.keys()]
            .sort((a, b) => a - b)
            .map((etapa) => ({
                etapa,
                titulo: obtenerEtapaConfig(etapa)?.titulo ?? `Etapa ${etapa}`,
                archivos: porEtapa.get(etapa)!
            }));
    }

    esPrevisualizable(nombre: string): boolean {
        return /\.(pdf|png|jpe?g|gif|webp)$/i.test(nombre);
    }

    descargar(archivo: CotizacionEtapasArchivoCasoDto): void {
        this._service.descargarArchivo(this.idSeguimiento, archivo.etapa, archivo.revision, archivo.nombreArchivo)
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe({
                next: (blob) => {
                    const url = URL.createObjectURL(blob);
                    const enlace = document.createElement('a');
                    enlace.href = url;
                    enlace.download = archivo.nombreArchivo;
                    document.body.appendChild(enlace);
                    enlace.click();
                    document.body.removeChild(enlace);
                    URL.revokeObjectURL(url);
                },
                error: (err) => console.error('Error al descargar la evidencia:', err)
            });
    }

    ver(archivo: CotizacionEtapasArchivoCasoDto): void {
        this._service.descargarArchivo(this.idSeguimiento, archivo.etapa, archivo.revision, archivo.nombreArchivo)
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe({
                next: (blob) => {
                    this._dialog.open(ImagePreviewDialogComponent, {
                        data: {
                            url: URL.createObjectURL(blob),
                            name: archivo.nombreArchivo,
                            isPdf: /\.pdf$/i.test(archivo.nombreArchivo)
                        }
                    });
                },
                error: (err) => console.error('Error al previsualizar la evidencia:', err)
            });
    }

    trackByArchivo(_: number, a: CotizacionEtapasArchivoCasoDto): string {
        return `${a.etapa}/${a.revision}/${a.nombreArchivo}`;
    }
}
