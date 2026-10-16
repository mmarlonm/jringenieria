import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { RouterLink } from '@angular/router';
import { BehaviorSubject, Subject, catchError, combineLatest, debounceTime, of, startWith, switchMap, takeUntil } from 'rxjs';
import { ColaboradoresService } from '../colaboradores.service';
import { CatalogoItem, ColaboradorLista, EstatusColaborador, EstatusContrato } from '../colaboradores.types';
import { ImportarUsuariosDialogComponent } from '../importar-usuarios-dialog/importar-usuarios-dialog.component';

@Component({
    selector: 'rrhh-colaboradores-lista',
    standalone: true,
    templateUrl: './colaboradores-lista.component.html',
    imports: [
        CommonModule, ReactiveFormsModule, RouterLink,
        MatTableModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule, MatIconModule
    ]
})
export class ColaboradoresListaComponent implements OnInit, OnDestroy {
    private readonly _service = inject(ColaboradoresService);
    private readonly _snackBar = inject(MatSnackBar);
    private readonly _dialog = inject(MatDialog);
    private readonly _destroy = new Subject<void>();
    /** Emite para volver a consultar la lista (tras importar usuarios). */
    private readonly _recargar = new BehaviorSubject<void>(undefined);

    colaboradores: ColaboradorLista[] = [];
    sucursales: CatalogoItem[] = [];
    cargando = true;
    cargandoUsuarios = false;

    displayedColumns = ['codigo', 'nombre', 'sucursal', 'departamento', 'puesto', 'estatus', 'estatusContrato', 'vencimiento', 'acciones'];

    filtroEstatus = new FormControl<EstatusColaborador | ''>('', { nonNullable: true });
    filtroSucursal = new FormControl<number | null>(null);
    filtroBuscar = new FormControl<string>('', { nonNullable: true });

    ngOnInit(): void {
        this._service.catalogos().pipe(takeUntil(this._destroy)).subscribe({
            next: (c) => (this.sucursales = c.sucursales),
            error: (e) => this.avisar(e, 'No se pudieron cargar las sucursales.')
        });

        combineLatest([
            this.filtroEstatus.valueChanges.pipe(startWith(this.filtroEstatus.value)),
            this.filtroSucursal.valueChanges.pipe(startWith(this.filtroSucursal.value)),
            this.filtroBuscar.valueChanges.pipe(startWith(this.filtroBuscar.value), debounceTime(300)),
            this._recargar
        ]).pipe(
            takeUntil(this._destroy),
            switchMap(([estatus, sucursalId, buscar]) => {
                this.cargando = true;
                // el error se atrapa aquí dentro: si se propagara, los filtros dejarían de funcionar
                return this._service.listar({ estatus, sucursalId, buscar }).pipe(
                    catchError((e) => {
                        this.avisar(e, 'No se pudo cargar la lista de colaboradores.');
                        return of<ColaboradorLista[]>([]);
                    })
                );
            })
        ).subscribe((lista) => {
            this.colaboradores = lista;
            this.cargando = false;
        });
    }

    ngOnDestroy(): void {
        this._destroy.next();
        this._destroy.complete();
    }

    /** Sin filtros activos: si la lista sale vacía es que aún no hay colaboradores. */
    get sinFiltros(): boolean {
        return !this.filtroEstatus.value && !this.filtroSucursal.value && !this.filtroBuscar.value;
    }

    /** Consulta los usuarios que aún no son colaboradores (en el clic, no al crear el diálogo) y abre el diálogo para elegir. */
    importarUsuarios(): void {
        this.cargandoUsuarios = true;
        this._service.usuariosDisponibles().subscribe({
            next: (usuarios) => {
                this.cargandoUsuarios = false;
                this._dialog.open(ImportarUsuariosDialogComponent, { width: '860px', maxWidth: '95vw', data: usuarios }).afterClosed().subscribe((resultado) => {
                    if (!resultado) return;
                    const omitidos = resultado.omitidos ? ` (${resultado.omitidos} omitido${resultado.omitidos === 1 ? '' : 's'})` : '';
                    this._snackBar.open(`Colaboradores importados: ${resultado.importados}${omitidos}.`, 'Cerrar', { duration: 6000 });
                    this._recargar.next();
                });
            },
            error: (e) => {
                this.cargandoUsuarios = false;
                this.avisar(e, 'No se pudieron cargar los usuarios del sistema.');
            }
        });
    }

    claseContrato(estatus: EstatusContrato): string {
        switch (estatus) {
            case 'VIGENTE': return 'bg-green-100 text-green-800';
            case 'POR VENCER': return 'bg-amber-100 text-amber-800';
            case 'VENCIDO': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-700';
        }
    }

    private avisar(error: any, porDefecto: string): void {
        this._snackBar.open(error?.error?.mensaje || porDefecto, 'Cerrar', { duration: 5000 });
    }
}
