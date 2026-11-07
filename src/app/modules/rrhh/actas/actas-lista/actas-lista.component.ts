import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router, RouterLink } from '@angular/router';
import { PermisosEspecialesService } from 'app/core/permisos-especiales/permisos-especiales.service';
import { ActasService } from '../actas.service';
import { ActaResumen } from '../actas.types';
import {
    claseAlerta,
    claseEstatus,
    ETIQUETAS_GRAVEDAD,
    ETIQUETAS_SANCION,
    etiquetaEstatus,
    textoAlerta,
    textoValidacion
} from '../actas.utils';
import { DialogoActaComponent } from '../dialogos/dialogo-acta.component';

@Component({
    selector: 'app-actas-lista',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        RouterLink,
        MatButtonModule,
        MatIconModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatDialogModule,
        MatTooltipModule
    ],
    templateUrl: './actas-lista.component.html'
})
export class ActasListaComponent implements OnInit {
    private readonly _service = inject(ActasService);
    private readonly _dialog = inject(MatDialog);
    private readonly _router = inject(Router);
    private readonly _permisos = inject(PermisosEspecialesService);

    actas: ActaResumen[] = [];
    alertas: ActaResumen[] = [];
    cargando = false;
    errorCarga = false;

    filtroEstatus = '';
    filtroAlerta = '';
    buscarTexto = '';

    readonly estatuses = ['Borrador', 'Citado', 'AudienciaRealizada', 'PendienteFirmas', 'SancionAplicada', 'Cerrada', 'Anulada'];

    readonly etiquetaEstatus = etiquetaEstatus;
    readonly claseEstatus = claseEstatus;
    readonly claseAlerta = claseAlerta;
    readonly textoAlerta = textoAlerta;
    readonly textoValidacion = textoValidacion;

    /** Quien tiene el permiso de consulta o de gestión ve todas las actas; los demás solo las que iniciaron. */
    get verTodas(): boolean {
        return this._permisos.tiene('rrhh.actas.gestionar') || this._permisos.tiene('rrhh.actas.consultar');
    }

    ngOnInit(): void {
        this.cargar();
    }

    cargar(): void {
        this.cargando = true;
        this.errorCarga = false;
        this._service.listar({
            estatus: this.filtroEstatus || undefined,
            alerta: this.filtroAlerta || undefined,
            buscar: this.buscarTexto.trim() || undefined
        }).subscribe({
            next: (data) => {
                this.actas = data;
                this.cargando = false;
            },
            error: () => {
                this.cargando = false;
                this.errorCarga = true;
            }
        });

        if (this.verTodas) {
            this._service.alertas().subscribe({
                next: (data) => (this.alertas = data),
                error: () => (this.alertas = [])
            });
        }
    }

    nuevaActa(): void {
        const ref = this._dialog.open(DialogoActaComponent, { data: {}, maxHeight: '90vh' });
        ref.afterClosed().subscribe((acta) => {
            if (acta) this._router.navigate(['/rrhh/actas', acta.actaId]);
        });
    }

    etiquetaGravedad(g: string): string {
        return ETIQUETAS_GRAVEDAD[g] ?? g;
    }

    etiquetaSancion(s?: string | null): string {
        return s ? (ETIQUETAS_SANCION[s] ?? s) : '—';
    }
}
