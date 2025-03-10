import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { TextFieldModule } from '@angular/cdk/text-field';
import { DatePipe, NgClass } from '@angular/common';
import {
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    ElementRef,
    OnDestroy,
    OnInit,
    Renderer2,
    TemplateRef,
    ViewChild,
    ViewContainerRef,
    ViewEncapsulation,
} from '@angular/core';
import {
    FormsModule,
    ReactiveFormsModule,
    UntypedFormArray,
    UntypedFormBuilder,
    UntypedFormGroup,
    Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatOptionModule, MatRippleModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDrawerToggleResult } from '@angular/material/sidenav';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FuseFindByKeyPipe } from '@fuse/pipes/find-by-key/find-by-key.pipe';
import { FuseConfirmationService } from '@fuse/services/confirmation';
import { RolService } from 'app/modules/admin/security/roles/roles.service';
import { RolesListComponent } from 'app/modules/admin/security/roles/list/roles-list.component';
import { Subject, debounceTime, takeUntil } from 'rxjs';
import { FuseNavigationItem } from '@fuse/components/navigation';
import { RoleNavigationModule } from '../rol-navigation/rol-navigation.module'
@Component({
    selector: 'roles-details',
    templateUrl: './roles-detail.component.html',
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: true,
    imports: [
        MatButtonModule,
        MatTooltipModule,
        RouterLink,
        MatIconModule,
        FormsModule,
        ReactiveFormsModule,
        MatRippleModule,
        MatFormFieldModule,
        MatInputModule,
        MatCheckboxModule,
        NgClass,
        MatSelectModule,
        MatOptionModule,
        MatDatepickerModule,
        TextFieldModule,
        FuseFindByKeyPipe,
        DatePipe,
        RoleNavigationModule
    ],
})
export class RolesDetailsComponent implements OnInit, OnDestroy {

    editMode: boolean = false;
    tagsEditMode: boolean = false;
    rol: any;
    contactForm: UntypedFormGroup;
    roles: any[];
    permisos:any[];
    private _tagsPanelOverlayRef: OverlayRef;
    private _unsubscribeAll: Subject<any> = new Subject<any>();

    navigation: FuseNavigationItem[] = [];
    selectedPermissions:any;
    /**
     * Constructor
     */
    constructor(
        private _activatedRoute: ActivatedRoute,
        private _changeDetectorRef: ChangeDetectorRef,
        private _usersListComponent: RolesListComponent,
        private _rolService: RolService,
        private _formBuilder: UntypedFormBuilder,
        private _fuseConfirmationService: FuseConfirmationService,
        private _renderer2: Renderer2,
        private _router: Router,
        private _overlay: Overlay,
        private _viewContainerRef: ViewContainerRef
    ) {}

    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    ngOnInit(): void {
        // Open the drawer
        this._usersListComponent.matDrawer.open();

        // Create the rol form
        this.contactForm = this._formBuilder.group({
            rolId: [''],
            nombreRol: ['', [Validators.required]],
            vistas: [[]]  // Aquí se guardarán las vistas con permisos
        });

        // Get the roles
        this._rolService.rol$
    .pipe(takeUntil(this._unsubscribeAll))
    .subscribe((rol: any) => {
        this._usersListComponent.matDrawer.open();
        this.rol = rol;
        console.log("Información de rol recibida: ", rol);

        // Transformar vistas y permisos en un formato adecuado para el formulario
        const vistasConPermisos = (rol.vistas || []).map(vista => ({
            vistaId: vista.vistaId,
            nombreVista: vista.nombreVista,
            permisos: (rol.permisos || [])
                .filter(p => p.vista?.vistaId === vista.vistaId)
                .map(p => p.permisoId) // Extraemos solo los IDs de permisos
        }));

        console.log("Vistas con permisos asignados: ", vistasConPermisos);

        // Crear estructura de permisos para <app-role-navigation>
        const permisosSeleccionados = {};
        vistasConPermisos.forEach(vista => {
            permisosSeleccionados[vista.nombreVista] = vista.permisos; 
        });

        console.log("Permisos seleccionados: ", permisosSeleccionados);

        // Asignar valores al formulario
        this.contactForm.patchValue({
            rolId: rol.rolId,
            nombreRol: rol.nombreRol,
            vistas: vistasConPermisos
        });

        // Asignar los permisos ya existentes a la navegación
        this.selectedPermissions = permisosSeleccionados;

        // Marcar cambios
        this._changeDetectorRef.markForCheck();
    });

        // Get the rol
        this._rolService.rol$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((rol: any) => {
                // Open the drawer in case it is closed
                this._usersListComponent.matDrawer.open();

                // Get the rol
                this.rol = rol;
                console.log("informacion de rol ", rol);

                // Patch values to the form
                this.contactForm.patchValue(rol);

                // Toggle the edit mode off
                this.toggleEditMode(false);

                // Mark for check
                this._changeDetectorRef.markForCheck();
            });

            this._rolService.getNavigation().subscribe(data => {
                console.log("data navigation", data)
                this.navigation = data.default2 || []; // ✅ Asegurar que siempre sea un array
                console.log("navigation data ", this.navigation)
                this._changeDetectorRef.markForCheck();
            });
    }

