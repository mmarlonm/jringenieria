import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { RouterLink } from '@angular/router';
import { Subject, catchError, combineLatest, debounceTime, of, startWith, switchMap, takeUntil } from 'rxjs';
import { ColaboradoresService } from '../colaboradores/colaboradores.service';
import { CatalogoItem } from '../colaboradores/colaboradores.types';
import { mensajeError } from '../colaboradores/colaboradores.utils';
import { ExpedienteService } from '../expediente/expediente.service';
import { ExpedienteLista } from '../expediente/expediente.types';
import { FormatosDialogComponent } from './formatos-dialog.component';

/** Expedientes de todos los colaboradores con su % y lo que falta, para RRHH (requiere el permiso rrhh.expedientes.revisar). */
@Component({
    selector: 'rrhh-expedientes-lista',
    standalone: true,
    templateUrl: './expedientes-lista.component.html',
    imports: [
        CommonModule, ReactiveFormsModule, RouterLink,
        MatTableModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule, MatIconModule
    ]
})
export class ExpedientesListaComponent implements OnInit, OnDestroy {
    private readonly _service = inject(ExpedienteService);
    private readonly _colaboradores = inject(ColaboradoresService);
    private readonly _snackBar = inject(MatSnackBar);
    private readonly _dialog = inject(MatDialog);
    private readonly _destroy = new Subject<void>();

    filas: ExpedienteLista[] = [];
    sucursales: CatalogoItem[] = [];
    cargando = true;
    cargandoFormatos = false;
    readonly columnas = ['nombre', 'sucursal', 'expediente', 'pendientes', 'acciones'];

    /** '' = todos; incompletos, porrevisar o porvencer. */
    filtroEstado = new FormControl<string>('', { nonNullable: true });
    /** 0 = todas las sucursales (un valor null deja el select en blanco). */
    filtroSucursal = new FormControl<number>(0, { nonNullable: true });
    filtroBuscar = new FormControl<string>('', { nonNullable: true });

    ngOnInit(): void {
        this._colaboradores.catalogos().pipe(takeUntil(this._destroy)).subscribe({
            next: (c) => (this.sucursales = c.sucursales),
            error: (e) => this.avisar(e, 'No se pudieron cargar las sucursales.')
        });

        combineLatest([
            this.filtroEstado.valueChanges.pipe(startWith(this.filtroEstado.value)),
            this.filtroSucursal.valueChanges.pipe(startWith(this.filtroSucursal.value)),
            this.filtroBuscar.valueChanges.pipe(startWith(this.filtroBuscar.value), debounceTime(300))
        ]).pipe(
            takeUntil(this._destroy),
            switchMap(([filtro, sucursalId, buscar]) => {
                this.cargando = true;
                // el error se atrapa aquí dentro: si se propagara, los filtros dejarían de funcionar
                return this._service.listar({ filtro, sucursalId: sucursalId || null, buscar }).pipe(
                    catchError((e) => {
                        this.avisar(e, 'No se pudo cargar la lista de expedientes.');
                        return of<ExpedienteLista[]>([]);
                    })
                );
            })
        ).subscribe((lista) => {
            this.filas = lista;
            this.cargando = false;
        });
    }

    ngOnDestroy(): void {
        this._destroy.next();
        this._destroy.complete();
    }

    /** Consulta los tipos en el clic (no al crear el diálogo) y abre «Formatos». */
    abrirFormatos(): void {
        this.cargandoFormatos = true;
        this._service.tipos().subscribe({
            next: (tipos) => {
                this.cargandoFormatos = false;
                this._dialog.open(FormatosDialogComponent, { width: '640px', maxWidth: '95vw', data: tipos });
            },
            error: (e) => {
                this.cargandoFormatos = false;
                this.avisar(e, 'No se pudieron cargar los tipos de documento.');
            }
        });
    }

    private avisar(e: unknown, porDefecto: string): void {
        this._snackBar.open(mensajeError(e, porDefecto), 'Cerrar', { duration: 5000 });
    }
}
