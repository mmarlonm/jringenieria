import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Router, RouterLink } from '@angular/router';
import { DialogoBajaComponent } from '../dialogos/dialogo-baja.component';
import { OffboardingService } from '../offboarding.service';
import { OffboardingResumen } from '../offboarding.types';
import {
    claseAlertaImss,
    claseEstatus,
    etiquetaCausa,
    etiquetaEstatus,
    porcentajeAvance,
    textoAlertaImss
} from '../offboarding.utils';

@Component({
    selector: 'app-offboarding-lista',
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
        MatDialogModule
    ],
    templateUrl: './offboarding-lista.component.html'
})
export class OffboardingListaComponent implements OnInit {
    private readonly _service = inject(OffboardingService);
    private readonly _dialog = inject(MatDialog);
    private readonly _router = inject(Router);

    bajas: OffboardingResumen[] = [];
    cargando = false;
    errorCarga = false;

    filtroEstatus = '';
    buscarTexto = '';

    readonly estatuses = ['Abierto', 'BajaRegistrada', 'Cerrado', 'Cancelado'];

    readonly etiquetaEstatus = etiquetaEstatus;
    readonly claseEstatus = claseEstatus;
    readonly etiquetaCausa = etiquetaCausa;
    readonly claseAlertaImss = claseAlertaImss;
    readonly textoAlertaImss = textoAlertaImss;
    readonly porcentajeAvance = porcentajeAvance;

    get enProceso(): number {
        return this.bajas.filter((b) => b.estatus === 'Abierto' || b.estatus === 'BajaRegistrada').length;
    }

    get conImssVencida(): number {
        return this.bajas.filter((b) => b.alertaBajaImss === 'Vencida').length;
    }

    ngOnInit(): void {
        this.cargar();
    }

    cargar(): void {
        this.cargando = true;
        this.errorCarga = false;
        this._service.listar({
            estatus: this.filtroEstatus || undefined,
            buscar: this.buscarTexto.trim() || undefined
        }).subscribe({
            next: (data) => {
                this.bajas = data;
                this.cargando = false;
            },
            error: () => {
                this.cargando = false;
                this.errorCarga = true;
            }
        });
    }

    nuevaBaja(): void {
        const ref = this._dialog.open(DialogoBajaComponent, { data: {}, maxHeight: '90vh' });
        ref.afterClosed().subscribe((baja) => {
            if (baja) this._router.navigate(['/rrhh/offboarding', baja.bajaId]);
        });
    }
}
