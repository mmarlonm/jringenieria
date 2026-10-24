import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatRadioModule } from '@angular/material/radio';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { Subject, takeUntil } from 'rxjs';
import { CotizacionEtapasService } from '../cotizacion-etapas.service';
import { EngineeringService, Solicitante } from '../../engineering.service';
import { UsersService } from 'app/modules/admin/security/users/users.service';
import { SubcontratacionService, SubcontratistaPersonal } from '../../subcontratacion.service';
import { CrearCasoDto } from '../cotizacion-etapas.models';

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
        MatNativeDateModule
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
    errorMsg: string | null = null;

    tiposProyecto: string[] = [
        'PROYECTOS',
        'ESTUDIOS Y ANÁLISIS',
        'INSTALACIÓN Y PUESTA EN SERVICIO',
        'MANTENIMIENTO',
        'SUMINISTRO',
        'OTRO'
    ];

    private readonly _unsubscribeAll = new Subject<void>();

    constructor(
        private readonly _fb: FormBuilder,
        private readonly _dialogRef: MatDialogRef<NuevoCasoDialogComponent>,
        private readonly _cotizacionService: CotizacionEtapasService,
        private readonly _engineeringService: EngineeringService,
        private readonly _usersService: UsersService,
        private readonly _subcontratacionService: SubcontratacionService
    ) {
        this.form = this._fb.group({
            idSolicitante: [null, [Validators.required]],
            fechaRequisicion: [new Date()],
            tipo: ['PROYECTOS', [Validators.required]],
            sucursalId: [null],
            tituloProyecto: ['', [Validators.required, Validators.maxLength(300)]],
            actividad: ['', [Validators.required]],
            esAliado: [false],
            responsableUsuarioId: [null]
        });
    }

    ngOnInit(): void {
        this._cargarCatalogos();

        this.form.get('esAliado')?.valueChanges
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(() => {
                this.form.get('responsableUsuarioId')?.reset();
            });
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
            fechaRequisicion: val.fechaRequisicion ? new Date(val.fechaRequisicion).toISOString() : null,
            tipo: val.tipo,
            sucursalId: val.sucursalId,
            tituloProyecto: val.tituloProyecto.trim(),
            actividad: val.actividad.trim(),
            responsableUsuarioId: val.responsableUsuarioId,
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
}
