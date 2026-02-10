import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// Angular Material
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import Swal from 'sweetalert2';

// Servicios
import { ReportProductExistenceService } from '../report-product-existence.service';
import { UsersService } from '../../../admin/security/users/users.service';

@Component({
    selector: 'app-traspaso-modal',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        MatDialogModule,
        MatFormFieldModule,
        MatSelectModule,
        MatInputModule,
        MatButtonModule,
        MatIconModule,
        MatProgressSpinnerModule
    ],
    templateUrl: './traspaso-modal.component.html',
    styles: [`
    :host { display: block; }
    .mat-mdc-form-field { width: 100%; }
  `]
})
export class TraspasoModalComponent implements OnInit {

    public usuarios: any[] = [];
    public loading: boolean = false;
    public stockDisponible: number = 0;

    public traspaso = {
        idAlmacenOrigen: null,
        almacenOrigenNombre: '',
        idAlmacenDestino: null,
        almacenDestinoNombre: '',
        idUsuarioEnvia: 1,
        idUsuarioDestino: null,
        observaciones: '',
        cantidad: 1
    };

    constructor(
        public dialogRef: MatDialogRef<TraspasoModalComponent>,
        @Inject(MAT_DIALOG_DATA) public data: any,
        private _service: ReportProductExistenceService,
        private _usersService: UsersService
    ) { }

    ngOnInit(): void {
        this.cargarUsuarios();
    }

    cargarUsuarios(): void {
        this._usersService.getUsers().subscribe({
            next: (res) => this.usuarios = res,
            error: () => Swal.fire('Error', 'No se pudieron cargar los usuarios', 'error')
        });
    }

    onOrigenChange(): void {
        const id = this.traspaso.idAlmacenOrigen;
        if (id === 1) { this.stockDisponible = this.data.producto.qro; this.traspaso.almacenOrigenNombre = 'Querétaro'; }
        if (id === 2) { this.stockDisponible = this.data.producto.pach; this.traspaso.almacenOrigenNombre = 'Pachuca'; }
        if (id === 3) { this.stockDisponible = this.data.producto.pue; this.traspaso.almacenOrigenNombre = 'Puebla'; }

        if (this.traspaso.idAlmacenDestino === id) {
            this.traspaso.idAlmacenDestino = null;
        }
    }

    onDestinoChange(): void {
        const id = this.traspaso.idAlmacenDestino;
        if (id === 1) this.traspaso.almacenDestinoNombre = 'Querétaro';
        if (id === 2) this.traspaso.almacenDestinoNombre = 'Pachuca';
        if (id === 3) this.traspaso.almacenDestinoNombre = 'Puebla';
    }

    // Propiedad calculada para validar en el HTML
    get esInvalido(): boolean {
        return this.traspaso.cantidad <= 0 ||
            this.traspaso.cantidad > this.stockDisponible ||
            !this.traspaso.idAlmacenDestino ||
            !this.traspaso.idUsuarioDestino;
    }

    /**
     * Muestra confirmación y envía al Backend
     */
    async confirmarTraspaso() {
        if (this.esInvalido) {
            Swal.fire('Atención', 'Revisa la cantidad y los campos obligatorios', 'warning');
            return;
        }

        const confirm = await Swal.fire({
            title: '¿Confirmar Traspaso?',
            text: `Se moverán ${this.traspaso.cantidad} unidades a ${this.traspaso.almacenDestinoNombre}`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#1e40af',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Sí, enviar',
            cancelButtonText: 'Cancelar'
        });

        if (confirm.isConfirmed) {
            this.guardarTraspaso();
        }
    }

    private guardarTraspaso(): void {
        this.loading = true;
        const payload = {
            idAlmacenOrigen: this.traspaso.idAlmacenOrigen,
            almacenOrigenNombre: this.traspaso.almacenOrigenNombre,
            idAlmacenDestino: this.traspaso.idAlmacenDestino,
            almacenDestinoNombre: this.traspaso.almacenDestinoNombre,
            idUsuarioEnvia: this.traspaso.idUsuarioEnvia,
            idUsuarioDestino: this.traspaso.idUsuarioDestino,
            observaciones: this.traspaso.observaciones || `Traspaso de ${this.data.producto.nombreProducto}`,
            detalles: [{
                codigoProducto: this.data.producto.codigoProducto,
                cantidadEnviada: this.traspaso.cantidad,
                nombreProducto: this.data.producto.nombreProducto,
            }]
        };
        this._service.crearTraspaso(payload).subscribe({
            next: () => {
                this.loading = false;
                Swal.fire('¡Éxito!', 'Traspaso enviado y notificado.', 'success');
                this.dialogRef.close(true);
            },
            error: (err) => {
                this.loading = false;
                console.error(err);
                Swal.fire('Error', 'No se pudo procesar el traspaso', 'error');
            }
        });
    }
}