    /**
     * On destroy
     */
    ngOnDestroy(): void {
        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next(null);
        this._unsubscribeAll.complete();

        // Dispose the overlays if they are still on the DOM
        if (this._tagsPanelOverlayRef) {
            this._tagsPanelOverlayRef.dispose();
        }
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * Close the drawer
     */
    closeDrawer(): Promise<MatDrawerToggleResult> {
        return this._usersListComponent.matDrawer.close();
    }

    /**
     * Toggle edit mode
     *
     * @param editMode
     */
    toggleEditMode(editMode: boolean | null = null): void {
        if (editMode === null) {
            this.editMode = !this.editMode;
        } else {
            this.editMode = editMode;
        }

        // Mark for check
        this._changeDetectorRef.markForCheck();
    }

    /**
     * Update the rol
     */
    updateContact(): void {
        // Get the rol object
        const rol = this.contactForm.getRawValue();
        console.log("Nuevo rol ", rol)
        // Update the rol on the server
        this._rolService
            .updateRoles(rol)
            .subscribe(() => {
                // Toggle the edit mode off
                this.toggleEditMode(false);
            });
    }

    /**
     * Delete the rol
     */
    deleteContact(): void {
        // Open the confirmation dialog
        const confirmation = this._fuseConfirmationService.open({
            title: 'Delete rol',
            message:
                'Are you sure you want to delete this rol? This action cannot be undone!',
            actions: {
                confirm: {
                    label: 'Delete',
                },
            },
        });

        // Subscribe to the confirmation dialog closed action
        confirmation.afterClosed().subscribe((result) => {
            // If the confirm button pressed...
            if (result === 'confirmed') {
                // Get the current rol's id
                const id = this.rol.id;

                // Get the next/previous rol's id
                const currentContactIndex = this.roles.findIndex(
                    (item) => item.id === id
                );
                const nextContactIndex =
                    currentContactIndex +
                    (currentContactIndex === this.roles.length - 1 ? -1 : 1);
                const nextContactId =
                    this.roles.length === 1 && this.roles[0].id === id
                        ? null
                        : this.roles[nextContactIndex].id;

                // Delete the rol
                /* this._rolService
                    .deleteContact(id)
                    .subscribe((isDeleted) => {
                        // Return if the rol wasn't deleted...
                        if (!isDeleted) {
                            return;
                        }

                        // Navigate to the next rol if available
                        if (nextContactId) {
                            this._router.navigate(['../', nextContactId], {
                                relativeTo: this._activatedRoute,
                            });
                        }
                        // Otherwise, navigate to the parent
                        else {
                            this._router.navigate(['../'], {
                                relativeTo: this._activatedRoute,
                            });
                        }

                        // Toggle the edit mode off
                        this.toggleEditMode(false);
                    }); */

                // Mark for check
                this._changeDetectorRef.markForCheck();
            }
        });
    }

    /**
     * Track by function for ngFor loops
     *
     * @param index
     * @param item
     */
    trackByFn(index: number, item: any): any {
        return item.id || index;
    }

    actualizarPermisos(permisos: any[]): void {
        this.contactForm.patchValue({ vistas: permisos });
        console.log("Permisos actualizados en el formulario:", this.contactForm.value);
    }

    togglePermiso(vistaId: string, permisoId: number, isChecked: boolean): void {
        const vista:any = this.navigation.find(v => v.id === vistaId);
        if (!vista) return;
    
        if (isChecked) {
            if (!vista.permisosSeleccionados.includes(permisoId)) {
                vista.permisosSeleccionados.push(permisoId);
            }
        } else {
            vista.permisosSeleccionados = vista.permisosSeleccionados.filter(id => id !== permisoId);
        }
    
        console.log("Permisos seleccionados:", this.navigation);
    }
}
