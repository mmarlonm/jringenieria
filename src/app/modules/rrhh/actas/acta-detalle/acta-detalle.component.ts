import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { PermisosEspecialesService } from 'app/core/permisos-especiales/permisos-especiales.service';
import { ActasService } from '../actas.service';
import { ActaDetalle } from '../actas.types';
import {
    AccionActa,
    accionesDisponibles,
    claseAlerta,
    claseEstatus,
    ETIQUETAS_FIRMA,
    ETIQUETAS_GRAVEDAD,
    ETIQUETAS_SANCION,
    etiquetaEstatus,
    indicePaso,
    PASOS_ACTA,
    textoAlerta,
    textoValidacion
} from '../actas.utils';
import { DialogoActaComponent } from '../dialogos/dialogo-acta.component';
import { DialogoAnularActaComponent } from '../dialogos/dialogo-anular.component';
import { DialogoAudienciaComponent } from '../dialogos/dialogo-audiencia.component';
import { DialogoCitarComponent } from '../dialogos/dialogo-citar.component';
import { DialogoFirmaComponent } from '../dialogos/dialogo-firma.component';
import { DialogoSancionComponent } from '../dialogos/dialogo-sancion.component';

@Component({
    selector: 'app-acta-detalle',
    standalone: true,
    imports: [CommonModule, RouterLink, MatButtonModule, MatIconModule, MatDialogModule, MatTooltipModule],
    templateUrl: './acta-detalle.component.html'
})
export class ActaDetalleComponent implements OnInit {
    private readonly _route = inject(ActivatedRoute);
    private readonly _router = inject(Router);
    private readonly _service = inject(ActasService);
    private readonly _dialog = inject(MatDialog);
    private readonly _permisos = inject(PermisosEspecialesService);

    actaId!: number;
    acta: ActaDetalle | null = null;
    cargando = false;
    ocupado = false;

    readonly pasos = PASOS_ACTA;
    readonly etiquetaEstatus = etiquetaEstatus;
    readonly claseEstatus = claseEstatus;
    readonly claseAlerta = claseAlerta;
    readonly textoAlerta = textoAlerta;
    readonly textoValidacion = textoValidacion;

    get esGestor(): boolean {
        return this._permisos.tiene('rrhh.actas.gestionar');
    }

    get acciones(): AccionActa[] {
        return this.acta ? accionesDisponibles(this.acta.estatus, this.acta.editable, this.esGestor) : [];
    }

    get pasoActual(): number {
        return this.acta ? indicePaso(this.acta.estatus) : -1;
    }

    ngOnInit(): void {
        this.actaId = Number(this._route.snapshot.paramMap.get('id'));
        this.cargar();
    }

    cargar(): void {
        this.cargando = true;
        this._service.obtener(this.actaId).subscribe({
            next: (data) => {
                this.acta = data;
                this.cargando = false;
            },
            error: (err) => {
                this.cargando = false;
                alert(err?.error?.mensaje || 'No se pudo cargar el acta');
                this._router.navigate(['/rrhh/actas']);
            }
        });
    }

    ejecutar(accion: AccionActa): void {
        if (!this.acta) return;
        const data = { acta: this.acta };
        switch (accion) {
            case 'editar': this.abrir(DialogoActaComponent, data); break;
            case 'citar': this.abrir(DialogoCitarComponent, data); break;
            case 'audiencia': this.abrir(DialogoAudienciaComponent, data); break;
            case 'sancion': this.abrir(DialogoSancionComponent, data); break;
            case 'firma': this.abrir(DialogoFirmaComponent, data); break;
            case 'anular': this.abrir(DialogoAnularActaComponent, data); break;
            case 'cerrar': this.cerrar(); break;
        }
    }

    private abrir(componente: any, data: { acta: ActaDetalle }): void {
        this._dialog.open(componente, { data, maxHeight: '90vh' })
            .afterClosed()
            .subscribe((res: ActaDetalle | undefined) => {
                if (res) this.acta = res;
            });
    }

    private cerrar(): void {
        if (!this.acta || !confirm(`¿Cerrar el acta ${this.acta.folio}? Después ya no se puede modificar.`)) return;
        this.ocupado = true;
        this._service.cerrar(this.acta.actaId).subscribe({
            next: (res) => {
                this.ocupado = false;
                this.acta = res;
            },
            error: (err) => {
                this.ocupado = false;
                alert(err?.error?.mensaje || 'No se pudo cerrar el acta');
            }
        });
    }

    etiquetaAccion(a: AccionActa): string {
        return {
            editar: 'Editar hechos',
            citar: 'Citar al colaborador',
            audiencia: 'Registrar audiencia',
            sancion: 'Aplicar sanción',
            firma: 'Registrar firma',
            cerrar: 'Cerrar acta',
            anular: 'Anular'
        }[a];
    }

    iconoAccion(a: AccionActa): string {
        return {
            editar: 'heroicons_outline:pencil-square',
            citar: 'heroicons_outline:envelope',
            audiencia: 'heroicons_outline:chat-bubble-left-right',
            sancion: 'heroicons_outline:scale',
            firma: 'heroicons_outline:pencil',
            cerrar: 'heroicons_outline:lock-closed',
            anular: 'heroicons_outline:x-circle'
        }[a];
    }

    etiquetaGravedad(g: string): string {
        return ETIQUETAS_GRAVEDAD[g] ?? g;
    }

    etiquetaSancion(s?: string | null): string {
        return s ? (ETIQUETAS_SANCION[s] ?? s) : 'Sin decidir';
    }

    etiquetaFirma(f?: string | null): string {
        return f ? (ETIQUETAS_FIRMA[f] ?? f) : 'Pendiente';
    }
}
