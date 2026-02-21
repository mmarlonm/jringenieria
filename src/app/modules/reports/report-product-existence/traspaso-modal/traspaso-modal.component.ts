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
import { MatRadioModule } from '@angular/material/radio';
import { MatCheckboxModule } from '@angular/material/checkbox';
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
        MatProgressSpinnerModule,
        MatRadioModule,
        MatCheckboxModule
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

    // Lista de paqueterías solicitadas
    public paqueterias: string[] = ['PAQUETEXPRESS', 'DHL', 'ESTAFETA', 'COLABORADOR'];

    public traspaso: any = {
        idAlmacenOrigen: null,
        almacenOrigenNombre: '',
        idAlmacenDestino: null,
        almacenDestinoNombre: '',
        idUsuarioEnvia: null,
        idUsuarioDestino: null,
        paqueteria: '',
        guiaRastreo: '',
        transportista: '',
        observaciones: '',
        // 🔹 NUEVOS CAMPOS SOP
        tipoEnvio: 'PAQUETERIA', // PAQUETERIA | INTERNO
        destinoFinal: 'SUCURSAL', // SUCURSAL | CLIENTE
        datosLogistica: '',
        urlEvidenciaEnvio: ''
    };

    // Campos temporales para la UI
    public logisticaExtra = {
        esOcurre: false,
        direccion: '',
        telefono: '',
        colaborador: '',
        ocFactura: ''
    };




    public archivoEvidencia: File | null = null;
    public subiendoArchivo: boolean = false;


    // Lista de productos con su cantidad a enviar
    public productosSeleccionados: any[] = [];

    constructor(
        public dialogRef: MatDialogRef<TraspasoModalComponent>,
        @Inject(MAT_DIALOG_DATA) public data: any,
        private _service: ReportProductExistenceService,
        private _usersService: UsersService
    ) { }

    ngOnInit(): void {
        this.cargarUsuarios();
        this.inicializarDatos();
    }

    inicializarDatos(): void {
        // Sacar ID del usuario de la sesión
        try {
            const userInformation = JSON.parse(localStorage.getItem('userInformation') || '{}');
            this.traspaso.idUsuarioEnvia = userInformation.usuario?.id || 1;
        } catch (e) {
            this.traspaso.idUsuarioEnvia = 1;
        }

        // Default para el usuario destino (será sobreescrito por el select)
        this.traspaso.idUsuarioDestino = null;


        // Inicializar lista de productos con cantidad por defecto 1

        if (this.data.productos) {
            this.productosSeleccionados = this.data.productos.map((p: any) => ({
                ...p,
                cantidadEnviar: 1,
                errorStock: false
            }));
        }
    }

    cargarUsuarios(): void {
        this._usersService.getUsers().subscribe({
            next: (res) => this.usuarios = res,
            error: () => Swal.fire('Error', 'No se pudieron cargar los usuarios', 'error')
        });
    }

    onOrigenChange(): void {
        const id = this.traspaso.idAlmacenOrigen;
        if (id === 1) this.traspaso.almacenOrigenNombre = 'Querétaro';
        if (id === 2) this.traspaso.almacenOrigenNombre = 'Pachuca';
        if (id === 3) this.traspaso.almacenOrigenNombre = 'Puebla';

        if (this.traspaso.idAlmacenDestino === id) {
            this.traspaso.idAlmacenDestino = null;
        }
        this.validarStockGlobal();
    }

    onDestinoChange(): void {
        const id = this.traspaso.idAlmacenDestino;
        if (id === 1) this.traspaso.almacenDestinoNombre = 'Querétaro';
        if (id === 2) this.traspaso.almacenDestinoNombre = 'Pachuca';
        if (id === 3) this.traspaso.almacenDestinoNombre = 'Puebla';
    }

    validarStockGlobal(): void {
        const idOrigen = this.traspaso.idAlmacenOrigen;
        this.productosSeleccionados.forEach(p => {
            let stock = 0;
            if (idOrigen === 1) stock = p.qro;
            if (idOrigen === 2) stock = p.pue;
            if (idOrigen === 3) stock = p.pach;

            p.errorStock = p.cantidadEnviar > stock || p.cantidadEnviar <= 0;
            p.stockMaximo = stock;
        });
    }

    get esInvalido(): boolean {
        const algunErrorStock = this.productosSeleccionados.some(p => p.errorStock);

        return algunErrorStock ||
            !this.traspaso.idAlmacenOrigen ||
            !this.traspaso.idAlmacenDestino ||
            !this.traspaso.idUsuarioDestino ||
            (this.traspaso.tipoEnvio === 'PAQUETERIA' && !this.traspaso.paqueteria);


    }




    buildDatosLogistica(): void {
        let parts: string[] = [];

        if (this.traspaso.tipoEnvio === 'PAQUETERIA') {
            const entrega = this.logisticaExtra.esOcurre ? 'Entrega Ocurre' : 'Entrega Domicilio';
            parts.push(entrega);
            if (this.logisticaExtra.direccion) parts.push(`Dirección: ${this.logisticaExtra.direccion}`);
            if (this.logisticaExtra.telefono) parts.push(`Tel: ${this.logisticaExtra.telefono}`);
        } else {

            if (this.logisticaExtra.colaborador) parts.push(`Colaborador: ${this.logisticaExtra.colaborador}`);
        }

        if (this.traspaso.destinoFinal === 'CLIENTE') {
            if (this.logisticaExtra.ocFactura) parts.push(`OC/Factura: ${this.logisticaExtra.ocFactura}`);
        }

        this.traspaso.datosLogistica = parts.join('. ');
    }


    async confirmarTraspaso() {
        if (this.esInvalido) {
            Swal.fire('Atención', 'Revisa las cantidades y los campos obligatorios', 'warning');
            return;
        }

        const confirm = await Swal.fire({
            title: '¿Confirmar Envío?',
            text: `Se enviarán ${this.productosSeleccionados.length} productos a ${this.traspaso.almacenDestinoNombre} vía ${this.traspaso.paqueteria}`,
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

        this.buildDatosLogistica();

        const payload = {
            idAlmacenOrigen: this.traspaso.idAlmacenOrigen,
            almacenOrigenNombre: this.traspaso.almacenOrigenNombre,
            idAlmacenDestino: this.traspaso.idAlmacenDestino,
            almacenDestinoNombre: this.traspaso.almacenDestinoNombre,
            idUsuarioEnvia: this.traspaso.idUsuarioEnvia,
            idUsuarioDestino: this.traspaso.idUsuarioDestino,
            paqueteria: this.traspaso.paqueteria,
            guiaRastreo: this.traspaso.guiaRastreo,
            transportista: this.traspaso.paqueteria || this.traspaso.transportista,
            observaciones: this.traspaso.observaciones || `Traspaso masivo de ${this.productosSeleccionados.length} productos`,
            // 🔹 NUEVOS CAMPOS SOP
            tipoEnvio: this.traspaso.tipoEnvio,
            destinoFinal: this.traspaso.destinoFinal,
            datosLogistica: this.traspaso.datosLogistica,
            urlEvidenciaEnvio: this.traspaso.urlEvidenciaEnvio,
            detalles: this.productosSeleccionados.map(p => ({
                codigoProducto: p.codigoProducto,
                cantidadEnviada: p.cantidadEnviar,
                nombreProducto: p.nombreProducto
            }))
        };


        this._service.crearTraspaso(payload).subscribe({
            next: () => {
                this.loading = false;
                Swal.fire('¡Éxito!', 'Traspaso masivo enviado con éxito.', 'success');
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
