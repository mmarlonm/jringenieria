import { CommonModule, DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { Subject, filter, fromEvent, takeUntil } from 'rxjs';
import { RolService } from 'app/modules/admin/security/roles/roles.service';
import { RolesAsignacionMasivaDialogComponent } from '../asignacion-masiva/roles-asignacion-masiva-dialog.component';

@Component({
    selector: 'roles-list',
    templateUrl: './roles-list.component.html',
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: true,
    imports: [CommonModule, FormsModule, MatButtonModule, MatIconModule, MatTooltipModule, RouterLink, RouterOutlet],
})
export class RolesListComponent implements OnInit, OnDestroy {
    roles: any[] = [];
    filtrados: any[] = [];
    busqueda = '';
    /** Id del rol abierto en el panel de la derecha (null si no hay ninguno). */
    selectedId: string | null = null;

    private _unsubscribeAll: Subject<any> = new Subject<any>();

    constructor(
        private _activatedRoute: ActivatedRoute,
        private _changeDetectorRef: ChangeDetectorRef,
        private _rolService: RolService,
        private _dialog: MatDialog,
        @Inject(DOCUMENT) private _document: any,
        private _router: Router
    ) { }

    ngOnInit(): void {
        this._rolService.roles$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((roles: any[] | null) => {
                this.roles = roles ?? [];
                this.filtrar();
            });

        // El rol abierto sale de la dirección (así también se sabe cuando se vuelve a la lista)
        this.leerRolAbierto();
        this._router.events
            .pipe(filter(e => e instanceof NavigationEnd), takeUntil(this._unsubscribeAll))
            .subscribe(() => this.leerRolAbierto());

        // Atajo: Ctrl + / crea un rol nuevo
        fromEvent(this._document, 'keydown')
            .pipe(
                takeUntil(this._unsubscribeAll),
                filter<KeyboardEvent>((event) => (event.ctrlKey === true || event.metaKey) && event.key === '/')
            )
            .subscribe(() => this.crearRol());
    }

    ngOnDestroy(): void {
        this._unsubscribeAll.next(null);
        this._unsubscribeAll.complete();
    }

    private leerRolAbierto(): void {
        this.selectedId = this._activatedRoute.firstChild?.snapshot.paramMap.get('id') ?? null;
        this._changeDetectorRef.markForCheck();
    }

    filtrar(): void {
        const q = this.busqueda.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
        this.filtrados = !q
            ? this.roles
            : this.roles.filter(r => (r.nombreRol || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().includes(q));
        this._changeDetectorRef.markForCheck();
    }

    /** Cantidad de vistas con acceso de un rol. */
    totalVistas(rol: any): number {
        return (rol.vistas ?? []).length;
    }

    crearRol(): void {
        this._rolService.createRol().subscribe((nuevo) => {
            this._router.navigate(['./', nuevo.rolId], { relativeTo: this._activatedRoute });
        });
    }

    abrirAsignacionMasiva(): void {
        this._dialog.open(RolesAsignacionMasivaDialogComponent, {
            width: '1040px',
            maxWidth: '95vw',
            autoFocus: false,
        });
    }

    trackByFn(index: number, rol: any): any {
        return rol.rolId ?? index;
    }
}
