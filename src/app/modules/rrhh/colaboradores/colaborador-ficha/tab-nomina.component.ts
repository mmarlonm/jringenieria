import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ColaboradoresService } from '../colaboradores.service';
import { ColaboradorNomina } from '../colaboradores.types';
import { aFechaIso, desdeIso, mensajeError, textoONull } from '../colaboradores.utils';

/** Salario y datos bancarios. Solo se muestra a quien tenga el permiso especial rrhh.colaboradores.nomina. */
@Component({
    selector: 'rrhh-tab-nomina',
    standalone: true,
    templateUrl: './tab-nomina.component.html',
    imports: [
        CommonModule, ReactiveFormsModule,
        MatFormFieldModule, MatInputModule, MatButtonModule, MatCheckboxModule, MatDatepickerModule, MatNativeDateModule
    ]
})
export class TabNominaComponent implements OnInit {
    private readonly _fb = inject(FormBuilder);
    private readonly _service = inject(ColaboradoresService);
    private readonly _snackBar = inject(MatSnackBar);

    @Input({ required: true }) colaboradorId!: number;
    /** Se emite tras guardar (la ficha refresca el historial). */
    @Output() guardado = new EventEmitter<void>();

    cargando = true;
    /** Texto cuando el API rechazó la consulta (por ejemplo 403 sin permiso). */
    error: string | null = null;
    guardando = false;

    readonly form = this._fb.group({
        salarioDiario: [null as number | null, Validators.min(0)],
        sueldoSemanal: [null as number | null, Validators.min(0)],
        banco: [''],
        clabe: ['', [Validators.pattern(/^\d{18}$/)]],
        infonavit: [false],
        fonacot: [false],
        fechaUltimoIncremento: [null as Date | null]
    });

    ngOnInit(): void {
        this._service.obtenerNomina(this.colaboradorId).subscribe({
            next: (n) => {
                if (n) {
                    this.form.reset({
                        salarioDiario: n.salarioDiario, sueldoSemanal: n.sueldoSemanal, banco: n.banco ?? '', clabe: n.clabe ?? '',
                        infonavit: n.infonavit, fonacot: n.fonacot, fechaUltimoIncremento: desdeIso(n.fechaUltimoIncremento)
                    });
                }
                this.cargando = false;
            },
            error: (e) => {
                this.cargando = false;
                this.error = mensajeError(e, 'No se pudieron cargar los datos de nómina.');
            }
        });
    }

    guardar(): void {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            this.avisar('Revisa los datos marcados (la CLABE tiene 18 dígitos).');
            return;
        }
        const v = this.form.getRawValue();
        const dto: ColaboradorNomina = {
            salarioDiario: v.salarioDiario,
            sueldoSemanal: v.sueldoSemanal,
            banco: textoONull(v.banco),
            clabe: textoONull(v.clabe),
            infonavit: !!v.infonavit,
            fonacot: !!v.fonacot,
            fechaUltimoIncremento: aFechaIso(v.fechaUltimoIncremento)
        };
        this.guardando = true;
        this._service.guardarNomina(this.colaboradorId, dto).subscribe({
            next: () => {
                this.guardando = false;
                this.avisar('Datos de nómina guardados.');
                this.guardado.emit();
            },
            error: (e) => {
                this.guardando = false;
                this.avisar(mensajeError(e, 'No se pudieron guardar los datos de nómina.'));
            }
        });
    }

    private avisar(texto: string): void {
        this._snackBar.open(texto, 'Cerrar', { duration: 5000 });
    }
}
