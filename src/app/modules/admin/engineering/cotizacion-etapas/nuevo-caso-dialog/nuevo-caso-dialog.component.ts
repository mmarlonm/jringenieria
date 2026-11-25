import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialog, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatRadioModule } from '@angular/material/radio';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subject, takeUntil } from 'rxjs';
import { CotizacionEtapasService } from '../cotizacion-etapas.service';
import { EngineeringService, Solicitante } from '../../engineering.service';
import { UsersService } from 'app/modules/admin/security/users/users.service';
import { SubcontratacionService, SubcontratistaPersonal } from '../../subcontratacion.service';
import { CrearCasoDto } from '../cotizacion-etapas.models';
import { SolicitanteDialogComponent } from '../../solicitantes/solicitante-dialog/solicitante-dialog.component';

export interface SucursalOption {
    id: number;
    nombre: string;
}

@Component({
    selector: 'app-nuevo-caso-dialog',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatDialogModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatButtonModule,
        MatIconModule,
        MatRadioModule,
        MatDatepickerModule,
        MatNativeDateModule,
        MatTooltipModule,
        SolicitanteDialogComponent
    ],
    templateUrl: './nuevo-caso-dialog.component.html',
    styleUrls: ['./nuevo-caso-dialog.component.scss']
})
export class NuevoCasoDialogComponent implements OnInit, OnDestroy {
    form: FormGroup;
    solicitantes: Solicitante[] = [];
    usuariosJr: any[] = [];
    aliados: SubcontratistaPersonal[] = [];
    guardando = false;
    creandoSolicitante = false;
    errorMsg: string | null = null;

    sucursales: SucursalOption[] = [
        { id: 1, nombre: 'Querétaro' },
        { id: 2, nombre: 'Puebla' },
        { id: 3, nombre: 'Hidalgo (Pachuca)' }
    ];

    tiposProyecto: string[] = [
        'Construcción e instalación',
        'Ingeniería',
        'Mantenimiento',
        'Instalación',
        'Estudios y Pruebas',
        'Gestiones y trámites',
        'Proyectos llave en mano'
    ];

    private readonly _unsubscribeAll = new Subject<void>();

    constructor(
        private readonly _fb: FormBuilder,
        private readonly _dialogRef: MatDialogRef<NuevoCasoDialogComponent>,
        private readonly _dialog: MatDialog,
        private readonly _cotizacionService: CotizacionEtapasService,
        private readonly _engineeringService: EngineeringService,
        private readonly _usersService: UsersService,
        private readonly _subcontratacionService: SubcontratacionService
    ) {
        this.form = this._fb.group({
            idSolicitante: [null, [Validators.required]],
            sucursalId: [null, [Validators.required]],
            fechaRequisicion: [new Date()],
            tipo: ['Construcción e instalación', [Validators.required]],
            titulo: ['', [Validators.required, Validators.maxLength(500)]],
            descripcion: ['', [Validators.required, Validators.maxLength(500)]],
            esAliado: [false],
            responsableUsuarioId: [null]
        });
    }

    ngOnInit(): void {
        this._cargarCatalogos();
    }

    onTipoResponsableChange(): void {
        this.form.get('responsableUsuarioId')?.setValue(null);
    }

    ngOnDestroy(): void {
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }

    private _cargarCatalogos(): void {
        this._engineeringService.getSolicitantes()
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe({
                next: (res) => {
                    this.solicitantes = (res || []).filter((s) => s.activo);
                },
                error: (err) => console.error('Error cargando solicitantes', err)
            });

        this._usersService.getUsers()
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe({
                next: (res) => {
                    this.usuariosJr = res || [];
                },
                error: (err) => console.error('Error cargando usuarios JR', err)
            });

        this._subcontratacionService.getPersonal()
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe({
                next: (res) => {
                    this.aliados = (res || []).filter((p) => p.activo !== false);
                },
                error: (err) => console.error('Error cargando aliados', err)
            });
    }

    guardar(): void {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        this.guardando = true;
        this.errorMsg = null;

        const val = this.form.value;
        const dto: CrearCasoDto = {
            idSolicitante: val.idSolicitante,
            titulo: val.titulo.trim(),
            descripcion: val.descripcion.trim(),
            tipo: val.tipo,
            sucursalId: val.sucursalId,
            fechaRequisicion: val.fechaRequisicion ? new Date(val.fechaRequisicion).toISOString() : null,
            responsableUsuarioId: !val.esAliado ? val.responsableUsuarioId : null,
            responsableAliadoId: val.esAliado ? val.responsableUsuarioId : null,
            esAliado: !!val.esAliado
        };

        this._cotizacionService.crear(dto)
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe({
                next: (creado) => {
                    this.guardando = false;
                    this._dialogRef.close(creado);
                },
                error: (err) => {
                    this.guardando = false;
                    this.errorMsg = err?.error?.mensaje || 'Ocurrió un error al registrar el caso.';
                }
            });
    }

    cancelar(): void {
        this._dialogRef.close();
    }

    agregarSolicitante(): void {
        const dialogRef = this._dialog.open(SolicitanteDialogComponent, {
            width: '100%',
            maxWidth: '500px',
            autoFocus: false
        });

        dialogRef.afterClosed()
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((valor) => {
                if (!valor) {
                    return;
                }

                this.creandoSolicitante = true;
                this.errorMsg = null;

                this._engineeringService.saveSolicitante({
                    ...valor,
                    idSolicitante: 0,
                    activo: true
                })
                .pipe(takeUntil(this._unsubscribeAll))
                .subscribe({
                    next: (res: any) => {
                        const nuevoId = res?.idSolicitante;
                        this._engineeringService.getSolicitantes()
                            .pipe(takeUntil(this._unsubscribeAll))
                            .subscribe({
                                next: (lista) => {
                                    this.solicitantes = (lista || []).filter((s) => s.activo);
                                    if (nuevoId) {
                                        this.form.get('idSolicitante')?.setValue(nuevoId);
                                        this.form.get('idSolicitante')?.markAsTouched();
                                    }
                                    this.creandoSolicitante = false;
                                },
                                error: () => {
                                    if (nuevoId) {
                                        const localItem: Solicitante = {
                                            idSolicitante: nuevoId,
                                            nombreCompleto: (valor.nombreCompleto || '').trim().toUpperCase(),
                                            empresa: (valor.empresa || '').trim().toUpperCase(),
                                            celular: valor.celular,
                                            area: valor.area,
                                            activo: true
                                        };
                                        this.solicitantes = [...this.solicitantes, localItem];
                                        this.form.get('idSolicitante')?.setValue(nuevoId);
                                        this.form.get('idSolicitante')?.markAsTouched();
                                    }
                                    this.creandoSolicitante = false;
                                }
                            });
                    },
                    error: () => {
                        this.creandoSolicitante = false;
                        this.errorMsg = 'No se pudo crear el solicitante.';
                    }
                });
            });
    }
}
