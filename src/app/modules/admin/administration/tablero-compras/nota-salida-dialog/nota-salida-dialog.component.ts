import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subject, debounceTime, distinctUntilChanged, switchMap, of } from 'rxjs';
import { SolicitudSalidaAlmacenService } from '../services/solicitud-salida-almacen.service';
import { MaterialAlmacenDto } from '../models/solicitud-salida-almacen.types';

@Component({
    selector: 'app-nota-salida-dialog',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        MatDialogModule,
        MatButtonModule,
        MatIconModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatTooltipModule
    ],
    templateUrl: './nota-salida-dialog.component.html'
})
export class NotaSalidaDialogComponent implements OnInit {
    form: FormGroup;
    busquedaMaterial: string = '';
    materialesEncontrados: MaterialAlmacenDto[] = [];
    cargandoBusqueda: boolean = false;
    private searchSubject: Subject<string> = new Subject<string>();

    // Captura manual rápida
    manualDescripcion: string = '';
    manualCantidad: number = 1;
    manualUnidad: string = 'PZA';
    manualNotas: string = '';

    constructor(
        private _fb: FormBuilder,
        private _salidaService: SolicitudSalidaAlmacenService,
        public dialogRef: MatDialogRef<NotaSalidaDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: any
    ) {
        this.form = this._fb.group({
            nombreProyecto: ['', Validators.required],
            nombreSolicitante: ['', Validators.required],
            observacionesNotas: [''],
            detalles: this._fb.array([], Validators.required)
        });
    }

    get detalles(): FormArray {
        return this.form.get('detalles') as FormArray;
    }

    ngOnInit(): void {
        this.searchSubject.pipe(
            debounceTime(350),
            distinctUntilChanged(),
            switchMap(term => {
                if (!term || term.trim().length < 2) {
                    this.cargandoBusqueda = false;
                    return of([]);
                }
                this.cargandoBusqueda = true;
                return this._salidaService.buscarMaterialesAlmacen(term);
            })
        ).subscribe(items => {
            this.materialesEncontrados = items;
            this.cargandoBusqueda = false;
        });
    }

    onSearchMaterial(event: any): void {
        this.searchSubject.next(event.target.value);
    }

    agregarMaterialCatalogo(mat: MaterialAlmacenDto): void {
        this.detalles.push(this._fb.group({
            codigoProducto: [mat.codigo],
            descripcion: [mat.nombre, Validators.required],
            unidadMedida: [mat.unidad || 'PZA', Validators.required],
            cantidadSolicitada: [1, [Validators.required, Validators.min(0.001)]],
            esManual: [false],
            notas: ['']
        }));
    }

    agregarMaterialManual(): void {
        if (!this.manualDescripcion.trim() || this.manualCantidad <= 0) return;

        this.detalles.push(this._fb.group({
            codigoProducto: [null],
            descripcion: [this.manualDescripcion.trim(), Validators.required],
            unidadMedida: [this.manualUnidad || 'PZA', Validators.required],
            cantidadSolicitada: [this.manualCantidad, [Validators.required, Validators.min(0.001)]],
            esManual: [true],
            notas: [this.manualNotas.trim()]
        }));

        this.manualDescripcion = '';
        this.manualCantidad = 1;
        this.manualNotas = '';
    }

    eliminarPartida(index: number): void {
        this.detalles.removeAt(index);
    }

    // Drag and drop support
    onDragStart(event: DragEvent, mat: MaterialAlmacenDto): void {
        if (event.dataTransfer) {
            event.dataTransfer.setData('text/plain', JSON.stringify(mat));
        }
    }

    onDragOver(event: DragEvent): void {
        event.preventDefault();
    }

    onDrop(event: DragEvent): void {
        event.preventDefault();
        if (event.dataTransfer) {
            const dataStr = event.dataTransfer.getData('text/plain');
            if (dataStr) {
                try {
                    const mat: MaterialAlmacenDto = JSON.parse(dataStr);
                    if (mat && mat.codigo) {
                        this.agregarMaterialCatalogo(mat);
                    }
                } catch (e) {
                    console.error('Error parseando material arrastrado', e);
                }
            }
        }
    }

    guardarNota(): void {
        if (this.form.invalid || this.detalles.length === 0) {
            this.form.markAllAsTouched();
            return;
        }

        const payload = {
            nombreProyecto: this.form.value.nombreProyecto,
            nombreSolicitante: this.form.value.nombreSolicitante,
            observacionesNotas: this.form.value.observacionesNotas,
            detalles: this.detalles.value
        };

        this._salidaService.crear(payload).subscribe({
            next: (resp) => {
                this.dialogRef.close(resp);
            },
            error: (err) => {
                console.error('Error al guardar nota de salida', err);
            }
        });
    }

    cerrar(): void {
        this.dialogRef.close();
    }
}
