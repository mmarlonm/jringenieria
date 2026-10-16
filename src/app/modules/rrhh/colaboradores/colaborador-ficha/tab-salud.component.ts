import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DateTime } from 'luxon';
import { ColaboradoresService } from '../colaboradores.service';
import { ColaboradorSalud } from '../colaboradores.types';
import { aFechaIso, desdeIso, mensajeError, textoONull } from '../colaboradores.utils';

/** Datos clínicos. Solo se muestra a quien tenga el permiso especial rrhh.colaboradores.salud. */
@Component({
    selector: 'rrhh-tab-salud',
    standalone: true,
    templateUrl: './tab-salud.component.html',
    imports: [
        CommonModule, ReactiveFormsModule,
        MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule, MatCheckboxModule, MatDatepickerModule
    ]
})
export class TabSaludComponent implements OnInit {
    private readonly _fb = inject(FormBuilder);
    private readonly _service = inject(ColaboradoresService);
    private readonly _snackBar = inject(MatSnackBar);

    @Input({ required: true }) colaboradorId!: number;
    /** Se emite tras guardar (la ficha refresca el historial). */
    @Output() guardado = new EventEmitter<void>();

    readonly tiposSangre = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];
    cargando = true;
    error: string | null = null;
    guardando = false;

    readonly form = this._fb.group({
        lentes: [false],
        alergias: [false],
        nombreAlergia: [''],
        tipoSangre: [''],
        fechaUltimoExamenMedico: [null as DateTime | null],
        pesoKg: [null as number | null, [Validators.min(0), Validators.max(999.99)]],
        estaturaM: [null as number | null, [Validators.min(0), Validators.max(9.99)]],
        vacunas: ['']
    });

    ngOnInit(): void {
        this._service.obtenerSalud(this.colaboradorId).subscribe({
            next: (s) => {
                if (s) {
                    this.form.reset({
                        lentes: s.lentes, alergias: s.alergias, nombreAlergia: s.nombreAlergia ?? '', tipoSangre: s.tipoSangre ?? '',
                        fechaUltimoExamenMedico: desdeIso(s.fechaUltimoExamenMedico), pesoKg: s.pesoKg, estaturaM: s.estaturaM, vacunas: s.vacunas ?? ''
                    });
                }
                this.cargando = false;
            },
            error: (e) => {
                this.cargando = false;
                this.error = mensajeError(e, 'No se pudieron cargar los datos clínicos.');
            }
        });
    }

    guardar(): void {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            this.avisar('Revisa los datos marcados.');
            return;
        }
        const v = this.form.getRawValue();
        const dto: ColaboradorSalud = {
            lentes: !!v.lentes,
            alergias: !!v.alergias,
            nombreAlergia: v.alergias ? textoONull(v.nombreAlergia) : null,
            tipoSangre: textoONull(v.tipoSangre),
            fechaUltimoExamenMedico: aFechaIso(v.fechaUltimoExamenMedico),
            pesoKg: v.pesoKg,
            estaturaM: v.estaturaM,
            vacunas: textoONull(v.vacunas)
        };
        this.guardando = true;
        this._service.guardarSalud(this.colaboradorId, dto).subscribe({
            next: () => {
                this.guardando = false;
                this.avisar('Datos clínicos guardados.');
                this.guardado.emit();
            },
            error: (e) => {
                this.guardando = false;
                this.avisar(mensajeError(e, 'No se pudieron guardar los datos clínicos.'));
            }
        });
    }

    private avisar(texto: string): void {
        this._snackBar.open(texto, 'Cerrar', { duration: 5000 });
    }
}
