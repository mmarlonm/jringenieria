import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { SeguimientoEjecucion } from '../../engineering.service';

@Component({
    selector: 'app-control-ejecucion-dialog',
    templateUrl: './control-ejecucion-dialog.component.html',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatDialogModule,
        MatButtonModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatDatepickerModule,
        MatNativeDateModule,
        MatIconModule
    ]
})
export class ControlEjecucionDialogComponent implements OnInit {
    form: FormGroup;
    ejecucion: SeguimientoEjecucion;

    recursosOptions = [
        'RECURSOS TOTALMENTE DISPONIBLES',
        'NO DISPONIBLE',
        'BAJA DISPONIBILIDAD',
        'CONFLICTO CON OTROS PROYECTOS'
    ];

    riesgoOptions = [
        'BAJO',
        'MEDIO',
        'ALTO',
        'MUY ALTO'
    ];

    prioridadOptions = [
        'IMPORTANTE URGENTE',
        'IMPORTANTE NO URGENTE',
        'NO IMPORTANTE URGENTE',
        'NO IMPORTANTE NO URGENTE'
    ];

    constructor(
        private _fb: FormBuilder,
        private _dialogRef: MatDialogRef<ControlEjecucionDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: { ejecucion: SeguimientoEjecucion }
    ) {
        this.ejecucion = data.ejecucion;
    }

    ngOnInit(): void {
        this.form = this._fb.group({
            idEjecucion: [this.ejecucion?.idEjecucion || 0],
            idSeguimiento: [this.ejecucion.idSeguimiento],
            utilidadEsperada: [this.ejecucion?.utilidadEsperada || ''],
            disponibilidadRecursos: [this.ejecucion?.disponibilidadRecursos || ''],
            fechaInicioProyecto: [this.ejecucion?.fechaInicioProyecto ? new Date(this.ejecucion.fechaInicioProyecto) : ''],
            fechaFinProyecto: [this.ejecucion?.fechaFinProyecto ? new Date(this.ejecucion.fechaFinProyecto) : ''],
            riesgoTecnico: [this.ejecucion?.riesgoTecnico || ''],
            nivelPrioridad: [this.ejecucion?.nivelPrioridad || ''],
            contratoFolio: [this.ejecucion?.contratoFolio || ''],
            fianzaFolio: [this.ejecucion?.fianzaFolio || '']
        });
    }

    save(): void {
        if (this.form.invalid) return;

        const val = this.form.value;
        this._dialogRef.close(val);
    }
}
