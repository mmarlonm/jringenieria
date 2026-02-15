import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { TextFieldModule } from '@angular/cdk/text-field';
import { DatePipe, NgClass, CommonModule } from '@angular/common';
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
import { UsersService } from 'app/modules/admin/security/users/users.service';
import { UsersListComponent } from 'app/modules/admin/security/users/list/users-list.component';
import { Subject, debounceTime, takeUntil } from 'rxjs';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { RolService } from 'app/modules/admin/security/roles/roles.service';
import Swal from 'sweetalert2';

@Component({
    selector: 'users-details',
    templateUrl: './users-detail.component.html',
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
        CommonModule,
        MatSlideToggleModule
    ],
})
export class UsersDetailsComponent implements OnInit, OnDestroy {
    @ViewChild('avatarFileInput') private _avatarFileInput: ElementRef;

    editMode: boolean = false;
    user: any;
    contactForm: UntypedFormGroup;
    users: any[];
    roles: any[] = [];
    unidades: any[] = []; // 🔹 Catálogo de sucursales

    private _unsubscribeAll: Subject<any> = new Subject<any>();

    constructor(
        private _activatedRoute: ActivatedRoute,
        private _changeDetectorRef: ChangeDetectorRef,
        private _usersListComponent: UsersListComponent,
        private _usersService: UsersService,
        private _formBuilder: UntypedFormBuilder,
        private _fuseConfirmationService: FuseConfirmationService,
        private _router: Router,
        private _rolService: RolService,
    ) { }

    get metasFormArray(): UntypedFormArray {
        return this.contactForm.get('metas') as UntypedFormArray;
    }

    ngOnInit(): void {
        // Cargar Roles
        this._rolService.getRoles().subscribe((roles) => {
            this.roles = roles;
            this._changeDetectorRef.markForCheck();
        });

        // 🔹 Cargar Unidades de Negocio (Asegúrate de tener este método en tu servicio)
        this._usersService.getUnidadesNegocio().subscribe((unidades) => {
            this.unidades = unidades;
            this._changeDetectorRef.markForCheck();
        });

        this._usersListComponent.matDrawer.open();

        // Inicializar el formulario
        this.contactForm = this._formBuilder.group({
            usuarioId: [''],
            avatar: [null],
            nombreUsuario: ['', [Validators.required]],
            email: ['', [Validators.required, Validators.email]],
            telefono: ['', [Validators.required]],
            activo: [true, [Validators.required]],
            rolId: ['', [Validators.required]],
            unidadId: [null], // 🔹 Sucursal
            metas: this._formBuilder.array([]) // 🔹 Metas dinámicas
        });

        this._usersService.users$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((users: any[]) => {
                this.users = users;
                this._changeDetectorRef.markForCheck();
            });

        this._usersService.user$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((user: any) => {
                if (!user) return;
                this.user = user;

                // Limpiar metas anteriores
                this.metasFormArray.clear();

                // Llenar metas si existen
                if (user.metas && user.metas.length > 0) {
                    user.metas.forEach(meta => {
                        this.addMeta(meta);
                    });
                }

                this.contactForm.patchValue(user);
                this.toggleEditMode(false);
                this._changeDetectorRef.markForCheck();
            });
    }

    ngOnDestroy(): void {
        this._unsubscribeAll.next(null);
        this._unsubscribeAll.complete();
    }

    // --- Gestión de Metas ---

    /**
     * Añade una meta al FormArray
     * @param meta Datos opcionales para inicializar
     */
    addMeta(meta: any = { anio: new Date().getFullYear(), montoMeta: 0 }): void {
        const metaFormGroup = this._formBuilder.group({
            metaId: [meta.metaId || 0],
            anio: [meta.anio, [Validators.required]],
            montoMeta: [meta.montoMeta, [Validators.required, Validators.min(1)]]
        });
        this.metasFormArray.push(metaFormGroup);
        this._changeDetectorRef.markForCheck();
    }

    /**
     * Elimina una meta del FormArray
     * @param index Indice del elemento
     */
    removeMeta(index: number): void {
        this.metasFormArray.removeAt(index);
        this._changeDetectorRef.markForCheck();
    }

    // --- Acciones de Formulario ---

    updateContact(): void {
        if (this.contactForm.invalid) {
            Swal.fire({ icon: "error", title: "Opps", text: "Revisa los campos obligatorios y las metas." });
            return;
        }

        const user = this.contactForm.getRawValue();

        if (user.avatar && user.avatar.startsWith("data:image")) {
            user.avatar = user.avatar.split(",")[1];
        }

        this._usersService.updateUsers(user).subscribe(() => {
            Swal.fire({ icon: "success", title: "Éxito", text: "Usuario actualizado correctamente", timer: 1500 });
            this.toggleEditMode(false);
        });
    }

    // --- Métodos de UI ---

    toggleEditMode(editMode: boolean | null = null): void {
        this.editMode = editMode ?? !this.editMode;
        this._changeDetectorRef.markForCheck();
    }

    uploadAvatar(fileList: FileList): void {
        if (!fileList.length) return;
        const file = fileList[0];
        const reader = new FileReader();
        reader.onload = () => {
            const base64String = reader.result as string;
            this.contactForm.patchValue({ avatar: base64String });
            this.user.avatar = base64String;
            this._changeDetectorRef.markForCheck();
        };
        reader.readAsDataURL(file);
    }

    removeAvatar(): void {
        this.contactForm.get('avatar').setValue(null);
        this._avatarFileInput.nativeElement.value = null;
        this.user.avatar = null;
    }

    closeDrawer(): Promise<MatDrawerToggleResult> {
        return this._usersListComponent.matDrawer.close();
    }

    deleteContact(): void {
        const confirmation = this._fuseConfirmationService.open({
            title: 'Delete user',
            message: 'Are you sure you want to delete this user? This action cannot be undone!',
            actions: { confirm: { label: 'Delete' } },
        });

        confirmation.afterClosed().subscribe((result) => {
            if (result === 'confirmed') {
                this._usersService.deleteContact(this.user.usuarioId).subscribe(() => {
                    this._router.navigate(['../'], { relativeTo: this._activatedRoute });
                });
            }
        });
    }

    trackByFn(index: number, item: any): any {
        return item.usuarioId || index;
    }

    navigateToProject(id: number): void {
        this._router.navigate([`/dashboards/project/${id}`]);
    }

    async copyTextToClipboard(text: string): Promise<void> {
        try {
            await navigator.clipboard.writeText(text);
        } catch (err) {
            console.error('Error al copiar: ', err);
        }
    }
}