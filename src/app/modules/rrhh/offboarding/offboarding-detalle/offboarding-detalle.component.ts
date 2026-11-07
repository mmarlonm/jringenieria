import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { PermisosEspecialesService } from 'app/core/permisos-especiales/permisos-especiales.service';
import { DialogoBajaComponent } from '../dialogos/dialogo-baja.component';
import { DialogoCancelarBajaComponent } from '../dialogos/dialogo-cancelar-baja.component';
import { DialogoCerrarBajaComponent } from '../dialogos/dialogo-cerrar-baja.component';
import { DialogoRegistrarBajaComponent } from '../dialogos/dialogo-registrar-baja.component';
import { DialogoTareaBajaComponent } from '../dialogos/dialogo-tarea.component';
import { OffboardingService } from '../offboarding.service';
import { GrupoResponsable, OffboardingDetalle, TareaOffboarding } from '../offboarding.types';
import {
    AccionOffboarding,
    accionesDisponibles,
    agruparPorResponsable,
    claseAlertaImss,
    claseEstatus,
    claseTarea,
    etiquetaCausa,
    etiquetaEstatus,
    etiquetaRecontratable,
    etiquetaTarea,
    porcentajeAvance,
    textoAlertaImss
} from '../offboarding.utils';

@Component({
    selector: 'app-offboarding-detalle',
    standalone: true,
    imports: [CommonModule, RouterLink, MatButtonModule, MatIconModule, MatDialogModule],
    templateUrl: './offboarding-detalle.component.html'
})
export class OffboardingDetalleComponent implements OnInit {
    private readonly _route = inject(ActivatedRoute);
    private readonly _router = inject(Router);
    private readonly _service = inject(OffboardingService);
    private readonly _dialog = inject(MatDialog);
    private readonly _permisos = inject(PermisosEspecialesService);

    bajaId!: number;
    baja: OffboardingDetalle | null = null;
    cargando = false;
    ocupado = false;

    readonly etiquetaCausa = etiquetaCausa;
    readonly etiquetaEstatus = etiquetaEstatus;
    readonly etiquetaTarea = etiquetaTarea;
    readonly etiquetaRecontratable = etiquetaRecontratable;
    readonly claseEstatus = claseEstatus;
    readonly claseTarea = claseTarea;
    readonly claseAlertaImss = claseAlertaImss;
    readonly textoAlertaImss = textoAlertaImss;
    readonly porcentajeAvance = porcentajeAvance;

    get puedeAutorizar(): boolean {
        return this._permisos.tiene('rrhh.offboarding.autorizar');
    }

    get acciones(): AccionOffboarding[] {
        return this.baja ? accionesDisponibles(this.baja, this.puedeAutorizar) : [];
    }

    get grupos(): GrupoResponsable[] {
        return this.baja ? agruparPorResponsable(this.baja.tareas) : [];
    }

    /** Las tareas se actualizan mientras el caso no esté cerrado ni cancelado. */
    get tareasEditables(): boolean {
        return this.baja?.estatus === 'Abierto' || this.baja?.estatus === 'BajaRegistrada';
    }

    ngOnInit(): void {
        this.bajaId = Number(this._route.snapshot.paramMap.get('id'));
        this.cargar();
    }

    cargar(): void {
        this.cargando = true;
        this._service.obtener(this.bajaId).subscribe({
            next: (data) => {
                this.baja = data;
                this.cargando = false;
            },
            error: (err) => {
                this.cargando = false;
                alert(err?.error?.mensaje || 'No se pudo cargar el caso de baja');
                this._router.navigate(['/rrhh/offboarding']);
            }
        });
    }

    ejecutar(accion: AccionOffboarding): void {
        if (!this.baja) return;
        const data = { baja: this.baja };
        switch (accion) {
            case 'editar': this.abrir(DialogoBajaComponent, data); break;
            case 'registrarBaja': this.abrir(DialogoRegistrarBajaComponent, data); break;
            case 'cerrar': this.abrir(DialogoCerrarBajaComponent, data); break;
            case 'cancelar': this.abrir(DialogoCancelarBajaComponent, data); break;
            case 'autorizar': this.autorizar(); break;
        }
    }

    editarTarea(tarea: TareaOffboarding): void {
        if (!this.tareasEditables) return;
        this.abrir(DialogoTareaBajaComponent, { tarea });
    }

    private abrir(componente: any, data: object): void {
        this._dialog.open(componente, { data, maxHeight: '90vh' })
            .afterClosed()
            .subscribe((res: OffboardingDetalle | undefined) => {
                if (res) this.baja = res;
            });
    }

    private autorizar(): void {
        if (!this.baja) return;
        if (!confirm('¿Autorizar como Dirección el despido injustificado o convenio de ' + this.baja.colaboradorNombre + '?')) return;
        this.ocupado = true;
        this._service.autorizar(this.baja.bajaId).subscribe({
            next: (res) => {
                this.ocupado = false;
                this.baja = res;
            },
            error: (err) => {
                this.ocupado = false;
                alert(err?.error?.mensaje || 'No se pudo registrar la autorización');
            }
        });
    }

    etiquetaAccion(a: AccionOffboarding): string {
        return {
            editar: 'Editar',
            autorizar: 'Autorizar (Dirección)',
            registrarBaja: 'Registrar baja',
            cerrar: 'Cerrar caso',
            cancelar: 'Cancelar caso'
        }[a];
    }

    iconoAccion(a: AccionOffboarding): string {
        return {
            editar: 'heroicons_outline:pencil-square',
            autorizar: 'heroicons_outline:shield-check',
            registrarBaja: 'heroicons_outline:arrow-right-on-rectangle',
            cerrar: 'heroicons_outline:lock-closed',
            cancelar: 'heroicons_outline:x-circle'
        }[a];
    }
}
